/** Formats a ratio (0..1) as a percentage string, e.g. 0.1234 -> "12.34%". */
export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

const priceFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Formats an amount stored in cents, e.g. 12900 -> "$129.00". */
export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}
