import { describe, expect, it } from "vitest";
import { calculateSlideLayout } from "../slide-layout";

describe("calculateSlideLayout", () => {
  it("creates stable baseline coordinates", () => {
    const result = calculateSlideLayout({
      cabinetInteriorHeight: 30,
      drawerCount: 4,
      topMargin: 2,
      gapSpacing: 6,
      slideThickness: 0.5,
      unit: "inches",
      toolContext: "table-saw",
    });

    expect(result.coordinates).toHaveLength(4);
    expect(result.coordinates[0].topY).toBeCloseTo(2, 4);
    expect(result.coordinates[1].topY).toBeCloseTo(8.5, 4);
    expect(result.spacerBlockHeight).toBeCloseTo(6.5, 4);
  });
});
