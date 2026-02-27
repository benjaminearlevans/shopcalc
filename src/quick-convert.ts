import { Clipboard, LaunchProps, getPreferenceValues, showHUD } from "@raycast/api";
import { evaluateQuickConversion } from "./lib/quick-convert";
import { ExtensionPreferences, FractionPrecision, Unit } from "./types";
import { saveToHistory } from "./utils/history";

type Arguments = {
  query: string;
};

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const query = props.arguments.query?.trim();

  if (!query) {
    await showHUD("Enter an expression like: 12-7/8 in to mm or 32.7cm to in");
    return;
  }

  try {
    const defaultUnit = ((prefs.defaultUnit as Unit) ?? "inches") as Unit;
    const precision = Number(prefs.fractionPrecision || "16") as FractionPrecision;
    const result = evaluateQuickConversion(query, defaultUnit, precision);

    const plain = result.display.replace(/\*\*/g, "");
    const firstLine = plain.split("\n")[1] ?? plain;

    await Clipboard.copy(plain);
    await saveToHistory(
      "quick-convert",
      {
        query,
        defaultUnit,
        precision,
      },
      result.display,
    );

    await showHUD(`${firstLine} (copied)`);
  } catch (error) {
    await showHUD(`Conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
