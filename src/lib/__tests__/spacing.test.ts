import { describe, expect, it } from "vitest";
import { calculateSpacing } from "../spacing";

describe("spacing", () => {
  it("matches 67.5/20/0.75/2.5 fixture", () => {
    const result = calculateSpacing({
      totalLength: 67.5,
      count: 20,
      elementWidth: 0.75,
      edgeOffset: 2.5,
      unit: "inches",
      centerToCenter: false,
    });

    expect(result.gap).toBeCloseTo(2.2619047619, 6);
  });

  it("matches 68/21/0.75/0 fixture", () => {
    const result = calculateSpacing({
      totalLength: 68,
      count: 21,
      elementWidth: 0.75,
      edgeOffset: 0,
      unit: "inches",
      centerToCenter: false,
    });

    expect(result.gap).toBeCloseTo(2.375, 6);
  });

  it("handles metric inputs", () => {
    const result = calculateSpacing({
      totalLength: 476,
      count: 11,
      elementWidth: 42,
      edgeOffset: 0,
      unit: "mm",
      centerToCenter: false,
    });

    expect(result.gap).toBeCloseTo(1.1666666667, 6);
    expect(result.summary).toContain("mm");
    expect(result.diagram).toContain("mm");
  });

  it("rejects impossible spacing", () => {
    expect(() =>
      calculateSpacing({
        totalLength: 10,
        count: 10,
        elementWidth: 2,
        unit: "inches",
      }),
    ).toThrow();
  });
});
