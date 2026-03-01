import { describe, expect, it } from "vitest";
import { calculateScribePlan } from "../scribe-planner";

describe("calculateScribePlan", () => {
  it("computes rough-cut oversize from deviation envelope", () => {
    const result = calculateScribePlan({
      nominalWallWidth: 30,
      highDeviation: 0.12,
      lowDeviation: -0.08,
      plumbDeviation: 0.1,
      desiredVisibleWidth: 29.5,
      unit: "inches",
      toolContext: "router",
    });

    expect(result.oversizeMargin).toBeGreaterThan(0.12);
    expect(result.roughCutDimension).toBeGreaterThan(29.5);
  });
});
