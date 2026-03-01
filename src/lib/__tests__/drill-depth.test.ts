import { describe, expect, it } from "vitest";
import { calculateDrillDepth } from "../drill-depth";

describe("calculateDrillDepth", () => {
  it("returns stop-collar setting and pilot suggestion", () => {
    const result = calculateDrillDepth({
      desiredHoleDepth: 0.75,
      materialThickness: 0.875,
      fastenerLength: 1.25,
      screwType: "wood",
      screwDiameter: 0.164,
      unit: "inches",
      toolContext: "drill",
    });

    expect(result.stopCollarSetting).toBeCloseTo(0.75, 4);
    expect(result.pilotHoleDiameter).toBeCloseTo(0.1148, 4);
    expect(result.throughHoleRisk).toBe(false);
  });
});
