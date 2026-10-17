import { describe, expect, it } from "vitest";
import { formatPercent, formatPrice } from "./utils";

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
