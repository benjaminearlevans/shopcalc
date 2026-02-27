import { calculateSpacing } from "../lib/spacing";
import { SpacingInput } from "../types";
import { saveToHistory } from "../utils/history";

type Input = {
  /** Total span to distribute elements across */
  totalLength: number;
  /** Number of elements to place */
  count: number;
  /** Width/thickness of each element */
  elementWidth: number;
  /** Measurement unit (defaults to inches) */
  unit?: "inches" | "mm" | "cm";
  /** Offset from each edge before first/last element */
  edgeOffset?: number;
  /** If true, spacing is center-to-center */
  centerToCenter?: boolean;
};

export default async function tool(input: Input): Promise<string> {
  try {
    const spacingInput: SpacingInput = {
      totalLength: input.totalLength,
      count: input.count,
      elementWidth: input.elementWidth,
      unit: input.unit ?? "inches",
      edgeOffset: input.edgeOffset ?? 0,
      centerToCenter: input.centerToCenter ?? false,
    };

    const result = calculateSpacing(spacingInput);
    await saveToHistory("spacing", spacingInput, result.summary);
    return [result.summary, "", result.diagram].join("\n");
  } catch (error) {
    return `Error calculating spacing: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
