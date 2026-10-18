import { type ExperimentAnalysis, METRICS, type MetricKey } from "@/lib/analysis";
import { formatPercent, formatPoints, formatPValue, formatUplift } from "@/lib/utils";
import { seriesColor } from "./colors";

/** Table view of every number behind the charts (also the accessible fallback). */
export function ResultsTable({
  analysis,
  primaryMetric,
}: {
  analysis: ExperimentAnalysis;
  primaryMetric: MetricKey;
}) {
  const { metrics } = analysis; // primary metric first, then the secondary ones

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-sm" data-testid="results-table">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Metric</th>
            <th className="px-4 py-3 font-medium">Variant</th>
            <th className="px-4 py-3 text-right font-medium">Visitors</th>
            <th className="px-4 py-3 text-right font-medium">Converted</th>
            <th className="px-4 py-3 text-right font-medium">Rate</th>
            <th className="px-4 py-3 text-right font-medium">Uplift</th>
            <th className="px-4 py-3 text-right font-medium">95% CI (difference)</th>
            <th className="px-4 py-3 text-right font-medium">p-value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {metrics.map((metric) =>
            analysis.variants.map((variant, i) => {
              const comparison = analysis.comparisons.find(
                (c) => c.metric === metric && c.variantKey === variant.key,
              );
              const rate = variant.visitors ? variant.conversions[metric] / variant.visitors : 0;
              return (
                <tr key={`${metric}-${variant.key}`} className={i === 0 ? "border-t-zinc-200" : ""}>
                  <td className="px-4 py-2.5 font-medium">
                    {i === 0 && (
                      <>
                        {METRICS[metric].label}
                        {metric === primaryMetric && (
                          <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700">
                            primary
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: seriesColor(i) }}
                      />
                      {variant.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {variant.visitors.toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {variant.conversions[metric].toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatPercent(rate)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {comparison ? formatUplift(comparison.result.relativeUplift) : "baseline"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {comparison
                      ? `[${formatPoints(comparison.result.ci[0])}, ${formatPoints(comparison.result.ci[1])}]`
                      : ""}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {comparison ? formatPValue(comparison.result.pValue) : ""}
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}
