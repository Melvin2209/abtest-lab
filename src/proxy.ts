import { NextResponse, type NextRequest } from "next/server";
import { USER_COOKIE, USER_COOKIE_MAX_AGE } from "@/lib/user";

/**
 * Gives every visitor a stable anonymous ID before the page renders.
 *
 * The cookie is written on the *request* as well as the response: on a first
 * visit the browser has no cookie yet, and this lets Server Components assign
 * a variant during that very first render (no flicker, no extra round trip).
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(USER_COOKIE)) return NextResponse.next();

  const userId = crypto.randomUUID();
  request.cookies.set(USER_COOKIE, userId);

  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: USER_COOKIE_MAX_AGE,
  });
  return response;
}

export const config = {
  // Pages only: skip API routes, Next.js internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-z]+$).*)"],
};
