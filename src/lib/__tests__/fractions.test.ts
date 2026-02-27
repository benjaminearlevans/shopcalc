import { describe, expect, it } from "vitest";
import { parseInchValue, toDecimalInch, toFractionalInch } from "../fractions";

describe("fractions", () => {
  it("rounds and reduces fractions", () => {
    const fraction = toFractionalInch(18.74015748, 16);
    expect(fraction.display).toBe('18-3/4"');
  });

  it("handles carry to next whole number", () => {
    const fraction = toFractionalInch(1.999, 16);
    expect(fraction.display).toBe('2"');
  });

  it("formats decimal inches", () => {
    expect(toDecimalInch(18.74015748)).toBe('18.7402"');
  });

  it("parses mixed and simple fractional inch input", () => {
    expect(parseInchValue("12-7/8")).toBeCloseTo(12.875, 6);
    expect(parseInchValue("12 7/8")).toBeCloseTo(12.875, 6);
    expect(parseInchValue("7/8")).toBeCloseTo(0.875, 6);
    expect(parseInchValue('18.74"')).toBeCloseTo(18.74, 6);
  });

  it("rejects invalid fraction input", () => {
    expect(() => parseInchValue("12-7/0")).toThrow();
    expect(() => parseInchValue("abc")).toThrow();
  });
});
