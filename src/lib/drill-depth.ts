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

  const safetyMargin = safetyMarginByUnit(input.unit);
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

  const summary = [
    "**Drill Depth & Stop Control**",
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

function safetyMarginByUnit(unit: DrillDepthInput["unit"]): number {
  if (unit === "mm") {
    return 1.5;
  }
  if (unit === "cm") {
    return 0.15;
  }
  return 1 / 16;
}
