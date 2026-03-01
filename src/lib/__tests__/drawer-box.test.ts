import { describe, expect, it } from "vitest";
import { calculateDrawerBox } from "../drawer-box";

describe("calculateDrawerBox", () => {
  it("calculates drawer parts with side-mount math", () => {
    const result = calculateDrawerBox({
      openingWidth: 21,
      drawerDepth: 18,
      slideType: "side-mount",
      slideClearance: 0.5,
      materialThickness: 0.75,
      joineryType: "dado",
      bottomInsetDepth: 0.25,
      bottomThickness: 0.25,
      unit: "inches",
      toolContext: "table-saw",
    });

    expect(result.frontBackPanelLength).toBeCloseTo(18.5, 4);
    expect(result.sidePanelLength).toBeCloseTo(18, 4);
    expect(result.warnings).toEqual([]);
  });
});
