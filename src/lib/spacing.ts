import { SpacingInput, SpacingResult, Unit } from "../types";
import { buildStoryStickDiagram } from "./diagrams";
import { toDecimalInch, toFractionalInch } from "./fractions";

export function calculateSpacing(input: SpacingInput): SpacingResult {
  validateSpacingInput(input);

  const { totalLength, count, elementWidth, edgeOffset = 0, centerToCenter = false } = input;
  const availableLength = totalLength - edgeOffset * 2;

  let gap = 0;
  let positions: number[] = [];

  if (centerToCenter) {
    if (count === 1) {
      const centered = edgeOffset + availableLength / 2 - elementWidth / 2;
      positions = [centered];
      gap = 0;
    } else {
      const ctcSpacing = availableLength / (count - 1);
      gap = ctcSpacing - elementWidth;
      if (gap < 0) {
        throw new Error("Elements overlap with current center-to-center spacing and offsets");
      }
      positions = Array.from({ length: count }, (_, i) => edgeOffset + i * ctcSpacing - elementWidth / 2);
    }
  } else {
    const totalElementWidth = count * elementWidth;
    const totalGapSpace = availableLength - totalElementWidth;
    const gapCount = count + 1;
    gap = totalGapSpace / gapCount;
    if (gap < 0) {
      throw new Error("Elements do not fit in the total length with current width and offsets");
    }
    positions = Array.from({ length: count }, (_, i) => edgeOffset + gap + i * (elementWidth + gap));
  }

  const centerPositions = positions.map((position) => position + elementWidth / 2);
  const repeatingUnit = elementWidth + gap;
  const lastElementEnd = positions[positions.length - 1] + elementWidth;
  const remainingSpace = totalLength - edgeOffset - lastElementEnd;

  const summary = [
    `**${count} elements** across **${formatMeasurement(totalLength, input.unit)}**`,
    `Gap between elements: **${formatMeasurement(gap, input.unit)}**`,
    `Repeating unit: **${formatMeasurement(repeatingUnit, input.unit)}**`,
    `Remaining space: **${formatMeasurement(remainingSpace, input.unit)}**`,
  ].join("\n\n");

  return {
    input,
    gap,
    positions,
    centerPositions,
    remainingSpace,
    repeatingUnit,
    diagram: buildStoryStickDiagram(input, positions, gap),
    summary,
  };
}

function validateSpacingInput(input: SpacingInput): void {
  if (!Number.isFinite(input.totalLength) || input.totalLength <= 0) {
    throw new Error("Total length must be a positive number");
  }
  if (!Number.isInteger(input.count) || input.count <= 0) {
    throw new Error("Element count must be a positive integer");
  }
  if (!Number.isFinite(input.elementWidth) || input.elementWidth <= 0) {
    throw new Error("Element width must be a positive number");
  }

  const edgeOffset = input.edgeOffset ?? 0;
  if (!Number.isFinite(edgeOffset) || edgeOffset < 0) {
    throw new Error("Edge offset must be a non-negative number");
  }

  const availableLength = input.totalLength - edgeOffset * 2;
  if (availableLength <= 0) {
    throw new Error("Edge offsets consume the full length");
  }
}

function formatMeasurement(value: number, unit: Unit): string {
  if (unit === "inches") {
    return `${toFractionalInch(value).display} (${toDecimalInch(value)})`;
  }

  return `${Math.round(value * 1000) / 1000} ${unit}`;
}
