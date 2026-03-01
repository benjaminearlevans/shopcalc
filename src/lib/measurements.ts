import { Unit } from "../types";
import { parseInchValue } from "./fractions";

const MM_PER_INCH = 25.4;
const CM_PER_INCH = 2.54;

const UNIT_ALIASES: Record<string, Unit> = {
  in: "inches",
  inch: "inches",
  inches: "inches",
  '"': "inches",
  mm: "mm",
  millimeter: "mm",
  millimeters: "mm",
  cm: "cm",
  centimeter: "cm",
  centimeters: "cm",
};

export function parseMeasurementInput(raw: string, targetUnit: Unit, fieldName = "value"): number {
  const normalized = raw.trim().toLowerCase().replace(/,/g, "");
  if (!normalized) {
    throw new Error(`Enter ${fieldName}`);
  }

  const { valueText, unit } = extractUnit(normalized);
  const sourceUnit = unit ?? targetUnit;
  const numeric = parseFlexibleNumber(valueText, sourceUnit);

  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return convertMeasurement(numeric, sourceUnit, targetUnit);
}

function extractUnit(raw: string): { valueText: string; unit?: Unit } {
  if (raw.endsWith('"')) {
    return {
      valueText: raw.slice(0, -1).trim(),
      unit: "inches",
    };
  }

  const match = raw.match(/(mm|millimeters?|cm|centimeters?|in|inch|inches)\s*$/);
  if (!match) {
    return { valueText: raw };
  }

  const alias = match[1];
  const unit = UNIT_ALIASES[alias];
  const valueText = raw.slice(0, match.index).trim();
  return { valueText, unit };
}

function parseFlexibleNumber(raw: string, unit: Unit): number {
  if (!raw) {
    throw new Error("Missing numeric value");
  }

  if (unit === "inches") {
    return parseInchValue(raw);
  }

  if (raw.includes("/")) {
    return parseInchValue(raw);
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid numeric value: ${raw}`);
  }
  return numeric;
}

function convertMeasurement(value: number, source: Unit, target: Unit): number {
  if (source === target) {
    return value;
  }

  const inches = source === "inches" ? value : source === "mm" ? value / MM_PER_INCH : value / CM_PER_INCH;
  if (target === "inches") {
    return inches;
  }
  if (target === "mm") {
    return inches * MM_PER_INCH;
  }
  return inches * CM_PER_INCH;
}
