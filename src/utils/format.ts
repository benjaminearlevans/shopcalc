import { Unit } from "../types";

export function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: number, places = 4): string {
  return round(value, places).toString();
}

export function unitLabel(unit: Unit): string {
  if (unit === "mm") {
    return "mm";
  }
  if (unit === "cm") {
    return "cm";
  }
  return "in";
}

export function escapeMarkdown(raw: string): string {
  return raw.replace(/([*_`])/g, "\\$1");
}

export function parsePositiveNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive number but received: ${value}`);
  }
  return parsed;
}

export function parseNonNegativeNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative number but received: ${value}`);
  }
  return parsed;
}
