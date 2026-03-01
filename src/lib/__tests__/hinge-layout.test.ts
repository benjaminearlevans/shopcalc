import { describe, expect, it } from "vitest";
import { calculateHingeLayout } from "../hinge-layout";

describe("calculateHingeLayout", () => {
  it("returns mirror-safe coordinates", () => {
    const result = calculateHingeLayout({
      doorHeight: 716,
      topHingeOffset: 100,
      bottomHingeOffset: 100,
      cupDiameter: 35,
      edgeSetback: 5,
      mode: "overlay",
      unit: "mm",
      includeStlParams: true,
      toolContext: "drill",
    });

    expect(result.topHoleY).toBe(100);
    expect(result.bottomHoleY).toBe(616);
    expect(result.mirrorSafe).toBe(true);
    expect(result.stlParams).toContain("cupDiameter");
  });
});
