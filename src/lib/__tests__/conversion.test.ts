import { describe, expect, it } from "vitest";
import { convertUnits } from "../conversion";

describe("conversion", () => {
  it("converts 476mm to inches with 1/16 precision", () => {
    const result = convertUnits({ value: 476, from: "mm", precision: 16 });
    expect(result.inches).toBeCloseTo(18.74015748, 6);
    expect(result.fractional.display).toBe('18-3/4"');
  });

  it("converts 18.74in to mm", () => {
    const result = convertUnits({ value: 18.74, from: "inches", precision: 16 });
    expect(result.mm).toBeCloseTo(476, 2);
  });

  it("converts centimeters to inches and millimeters", () => {
    const result = convertUnits({ value: 32.7, from: "cm", precision: 16 });
    expect(result.inches).toBeCloseTo(12.8740157, 6);
    expect(result.mm).toBeCloseTo(327, 2);
    expect(result.cm).toBeCloseTo(32.7, 3);
  });

  it("formats 0.125 to 1/8 at 1/8 precision", () => {
    const result = convertUnits({ value: 0.125, from: "inches", precision: 8 });
    expect(result.fractional.display).toBe('1/8"');
  });
});
