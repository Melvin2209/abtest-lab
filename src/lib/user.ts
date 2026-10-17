import { cookies } from "next/headers";

/** Name of the cookie holding the anonymous visitor ID (set by src/proxy.ts). */
export const USER_COOKIE = "abl_uid";

/** One year, in seconds. */
export const USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Anonymous ID of the current visitor, read on the server. */
export async function getUserId(): Promise<string | undefined> {
  return (await cookies()).get(USER_COOKIE)?.value;
}
