import { assignVariant } from "./assignment";
import { db } from "./db";
import { getUserId } from "./user";

/** What a page needs to render an experiment: which test, which variant. */
export type Assignment = { experimentKey: string; variantKey: string };

/**
 * Stable variant order: "control" first, then the others alphabetically.
 * The bucket -> variant mapping must never depend on the order rows come back from the DB,
 * otherwise users could switch variants between two requests.
 */
export function byVariantOrder(a: { key: string }, b: { key: string }): number {
  if (a.key === b.key) return 0;
  if (a.key === "control") return -1;
  if (b.key === "control") return 1;
  return a.key < b.key ? -1 : 1;
}

export function getExperiment(key: string) {
  return db.experiment.findUnique({ where: { key }, include: { variants: true } });
}

/**
 * Variant of a running experiment for a given user, or null if the experiment
 * is missing or not running (the page then renders its default experience).
 */
export async function assignUser(
  experimentKey: string,
  userId: string,
): Promise<Assignment | null> {
  const experiment = await getExperiment(experimentKey);
  if (!experiment || experiment.status !== "running" || experiment.variants.length === 0) {
    return null;
  }
  const variants = [...experiment.variants].sort(byVariantOrder);
  return { experimentKey, variantKey: assignVariant(experimentKey, userId, variants).key };
}

/** Same as assignUser, for the visitor of the current request (Server Components). */
export async function getAssignment(experimentKey: string): Promise<Assignment | null> {
  const userId = await getUserId();
  return userId ? assignUser(experimentKey, userId) : null;
}
