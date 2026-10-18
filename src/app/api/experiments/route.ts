import { NextResponse } from "next/server";
import { getAllExperimentResults } from "@/lib/analysis";

export const dynamic = "force-dynamic";

/** GET /api/experiments — every experiment with its aggregated results. */
export async function GET() {
  const results = await getAllExperimentResults();
  return NextResponse.json(
    results.map(({ experiment, analysis }) => ({
      key: experiment.key,
      name: experiment.name,
      status: experiment.status,
      primaryMetric: experiment.primaryMetric,
      totalVisitors: analysis.totalVisitors,
      verdicts: analysis.verdicts,
    })),
  );
}
