import { ConversionInput, ConversionResult, FractionPrecision } from "../types";
import { toDecimalInch, toFractionalInch } from "./fractions";

const MM_PER_INCH = 25.4;
const CM_PER_INCH = 2.54;
const PRECISION_SET = new Set<FractionPrecision>([8, 16, 32, 64]);

export function convertUnits(input: ConversionInput): ConversionResult {
  validateConversionInput(input);
  const precision = input.precision ?? 16;

  const inches =
    input.from === "mm" ? input.value / MM_PER_INCH : input.from === "cm" ? input.value / CM_PER_INCH : input.value;
  const mm = inches * MM_PER_INCH;
  const cm = inches * CM_PER_INCH;
  const roundedMm = Math.round(mm * 100) / 100;
  const roundedCm = Math.round(cm * 1000) / 1000;
  const fractional = toFractionalInch(inches, precision);

  const summary = [
    `**${input.value} ${input.from}** =`,
    `Inches: **${fractional.display}** (${toDecimalInch(inches)})`,
    `Millimeters: **${roundedMm} mm**`,
    `Centimeters: **${roundedCm} cm**`,
    `Precision: 1/${precision}"`,
  ].join("\n\n");

  return {
    input: { ...input, precision },
    inches,
    mm: roundedMm,
    cm: roundedCm,
    fractional,
    summary,
  };
}

function validateConversionInput(input: ConversionInput): void {
  if (!Number.isFinite(input.value)) {
    throw new Error("Conversion value must be a finite number");
  }
  if (input.precision !== undefined && !PRECISION_SET.has(input.precision)) {
    throw new Error("Precision must be one of 8, 16, 32, or 64");
  }
}
