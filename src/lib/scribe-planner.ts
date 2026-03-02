import { ScribePlannerInput, ScribePlannerResult } from "../types";
import { formatNumber, unitLabel } from "../utils/format";

export function calculateScribePlan(input: ScribePlannerInput): ScribePlannerResult {
  validateInput(input);
  const toleranceMode = input.toleranceMode ?? "standard";

  const maxDeviation = Math.max(
    Math.abs(input.highDeviation),
    Math.abs(input.lowDeviation),
    Math.abs(input.plumbDeviation),
  );
  const oversizeBuffer = oversizeBufferForUnit(input.unit, toleranceMode);
  const oversizeMargin = maxDeviation + oversizeBuffer;
  const roughCutDimension = input.desiredVisibleWidth + oversizeMargin;
  const maximumScribeAllowance = maxDeviation + oversizeBuffer * 0.5;

  const shimTolerance = shimToleranceForUnit(input.unit);
  const exceedsShimTolerance = maxDeviation > shimTolerance;

  const warnings: string[] = [];
  if (exceedsShimTolerance) {
    warnings.push(
      `Wall deviation exceeds typical shim tolerance (${formatNumber(shimTolerance, 3)} ${unitLabel(input.unit)}). Plan for backer or wider scribe.`,
    );
  }
  if (roughCutDimension > input.nominalWallWidth + oversizeBuffer * 2) {
    warnings.push("Recommended rough cut exceeds nominal width significantly.");
  }

  const assumptions = [
    `Tolerance mode: ${toleranceMode}`,
    "Uses the largest absolute deviation across high/low/plumb as controlling error.",
    "Adds oversize buffer before trimming to final visible width.",
    "Shim tolerance flag is advisory, not a structural check.",
  ];

  const summary = [
    "**Scribe & Oversize Plan**",
    `Tolerance mode: **${toleranceMode}**`,
    `Rough-cut dimension: **${formatNumber(roughCutDimension, 3)} ${unitLabel(input.unit)}**`,
    `Oversize margin: **${formatNumber(oversizeMargin, 3)} ${unitLabel(input.unit)}**`,
    `Maximum scribe allowance: **${formatNumber(maximumScribeAllowance, 3)} ${unitLabel(input.unit)}**`,
    `Deviation risk flag: **${exceedsShimTolerance ? "High" : "Normal"}**`,
    warnings.length ? `Warnings: ${warnings.join(" | ")}` : "Warnings: none",
  ].join("\n");

  return {
    input,
    roughCutDimension,
    oversizeMargin,
    maximumScribeAllowance,
    exceedsShimTolerance,
    warnings,
    assumptions,
    summary,
  };
}

function validateInput(input: ScribePlannerInput): void {
  const required: Array<[string, number]> = [
    ["nominal wall width", input.nominalWallWidth],
    ["desired final visible width", input.desiredVisibleWidth],
  ];

  for (const [label, value] of required) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be a positive number`);
    }
  }

  const deviations = [input.highDeviation, input.lowDeviation, input.plumbDeviation];
  for (const value of deviations) {
    if (!Number.isFinite(value)) {
      throw new Error("Deviations must be finite numbers");
    }
  }
}

function oversizeBufferForUnit(
  unit: ScribePlannerInput["unit"],
  mode: NonNullable<ScribePlannerInput["toleranceMode"]>,
): number {
  const base = unit === "mm" ? 2 : unit === "cm" ? 0.2 : 1 / 16;
  if (mode === "tight") {
    return base * 1.3;
  }
  if (mode === "loose") {
    return base * 0.7;
  }
  return base;
}

function shimToleranceForUnit(unit: ScribePlannerInput["unit"]): number {
  if (unit === "mm") {
    return 6;
  }
  if (unit === "cm") {
    return 0.6;
  }
  return 0.24;
}
