import { db } from "../src/lib/db";
import { experiments, products } from "../src/data/catalog-data";

// Idempotent: safe to run several times. Existing data is updated, never duplicated.
async function main() {
  for (const product of products) {
    await db.product.upsert({ where: { id: product.id }, create: product, update: product });
  }

  for (const { variants, ...experiment } of experiments) {
    const saved = await db.experiment.upsert({
      where: { key: experiment.key },
      create: experiment,
      update: experiment,
    });
    for (const variant of variants) {
      await db.variant.upsert({
        where: { experimentId_key: { experimentId: saved.id, key: variant.key } },
        create: { ...variant, experimentId: saved.id },
        update: variant,
      });
    }
  }

  console.log(`Seeded ${products.length} products and ${experiments.length} experiments.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
