import { BoardLayout, CutPiece, SheetPlacement, SpacingInput } from "../types";
import { formatNumber } from "../utils/format";
import { toFractionalInch, toDecimalInch } from "./fractions";

export function buildStoryStickDiagram(input: SpacingInput, positions: number[], gap: number): string {
  const { totalLength, elementWidth, count, unit } = input;
  const safeLength = Math.max(totalLength, 1e-6);
  const scaleWidth = 60;

  const lines: string[] = [];
  lines.push(
    `**Story Stick Layout** - ${count} x ${formatStoryValue(elementWidth, unit)} across ${formatStoryValue(totalLength, unit)}`,
  );
  lines.push("");
  lines.push("```");

  const scale = scaleWidth / safeLength;
  const scaledPositions = positions.map((p) => Math.max(0, Math.min(scaleWidth, Math.round(p * scale))));
  const scaledElementWidth = Math.max(1, Math.round(elementWidth * scale));

  let ruler = "";
  for (let i = 0; i <= scaleWidth; i += 1) {
    const isElement = scaledPositions.some((start) => i >= start && i < start + scaledElementWidth);
    ruler += isElement ? "#" : ".";
  }
  lines.push(ruler);

  let markers = "";
  for (let i = 0; i <= scaleWidth; i += 1) {
    markers += scaledPositions.includes(i) ? "^" : " ";
  }
  lines.push(markers);
  lines.push("");

  positions.forEach((position, index) => {
    lines.push(`  #${index + 1}: ${formatStoryValue(position, unit)}`);
  });

  lines.push("```");
  lines.push("");
  lines.push(`Gap: ${formatStoryValue(gap, unit)}`);

  return lines.join("\n");
}

function formatStoryValue(value: number, unit: SpacingInput["unit"]): string {
  if (unit === "inches") {
    return `${toFractionalInch(value).display} (${toDecimalInch(value)})`;
  }
  return `${formatNumber(value, 3)} ${unit}`;
}

export function buildBoardLayoutDiagram(layouts: BoardLayout[], stockLength: number, unit: string): string {
  const lines: string[] = [];
  lines.push("**Board Layout**");
  lines.push("");
  lines.push("```");

  layouts.forEach((layout) => {
    const used = formatNumber(layout.usedLength, 3);
    const remaining = formatNumber(layout.remainingLength, 3);
    lines.push(`Board ${layout.stockIndex + 1}: [${layout.pieceLabels.join(" | ")}]`);
    lines.push(`  used=${used}${unit} remaining=${remaining}${unit} of ${stockLength}${unit}`);
  });

  lines.push("```");
  return lines.join("\n");
}

export function buildSheetLayoutDiagram(
  placements: SheetPlacement[],
  stockLength: number,
  stockWidth: number,
  unit: string,
): string {
  const lines: string[] = [];
  lines.push("**Sheet Placements**");
  lines.push("");
  lines.push("```");

  const bySheet = new Map<number, SheetPlacement[]>();
  placements.forEach((placement) => {
    const existing = bySheet.get(placement.stockIndex) ?? [];
    existing.push(placement);
    bySheet.set(placement.stockIndex, existing);
  });

  [...bySheet.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([stockIndex, sheetPlacements]) => {
      lines.push(`Sheet ${stockIndex + 1} (${stockLength}x${stockWidth}${unit}):`);
      sheetPlacements.forEach((placement) => {
        const rotated = placement.rotated ? " rotated" : "";
        lines.push(
          `  - ${placement.pieceLabel} at (${formatNumber(placement.x, 2)}, ${formatNumber(placement.y, 2)}) size ${formatNumber(
            placement.length,
            2,
          )}x${formatNumber(placement.width, 2)}${unit}${rotated}`,
        );
      });
    });

  lines.push("```");
  return lines.join("\n");
}

export function cutPieceLabel(piece: CutPiece, index: number): string {
  if (piece.label?.trim()) {
    return piece.label.trim();
  }
  return `Piece ${index + 1}`;
}
