"use client";

import { useState } from "react";
import { formatPoints, formatPValue, formatUplift } from "@/lib/utils";
import { CHART } from "./colors";

export type UpliftRow = {
  label: string;
  absoluteDiff: number;
  ci: [number, number];
  relativeUplift: number | null;
  pValue: number;
  primary: boolean;
};

const WIDTH = 720;
const ROW_HEIGHT = 44;
const LABEL_WIDTH = 170;
const PAD_RIGHT = 24;

/**
 * "Forest plot": one row per metric, the dot is the observed difference (B − control),
 * the bar its 95% confidence interval. If the bar crosses the dashed zero line,
 * "no difference" is still plausible -> not significant.
 */
export function UpliftChart({ rows, color }: { rows: UpliftRow[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null);

  // Symmetric scale around zero so left (worse) and right (better) read the same.
  const extent = Math.max(...rows.flatMap((r) => [Math.abs(r.ci[0]), Math.abs(r.ci[1])]), 0.005);
  const half = extent * 1.15;
  const plotLeft = LABEL_WIDTH;
  const plotWidth = WIDTH - LABEL_WIDTH - PAD_RIGHT;
  const x = (value: number) => plotLeft + ((value + half) / (2 * half)) * plotWidth;
  const height = rows.length * ROW_HEIGHT + 28;

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Difference between B and control with 95% confidence intervals"
      >
        <line
          x1={x(0)}
          x2={x(0)}
          y1={4}
          y2={height - 24}
          stroke={CHART.axis}
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <text x={x(0)} y={height - 8} fontSize={11} fill={CHART.textMuted} textAnchor="middle">
          0
        </text>
        <text x={x(-half)} y={height - 8} fontSize={11} fill={CHART.textMuted} textAnchor="start">
          {formatPoints(-half, 1)} · B worse
        </text>
        <text x={x(half)} y={height - 8} fontSize={11} fill={CHART.textMuted} textAnchor="end">
          B better · {formatPoints(half, 1)}
        </text>

        {rows.map((row, i) => {
          const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2 + 4;
          return (
            <g key={row.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* Full-row hit area, bigger than the marks. */}
              <rect
                x={0}
                y={cy - ROW_HEIGHT / 2}
                width={WIDTH}
                height={ROW_HEIGHT}
                fill="transparent"
              />
              <text
                x={0}
                y={cy}
                dominantBaseline="middle"
                fontSize={13}
                fill="#18181b"
                fontWeight={row.primary ? 600 : 400}
              >
                {row.label}
                {row.primary ? " ★" : ""}
              </text>
              <line
                x1={x(row.ci[0])}
                x2={x(row.ci[1])}
                y1={cy}
                y2={cy}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle
                cx={x(row.absoluteDiff)}
                cy={cy}
                r={5}
                fill={color}
                stroke={CHART.surface}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute right-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm"
          style={{ top: hover * ROW_HEIGHT * 0.6 }}
        >
          <p className="font-medium text-zinc-900">{rows[hover].label}</p>
          <p className="mt-1 text-zinc-600">
            Difference: {formatPoints(rows[hover].absoluteDiff)} (
            {formatUplift(rows[hover].relativeUplift)})
          </p>
          <p className="text-zinc-600">
            95% CI: [{formatPoints(rows[hover].ci[0])}, {formatPoints(rows[hover].ci[1])}]
          </p>
          <p className="text-zinc-600">p-value: {formatPValue(rows[hover].pValue)}</p>
        </div>
      )}
      <figcaption className="mt-2 text-xs text-zinc-500">
        Dot = observed difference (B − control), bar = 95% confidence interval. ★ = primary metric.
      </figcaption>
    </figure>
  );
}
