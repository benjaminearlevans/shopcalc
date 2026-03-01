import { ToolContext } from "../types";

type SafetyMap = Record<Exclude<ToolContext, "none">, string[]>;

const SAFETY_CHECKS: SafetyMap = {
  router: [
    "Cut against bit rotation direction",
    "Apply tear-out mask/tape on exit edge",
    "Clamp workpiece before plunge pass",
  ],
  "table-saw": [
    "Confirm fence is parallel to blade",
    "Verify blade alignment and height",
    "Check offcut path for binding risk",
  ],
  drill: ["Center punch marked", "Pilot hole decision verified", "Stop collar is tightened and locked"],
  "pocket-screw": [
    "Set drill guide depth for stock thickness",
    "Clamp joint before driving screw",
    "Use matching screw length to avoid blowout",
  ],
};

export function getSafetyChecklist(context: ToolContext | undefined): string[] {
  if (!context || context === "none") {
    return [];
  }
  return SAFETY_CHECKS[context];
}

export function formatSafetyChecklist(context: ToolContext | undefined): string {
  const checks = getSafetyChecklist(context);
  if (!checks.length) {
    return "No safety prompt selected.";
  }
  return ["**Force-Vector Safety Check**", ...checks.map((item, index) => `${index + 1}. ${item}`)].join("\n");
}
