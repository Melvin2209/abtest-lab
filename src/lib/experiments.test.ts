import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the database with an in-memory experiment so the test stays a unit test.
const findUnique = vi.fn();
vi.mock("./db", () => ({
  db: { experiment: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));
vi.mock("./user", () => ({ getUserId: async () => "user-1" }));

const { assignUser, byVariantOrder } = await import("./experiments");

const experiment = {
  key: "exp",
  status: "running",
  variants: [
    { key: "control", weight: 50 },
    { key: "B", weight: 50 },
  ],
};

describe("assignUser", () => {
  beforeEach(() => findUnique.mockReset());

  it("returns a variant of a running experiment", async () => {
    findUnique.mockResolvedValue(experiment);
    const assignment = await assignUser("exp", "user-1");
    expect(assignment?.experimentKey).toBe("exp");
    expect(["control", "B"]).toContain(assignment?.variantKey);
  });

  it("does not depend on the order variants come back from the database", async () => {
    findUnique.mockResolvedValue(experiment);
    const first = await assignUser("exp", "user-42");
    findUnique.mockResolvedValue({ ...experiment, variants: [...experiment.variants].reverse() });
    const second = await assignUser("exp", "user-42");
    expect(second).toEqual(first);
  });

  it("returns null when the experiment is not running", async () => {
    findUnique.mockResolvedValue({ ...experiment, status: "stopped" });
    expect(await assignUser("exp", "user-1")).toBeNull();
    findUnique.mockResolvedValue(null);
    expect(await assignUser("missing", "user-1")).toBeNull();
  });
});

describe("byVariantOrder", () => {
  it("puts control first, then sorts the other variants", () => {
    const keys = [{ key: "C" }, { key: "B" }, { key: "control" }].sort(byVariantOrder);
    expect(keys.map((v) => v.key)).toEqual(["control", "B", "C"]);
  });
});
