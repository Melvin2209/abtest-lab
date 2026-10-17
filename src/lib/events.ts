import { z } from "zod";
import { db } from "./db";
import { assignUser } from "./experiments";

/**
 * Events accepted by POST /api/events.
 *
 * Note what is *not* in the payload: the user ID (read from the httpOnly cookie)
 * and the variant (recomputed on the server from the user ID). A client cannot
 * pretend to be someone else or log an exposure to a variant it was not assigned.
 */
const key = z.string().min(1).max(64);
const cents = z.number().int().nonnegative().max(10_000_000);

export const trackedEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("exposure"), experimentKey: key }),
  z.object({ type: z.literal("click"), target: key, productId: key.optional() }),
  z.object({ type: z.literal("add_to_cart"), productId: key, valueCents: cents }),
  z.object({ type: z.literal("purchase"), valueCents: cents }),
]);

export const eventBatchSchema = z.object({
  events: z.array(trackedEventSchema).min(1).max(50),
});

export type TrackedEvent = z.infer<typeof trackedEventSchema>;

/**
 * Stores a batch of events for one user.
 * `at` lets the traffic simulator write events in the past; the API always uses "now".
 */
export async function recordEvents(userId: string, events: TrackedEvent[], at = new Date()) {
  for (const event of events) {
    if (event.type === "exposure") {
      const assignment = await assignUser(event.experimentKey, userId);
      if (!assignment) continue; // unknown or stopped experiment: ignore silently

      // Upsert on (experimentKey, userId) with an empty update: the *first* exposure
      // is kept, later ones (page reloads, revisits) are no-ops. This is the dedup.
      await db.exposure.upsert({
        where: { experimentKey_userId: { experimentKey: assignment.experimentKey, userId } },
        create: { ...assignment, userId, exposedAt: at },
        update: {},
      });
    } else {
      await db.event.create({
        data: {
          userId,
          type: event.type,
          productId: "productId" in event ? event.productId : undefined,
          valueCents: "valueCents" in event ? event.valueCents : undefined,
          target: "target" in event ? event.target : undefined,
          createdAt: at,
        },
      });
    }
  }
}
