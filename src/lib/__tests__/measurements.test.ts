import { describe, expect, it } from "vitest";
import { parseMeasurementInput } from "../measurements";

describe("parseMeasurementInput", () => {
  it("parses fractional inches into inches", () => {
    const result = parseMeasurementInput("12-7/8", "inches");
    expect(result).toBeCloseTo(12.875, 6);
  });

  it("converts explicit metric suffix to target unit", () => {
    const result = parseMeasurementInput("35mm", "inches");
    expect(result).toBeCloseTo(1.37795, 4);
  });

  it("converts explicit inch suffix to metric target", () => {
    const result = parseMeasurementInput('1-1/2"', "mm");
    expect(result).toBeCloseTo(38.1, 4);
  });
});
