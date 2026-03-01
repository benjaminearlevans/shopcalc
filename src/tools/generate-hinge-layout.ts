import { calculateHingeLayout } from "../lib/hinge-layout";
import { HingeLayoutInput, Unit } from "../types";
import { saveToHistory } from "../utils/history";

type Input = {
  /** Door height */
  doorHeight: number;
  /** Top hinge offset */
  topHingeOffset: number;
  /** Bottom hinge offset */
  bottomHingeOffset: number;
  /** Cup diameter */
  cupDiameter: number;
  /** Edge setback */
  edgeSetback: number;
  /** Overlay or inset */
  mode: "overlay" | "inset";
  /** Unit (inches, mm, cm) */
  unit: Unit;
  /** Include printable STL params */
  includeStlParams?: boolean;
};

export default async function tool(input: Input): Promise<string> {
  try {
    const result = calculateHingeLayout(input as HingeLayoutInput);
    const sections = [result.summary];
    if (result.stlParams) {
      sections.push("", "```json", result.stlParams, "```");
    }
    await saveToHistory("hinge-layout", input as HingeLayoutInput, result.summary);
    return sections.join("\n");
  } catch (error) {
    return `Error generating hinge layout: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
