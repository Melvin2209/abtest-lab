import Link from "next/link";
import { VerdictBadge } from "@/components/dashboard/verdict-badge";
import { METRICS, type MetricKey, getAllExperimentResults } from "@/lib/analysis";
import { formatUplift } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const results = await getAllExperimentResults();

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Experiments</h1>
      <p className="mt-1 text-zinc-500">
        Conversion per variant, uplift, 95% confidence interval and p-value (two-proportion z-test).
      </p>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {results.map(({ experiment, analysis }) => {
          const primary = experiment.primaryMetric as MetricKey;
          const comparison = analysis.comparisons.find(
            (c) => c.metric === primary && c.variantKey === "B",
          );
          const verdict = analysis.verdicts.B;
          return (
            <li key={experiment.key}>
              <Link
                href={`/dashboard/${experiment.key}`}
                className="block rounded-xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-400"
                data-testid="experiment-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-zinc-400">{experiment.key}</p>
                    <h2 className="mt-1 text-lg font-semibold">{experiment.name}</h2>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                    {experiment.status}
                  </span>
                </div>
                <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-zinc-500">Visitors</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums">
                      {analysis.totalVisitors.toLocaleString("en-US")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Primary metric</dt>
                    <dd className="mt-1 font-medium">{METRICS[primary].label}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Uplift (B)</dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums">
                      {formatUplift(comparison?.result.relativeUplift ?? null)}
                    </dd>
                  </div>
                </dl>
                {verdict && (
                  <div className="mt-6">
                    <VerdictBadge verdict={verdict} />
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {results.length === 0 && (
        <p className="mt-8 text-zinc-500">
          No experiments yet. Run <code>npm run db:setup</code> to create the demo experiments.
        </p>
      )}
    </>
  );
}
