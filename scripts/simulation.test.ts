import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, mulberry32, simulateVisitor } from "./simulation";

const products = [
  { id: "p-main", priceCents: 10000, category: "Audio" },
  { id: "p-acc", priceCents: 1000, category: "Accessories" },
];
const start = new Date("2026-01-01T00:00:00Z");

function run(n: number, variants: { atcButton: string; upsellPopin: string }, seed = 1) {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => simulateVisitor({ rng, start, variants, products }));
}

const has = (events: ReturnType<typeof simulateVisitor>, type: string) =>
  events.some((e) => e.event.type === type);

describe("mulberry32", () => {
  it("is deterministic for a given seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("simulateVisitor", () => {
  it("always starts with the atc-button exposure, and events are chronological", () => {
    for (const events of run(500, { atcButton: "B", upsellPopin: "B" })) {
      expect(events[0].event).toEqual({ type: "exposure", experimentKey: "atc-button" });
      const times = events.map((e) => e.at.getTime());
      expect(times).toEqual([...times].sort((x, y) => x - y));
    }
  });

  it("only exposes users to the upsell test when they add to cart", () => {
    for (const events of run(2000, { atcButton: "control", upsellPopin: "control" })) {
      const exposedToUpsell = events.some(
        (e) => e.event.type === "exposure" && e.event.experimentKey === "upsell-popin",
      );
      expect(exposedToUpsell).toBe(has(events, "add_to_cart"));
    }
  });

  it("reproduces the configured add-to-cart rates", () => {
    const n = 40_000;
    const rate = (variant: string) =>
      run(n, { atcButton: variant, upsellPopin: "control" }).filter((e) => has(e, "add_to_cart"))
        .length / n;
    expect(rate("control")).toBeCloseTo(DEFAULT_MODEL.addToCart.control, 2);
    expect(rate("B")).toBeCloseTo(DEFAULT_MODEL.addToCart.B, 2);
  });

  it("purchases carry the value of the cart", () => {
    const purchases = run(5000, { atcButton: "B", upsellPopin: "B" })
      .flat()
      .filter((e) => e.event.type === "purchase");
    expect(purchases.length).toBeGreaterThan(0);
    for (const { event } of purchases) {
      expect([10000, 11000]).toContain((event as { valueCents: number }).valueCents);
    }
  });
});
