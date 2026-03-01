import { SlideCoordinate, SlideLayoutInput, SlideLayoutResult } from "../types";
import { formatNumber, unitLabel } from "../utils/format";

export function calculateSlideLayout(input: SlideLayoutInput): SlideLayoutResult {
  validateInput(input);

  const stackHeight = input.drawerCount * input.slideThickness + (input.drawerCount - 1) * input.gapSpacing;
  const availableHeight = input.cabinetInteriorHeight - input.topMargin;
  if (stackHeight > availableHeight) {
    throw new Error("Drawer stack is taller than available cabinet interior height");
  }

  const coordinates: SlideCoordinate[] = [];
  for (let i = 0; i < input.drawerCount; i += 1) {
    const topY = input.topMargin + i * (input.slideThickness + input.gapSpacing);
    const centerY = topY + input.slideThickness / 2;
    const bottomY = topY + input.slideThickness;
    coordinates.push({ drawerIndex: i + 1, topY, centerY, bottomY });
  }

  const spacerBlockHeight = input.slideThickness + input.gapSpacing;
  const laserBaselineOffset = input.topMargin;

  const summary = [
    "**Slide Layout**",
    `Top baseline offset: **${formatNumber(laserBaselineOffset, 3)} ${unitLabel(input.unit)}**`,
    `Spacer block height: **${formatNumber(spacerBlockHeight, 3)} ${unitLabel(input.unit)}**`,
    "",
    ...coordinates.map(
      (coordinate) =>
        `Drawer ${coordinate.drawerIndex}: top ${formatNumber(coordinate.topY, 3)}, center ${formatNumber(
          coordinate.centerY,
          3,
        )}, bottom ${formatNumber(coordinate.bottomY, 3)} ${unitLabel(input.unit)}`,
    ),
  ].join("\n");

  const diagram = [
    "```text",
    `Top margin: ${formatNumber(input.topMargin, 3)} ${unitLabel(input.unit)}`,
    ...coordinates.map(
      (coordinate) =>
        `[D${coordinate.drawerIndex}] top=${formatNumber(coordinate.topY, 3)} center=${formatNumber(
          coordinate.centerY,
          3,
        )} bottom=${formatNumber(coordinate.bottomY, 3)}`,
    ),
    "```",
  ].join("\n");

  return {
    input,
    coordinates,
    spacerBlockHeight,
    laserBaselineOffset,
    diagram,
    summary,
  };
}

function validateInput(input: SlideLayoutInput): void {
  const positiveValues: Array<[string, number]> = [
    ["cabinet interior height", input.cabinetInteriorHeight],
    ["top margin", input.topMargin],
    ["gap spacing", input.gapSpacing],
    ["slide thickness", input.slideThickness],
  ];
  for (const [label, value] of positiveValues) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be a positive number`);
    }
  }
  if (!Number.isInteger(input.drawerCount) || input.drawerCount <= 0) {
    throw new Error("Drawer count must be a whole number greater than zero");
  }
}
