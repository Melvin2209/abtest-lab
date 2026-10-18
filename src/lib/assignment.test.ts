import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BUCKET_COUNT, assignVariant, bucketFor, fnv1a32, pickVariant } from "./assignment";

const fiftyFifty = [
  { key: "control", weight: 50 },
  { key: "B", weight: 50 },
];

/** Counts how many of `n` random users land in each variant. */
function distribution(variants: { key: string; weight: number }[], n: number, experiment = "exp") {
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const { key } = assignVariant(experiment, randomUUID(), variants);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

describe("fnv1a32", () => {
  it("matches the reference FNV-1a test vectors", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
    expect(fnv1a32("a")).toBe(0xe40c292c);
    expect(fnv1a32("foobar")).toBe(0xbf9cf968);
  });
});

describe("bucketFor", () => {
  it("is stable for the same user and experiment", () => {
    const userId = randomUUID();
    expect(bucketFor("exp", userId)).toBe(bucketFor("exp", userId));
  });

  it("always returns a bucket in range", () => {
    for (let i = 0; i < 1000; i++) {
      const bucket = bucketFor("exp", randomUUID());
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(BUCKET_COUNT);
    }
  });
});

describe("pickVariant", () => {
  it("maps buckets onto cumulative weights", () => {
    expect(pickVariant(fiftyFifty, 0).key).toBe("control");
    expect(pickVariant(fiftyFifty, 4999).key).toBe("control");
    expect(pickVariant(fiftyFifty, 5000).key).toBe("B");
    expect(pickVariant(fiftyFifty, 9999).key).toBe("B");
  });

  it("supports uneven and relative weights", () => {
    const ninetyTen = [
      { key: "control", weight: 9 },
      { key: "B", weight: 1 },
    ];
    expect(pickVariant(ninetyTen, 8999).key).toBe("control");
    expect(pickVariant(ninetyTen, 9000).key).toBe("B");
  });

  it("never picks a variant with a zero weight", () => {
    const variants = [
      { key: "control", weight: 100 },
      { key: "B", weight: 0 },
    ];
    for (let bucket = 0; bucket < BUCKET_COUNT; bucket += 37) {
      expect(pickVariant(variants, bucket).key).toBe("control");
    }
  });

  it("rejects invalid configurations", () => {
    expect(() => pickVariant([], 0)).toThrow();
    expect(() => pickVariant([{ key: "control", weight: 0 }], 0)).toThrow();
  });
});

describe("assignVariant", () => {
  it("returns the same variant for the same user (stability)", () => {
    const userId = randomUUID();
    const first = assignVariant("exp", userId, fiftyFifty).key;
    for (let i = 0; i < 10; i++) {
      expect(assignVariant("exp", userId, fiftyFifty).key).toBe(first);
    }
  });

  it("splits traffic close to 50/50", () => {
    const n = 100_000;
    const counts = distribution(fiftyFifty, n);
    // With n = 100k the standard deviation of a share is ~0.16%, so ±1% is a safe margin.
    expect(counts.control / n).toBeGreaterThan(0.49);
    expect(counts.control / n).toBeLessThan(0.51);
  });

  it("splits traffic close to 90/10", () => {
    const n = 100_000;
    const counts = distribution(
      [
        { key: "control", weight: 90 },
        { key: "B", weight: 10 },
      ],
      n,
    );
    expect(counts.B / n).toBeGreaterThan(0.09);
    expect(counts.B / n).toBeLessThan(0.11);
  });

  it("assigns independently across experiments", () => {
    // If assignments were correlated, users in B for exp-1 would mostly be in B for exp-2.
    const n = 50_000;
    let inBForFirst = 0;
    let inBForBoth = 0;
    for (let i = 0; i < n; i++) {
      const userId = randomUUID();
      if (assignVariant("exp-1", userId, fiftyFifty).key === "B") {
        inBForFirst++;
        if (assignVariant("exp-2", userId, fiftyFifty).key === "B") inBForBoth++;
      }
    }
    const share = inBForBoth / inBForFirst;
    expect(share).toBeGreaterThan(0.48);
    expect(share).toBeLessThan(0.52);
  });
});
