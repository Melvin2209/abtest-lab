"use client";

import { useState } from "react";
import type { DailyPoint } from "@/lib/analysis";
import { formatPercent } from "@/lib/utils";
import { CHART, seriesColor } from "./colors";

type Props = {
  points: DailyPoint[];
  variants: { key: string; name: string }[];
};

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 96, bottom: 28, left: 48 };

/**
 * Cumulative conversion rate per variant, day by day (plain SVG, no chart library).
 * Hovering shows a crosshair and the values of every variant for that day.
 */
export function CumulativeChart({ points, variants }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="text-sm text-zinc-500">No exposures yet.</p>;
  }

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const maxRate = Math.max(...points.flatMap((p) => Object.values(p.rates)), 0.01);
  // About 4 gridlines at a round step (1%, 2%, 5%, 10%...).
  const step = niceCeil((maxRate * 1.15) / 4);
  const yMax = step * Math.ceil((maxRate * 1.15) / step);
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const y = (rate: number) => PAD.top + plotHeight - (rate / yMax) * plotHeight;

  const last = points[points.length - 1];
  const labelY = spreadLabels(
    variants.map((v) => y(last.rates[v.key] ?? 0)),
    16,
  );
  const hovered = hover === null ? null : points[hover];

  function handleMove(event: React.MouseEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setHover(Math.round(ratio * (points.length - 1)));
  }

  return (
    <figure>
      {/* Legend: identity never relies on the line color alone (lines are also labeled). */}
      <div className="mb-2 flex gap-4 text-sm text-zinc-600">
        {variants.map((v, i) => (
          <span key={v.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ backgroundColor: seriesColor(i) }} />
            {v.name}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="Cumulative conversion rate per variant over time"
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? CHART.axis : CHART.grid}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill={CHART.textMuted}
              >
                {formatPercent(tick, step < 0.01 ? 1 : 0)}
              </text>
            </g>
          ))}

          {/* First and last day on the x axis: enough context without clutter. */}
          <text x={x(0)} y={HEIGHT - 8} fontSize={11} fill={CHART.textMuted} textAnchor="start">
            {points[0].day}
          </text>
          {points.length > 1 && (
            <text
              x={x(points.length - 1)}
              y={HEIGHT - 8}
              fontSize={11}
              fill={CHART.textMuted}
              textAnchor="end"
            >
              {last.day}
            </text>
          )}

          {variants.map((v, i) => (
            <g key={v.key}>
              <polyline
                fill="none"
                stroke={seriesColor(i)}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points.map((p, j) => `${x(j)},${y(p.rates[v.key] ?? 0)}`).join(" ")}
              />
              {/* Direct label at the end of each line. */}
              <text
                x={x(points.length - 1) + 8}
                y={labelY[i]}
                dominantBaseline="middle"
                fontSize={12}
                fill={CHART.textMuted}
              >
                {v.name.length > 12 ? v.key : v.name} {formatPercent(last.rates[v.key] ?? 0, 1)}
              </text>
            </g>
          ))}

          {hovered && hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + plotHeight}
                stroke={CHART.axis}
                strokeWidth={1}
              />
              {variants.map((v, i) => (
                <circle
                  key={v.key}
                  cx={x(hover)}
                  cy={y(hovered.rates[v.key] ?? 0)}
                  r={4}
                  fill={seriesColor(i)}
                  stroke={CHART.surface}
                  strokeWidth={2}
                />
              ))}
            </g>
          )}

          {/* Invisible hit area, larger than the lines, for the crosshair. */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>

        {hovered && hover !== null && (
          <div
            className="pointer-events-none absolute top-2 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm"
            style={{
              left: `${(x(hover) / WIDTH) * 100}%`,
              transform:
                hover > points.length / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            }}
          >
            <p className="font-medium text-zinc-900">{hovered.day}</p>
            {variants.map((v, i) => (
              <p key={v.key} className="mt-1 flex items-center gap-2 text-zinc-600">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: seriesColor(i) }}
                />
                {v.name}: {formatPercent(hovered.rates[v.key] ?? 0)} (
                {hovered.visitors[v.key]?.toLocaleString("en-US")} visitors)
              </p>
            ))}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-xs text-zinc-500">
        Users are grouped by exposure date. Early on, a few conversions swing the curves a lot: that
        is why the verdict waits for the pre-registered sample size.
      </figcaption>
    </figure>
  );
}

/** Rounds up to a "nice" number: 1, 2 or 5 × a power of ten. */
function niceCeil(value: number): number {
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * power >= value) ?? 10;
  return step * power;
}

/**
 * Moves end-of-line labels apart so they never overlap (keeps their order,
 * pushes each label down until it is at least `gap` px below the previous one).
 */
function spreadLabels(positions: number[], gap: number): number[] {
  const order = positions.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const result = [...positions];
  let previous = -Infinity;
  for (const { p, i } of order) {
    result[i] = Math.max(p, previous + gap);
    previous = result[i];
  }
  return result;
}
