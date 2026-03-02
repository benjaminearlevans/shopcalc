import { DrawerBoxInput, DrawerBoxResult } from "../types";
import { formatNumber, unitLabel } from "../utils/format";

export function calculateDrawerBox(input: DrawerBoxInput): DrawerBoxResult {
  validateDrawerInput(input);
  const toleranceMode = input.toleranceMode ?? "standard";

  const clearOpeningWidth = input.openingWidth - input.slideClearance * 2;
  const frontBackPanelLength = clearOpeningWidth - input.materialThickness * 2;
  const sidePanelLength = input.drawerDepth;
  const innerDepth = Math.max(0, input.drawerDepth - input.materialThickness * 2);

  const bottomPanelWidth = frontBackPanelLength + input.bottomInsetDepth * 2;
  const bottomPanelLength = innerDepth + input.bottomInsetDepth * 2;
  const rabbetDepth = Math.min(input.materialThickness * 0.5, input.bottomThickness + input.bottomInsetDepth * 0.2);
  const rabbetWidth = input.bottomInsetDepth;

  const spacingBase = input.slideType === "side-mount" ? input.slideClearance : input.slideClearance * 0.5;
  const requiredSlideSpacing = spacingBase + toleranceOffset(input.unit, toleranceMode);

  const warnings: string[] = [];
  if (clearOpeningWidth <= 0) {
    warnings.push("Slide clearance consumes the entire opening width.");
  }
  if (frontBackPanelLength <= 0) {
    warnings.push("Front/back panel length is not positive. Reduce material thickness or slide clearance.");
  }
  if (input.slideType === "undermount" && input.slideClearance > input.materialThickness) {
    warnings.push("Undermount clearance is larger than material thickness. Re-check slide spec.");
  }
  if (toleranceMode === "tight") {
    warnings.push("Tight tolerance selected. Dry-fit one drawer before batch cutting.");
  }

  const assumptions = [
    `Tolerance mode: ${toleranceMode}`,
    "Clear opening subtracts two side clearances and two side panel thicknesses.",
    "Bottom panel is inset equally on width and depth.",
    "Rabbet depth uses a conservative half-thickness cap.",
  ];

  const unit = unitLabel(input.unit);
  const summary = [
    `**Drawer Box (${input.slideType}, ${input.joineryType})**`,
    `Tolerance mode: **${toleranceMode}**`,
    `Side panel length: **${formatNumber(sidePanelLength, 3)} ${unit}**`,
    `Front/back panel length: **${formatNumber(frontBackPanelLength, 3)} ${unit}**`,
    `Bottom panel: **${formatNumber(bottomPanelWidth, 3)} x ${formatNumber(bottomPanelLength, 3)} ${unit}**`,
    `Rabbet: **${formatNumber(rabbetDepth, 3)} ${unit} deep x ${formatNumber(rabbetWidth, 3)} ${unit} wide**`,
    `Required slide spacing: **${formatNumber(requiredSlideSpacing, 3)} ${unit}**`,
    warnings.length ? `Warnings: ${warnings.join(" | ")}` : "Warnings: none",
  ].join("\n");

  const diagram = [
    "```text",
    "Front View (width)",
    `|<- ${formatNumber(input.slideClearance, 3)} ->|<---- clear opening ${formatNumber(clearOpeningWidth, 3)} ---->|<- ${formatNumber(
      input.slideClearance,
      3,
    )} ->|`,
    "",
    "Plan View (depth)",
    `[front] |<--- ${formatNumber(input.materialThickness, 3)} --->|<----- inner ${formatNumber(innerDepth, 3)} ----->|<--- ${formatNumber(
      input.materialThickness,
      3,
    )} --->| [back]`,
    "```",
  ].join("\n");

  return {
    input,
    sidePanelLength,
    frontBackPanelLength,
    bottomPanelWidth,
    bottomPanelLength,
    rabbetDepth,
    rabbetWidth,
    requiredSlideSpacing,
    warnings,
    assumptions,
    diagram,
    summary,
  };
}

function validateDrawerInput(input: DrawerBoxInput): void {
  const values: Array<[string, number]> = [
    ["opening width", input.openingWidth],
    ["drawer depth", input.drawerDepth],
    ["slide clearance", input.slideClearance],
    ["material thickness", input.materialThickness],
    ["bottom inset depth", input.bottomInsetDepth],
    ["bottom thickness", input.bottomThickness],
  ];

  for (const [label, value] of values) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be a positive number`);
    }
  }
}

function toleranceOffset(unit: DrawerBoxInput["unit"], mode: NonNullable<DrawerBoxInput["toleranceMode"]>): number {
  if (mode === "standard") {
    return 0;
  }

  const base = unit === "mm" ? 0.2 : unit === "cm" ? 0.02 : 0.008;
  return mode === "tight" ? -base : base;
}
