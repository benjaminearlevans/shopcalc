import { FractionPrecision, FractionalInch } from "../types";
import { round } from "../utils/format";

const PRECISION_SET = new Set<FractionPrecision>([8, 16, 32, 64]);

export function toFractionalInch(decimal: number, precision: FractionPrecision = 16): FractionalInch {
  if (!Number.isFinite(decimal)) {
    throw new Error("Decimal inch value must be finite");
  }
  if (!PRECISION_SET.has(precision)) {
    throw new Error(`Unsupported precision: ${precision}`);
  }

  const sign = decimal < 0 ? -1 : 1;
  const absDecimal = Math.abs(decimal);
  const whole = Math.floor(absDecimal);
  const remainder = absDecimal - whole;

  const rawTicks = Math.round(remainder * precision);
  let normalizedWhole = whole;
  let numerator = rawTicks;
  let denominator = precision;

  if (numerator >= denominator) {
    normalizedWhole += 1;
    numerator = 0;
  }

  if (numerator > 0) {
    const factor = gcd(numerator, denominator);
    numerator /= factor;
    denominator /= factor;
  }

  const signedWhole = normalizedWhole * sign;
  const signedDecimal = absDecimal * sign;
  const ticks = rawTicks;

  let display: string;
  if (numerator === 0) {
    display = `${signedWhole}"`;
  } else if (normalizedWhole === 0) {
    display = `${sign < 0 ? "-" : ""}${numerator}/${denominator}"`;
  } else {
    display = `${signedWhole}-${numerator}/${denominator}"`;
  }

  return {
    decimal: signedDecimal,
    whole: signedWhole,
    numerator,
    denominator,
    display,
    ticks,
  };
}

export function toDecimalInch(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("Inch value must be finite");
  }
  return `${round(value, 4)}"`;
}

export function parseInchValue(raw: string): number {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/inches?|in/g, "")
    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    throw new Error("Enter an inch value");
  }

  const mixedDashMatch = normalized.match(/^(-)?(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixedDashMatch) {
    const sign = mixedDashMatch[1] ? -1 : 1;
    const whole = Number(mixedDashMatch[2]);
    const numerator = Number(mixedDashMatch[3]);
    const denominator = Number(mixedDashMatch[4]);
    return sign * mixedToDecimal(whole, numerator, denominator);
  }

  const mixedSpaceMatch = normalized.match(/^(-)?(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedSpaceMatch) {
    const sign = mixedSpaceMatch[1] ? -1 : 1;
    const whole = Number(mixedSpaceMatch[2]);
    const numerator = Number(mixedSpaceMatch[3]);
    const denominator = Number(mixedSpaceMatch[4]);
    return sign * mixedToDecimal(whole, numerator, denominator);
  }

  const fractionMatch = normalized.match(/^(-)?(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const sign = fractionMatch[1] ? -1 : 1;
    const numerator = Number(fractionMatch[2]);
    const denominator = Number(fractionMatch[3]);
    return sign * mixedToDecimal(0, numerator, denominator);
  }

  const decimal = Number(normalized);
  if (Number.isFinite(decimal)) {
    return decimal;
  }

  throw new Error("Inches can be decimal (12.875) or fraction (12-7/8, 12 7/8, 7/8)");
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function mixedToDecimal(whole: number, numerator: number, denominator: number): number {
  if (!Number.isFinite(whole) || !Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    throw new Error("Invalid fractional inch value");
  }
  if (denominator === 0) {
    throw new Error("Fraction denominator cannot be 0");
  }
  if (numerator < 0 || denominator < 0) {
    throw new Error("Fraction values must be non-negative");
  }

  return whole + numerator / denominator;
}
