import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../../test/db";
import {
  type ExposureRow,
  analyze,
  cumulativeSeries,
  loadExposureRows,
  summarize,
} from "./analysis";
import { db } from "./db";

const variants = [
  { key: "control", name: "Control", weight: 50 },
  { key: "B", name: "B", weight: 50 },
];

function row(
  variantKey: string,
  day: string,
  converted: Partial<ExposureRow["conversions"]> = {},
): ExposureRow {
  return {
    variantKey,
    exposedAt: new Date(`${day}T12:00:00Z`),
    conversions: { add_to_cart: false, purchase: false, upsell_add: false, ...converted },
    revenueCents: converted.purchase ? 1000 : 0,
  };
}

describe("summarize", () => {
  it("counts visitors, converters and revenue per variant", () => {
    const rows = [
      row("control", "2026-01-01", { purchase: true, add_to_cart: true }),
      row("control", "2026-01-01"),
      row("B", "2026-01-01", { add_to_cart: true }),
      row("removed-variant", "2026-01-01"),
    ];
    const [control, b] = summarize(rows, variants);
    expect(control).toMatchObject({ visitors: 2, revenueCents: 1000 });
    expect(control.conversions).toEqual({ add_to_cart: 1, purchase: 1, upsell_add: 0 });
    expect(b.visitors).toBe(1);
    expect(b.conversions.add_to_cart).toBe(1);
  });
});

describe("cumulativeSeries", () => {
  it("accumulates conversion rates day after day", () => {
    const rows = [
      row("B", "2026-01-02", { purchase: true }),
      row("control", "2026-01-01", { purchase: true }),
      row("control", "2026-01-01"),
      row("B", "2026-01-01"),
    ];
    const series = cumulativeSeries(rows, ["control", "B"], "purchase");
    expect(series.map((p) => p.day)).toEqual(["2026-01-01", "2026-01-02"]);
    expect(series[0].rates).toEqual({ control: 0.5, B: 0 });
    expect(series[1].rates).toEqual({ control: 0.5, B: 0.5 });
    expect(series[1].visitors).toEqual({ control: 2, B: 2 });
  });
});

describe("analyze", () => {
  it("compares B to control and gives a verdict on the primary metric", () => {
    // control: 10% purchase rate, B: 15%, 2,000 visitors each -> clearly significant.
    const rows: ExposureRow[] = [];
    for (let i = 0; i < 2000; i++) {
      rows.push(row("control", "2026-01-01", { purchase: i < 200 }));
      rows.push(row("B", "2026-01-01", { purchase: i < 300 }));
    }
    const analysis = analyze(
      { primaryMetric: "purchase", minSamplePerVariant: 1000, variants },
      rows,
    );

    expect(analysis.totalVisitors).toBe(4000);
    expect(analysis.srm.mismatch).toBe(false);
    expect(analysis.verdicts.B.status).toBe("winner");
    const purchase = analysis.comparisons.find((c) => c.metric === "purchase");
    expect(purchase?.result.relativeUplift).toBeCloseTo(0.5, 10);
    expect(analysis.comparisons).toHaveLength(3); // one per metric for the single challenger
  });

  it("does not conclude below the pre-registered sample size", () => {
    const rows = [row("control", "2026-01-01"), row("B", "2026-01-01", { purchase: true })];
    const analysis = analyze(
      { primaryMetric: "purchase", minSamplePerVariant: 1000, variants },
      rows,
    );
    expect(analysis.verdicts.B.status).toBe("not_enough_data");
  });
});

describe("loadExposureRows", () => {
  beforeEach(() => resetDatabase("exp"));

  it("only counts events that happened after the exposure", async () => {
    const exposedAt = new Date("2026-01-10T12:00:00Z");
    await db.exposure.create({
      data: { experimentKey: "exp", variantKey: "B", userId: "u1", exposedAt },
    });
    await db.event.createMany({
      data: [
        // before the exposure: must be ignored
        {
          userId: "u1",
          type: "purchase",
          valueCents: 500,
          createdAt: new Date("2026-01-09T00:00:00Z"),
        },
        // after the exposure: counted
        {
          userId: "u1",
          type: "add_to_cart",
          productId: "p",
          valueCents: 900,
          createdAt: new Date("2026-01-11T00:00:00Z"),
        },
        {
          userId: "u1",
          type: "click",
          target: "upsell_add",
          createdAt: new Date("2026-01-11T00:00:00Z"),
        },
        // another user: ignored
        {
          userId: "u2",
          type: "purchase",
          valueCents: 700,
          createdAt: new Date("2026-01-11T00:00:00Z"),
        },
      ],
    });

    const rows = await loadExposureRows("exp");
    expect(rows).toHaveLength(1);
    expect(rows[0].variantKey).toBe("B");
    expect(rows[0].exposedAt).toEqual(exposedAt);
    expect(rows[0].conversions).toEqual({ add_to_cart: true, purchase: false, upsell_add: true });
    expect(rows[0].revenueCents).toBe(0);
  });

  it("sums the revenue of purchases after the exposure", async () => {
    await db.exposure.create({
      data: {
        experimentKey: "exp",
        variantKey: "control",
        userId: "u1",
        exposedAt: new Date("2026-01-10T00:00:00Z"),
      },
    });
    await db.event.createMany({
      data: [
        {
          userId: "u1",
          type: "purchase",
          valueCents: 1000,
          createdAt: new Date("2026-01-11T00:00:00Z"),
        },
        {
          userId: "u1",
          type: "purchase",
          valueCents: 2500,
          createdAt: new Date("2026-01-12T00:00:00Z"),
        },
      ],
    });
    const [only] = await loadExposureRows("exp");
    expect(only.conversions.purchase).toBe(true);
    expect(only.revenueCents).toBe(3500);
  });
});
