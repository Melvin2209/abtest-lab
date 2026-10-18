/** Formats a ratio (0..1) as a percentage string, e.g. 0.1234 -> "12.34%". */
export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

const priceFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Formats an amount stored in cents, e.g. 12900 -> "$129.00". */
export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

/** Formats a difference of rates in percentage points, e.g. 0.012 -> "+1.20 pts". */
export function formatPoints(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value * 100).toFixed(digits)} pts`;
}

/** Formats a relative change with its sign, e.g. 0.083 -> "+8.3%". */
export function formatUplift(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value * 100).toFixed(digits)}%`;
}

/** p-values are shown with 3 decimals; tiny values are not worth more precision. */
export function formatPValue(p: number): string {
  return p < 0.001 ? "< 0.001" : p.toFixed(3);
}

/** "p = 0.012" or "p < 0.001", ready to drop into a sentence. */
export function formatPStatement(p: number): string {
  return p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`;
}
