/** Formats a ratio (0..1) as a percentage string, e.g. 0.1234 -> "12.34%". */
export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}
