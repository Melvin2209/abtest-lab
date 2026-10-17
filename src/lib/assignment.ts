/**
 * Deterministic variant assignment.
 *
 * Idea: hash(experimentKey + userId) -> a bucket in [0, 10000) -> a variant.
 * - Stable: the same user always gets the same variant, with nothing stored.
 * - Independent across experiments: the experiment key is part of the hash,
 *   so being in "B" for one test says nothing about another test.
 * - Configurable split: buckets are mapped onto the cumulative variant weights.
 */

export type WeightedVariant = { key: string; weight: number };

/** Granularity of the split: 10,000 buckets allows weights down to 0.01%. */
export const BUCKET_COUNT = 10_000;

/**
 * FNV-1a 32-bit hash. Tiny, fast and well distributed for short strings,
 * which is all we need (this is not a cryptographic hash).
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Multiply by the FNV prime (16777619) with 32-bit overflow semantics.
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // force an unsigned 32-bit integer
}

/** Bucket in [0, BUCKET_COUNT) for a user in a given experiment. */
export function bucketFor(experimentKey: string, userId: string): number {
  // 2^32 is not a multiple of 10,000, so the modulo has a bias of ~0.0002%: negligible here.
  return fnv1a32(`${experimentKey}:${userId}`) % BUCKET_COUNT;
}

/**
 * Maps a bucket onto the variants' cumulative weights.
 * Example with weights 50/50: buckets 0-4999 -> first variant, 5000-9999 -> second.
 * Weights are relative (90/10 and 9/1 are the same split).
 */
export function pickVariant<V extends WeightedVariant>(variants: V[], bucket: number): V {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (variants.length === 0 || totalWeight <= 0) {
    throw new Error("An experiment needs at least one variant with a positive weight");
  }

  // Position of the bucket in [0, totalWeight).
  const point = (bucket / BUCKET_COUNT) * totalWeight;
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (point < cumulative) return variant;
  }
  return variants[variants.length - 1]; // unreachable, kept for floating-point safety
}

export function assignVariant<V extends WeightedVariant>(
  experimentKey: string,
  userId: string,
  variants: V[],
): V {
  return pickVariant(variants, bucketFor(experimentKey, userId));
}
