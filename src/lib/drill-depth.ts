import { DrillDepthInput, DrillDepthResult, ScrewType } from "../types";
import { formatNumber, unitLabel } from "../utils/format";

const PILOT_FACTORS: Record<Exclude<ScrewType, "custom">, number> = {
  wood: 0.7,
  "sheet-metal": 0.8,
  lag: 0.75,
  confirmat: 0.85,
};

export function calculateDrillDepth(input: DrillDepthInput): DrillDepthResult {
  validateInput(input);
  const toleranceMode = input.toleranceMode ?? "standard";

  const safetyMargin = safetyMarginByUnit(input.unit, toleranceMode);
  const stopCollarSetting = input.desiredHoleDepth;
  const minimumSafeDepth = Math.min(
    input.materialThickness - safetyMargin,
    Math.max(input.fastenerLength * 0.6, safetyMargin),
  );
  const throughHoleRisk = input.desiredHoleDepth >= input.materialThickness - safetyMargin * 0.5;

  const pilotHoleDiameter = suggestPilotDiameter(input);

  const warnings: string[] = [];
  if (throughHoleRisk) {
    warnings.push("Desired depth risks a through-hole blowout.");
  }
  if (input.fastenerLength > input.materialThickness) {
    warnings.push("Fastener length exceeds material thickness.");
  }
  if (minimumSafeDepth <= safetyMargin) {
    warnings.push("Material is too thin for this fastener/depth combination.");
  }
  if (toleranceMode === "tight") {
    warnings.push("Tight tolerance mode assumes frequent collar verification between holes.");
  }

  const assumptions = [
    `Tolerance mode: ${toleranceMode}`,
    "Stop collar setting equals requested drilling depth.",
    "Safety margin is unit/tolerance dependent for blowout protection.",
    "Pilot hole factors are rule-of-thumb by screw type.",
  ];

  const summary = [
    "**Drill Depth & Stop Control**",
    `Tolerance mode: **${toleranceMode}**`,
    `Stop collar setting: **${formatNumber(stopCollarSetting, 3)} ${unitLabel(input.unit)}**`,
    `Minimum safe drilling depth: **${formatNumber(minimumSafeDepth, 3)} ${unitLabel(input.unit)}**`,
    `Through-hole risk: **${throughHoleRisk ? "Yes" : "No"}**`,
    pilotHoleDiameter !== undefined
      ? `Pilot hole suggestion: **${formatNumber(pilotHoleDiameter, 3)} ${unitLabel(input.unit)}**`
      : "Pilot hole suggestion: provide screw diameter to calculate",
    warnings.length ? `Warnings: ${warnings.join(" | ")}` : "Warnings: none",
  ].join("\n");

  return {
    input,
    stopCollarSetting,
    minimumSafeDepth,
    throughHoleRisk,
    pilotHoleDiameter,
    warnings,
    assumptions,
    summary,
  };
}

function validateInput(input: DrillDepthInput): void {
  const required: Array<[string, number]> = [
    ["desired hole depth", input.desiredHoleDepth],
    ["material thickness", input.materialThickness],
    ["fastener length", input.fastenerLength],
  ];
  for (const [label, value] of required) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be a positive number`);
    }
  }

  if (input.screwDiameter !== undefined && (!Number.isFinite(input.screwDiameter) || input.screwDiameter <= 0)) {
    throw new Error("Screw diameter must be a positive number when provided");
  }
}

function suggestPilotDiameter(input: DrillDepthInput): number | undefined {
  if (input.screwDiameter === undefined) {
    return undefined;
  }

  if (!input.screwType || input.screwType === "custom") {
    return input.screwDiameter * 0.75;
  }
  return input.screwDiameter * PILOT_FACTORS[input.screwType];
}

function safetyMarginByUnit(
  unit: DrillDepthInput["unit"],
  mode: NonNullable<DrillDepthInput["toleranceMode"]>,
): number {
  const base = unit === "mm" ? 1.5 : unit === "cm" ? 0.15 : 1 / 16;
  if (mode === "tight") {
    return base * 1.25;
  }
  if (mode === "loose") {
    return base * 0.85;
  }
  return base;
}
