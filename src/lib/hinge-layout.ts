import { HingeLayoutInput, HingeLayoutResult } from "../types";
import { formatNumber, unitLabel } from "../utils/format";

export function calculateHingeLayout(input: HingeLayoutInput): HingeLayoutResult {
  validateInput(input);

  const topHoleY = input.topHingeOffset;
  const bottomHoleY = input.doorHeight - input.bottomHingeOffset;
  const cupCenterX = input.edgeSetback + input.cupDiameter / 2;

  const mirrorSafe = Math.abs(input.topHingeOffset - input.bottomHingeOffset) < toleranceForUnit(input.unit);
  const printableTemplateRef = `Template origin at top-left; drill cup centers at X=${formatNumber(cupCenterX, 3)} ${unitLabel(
    input.unit,
  )}, Y=${formatNumber(topHoleY, 3)} and ${formatNumber(bottomHoleY, 3)} ${unitLabel(input.unit)}`;

  const warnings: string[] = [];
  if (input.edgeSetback < input.cupDiameter * 0.15) {
    warnings.push("Cup setback is very small; hinge may break edge.");
  }
  if (bottomHoleY <= topHoleY) {
    warnings.push("Top and bottom hinge coordinates overlap. Increase door height or adjust offsets.");
  }
  if (!mirrorSafe) {
    warnings.push("Top and bottom offsets are not symmetric.");
  }

  const stlParams = input.includeStlParams
    ? JSON.stringify(
        {
          cupDiameter: round3(input.cupDiameter),
          edgeSetback: round3(input.edgeSetback),
          topOffset: round3(input.topHingeOffset),
          bottomOffset: round3(input.bottomHingeOffset),
          mode: input.mode,
        },
        null,
        2,
      )
    : undefined;

  const summary = [
    `**Hinge Layout (${input.mode})**`,
    `Top cup center: **X ${formatNumber(cupCenterX, 3)}, Y ${formatNumber(topHoleY, 3)} ${unitLabel(input.unit)}**`,
    `Bottom cup center: **X ${formatNumber(cupCenterX, 3)}, Y ${formatNumber(bottomHoleY, 3)} ${unitLabel(input.unit)}**`,
    `Mirror-safe layout: **${mirrorSafe ? "Yes" : "No"}**`,
    `Template reference: ${printableTemplateRef}`,
    warnings.length ? `Warnings: ${warnings.join(" | ")}` : "Warnings: none",
  ].join("\n");

  return {
    input,
    topHoleY,
    bottomHoleY,
    cupCenterX,
    mirrorSafe,
    printableTemplateRef,
    stlParams,
    warnings,
    summary,
  };
}

function validateInput(input: HingeLayoutInput): void {
  const values: Array<[string, number]> = [
    ["door height", input.doorHeight],
    ["top hinge offset", input.topHingeOffset],
    ["bottom hinge offset", input.bottomHingeOffset],
    ["cup diameter", input.cupDiameter],
    ["edge setback", input.edgeSetback],
  ];

  for (const [label, value] of values) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be a positive number`);
    }
  }

  if (input.topHingeOffset + input.bottomHingeOffset >= input.doorHeight) {
    throw new Error("Top + bottom hinge offsets exceed door height");
  }
}

function toleranceForUnit(unit: HingeLayoutInput["unit"]): number {
  if (unit === "mm") {
    return 1;
  }
  if (unit === "cm") {
    return 0.1;
  }
  return 1 / 32;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
