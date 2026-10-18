/**
 * Fills the database with realistic simulated traffic for the dashboard.
 *
 *   npm run simulate                       # 20,000 visitors over 14 days, seed 2
 *   npm run simulate -- --visitors 30000 --days 21 --seed 7
 *
 * Each visitor goes through the same server code as real traffic: variants come from
 * assignUser() and events are stored with recordEvents(), so assignment, dedup and the
 * analysis are exercised end to end. --reset (on by default in the npm script) deletes
 * existing exposures and events first.
 */
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";
import { recordEvents } from "../src/lib/events";
import { assignUser } from "../src/lib/experiments";
import { mulberry32, simulateVisitor } from "./simulation";

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const { values } = parseArgs({
    options: {
      visitors: { type: "string", default: "20000" },
      days: { type: "string", default: "14" },
      seed: { type: "string", default: "2" },
      reset: { type: "boolean", default: false },
    },
  });
  const visitors = Number(values.visitors);
  const days = Number(values.days);
  const seed = Number(values.seed);
  const rng = mulberry32(seed);

  // SQLite only: skip the disk sync after each write. Fine for throwaway demo data,
  // and about 10x faster for this bulk insert.
  if (!process.env.DATABASE_URL?.startsWith("postgres")) {
    await db.$queryRawUnsafe("PRAGMA synchronous = OFF");
  }

  if (values.reset) {
    await db.exposure.deleteMany();
    await db.event.deleteMany();
    console.log("Cleared existing exposures and events.");
  }

  const products = await db.product.findMany();
  if (products.length === 0) throw new Error("No products: run `npm run db:setup` first.");

  // The experiments "started" when the simulated traffic starts.
  const startMs = Date.now() - days * DAY;
  await db.experiment.updateMany({ data: { startedAt: new Date(startMs) } });

  // Visitors arrive uniformly over the period, in chronological order.
  const arrivals = Array.from(
    { length: visitors },
    () => startMs + rng() * (days * DAY - DAY / 2),
  ).sort((a, b) => a - b);

  const startedAt = Date.now();
  let eventCount = 0;
  for (const [i, arrival] of arrivals.entries()) {
    const userId = `sim-${seed}-${i}`;
    const [atcButton, upsellPopin] = await Promise.all([
      assignUser("atc-button", userId),
      assignUser("upsell-popin", userId),
    ]);
    const events = simulateVisitor({
      rng,
      start: new Date(arrival),
      variants: {
        atcButton: atcButton?.variantKey ?? "control",
        upsellPopin: upsellPopin?.variantKey ?? "control",
      },
      products,
    });
    for (const { at, event } of events) await recordEvents(userId, [event], at);
    eventCount += events.length;

    if ((i + 1) % 2000 === 0) console.log(`  ${i + 1} / ${visitors} visitors...`);
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `Simulated ${visitors} visitors (${eventCount} events) over ${days} days in ${seconds}s.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
