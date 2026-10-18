import { NextResponse, type NextRequest } from "next/server";
import { eventBatchSchema, recordEvents } from "@/lib/events";
import { USER_COOKIE } from "@/lib/user";

/**
 * Collects tracking events sent by the browser (see src/lib/tracker.ts).
 * Body: { events: TrackedEvent[] } — validated with zod.
 */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get(USER_COOKIE)?.value;
  if (!userId) {
    return NextResponse.json({ error: "Missing visitor cookie" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = eventBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid events", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  await recordEvents(userId, parsed.data.events);
  return new NextResponse(null, { status: 204 });
}
