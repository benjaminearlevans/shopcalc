import { calculateAngle } from "../lib/angles";
import { AngleInput, AngleMode } from "../types";
import { saveToHistory } from "../utils/history";

type Input = {
  /** Calculation mode: miter, bevel, compound, polygon, stair-rail */
  mode: "miter" | "bevel" | "compound" | "polygon" | "stair-rail";
  /** Joint/slope angle in degrees */
  slopeAngle?: number;
  /** Number of polygon sides */
  sides?: number;
  /** Tilt angle for compound cuts */
  tiltAngle?: number;
  /** Stair rise when using rise/run input */
  rise?: number;
  /** Stair run when using rise/run input */
  run?: number;
};

export default async function tool(input: Input): Promise<string> {
  try {
    const angleInput: AngleInput = {
      mode: input.mode as AngleMode,
      slopeAngle: input.slopeAngle,
      sides: input.sides,
      tiltAngle: input.tiltAngle,
      rise: input.rise,
      run: input.run,
      unit: input.rise && input.run ? "rise-run" : "degrees",
    };

    const result = calculateAngle(angleInput);
    await saveToHistory("angle", angleInput, result.summary);
    return [result.summary, "", `**Saw setting**: ${result.bladeSetting}`].join("\n");
  } catch (error) {
    return `Error calculating angle: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
