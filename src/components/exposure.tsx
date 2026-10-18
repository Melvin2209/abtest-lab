"use client";

import { useEffect } from "react";
import type { Assignment } from "@/lib/experiments";
import { track } from "@/lib/tracker";

/**
 * Logs an exposure when rendered: put it where the tested element is actually visible.
 * The server keeps only the first exposure per user, so re-renders are harmless.
 */
export function Exposure({ assignment }: { assignment: Assignment | null }) {
  const experimentKey = assignment?.experimentKey;
  useEffect(() => {
    if (experimentKey) track({ type: "exposure", experimentKey });
  }, [experimentKey]);
  return null;
}
