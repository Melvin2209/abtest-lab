import { describe, expect, it } from "vitest";
import {
  chiSquarePValue,
  compareProportions,
  normalCdf,
  requiredSampleSize,
  sampleRatioMismatch,
  verdict,
} from "./stats";

// Reference values computed with Python:
//   statsmodels.stats.proportion.proportions_ztest([cB, cA], [nB, nA])
//   scipy.stats.norm / scipy.stats.chisquare

describe("normalCdf", () => {
  it.each([
    [0, 0.5],
    [1, 0.8413447460685429],
    [-2.5, 0.006209665325776132],
    [3.2, 0.9993128620620841],
  ])("Φ(%d) ≈ %d", (z, expected) => {
    expect(normalCdf(z)).toBeCloseTo(expected, 6);
  });
});

describe("compareProportions", () => {
  it.each([
    // [cA, nA, cB, nB, z, pValue, ciLow, ciHigh]
    [200, 2000, 250, 2000, 2.5019554168, 0.0123509477, 0.0054310086, 0.0445689914],
    [500, 10000, 520, 10000, 0.6428309874, 0.5203337738, -0.0040978508, 0.0080978508],
    [48, 1000, 30, 1000, -2.0790431827, 0.0376133816, -0.0349506859, -0.0010493141],
  ])("A=%i/%i vs B=%i/%i matches statsmodels", (cA, nA, cB, nB, z, p, lo, hi) => {
    const result = compareProportions(
      { conversions: cA, visitors: nA },
      { conversions: cB, visitors: nB },
    );
    expect(result.z).toBeCloseTo(z, 6);
    expect(result.pValue).toBeCloseTo(p, 6);
    expect(result.ci[0]).toBeCloseTo(lo, 8);
    expect(result.ci[1]).toBeCloseTo(hi, 8);
  });

  it("computes rates and relative uplift", () => {
    const result = compareProportions(
      { conversions: 200, visitors: 2000 },
      { conversions: 250, visitors: 2000 },
    );
    expect(result.rateA).toBe(0.1);
    expect(result.rateB).toBe(0.125);
    expect(result.absoluteDiff).toBeCloseTo(0.025, 10);
    expect(result.relativeUplift).toBeCloseTo(0.25, 10);
  });

  it("handles empty groups without dividing by zero", () => {
    const result = compareProportions(
      { conversions: 0, visitors: 0 },
      { conversions: 0, visitors: 0 },
    );
    expect(result.pValue).toBe(1);
    expect(result.ci).toEqual([0, 0]);
    expect(result.relativeUplift).toBeNull();
  });

  it("gives a p-value of ~1 when both groups are identical", () => {
    const group = { conversions: 100, visitors: 1000 };
    expect(compareProportions(group, group).pValue).toBeCloseTo(1, 6);
  });
});

describe("sampleRatioMismatch", () => {
  it("matches scipy.stats.chisquare", () => {
    expect(sampleRatioMismatch([5100, 4900], [50, 50]).pValue).toBeCloseTo(0.0455002639, 6);
    expect(sampleRatioMismatch([5300, 4700], [50, 50]).chiSquare).toBe(36);
  });

  it("flags a broken split but not normal noise", () => {
    expect(sampleRatioMismatch([5300, 4700], [50, 50]).mismatch).toBe(true);
    expect(sampleRatioMismatch([5100, 4900], [50, 50]).mismatch).toBe(false);
    expect(sampleRatioMismatch([9000, 1000], [90, 10]).mismatch).toBe(false);
  });
});

describe("chiSquarePValue", () => {
  it("approximates df > 1 closely (scipy: χ²=2, df=2 -> 0.3679)", () => {
    expect(Math.abs(chiSquarePValue(2, 2) - 0.36787944117)).toBeLessThan(0.01);
  });
});

describe("requiredSampleSize", () => {
  it("matches the textbook formula (baseline 10%, +10% relative)", () => {
    expect(requiredSampleSize(0.1, 0.1)).toBe(14749); // ceil(14748.05)
  });

  it("needs more traffic for smaller effects", () => {
    expect(requiredSampleSize(0.1, 0.05)).toBeGreaterThan(requiredSampleSize(0.1, 0.1));
  });
});

describe("verdict", () => {
  const big = { visitors: 5000, conversions: 500 };
  const options = { minVisitorsPerVariant: 1000 };

  it("waits for the minimum sample size", () => {
    const a = { visitors: 100, conversions: 10 };
    const b = { visitors: 100, conversions: 30 };
    expect(verdict(compareProportions(a, b), { a, b }, options).status).toBe("not_enough_data");
  });

  it("declares a winner or a loser when p < 0.05", () => {
    const better = { visitors: 5000, conversions: 600 };
    const worse = { visitors: 5000, conversions: 400 };
    expect(verdict(compareProportions(big, better), { a: big, b: better }, options).status).toBe(
      "winner",
    );
    expect(verdict(compareProportions(big, worse), { a: big, b: worse }, options).status).toBe(
      "loser",
    );
  });

  it("stays inconclusive when the gap could be noise", () => {
    const close = { visitors: 5000, conversions: 510 };
    expect(verdict(compareProportions(big, close), { a: big, b: close }, options).status).toBe(
      "inconclusive",
    );
  });

  it("reports an SRM before anything else", () => {
    const better = { visitors: 5000, conversions: 600 };
    const result = compareProportions(big, better);
    expect(verdict(result, { a: big, b: better }, { ...options, srm: true }).status).toBe("srm");
  });
});
