import { convertUnits } from "../lib/conversion";
import { ConversionInput, FractionPrecision } from "../types";
import { saveToHistory } from "../utils/history";

type Input = {
  /** Numeric value to convert */
  value: number;
  /** Source unit (inches, mm, or cm) */
  from: "inches" | "mm" | "cm";
  /** Fraction precision for inch output (8,16,32,64) */
  precision?: number;
};

export default async function tool(input: Input): Promise<string> {
  try {
    const conversionInput: ConversionInput = {
      value: input.value,
      from: input.from,
      precision: (input.precision ?? 16) as FractionPrecision,
    };

    const result = convertUnits(conversionInput);
    await saveToHistory("conversion", conversionInput, result.summary);
    return result.summary;
  } catch (error) {
    return `Error converting units: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
