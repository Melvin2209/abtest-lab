import type { BrowserContext } from "@playwright/test";
import { bucketFor } from "../src/lib/assignment";

const USER_COOKIE = "abl_uid";

/**
 * Finds a visitor ID that lands in the wanted variant of both demo experiments
 * (50/50 splits: control = buckets 0-4999, B = 5000-9999), so a test can
 * check one specific experience deterministically.
 */
export function userIdFor(variant: "control" | "B", prefix = "e2e"): string {
  const inVariant = (bucket: number) => (variant === "control" ? bucket < 5000 : bucket >= 5000);
  for (let i = 0; ; i++) {
    const userId = `${prefix}-${variant}-${i}`;
    if (
      inVariant(bucketFor("atc-button", userId)) &&
      inVariant(bucketFor("upsell-popin", userId))
    ) {
      return userId;
    }
  }
}

export async function setVisitor(context: BrowserContext, userId: string, baseURL: string) {
  await context.addCookies([{ name: USER_COOKIE, value: userId, url: baseURL }]);
}
