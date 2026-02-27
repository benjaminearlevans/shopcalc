import { calculateCutList, formatCutListResult } from "../lib/cutlist";
import { CutListInput, Unit } from "../types";
import { saveToHistory } from "../utils/history";

type PieceInput = {
  /** Piece length */
  length: number;
  /** Piece width */
  width: number;
  /** Quantity for this piece */
  quantity: number;
  /** Optional label */
  label?: string;
};

type Input = {
  /** Pieces to cut */
  pieces: PieceInput[];
  /** Stock type */
  stockType: "board" | "sheet";
  /** Stock length */
  stockLength: number;
  /** Stock width */
  stockWidth: number;
  /** Unit */
  unit?: "inches" | "mm" | "cm";
  /** Kerf width */
  kerf?: number;
  /** Allow rotation for sheet placement */
  allowRotation?: boolean;
};

export default async function tool(input: Input): Promise<string> {
  try {
    const unit = (input.unit ?? "inches") as Unit;
    const cutInput: CutListInput = {
      pieces: input.pieces,
      stock: {
        type: input.stockType,
        length: input.stockLength,
        width: input.stockWidth,
        unit,
      },
      unit,
      kerf: input.kerf ?? 0.125,
      allowRotation: input.allowRotation ?? true,
    };

    const result = calculateCutList(cutInput);
    await saveToHistory("cutlist", cutInput, result.summary);
    return formatCutListResult(result, unit);
  } catch (error) {
    return `Error calculating cut list: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
