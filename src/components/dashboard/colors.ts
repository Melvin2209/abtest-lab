/**
 * Chart colors. Categorical slots are assigned in a fixed order (control is always
 * slot 1), and the pair was checked for color-blind separation and contrast.
 */
export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#6250d6"];

export const CHART = {
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  textMuted: "#52514e",
  surface: "#ffffff",
};

export function seriesColor(index: number): string {
  return SERIES_COLORS[index] ?? SERIES_COLORS[SERIES_COLORS.length - 1];
}
