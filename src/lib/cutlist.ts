import { BoardLayout, CutListInput, CutListResult, CutPiece, SheetPlacement, StockMaterial, Unit } from "../types";
import { formatNumber, round, unitLabel } from "../utils/format";
import { buildBoardLayoutDiagram, buildSheetLayoutDiagram, cutPieceLabel } from "./diagrams";

interface ExpandedPiece {
  label: string;
  length: number;
  width: number;
}

interface FreeRect {
  x: number;
  y: number;
  length: number;
  width: number;
}

interface PlacementCandidate {
  rectIndex: number;
  rotated: boolean;
  wasteArea: number;
  placedLength: number;
  placedWidth: number;
}

export function calculateCutList(input: CutListInput): CutListResult {
  validateCutListInput(input);
  const toleranceMode = input.toleranceMode ?? "standard";
  const toleranceKerfOffset = kerfOffset(input.unit, toleranceMode);
  const normalizedInput: CutListInput = {
    ...input,
    kerf: Math.max(0, input.kerf + toleranceKerfOffset),
  };

  const pieces = expandPieces(normalizedInput.pieces);
  const sortedPieces = [...pieces].sort((a, b) => b.length * b.width - a.length * a.width);

  if (normalizedInput.stock.type === "board") {
    return calculateBoardCutList(normalizedInput, sortedPieces);
  }

  return calculateSheetCutList(normalizedInput, sortedPieces);
}

function calculateBoardCutList(input: CutListInput, pieces: ExpandedPiece[]): CutListResult {
  const { stock, kerf } = input;
  const boards: { pieces: ExpandedPiece[]; usedLength: number }[] = [];

  const sortedByLength = [...pieces].sort((a, b) => b.length - a.length);

  for (const piece of sortedByLength) {
    let placed = false;

    for (const board of boards) {
      const extraKerf = board.pieces.length > 0 ? kerf : 0;
      const requiredLength = piece.length + extraKerf;
      if (board.usedLength + requiredLength <= stock.length + 1e-9) {
        board.pieces.push(piece);
        board.usedLength += requiredLength;
        placed = true;
        break;
      }
    }

    if (!placed) {
      boards.push({ pieces: [piece], usedLength: piece.length });
    }
  }

  const boardLayouts: BoardLayout[] = boards.map((board, index) => ({
    stockIndex: index,
    pieceLabels: board.pieces.map(
      (piece) => `${piece.label} (${formatNumber(piece.length, 3)}x${formatNumber(piece.width, 3)})`,
    ),
    usedLength: round(board.usedLength, 4),
    remainingLength: round(stock.length - board.usedLength, 4),
  }));

  const totalCapacity = boards.length * stock.length;
  const totalUsedLength = boards.reduce((sum, board) => sum + board.usedLength, 0);
  const waste = Math.max(0, totalCapacity - totalUsedLength);
  const wastePercent = totalCapacity > 0 ? (waste / totalCapacity) * 100 : 0;
  const totalKerf = boards.reduce((sum, board) => sum + Math.max(0, board.pieces.length - 1) * kerf, 0);
  const totalPieceLength = pieces.reduce((sum, piece) => sum + piece.length, 0);
  const totalCutLength = totalPieceLength + totalKerf;

  const layout = buildBoardLayoutDiagram(boardLayouts, stock.length, unitLabel(input.unit));
  const summary = [
    `Tolerance mode: **${input.toleranceMode ?? "standard"}**`,
    `**Stock needed**: ${boards.length} board(s)`,
    `**Total cut length**: ${formatNumber(totalCutLength, 3)} ${unitLabel(input.unit)}`,
    `**Waste**: ${formatNumber(waste, 3)} ${unitLabel(input.unit)} (${formatNumber(wastePercent, 2)}%)`,
  ].join("\n\n");
  const assumptions = [
    `Tolerance mode: ${input.toleranceMode ?? "standard"}`,
    "Board optimizer uses first-fit decreasing by length.",
    "Kerf is added only between adjacent cuts on the same board.",
    "Result is a heuristic estimate and not globally optimal.",
  ];

  return {
    input,
    stockNeeded: boards.length,
    totalCutLength: round(totalCutLength, 4),
    waste: round(waste, 4),
    wastePercent: round(wastePercent, 4),
    layout,
    boardLayouts,
    assumptions,
    summary,
  };
}

function calculateSheetCutList(input: CutListInput, pieces: ExpandedPiece[]): CutListResult {
  const { stock, kerf, allowRotation = true } = input;

  const sheets: { freeRects: FreeRect[] }[] = [];
  const placements: SheetPlacement[] = [];

  for (const piece of pieces) {
    let placed = false;

    for (let stockIndex = 0; stockIndex < sheets.length && !placed; stockIndex += 1) {
      const placement = placeOnSheet(sheets[stockIndex], piece, stockIndex, kerf, allowRotation);
      if (placement) {
        placements.push(placement);
        placed = true;
      }
    }

    if (!placed) {
      const sheet = {
        freeRects: [{ x: 0, y: 0, length: stock.length, width: stock.width }],
      };
      sheets.push(sheet);
      const newStockIndex = sheets.length - 1;
      const placement = placeOnSheet(sheet, piece, newStockIndex, kerf, allowRotation);
      if (!placement) {
        throw new Error(`Piece ${piece.label} does not fit in stock sheet`);
      }
      placements.push(placement);
    }
  }

  const totalStockArea = sheets.length * stock.length * stock.width;
  const totalPieceArea = pieces.reduce((sum, piece) => sum + piece.length * piece.width, 0);
  const waste = Math.max(0, totalStockArea - totalPieceArea);
  const wastePercent = totalStockArea > 0 ? (waste / totalStockArea) * 100 : 0;
  const totalCutLength = pieces.reduce((sum, piece) => sum + (piece.length + piece.width) * 2, 0);

  const layout = buildSheetLayoutDiagram(placements, stock.length, stock.width, unitLabel(input.unit));
  const summary = [
    `Tolerance mode: **${input.toleranceMode ?? "standard"}**`,
    `**Stock needed**: ${sheets.length} sheet(s)`,
    `**Total cut length**: ${formatNumber(totalCutLength, 3)} ${unitLabel(input.unit)}`,
    `**Waste**: ${formatNumber(waste, 3)} ${unitLabel(input.unit)}² (${formatNumber(wastePercent, 2)}%)`,
  ].join("\n\n");
  const assumptions = [
    `Tolerance mode: ${input.toleranceMode ?? "standard"}`,
    `Rotation allowed: ${allowRotation ? "yes" : "no"}`,
    "Sheet optimizer uses deterministic guillotine free-rectangle placement.",
    "Result is a heuristic estimate and not globally optimal.",
  ];

  return {
    input,
    stockNeeded: sheets.length,
    totalCutLength: round(totalCutLength, 4),
    waste: round(waste, 4),
    wastePercent: round(wastePercent, 4),
    layout,
    sheetPlacements: placements,
    assumptions,
    summary,
  };
}

function placeOnSheet(
  sheet: { freeRects: FreeRect[] },
  piece: ExpandedPiece,
  stockIndex: number,
  kerf: number,
  allowRotation: boolean,
): SheetPlacement | null {
  let best: PlacementCandidate | undefined;

  for (let rectIndex = 0; rectIndex < sheet.freeRects.length; rectIndex += 1) {
    const rect = sheet.freeRects[rectIndex];
    const options = [
      { rotated: false, length: piece.length, width: piece.width },
      ...(allowRotation ? [{ rotated: true, length: piece.width, width: piece.length }] : []),
    ];

    for (const option of options) {
      if (option.length <= rect.length + 1e-9 && option.width <= rect.width + 1e-9) {
        const wasteArea = rect.length * rect.width - option.length * option.width;
        if (!best || wasteArea < best.wasteArea) {
          best = {
            rectIndex,
            rotated: option.rotated,
            wasteArea,
            placedLength: option.length,
            placedWidth: option.width,
          };
        }
      }
    }
  }

  if (best === undefined) {
    return null;
  }

  const targetRect = sheet.freeRects[best.rectIndex];
  sheet.freeRects.splice(best.rectIndex, 1);

  const rightRectLength = targetRect.length - best.placedLength - kerf;
  const bottomRectWidth = targetRect.width - best.placedWidth - kerf;

  if (rightRectLength > 1e-9) {
    sheet.freeRects.push({
      x: targetRect.x + best.placedLength + kerf,
      y: targetRect.y,
      length: rightRectLength,
      width: best.placedWidth,
    });
  }

  if (bottomRectWidth > 1e-9) {
    sheet.freeRects.push({
      x: targetRect.x,
      y: targetRect.y + best.placedWidth + kerf,
      length: targetRect.length,
      width: bottomRectWidth,
    });
  }

  return {
    stockIndex,
    pieceLabel: piece.label,
    x: round(targetRect.x, 4),
    y: round(targetRect.y, 4),
    length: round(best.placedLength, 4),
    width: round(best.placedWidth, 4),
    rotated: best.rotated,
  };
}

function expandPieces(pieces: CutPiece[]): ExpandedPiece[] {
  const expanded: ExpandedPiece[] = [];

  pieces.forEach((piece, pieceIndex) => {
    for (let i = 0; i < piece.quantity; i += 1) {
      const base = cutPieceLabel(piece, pieceIndex);
      const label = piece.quantity > 1 ? `${base} #${i + 1}` : base;
      expanded.push({ label, length: piece.length, width: piece.width });
    }
  });

  return expanded;
}

function validateCutListInput(input: CutListInput): void {
  if (!input.pieces.length) {
    throw new Error("At least one cut piece is required");
  }
  if (!isFinitePositive(input.stock.length) || !isFinitePositive(input.stock.width)) {
    throw new Error("Stock dimensions must be positive numbers");
  }
  if (!Number.isFinite(input.kerf) || input.kerf < 0) {
    throw new Error("Kerf must be a non-negative number");
  }

  input.pieces.forEach((piece, index) => {
    if (!isFinitePositive(piece.length) || !isFinitePositive(piece.width)) {
      throw new Error(`Piece ${index + 1} has invalid dimensions`);
    }
    if (!Number.isInteger(piece.quantity) || piece.quantity <= 0) {
      throw new Error(`Piece ${index + 1} quantity must be a positive integer`);
    }

    ensurePieceFitsStock(piece, input.stock, input.allowRotation ?? true);
  });
}

function ensurePieceFitsStock(piece: CutPiece, stock: StockMaterial, allowRotation: boolean): void {
  if (stock.type === "board") {
    if (piece.length > stock.length + 1e-9) {
      throw new Error(`Piece length ${piece.length} exceeds board length ${stock.length}`);
    }
    if (piece.width > stock.width + 1e-9) {
      throw new Error(`Piece width ${piece.width} exceeds board width ${stock.width}`);
    }
    return;
  }

  const directFit = piece.length <= stock.length + 1e-9 && piece.width <= stock.width + 1e-9;
  const rotatedFit = allowRotation && piece.width <= stock.length + 1e-9 && piece.length <= stock.width + 1e-9;
  if (!directFit && !rotatedFit) {
    throw new Error(`Piece ${piece.length}x${piece.width} does not fit stock sheet ${stock.length}x${stock.width}`);
  }
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function parsePieceLines(raw: string): CutPiece[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  return lines.map((line, index) => {
    const fields = line.split(",").map((field) => field.trim());
    if (fields.length < 3) {
      throw new Error(`Line ${index + 1} must be length,width,qty[,label]`);
    }

    const length = Number(fields[0]);
    const width = Number(fields[1]);
    const quantity = Number(fields[2]);
    const label = fields[3];

    if (!isFinitePositive(length) || !isFinitePositive(width) || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Line ${index + 1} has invalid numbers`);
    }

    return {
      length,
      width,
      quantity,
      label,
    };
  });
}

export function formatCutListResult(result: CutListResult, unit: Unit): string {
  const assumptions = result.assumptions?.length
    ? ["", "**Assumptions**", ...result.assumptions.map((item) => `- ${item}`)].join("\n")
    : "";
  return [result.summary, assumptions, "", result.layout, "", `_Unit: ${unitLabel(unit)}_`].join("\n");
}

function kerfOffset(unit: Unit, toleranceMode: NonNullable<CutListInput["toleranceMode"]>): number {
  if (toleranceMode === "standard") {
    return 0;
  }
  const base = unit === "mm" ? 0.1 : unit === "cm" ? 0.01 : 0.004;
  return toleranceMode === "tight" ? base : -base;
}
