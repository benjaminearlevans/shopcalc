import { describe, expect, it } from "vitest";
import { calculateDrillDepth } from "../drill-depth";
import { calculateHingeLayout } from "../hinge-layout";
import { parseMeasurementInput } from "../measurements";
import { calculateScribePlan } from "../scribe-planner";

describe("validation hardening", () => {
  it("rejects malformed fractional inch input", () => {
    expect(() => parseMeasurementInput("12-7/x", "inches")).toThrow();
  });

  it("converts centimeters with explicit suffix", () => {
    const mm = parseMeasurementInput("3.2cm", "mm");
    expect(mm).toBeCloseTo(32, 6);
  });

  it("tight tolerance increases scribe oversize margin vs loose", () => {
    const tight = calculateScribePlan({
      nominalWallWidth: 30,
      highDeviation: 0.1,
      lowDeviation: -0.08,
      plumbDeviation: 0.06,
      desiredVisibleWidth: 29.5,
      unit: "inches",
      toleranceMode: "tight",
    });
    const loose = calculateScribePlan({
      nominalWallWidth: 30,
      highDeviation: 0.1,
      lowDeviation: -0.08,
      plumbDeviation: 0.06,
      desiredVisibleWidth: 29.5,
      unit: "inches",
      toleranceMode: "loose",
    });

    expect(tight.oversizeMargin).toBeGreaterThan(loose.oversizeMargin);
  });

  it("tight tolerance raises drill safety margin impact", () => {
    const tight = calculateDrillDepth({
      desiredHoleDepth: 0.7,
      materialThickness: 0.875,
      fastenerLength: 1.0,
      screwType: "wood",
      screwDiameter: 0.16,
      unit: "inches",
      toleranceMode: "tight",
    });
    const loose = calculateDrillDepth({
      desiredHoleDepth: 0.7,
      materialThickness: 0.875,
      fastenerLength: 1.0,
      screwType: "wood",
      screwDiameter: 0.16,
      unit: "inches",
      toleranceMode: "loose",
    });

    expect(tight.minimumSafeDepth).toBeGreaterThanOrEqual(loose.minimumSafeDepth);
  });

  it("tight hinge tolerance is stricter than loose tolerance", () => {
    const tight = calculateHingeLayout({
      doorHeight: 716,
      topHingeOffset: 100,
      bottomHingeOffset: 100.75,
      cupDiameter: 35,
      edgeSetback: 5,
      mode: "overlay",
      unit: "mm",
      toleranceMode: "tight",
    });
    const loose = calculateHingeLayout({
      doorHeight: 716,
      topHingeOffset: 100,
      bottomHingeOffset: 100.75,
      cupDiameter: 35,
      edgeSetback: 5,
      mode: "overlay",
      unit: "mm",
      toleranceMode: "loose",
    });

    expect(tight.mirrorSafe).toBe(false);
    expect(loose.mirrorSafe).toBe(true);
  });
});
