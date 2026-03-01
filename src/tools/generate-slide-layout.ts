import { calculateSlideLayout } from "../lib/slide-layout";
import { saveToHistory } from "../utils/history";
import { SlideLayoutInput, Unit } from "../types";

type Input = {
  /** Cabinet interior height */
  cabinetInteriorHeight: number;
  /** Number of drawers */
  drawerCount: number;
  /** Top margin from cabinet top */
  topMargin: number;
  /** Gap spacing between slides */
  gapSpacing: number;
  /** Slide thickness */
  slideThickness: number;
  /** Unit (inches, mm, cm) */
  unit: Unit;
};

export default async function tool(input: Input): Promise<string> {
  try {
    const result = calculateSlideLayout(input as SlideLayoutInput);
    await saveToHistory("slide-layout", input as SlideLayoutInput, result.summary);
    return [result.summary, "", result.diagram].join("\n");
  } catch (error) {
    return `Error generating slide layout: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
