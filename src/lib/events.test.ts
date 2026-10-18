import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../../test/db";
import { db } from "./db";
import { eventBatchSchema, recordEvents } from "./events";
import { assignUser } from "./experiments";

describe("eventBatchSchema", () => {
  it("accepts a valid batch", () => {
    const result = eventBatchSchema.safeParse({
      events: [
        { type: "exposure", experimentKey: "exp" },
        { type: "add_to_cart", productId: "p-1", valueCents: 1290 },
        { type: "click", target: "upsell_add" },
        { type: "purchase", valueCents: 1290 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ["an unknown event type", { events: [{ type: "scroll" }] }],
    ["a missing field", { events: [{ type: "add_to_cart", valueCents: 100 }] }],
    ["a negative amount", { events: [{ type: "purchase", valueCents: -5 }] }],
    ["a decimal amount", { events: [{ type: "purchase", valueCents: 9.99 }] }],
    ["an empty batch", { events: [] }],
    ["a batch that is too large", { events: Array(51).fill({ type: "purchase", valueCents: 1 }) }],
  ])("rejects %s", (_label, body) => {
    expect(eventBatchSchema.safeParse(body).success).toBe(false);
  });
});

describe("recordEvents", () => {
  beforeEach(() => resetDatabase("exp"));

  it("stores the server-assigned variant for an exposure", async () => {
    await recordEvents("user-1", [{ type: "exposure", experimentKey: "exp" }]);
    const exposure = await db.exposure.findFirstOrThrow();
    const expected = await assignUser("exp", "user-1");
    expect(exposure.variantKey).toBe(expected?.variantKey);
  });

  it("keeps only the first exposure of a user", async () => {
    const first = new Date("2026-01-01T10:00:00Z");
    await recordEvents("user-1", [{ type: "exposure", experimentKey: "exp" }], first);
    await recordEvents("user-1", [{ type: "exposure", experimentKey: "exp" }]);
    const exposures = await db.exposure.findMany();
    expect(exposures).toHaveLength(1);
    expect(exposures[0].exposedAt).toEqual(first);
  });

  it("ignores exposures to unknown experiments", async () => {
    await recordEvents("user-1", [{ type: "exposure", experimentKey: "nope" }]);
    expect(await db.exposure.count()).toBe(0);
  });

  it("stores behavioural events", async () => {
    await recordEvents("user-1", [
      { type: "add_to_cart", productId: "p-1", valueCents: 1290 },
      { type: "purchase", valueCents: 1290 },
    ]);
    const events = await db.event.findMany({ orderBy: { type: "asc" } });
    expect(events.map((e) => e.type)).toEqual(["add_to_cart", "purchase"]);
    expect(events[0]).toMatchObject({ userId: "user-1", productId: "p-1", valueCents: 1290 });
  });
});
