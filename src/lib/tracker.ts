import type { TrackedEvent } from "./events";

/**
 * Tiny client-side tracker.
 *
 * Events are queued and sent in batches (one request instead of one per event).
 * The queue is flushed after a short delay, and when the page is hidden or closed,
 * using navigator.sendBeacon which keeps working while the page unloads.
 */
const ENDPOINT = "/api/events";
const FLUSH_DELAY_MS = 1000;

let queue: TrackedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

export function track(event: TrackedEvent, options: { immediate?: boolean } = {}) {
  queue.push(event);
  listenForPageHide();
  if (options.immediate) flush();
  else timer ??= setTimeout(flush, FLUSH_DELAY_MS);
}

export function flush() {
  clearTimeout(timer);
  timer = undefined;
  if (queue.length === 0) return;

  const body = JSON.stringify({ events: queue });
  queue = [];

  const blob = new Blob([body], { type: "application/json" });
  const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(ENDPOINT, blob);
  if (!sent) {
    // Fallback (beacon unsupported or rejected): keepalive lets the request outlive the page.
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "content-type": "application/json" },
    });
  }
}

function listenForPageHide() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
