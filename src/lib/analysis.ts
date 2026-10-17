import { db } from "./db";
import { byVariantOrder } from "./experiments";
import {
  type ComparisonResult,
  type Group,
  type Verdict,
  compareProportions,
  requiredSampleSize,
  sampleRatioMismatch,
  verdict,
} from "./stats";

/** Conversion metrics the dashboard knows how to compute (all are "did the user do X?"). */
export const METRICS = {
  add_to_cart: { label: "Add-to-cart rate" },
  purchase: { label: "Purchase rate" },
  upsell_add: { label: "Upsell accepted" },
} as const;

export type MetricKey = keyof typeof METRICS;
export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

/** One row per exposed user: their variant, when they were exposed, what they did after. */
export type ExposureRow = {
  variantKey: string;
  exposedAt: Date;
  conversions: Record<MetricKey, boolean>;
  revenueCents: number;
};

/**
 * Loads one row per exposed user.
 *
 * Only events that happened *after* the exposure count: a purchase made before a user
 * ever saw the variant cannot have been caused by it.
 * The SQL uses quoted identifiers and plain CASE/MAX only, so it runs unchanged on
 * SQLite and Postgres.
 */
export async function loadExposureRows(experimentKey: string): Promise<ExposureRow[]> {
  const rows = await db.$queryRaw<
    {
      variantKey: string;
      exposedAt: Date | string | number;
      addToCart: number | bigint;
      purchase: number | bigint;
      upsellAdd: number | bigint;
      revenueCents: number | bigint | null;
    }[]
  >`
    SELECT
      x."variantKey" AS "variantKey",
      x."exposedAt" AS "exposedAt",
      MAX(CASE WHEN e."type" = 'add_to_cart' THEN 1 ELSE 0 END) AS "addToCart",
      MAX(CASE WHEN e."type" = 'purchase' THEN 1 ELSE 0 END) AS "purchase",
      MAX(CASE WHEN e."type" = 'click' AND e."target" = 'upsell_add' THEN 1 ELSE 0 END) AS "upsellAdd",
      SUM(CASE WHEN e."type" = 'purchase' THEN e."valueCents" ELSE 0 END) AS "revenueCents"
    FROM "Exposure" x
    LEFT JOIN "Event" e
      ON e."userId" = x."userId" AND e."createdAt" >= x."exposedAt"
    WHERE x."experimentKey" = ${experimentKey}
    GROUP BY x."id", x."variantKey", x."exposedAt"
  `;

  // Drivers return counts as number or bigint and dates as Date, string or number.
  return rows.map((row) => ({
    variantKey: row.variantKey,
    exposedAt: new Date(row.exposedAt),
    conversions: {
      add_to_cart: Number(row.addToCart) > 0,
      purchase: Number(row.purchase) > 0,
      upsell_add: Number(row.upsellAdd) > 0,
    },
    revenueCents: Number(row.revenueCents ?? 0),
  }));
}

export type VariantSummary = {
  key: string;
  name: string;
  weight: number;
  visitors: number;
  conversions: Record<MetricKey, number>;
  revenueCents: number;
};

/** Counts visitors, converters per metric and revenue for each variant. */
export function summarize(
  rows: ExposureRow[],
  variants: { key: string; name: string; weight: number }[],
): VariantSummary[] {
  const byKey = new Map<string, VariantSummary>(
    variants.map((v) => [
      v.key,
      {
        ...v,
        visitors: 0,
        conversions: { add_to_cart: 0, purchase: 0, upsell_add: 0 },
        revenueCents: 0,
      },
    ]),
  );
  for (const row of rows) {
    const summary = byKey.get(row.variantKey);
    if (!summary) continue; // variant removed from the config: ignore its old exposures
    summary.visitors++;
    summary.revenueCents += row.revenueCents;
    for (const metric of METRIC_KEYS) {
      if (row.conversions[metric]) summary.conversions[metric]++;
    }
  }
  return [...byKey.values()];
}

export type DailyPoint = {
  /** UTC day, "YYYY-MM-DD". */
  day: string;
  /** Cumulative conversion rate per variant key, for users exposed up to this day. */
  rates: Record<string, number>;
  visitors: Record<string, number>;
};

/**
 * Cumulative conversion rate per day (by exposure date).
 * Watching it stabilise over time is a good way to explain why early results are noisy.
 */
export function cumulativeSeries(
  rows: ExposureRow[],
  variantKeys: string[],
  metric: MetricKey,
): DailyPoint[] {
  const sorted = [...rows].sort((a, b) => a.exposedAt.getTime() - b.exposedAt.getTime());
  const visitors: Record<string, number> = Object.fromEntries(variantKeys.map((k) => [k, 0]));
  const converted: Record<string, number> = { ...visitors };
  const points: DailyPoint[] = [];

  const snapshot = (day: string): DailyPoint => ({
    day,
    visitors: { ...visitors },
    rates: Object.fromEntries(
      variantKeys.map((k) => [k, visitors[k] ? converted[k] / visitors[k] : 0]),
    ),
  });

  let currentDay: string | null = null;
  for (const row of sorted) {
    if (!(row.variantKey in visitors)) continue;
    const day = row.exposedAt.toISOString().slice(0, 10);
    if (currentDay !== null && day !== currentDay) points.push(snapshot(currentDay));
    currentDay = day;
    visitors[row.variantKey]++;
    if (row.conversions[metric]) converted[row.variantKey]++;
  }
  if (currentDay !== null) points.push(snapshot(currentDay));
  return points;
}

export type MetricComparison = {
  metric: MetricKey;
  variantKey: string;
  control: Group;
  variant: Group;
  result: ComparisonResult;
};

export type ExperimentAnalysis = {
  variants: VariantSummary[];
  /** Every non-control variant compared to control, for every metric. */
  comparisons: MetricComparison[];
  srm: ReturnType<typeof sampleRatioMismatch>;
  /** Verdict on the primary metric, per non-control variant. */
  verdicts: Record<string, Verdict>;
  /** Visitors per variant needed to detect a +10% relative uplift on the primary metric. */
  sampleSizeFor10Percent: number;
  totalVisitors: number;
};

/** Everything the dashboard shows for one experiment, computed from the exposure rows. */
export function analyze(
  experiment: {
    primaryMetric: string;
    minSamplePerVariant: number;
    variants: { key: string; name: string; weight: number }[];
  },
  rows: ExposureRow[],
): ExperimentAnalysis {
  const primary = experiment.primaryMetric as MetricKey;
  const variants = summarize(rows, [...experiment.variants].sort(byVariantOrder));
  const [control, ...challengers] = variants;

  const srm = sampleRatioMismatch(
    variants.map((v) => v.visitors),
    variants.map((v) => v.weight),
  );

  const group = (v: VariantSummary, metric: MetricKey): Group => ({
    visitors: v.visitors,
    conversions: v.conversions[metric],
  });

  const comparisons: MetricComparison[] = [];
  const verdicts: Record<string, Verdict> = {};
  for (const challenger of challengers) {
    for (const metric of METRIC_KEYS) {
      const a = group(control, metric);
      const b = group(challenger, metric);
      const result = compareProportions(a, b);
      comparisons.push({ metric, variantKey: challenger.key, control: a, variant: b, result });
      if (metric === primary) {
        verdicts[challenger.key] = verdict(
          result,
          { a, b },
          { minVisitorsPerVariant: experiment.minSamplePerVariant, srm: srm.mismatch },
        );
      }
    }
  }

  const baseline = control.visitors ? control.conversions[primary] / control.visitors : 0;
  return {
    variants,
    comparisons,
    srm,
    verdicts,
    sampleSizeFor10Percent: requiredSampleSize(baseline, 0.1),
    totalVisitors: variants.reduce((sum, v) => sum + v.visitors, 0),
  };
}

/** Loads and analyzes an experiment. Null if it does not exist. */
export async function getExperimentResults(key: string) {
  const experiment = await db.experiment.findUnique({
    where: { key },
    include: { variants: true },
  });
  if (!experiment) return null;
  const rows = await loadExposureRows(key);
  const analysis = analyze(experiment, rows);
  const series = cumulativeSeries(
    rows,
    analysis.variants.map((v) => v.key),
    experiment.primaryMetric as MetricKey,
  );
  return { experiment, analysis, series };
}

/** Summary of every experiment, for the dashboard home page. */
export async function getAllExperimentResults() {
  const experiments = await db.experiment.findMany({
    include: { variants: true },
    orderBy: { startedAt: "desc" },
  });
  return Promise.all(
    experiments.map(async (experiment) => ({
      experiment,
      analysis: analyze(experiment, await loadExposureRows(experiment.key)),
    })),
  );
}
