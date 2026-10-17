import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { USER_COOKIE } from "@/lib/user";
import { proxy } from "./proxy";

describe("proxy", () => {
  it("sets an anonymous ID cookie on a first visit", () => {
    const response = proxy(new NextRequest("http://localhost/"));
    const cookie = response.cookies.get(USER_COOKIE);
    expect(cookie?.value).toMatch(/^[0-9a-f-]{36}$/);
    expect(cookie?.httpOnly).toBe(true);
  });

  it("forwards the new ID to the current render through the request headers", () => {
    const response = proxy(new NextRequest("http://localhost/"));
    const userId = response.cookies.get(USER_COOKIE)?.value;
    // Next.js passes overridden request headers along with this internal header.
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      `${USER_COOKIE}=${userId}`,
    );
  });

  it("keeps an existing ID untouched", () => {
    const request = new NextRequest("http://localhost/", {
      headers: { cookie: `${USER_COOKIE}=existing-id` },
    });
    const response = proxy(request);
    expect(response.cookies.get(USER_COOKIE)).toBeUndefined();
  });
});
