import Link from "next/link";
import { notFound } from "next/navigation";
import { seriesColor } from "@/components/dashboard/colors";
import { CumulativeChart } from "@/components/dashboard/cumulative-chart";
import { ResultsTable } from "@/components/dashboard/results-table";
import { UpliftChart } from "@/components/dashboard/uplift-chart";
import { VerdictBadge } from "@/components/dashboard/verdict-badge";
import { METRICS, METRIC_KEYS, type MetricKey, getExperimentResults } from "@/lib/analysis";
import { formatPercent, formatPoints, formatPrice, formatPValue, formatUplift } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExperimentPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const data = await getExperimentResults(key);
  if (!data) notFound();

  const { experiment, analysis, series } = data;
  const primary = experiment.primaryMetric as MetricKey;
  const [control, ...challengers] = analysis.variants;
  const minVisitors = Math.min(...analysis.variants.map((v) => v.visitors));
  const progress = Math.min(1, minVisitors / experiment.minSamplePerVariant);

  return (
    <>
      <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← All experiments
      </Link>

      <header className="mt-4">
        <p className="font-mono text-xs text-zinc-400">{experiment.key}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{experiment.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {experiment.status} · started {experiment.startedAt.toISOString().slice(0, 10)} · primary
          metric: {METRICS[primary].label.toLowerCase()}
        </p>
        <blockquote className="mt-4 max-w-3xl border-l-2 border-zinc-300 pl-4 text-zinc-600">
          <span className="font-medium text-zinc-900">Hypothesis.</span> {experiment.hypothesis}
        </blockquote>
      </header>

      {challengers.map((variant, i) => {
        const comparison = analysis.comparisons.find(
          (c) => c.metric === primary && c.variantKey === variant.key,
        )!;
        const { result } = comparison;
        return (
          <section
            key={variant.key}
            className="mt-8 rounded-xl border border-zinc-200 bg-white p-6"
            data-testid="verdict-panel"
          >
            <VerdictBadge verdict={analysis.verdicts[variant.key]} size="lg" />
            <p className="mt-4 max-w-3xl text-zinc-700">
              <strong>{variant.name}</strong> converts at{" "}
              <strong>{formatPercent(result.rateB)}</strong> vs {formatPercent(result.rateA)} for{" "}
              {control.name.toLowerCase()} ({formatUplift(result.relativeUplift)}, p ={" "}
              {formatPValue(result.pValue)}). The true difference is plausibly between{" "}
              {formatPoints(result.ci[0])} and {formatPoints(result.ci[1])}.
            </p>

            <dl className="mt-6 grid gap-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-zinc-500">Visitors (control / {variant.key})</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {control.visitors.toLocaleString("en-US")} /{" "}
                  {variant.visitors.toLocaleString("en-US")}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Pre-registered sample</dt>
                <dd className="mt-1">
                  <span className="text-lg font-semibold tabular-nums">
                    {formatPercent(progress, 0)}
                  </span>{" "}
                  <span className="text-zinc-500">
                    of {experiment.minSamplePerVariant.toLocaleString("en-US")} / variant
                  </span>
                  <div className="mt-2 h-1.5 rounded-full bg-zinc-100">
                    <div
                      className="h-1.5 rounded-full bg-zinc-800"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Traffic split (SRM check)</dt>
                <dd className="mt-1">
                  {analysis.srm.mismatch ? (
                    <span className="font-medium text-[#b42323]">⚠ Mismatch</span>
                  ) : (
                    <span className="font-medium text-[#006300]">✓ OK</span>
                  )}{" "}
                  <span className="text-zinc-500">(p = {formatPValue(analysis.srm.pValue)})</span>
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Revenue / visitor (descriptive)</dt>
                <dd className="mt-1 tabular-nums">
                  {formatPrice(control.visitors ? control.revenueCents / control.visitors : 0)} →{" "}
                  <span className="font-semibold">
                    {formatPrice(variant.visitors ? variant.revenueCents / variant.visitors : 0)}
                  </span>
                </dd>
              </div>
            </dl>

            <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {variant.name} vs {control.name}: difference per metric
            </h2>
            <div className="mt-4">
              <UpliftChart
                color={seriesColor(i + 1)}
                rows={METRIC_KEYS.map((metric) => {
                  const c = analysis.comparisons.find(
                    (x) => x.metric === metric && x.variantKey === variant.key,
                  )!;
                  return {
                    label: METRICS[metric].label,
                    absoluteDiff: c.result.absoluteDiff,
                    ci: c.result.ci,
                    relativeUplift: c.result.relativeUplift,
                    pValue: c.result.pValue,
                    primary: metric === primary,
                  };
                })}
              />
            </div>
          </section>
        );
      })}

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {METRICS[primary].label} over time (cumulative)
        </h2>
        <div className="mt-4">
          <CumulativeChart points={series} variants={analysis.variants} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          All numbers
        </h2>
        <ResultsTable analysis={analysis} primaryMetric={primary} />
        <p className="mt-3 text-xs text-zinc-500">
          To detect a +10% relative uplift on the primary metric at this baseline (95% confidence,
          80% power), you need about{" "}
          {Number.isFinite(analysis.sampleSizeFor10Percent)
            ? analysis.sampleSizeFor10Percent.toLocaleString("en-US")
            : "—"}{" "}
          visitors per variant. Secondary metrics are shown for context: testing many metrics raises
          the odds that one is “significant” by chance.
        </p>
      </section>
    </>
  );
}
