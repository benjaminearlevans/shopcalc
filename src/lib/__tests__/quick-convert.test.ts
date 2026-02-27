import { describe, expect, it } from "vitest";
import { evaluateQuickConversion } from "../quick-convert";

describe("quick-convert", () => {
  it("converts mixed fraction inches to mm", () => {
    const result = evaluateQuickConversion("12-7/8 in to mm", "inches", 16);
    expect(result.targetUnit).toBe("mm");
    expect(result.targetValue).toBeCloseTo(327.025, 3);
  });

  it("supports feet + inches expression", () => {
    const result = evaluateQuickConversion("3ft 2in to mm", "inches", 16);
    expect(result.targetValue).toBeCloseTo(965.2, 2);
  });

  it("supports arithmetic", () => {
    const result = evaluateQuickConversion("2x4in to mm", "inches", 16);
    expect(result.targetValue).toBeCloseTo(203.2, 2);
  });

  it("infers target when omitted", () => {
    const result = evaluateQuickConversion("25mm", "inches", 16);
    expect(result.targetUnit).toBe("in");
  });

  it("uses centimeter default unit for unitless values", () => {
    const result = evaluateQuickConversion("10", "cm", 16);
    expect(result.inches).toBeCloseTo(3.93700787, 6);
  });

  it("converts centimeters to inches", () => {
    const result = evaluateQuickConversion("32.7cm to in", "inches", 16);
    expect(result.inches).toBeCloseTo(12.8740157, 6);
  });

  it("throws on unknown unit", () => {
    expect(() => evaluateQuickConversion("12 cubits to mm", "inches", 16)).toThrow();
  });
});
