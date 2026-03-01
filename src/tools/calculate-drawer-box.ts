import { calculateDrawerBox } from "../lib/drawer-box";
import { DrawerBoxInput, Unit } from "../types";
import { saveToHistory } from "../utils/history";

type Input = {
  /** Opening width for the drawer bay */
  openingWidth: number;
  /** Target drawer depth */
  drawerDepth: number;
  /** Slide type */
  slideType: "side-mount" | "undermount";
  /** Slide clearance per side */
  slideClearance: number;
  /** Panel material thickness */
  materialThickness: number;
  /** Joinery type */
  joineryType: "butt" | "rabbet" | "dado";
  /** Bottom panel inset depth */
  bottomInsetDepth: number;
  /** Bottom panel thickness */
  bottomThickness: number;
  /** Unit (inches, mm, cm) */
  unit: Unit;
};

export default async function tool(input: Input): Promise<string> {
  try {
    const result = calculateDrawerBox(input as DrawerBoxInput);
    const markdown = [result.summary, "", result.diagram].join("\n");
    await saveToHistory("drawer-box", input as DrawerBoxInput, result.summary);
    return markdown;
  } catch (error) {
    return `Error calculating drawer box: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
