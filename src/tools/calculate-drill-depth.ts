import { calculateDrillDepth } from "../lib/drill-depth";
import { DrillDepthInput, ScrewType, Unit } from "../types";
import { saveToHistory } from "../utils/history";

type Input = {
  /** Desired hole depth */
  desiredHoleDepth: number;
  /** Material thickness */
  materialThickness: number;
  /** Fastener length */
  fastenerLength: number;
  /** Screw type */
  screwType?: ScrewType;
  /** Screw diameter for pilot recommendation */
  screwDiameter?: number;
  /** Unit (inches, mm, cm) */
  unit: Unit;
};

export default async function tool(input: Input): Promise<string> {
  try {
    const result = calculateDrillDepth(input as DrillDepthInput);
    await saveToHistory("drill-depth", input as DrillDepthInput, result.summary);
    return result.summary;
  } catch (error) {
    return `Error calculating drill depth: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
