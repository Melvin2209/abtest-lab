import { describe, expect, it } from "vitest";
import { formatPercent, formatPoints, formatPrice, formatPValue, formatUplift } from "./utils";

describe("formatPercent", () => {
  it("formats a ratio as a percentage", () => {
    expect(formatPercent(0.1234)).toBe("12.34%");
    expect(formatPercent(0.5, 0)).toBe("50%");
  });
});

describe("formatPrice", () => {
  it("formats cents as dollars", () => {
    expect(formatPrice(12900)).toBe("$129.00");
    expect(formatPrice(1490)).toBe("$14.90");
  });
});

describe("formatPoints / formatUplift / formatPValue", () => {
  it("shows signs explicitly", () => {
    expect(formatPoints(0.012)).toBe("+1.20 pts");
    expect(formatPoints(-0.005)).toBe("−0.50 pts");
    expect(formatUplift(0.083)).toBe("+8.3%");
    expect(formatUplift(-0.1)).toBe("−10.0%");
    expect(formatUplift(null)).toBe("—");
  });

  it("caps p-value precision", () => {
    expect(formatPValue(0.0123)).toBe("0.012");
    expect(formatPValue(0.00001)).toBe("< 0.001");
  });
});
