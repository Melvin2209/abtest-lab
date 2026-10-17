import { describe, expect, it } from "vitest";
import { formatPercent } from "./utils";

describe("formatPercent", () => {
  it("formats a ratio as a percentage", () => {
    expect(formatPercent(0.1234)).toBe("12.34%");
    expect(formatPercent(0.5, 0)).toBe("50%");
  });
});
