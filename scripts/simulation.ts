import type { TrackedEvent } from "../src/lib/events";

/**
 * Behaviour model of a simulated visitor.
 *
 * The "true" effects of each variant are set here, so the dashboard can be checked
 * against a known answer: with enough traffic it should find the effects that exist
 * (atc-button, accessory adds) and stay inconclusive where there are none (purchase).
 */
export type Model = {
  /** P(add to cart | product page view), per "atc-button" variant. */
  addToCart: Record<string, number>;
  /** P(purchase | added to cart), per "upsell-popin" variant. */
  purchaseGivenCart: Record<string, number>;
  /** P(accepting the accessory offered by the pop-in), "upsell-popin" B only. */
  popinAccept: number;
  /** P(adding an accessory on one's own, without any pop-in). */
  organicAccessory: number;
};

export const DEFAULT_MODEL: Model = {
  addToCart: { control: 0.12, B: 0.138 }, // +15% relative: a real, detectable effect
  purchaseGivenCart: { control: 0.4, B: 0.395 }, // practically no effect
  popinAccept: 0.16,
  organicAccessory: 0.03,
};

export type CatalogItem = { id: string; priceCents: number; category: string };

export type TimedEvent = { at: Date; event: TrackedEvent };

/** Mulberry32: a tiny seeded PRNG, so a given --seed always produces the same traffic. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SECOND = 1000;

/**
 * Events produced by one visitor, mirroring what the real store sends:
 * product page view (atc-button exposure) -> maybe add to cart (upsell-popin exposure)
 * -> maybe accessory -> maybe purchase.
 */
export function simulateVisitor(input: {
  rng: () => number;
  start: Date;
  variants: { atcButton: string; upsellPopin: string };
  products: CatalogItem[];
  model?: Model;
}): TimedEvent[] {
  const { rng, start, variants, products, model = DEFAULT_MODEL } = input;
  const mainProducts = products.filter((p) => p.category !== "Accessories");
  const accessories = products.filter((p) => p.category === "Accessories");
  const pick = <T>(items: T[]) => items[Math.floor(rng() * items.length)];

  let t = start.getTime();
  const at = (delayMs: number) => new Date((t += delayMs));
  const events: TimedEvent[] = [
    { at: at(0), event: { type: "exposure", experimentKey: "atc-button" } },
  ];

  if (rng() >= (model.addToCart[variants.atcButton] ?? 0)) return events; // bounced

  const product = pick(mainProducts);
  let cartCents = product.priceCents;
  const addedAt = at(20 * SECOND + rng() * 100 * SECOND);
  events.push(
    {
      at: addedAt,
      event: { type: "add_to_cart", productId: product.id, valueCents: product.priceCents },
    },
    // Triggered exposure, exactly like the real store: logged at add to cart, in both groups.
    { at: addedAt, event: { type: "exposure", experimentKey: "upsell-popin" } },
  );

  const accessory = pick(accessories);
  const addAccessory = (delayMs: number) => {
    cartCents += accessory.priceCents;
    events.push({
      at: at(delayMs),
      event: { type: "add_to_cart", productId: accessory.id, valueCents: accessory.priceCents },
    });
  };

  if (variants.upsellPopin === "B") {
    if (rng() < model.popinAccept) {
      events.push({ at: at(4 * SECOND), event: { type: "click", target: "upsell_add" } });
      addAccessory(0);
    } else {
      events.push({ at: at(3 * SECOND), event: { type: "click", target: "upsell_dismiss" } });
    }
  } else if (rng() < model.organicAccessory) {
    addAccessory(60 * SECOND + rng() * 300 * SECOND);
  }

  if (rng() < (model.purchaseGivenCart[variants.upsellPopin] ?? 0)) {
    events.push({
      at: at(60 * SECOND + rng() * 600 * SECOND),
      event: { type: "purchase", valueCents: cartCents },
    });
  }
  return events;
}
