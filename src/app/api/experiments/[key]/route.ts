import { NextResponse } from "next/server";
import { getExperimentResults } from "@/lib/analysis";

export const dynamic = "force-dynamic";

/** GET /api/experiments/:key — full results of one experiment (variants, stats, daily series). */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const data = await getExperimentResults(key);
  if (!data) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });

  const { experiment, analysis, series } = data;
  return NextResponse.json({
    experiment: {
      key: experiment.key,
      name: experiment.name,
      hypothesis: experiment.hypothesis,
      status: experiment.status,
      primaryMetric: experiment.primaryMetric,
      minSamplePerVariant: experiment.minSamplePerVariant,
      startedAt: experiment.startedAt,
    },
    ...analysis,
    series,
  });
}
