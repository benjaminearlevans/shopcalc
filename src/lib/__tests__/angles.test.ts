import { describe, expect, it } from "vitest";
import { calculateAngle } from "../angles";

describe("angles", () => {
  it("stair rail at 36 degrees gives 54 miter", () => {
    const result = calculateAngle({ mode: "stair-rail", slopeAngle: 36, unit: "degrees" });
    expect(result.miterAngle).toBeCloseTo(54, 6);
    expect(result.complementary).toBeCloseTo(36, 6);
  });

  it("polygon with 6 sides gives 30 degree miter", () => {
    const result = calculateAngle({ mode: "polygon", sides: 6 });
    expect(result.miterAngle).toBeCloseTo(30, 6);
  });

  it("miter for 90 degree joint gives 45", () => {
    const result = calculateAngle({ mode: "miter", slopeAngle: 90, unit: "degrees" });
    expect(result.miterAngle).toBeCloseTo(45, 6);
  });
});
