import { calculateScribePlan } from "../lib/scribe-planner";
import { saveToHistory } from "../utils/history";
import { ScribePlannerInput, Unit } from "../types";

type Input = {
  /** Nominal wall width */
  nominalWallWidth: number;
  /** High deviation measurement */
  highDeviation: number;
  /** Low deviation measurement */
  lowDeviation: number;
  /** Plumb deviation measurement */
  plumbDeviation: number;
  /** Desired final visible width */
  desiredVisibleWidth: number;
  /** Unit (inches, mm, cm) */
  unit: Unit;
};

export default async function tool(input: Input): Promise<string> {
  try {
    const result = calculateScribePlan(input as ScribePlannerInput);
    await saveToHistory("scribe-planner", input as ScribePlannerInput, result.summary);
    return result.summary;
  } catch (error) {
    return `Error planning scribe oversize: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
