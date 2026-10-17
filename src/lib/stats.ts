/**
 * Statistics for A/B tests on conversion rates.
 *
 * Everything here is plain math with no dependencies, so each step can be explained:
 *
 * - Each visitor either converts or not, so a conversion rate is a *proportion*.
 * - To compare control (A) and variant (B) we use the classic two-proportion z-test:
 *   "if A and B truly converted at the same rate, how surprising is the gap we observe?"
 *   That probability is the p-value. Small p-value -> the gap is unlikely to be noise.
 * - The confidence interval gives the range of plausible true differences (B - A).
 *
 * Results were checked against statsmodels / scipy (see stats.test.ts).
 */

/** Two-sided 95% critical value: P(-1.96 < Z < 1.96) = 0.95 for a standard normal Z. */
export const Z_95 = 1.959963984540054;

/** One-sided critical value for 80% power (used by the sample size formula). */
export const Z_POWER_80 = 0.8416212335729143;

export type Group = {
  /** Number of exposed visitors. */
  visitors: number;
  /** Number of those visitors who converted. */
  conversions: number;
};

/**
 * Cumulative distribution function of the standard normal distribution: P(Z <= z).
 *
 * There is no closed form, so we use the Abramowitz & Stegun 7.1.26 approximation
 * of the error function (max error 1.5e-7, far below anything we display).
 */
export function normalCdf(z: number): number {
  // Φ(z) = (1 + erf(z / √2)) / 2
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

export function conversionRate({ visitors, conversions }: Group): number {
  return visitors === 0 ? 0 : conversions / visitors;
}

export type ComparisonResult = {
  rateA: number;
  rateB: number;
  /** Absolute difference in conversion rate, B - A (e.g. 0.012 = +1.2 points). */
  absoluteDiff: number;
  /** Relative uplift, (B - A) / A (e.g. 0.10 = +10%). Null when A has no conversions. */
  relativeUplift: number | null;
  /** 95% confidence interval of the absolute difference. */
  ci: [number, number];
  /** 95% CI of the relative uplift (approximation: the absolute CI divided by rate A). */
  relativeCi: [number, number] | null;
  z: number;
  /** Two-sided p-value. */
  pValue: number;
};

/**
 * Two-proportion z-test of B against A (two-sided).
 */
export function compareProportions(a: Group, b: Group): ComparisonResult {
  const rateA = conversionRate(a);
  const rateB = conversionRate(b);
  const absoluteDiff = rateB - rateA;

  // Nothing to compare until both groups have visitors (avoids 0 / 0 = NaN below).
  if (a.visitors === 0 || b.visitors === 0) {
    const relativeUplift = rateA > 0 ? absoluteDiff / rateA : null;
    return {
      rateA,
      rateB,
      absoluteDiff,
      relativeUplift,
      ci: [0, 0],
      relativeCi: null,
      z: 0,
      pValue: 1,
    };
  }

  // 1) Test statistic. Under the null hypothesis "A and B convert at the same rate",
  //    the best estimate of that common rate is the *pooled* rate (all conversions /
  //    all visitors). The standard error of the difference is computed from it.
  const pooled = (a.conversions + b.conversions) / (a.visitors + b.visitors);
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / a.visitors + 1 / b.visitors));
  // z = how many standard errors the observed gap is away from 0.
  const z = sePooled > 0 ? absoluteDiff / sePooled : 0;

  // 2) p-value: probability of a gap at least this large, in either direction,
  //    if there were no real difference. Two-sided -> both tails of the normal curve.
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));

  // 3) Confidence interval. Here we do *not* assume A = B, so each group keeps its
  //    own variance (unpooled standard error): diff ± 1.96 × SE.
  const seUnpooled = Math.sqrt(
    (rateA * (1 - rateA)) / a.visitors + (rateB * (1 - rateB)) / b.visitors,
  );
  const ci: [number, number] = [absoluteDiff - Z_95 * seUnpooled, absoluteDiff + Z_95 * seUnpooled];

  // Relative numbers are what product teams talk about ("+8% conversions").
  // The relative CI below ignores the uncertainty on rate A itself: a common, slightly
  // optimistic shortcut, good enough for a dashboard (the verdict uses the p-value).
  const relativeUplift = rateA > 0 ? absoluteDiff / rateA : null;
  const relativeCi: [number, number] | null = rateA > 0 ? [ci[0] / rateA, ci[1] / rateA] : null;

  return { rateA, rateB, absoluteDiff, relativeUplift, ci, relativeCi, z, pValue };
}

/**
 * Sample Ratio Mismatch (SRM) check: chi-square goodness-of-fit test comparing the
 * observed number of visitors per variant to the configured split.
 *
 * A 50/50 test that ends up 53/47 on 10,000 visitors is almost certainly broken
 * (bug in assignment, tracking lost in one variant, bots...). Its results should not
 * be trusted, whatever the p-value says. A very low threshold (0.001) is the usual choice.
 */
export function sampleRatioMismatch(observed: number[], weights: number[]) {
  const total = observed.reduce((sum, n) => sum + n, 0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // χ² = Σ (observed - expected)² / expected
  let chiSquare = 0;
  observed.forEach((count, i) => {
    const expected = (total * weights[i]) / totalWeight;
    if (expected > 0) chiSquare += (count - expected) ** 2 / expected;
  });

  const pValue = chiSquarePValue(chiSquare, observed.length - 1);
  return { chiSquare, pValue, mismatch: total > 0 && pValue < 0.001 };
}

/**
 * Upper tail P(X >= x) of a chi-square distribution with `df` degrees of freedom.
 * - df = 1 (A/B test): exact, since a χ²(1) variable is the square of a standard normal.
 * - df > 1 (A/B/n): Wilson–Hilferty approximation, which maps χ² to a normal variable.
 *   It is accurate to about 0.01, which is plenty to detect an SRM.
 */
export function chiSquarePValue(x: number, df: number): number {
  if (df <= 0 || x <= 0) return 1;
  if (df === 1) return 2 * (1 - normalCdf(Math.sqrt(x)));
  const z = (Math.cbrt(x / df) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normalCdf(z);
}

/**
 * Visitors needed *per variant* to detect a given relative uplift with
 * 95% confidence (alpha = 0.05, two-sided) and 80% power.
 *
 * n = (z_alpha/2 + z_beta)² × (pA(1-pA) + pB(1-pB)) / (pB - pA)²
 *
 * Example: baseline 10%, minimum detectable effect +10% (10% -> 11%) -> ~14,750 per variant.
 * This is why small effects need a lot of traffic, and why stopping early is tempting.
 */
export function requiredSampleSize(baselineRate: number, minDetectableUplift: number): number {
  const pA = baselineRate;
  const pB = baselineRate * (1 + minDetectableUplift);
  if (pA <= 0 || pA >= 1 || pB <= 0 || pB >= 1 || pA === pB) return Infinity;
  const variance = pA * (1 - pA) + pB * (1 - pB);
  return Math.ceil(((Z_95 + Z_POWER_80) ** 2 * variance) / (pB - pA) ** 2);
}

export type Verdict =
  | { status: "not_enough_data"; label: string }
  | { status: "srm"; label: string }
  | { status: "winner" | "loser"; label: string }
  | { status: "inconclusive"; label: string };

/**
 * Turns the numbers into a decision a product manager can read.
 *
 * Order matters:
 * 1. SRM first: if the split is broken, nothing else can be trusted.
 * 2. Minimum sample: with a handful of visitors, p-values swing wildly. Refusing to
 *    conclude before a fixed sample size limits the "peeking" problem (checking every
 *    day and stopping as soon as p < 0.05 inflates false positives).
 * 3. Then the p-value against alpha = 0.05.
 */
export function verdict(
  result: ComparisonResult,
  groups: { a: Group; b: Group },
  options: { minVisitorsPerVariant: number; srm?: boolean; alpha?: number },
): Verdict {
  const alpha = options.alpha ?? 0.05;

  if (options.srm) {
    return { status: "srm", label: "Sample ratio mismatch: check the setup" };
  }
  if (Math.min(groups.a.visitors, groups.b.visitors) < options.minVisitorsPerVariant) {
    return { status: "not_enough_data", label: "Not enough data yet" };
  }
  if (result.pValue < alpha) {
    return result.absoluteDiff > 0
      ? { status: "winner", label: "Significant: B wins" }
      : { status: "loser", label: "Significant: B loses" };
  }
  return { status: "inconclusive", label: "Not significant (yet)" };
}
