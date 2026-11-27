import { computeBarWidthPercent } from "./computeBarWidthPercent";

describe("computeBarWidthPercent", () => {
  it("returns 100 when count equals the max", () => {
    expect(computeBarWidthPercent(12, 12)).toBe(100);
  });

  it("returns a proportional percentage below the max", () => {
    expect(computeBarWidthPercent(3, 12)).toBe(25);
  });

  it("returns 0 when count is 0", () => {
    expect(computeBarWidthPercent(0, 12)).toBe(0);
  });

  it("returns 0 when maxCount is 0, never dividing by zero", () => {
    expect(computeBarWidthPercent(0, 0)).toBe(0);
  });

  it("returns 0 when maxCount is negative", () => {
    expect(computeBarWidthPercent(5, -1)).toBe(0);
  });

  it("clamps to 100 even if count somehow exceeds maxCount", () => {
    expect(computeBarWidthPercent(20, 12)).toBe(100);
  });
});
