import { db } from "@/lib/db";

/** Empties all tables and inserts a running 50/50 experiment. */
export async function resetDatabase(experimentKey = "exp", primaryMetric = "purchase") {
  await db.exposure.deleteMany();
  await db.event.deleteMany();
  await db.variant.deleteMany();
  await db.experiment.deleteMany();
  await db.experiment.create({
    data: {
      key: experimentKey,
      name: "Test experiment",
      hypothesis: "Testing",
      primaryMetric,
      variants: {
        create: [
          { key: "control", name: "Control", weight: 50 },
          { key: "B", name: "B", weight: 50 },
        ],
      },
    },
  });
}
