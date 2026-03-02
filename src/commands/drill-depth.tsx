import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LaunchType,
  LaunchProps,
  Toast,
  getPreferenceValues,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { calculateDrillDepth } from "../lib/drill-depth";
import { parseMeasurementInput } from "../lib/measurements";
import { formatSafetyChecklist } from "../lib/safety";
import {
  DrillDepthInput,
  DrillDepthResult,
  ExtensionPreferences,
  ScrewType,
  ToleranceMode,
  ToolContext,
  Unit,
} from "../types";
import { saveToHistory } from "../utils/history";
import { saveJobRevision } from "../utils/jobs";
import { getActiveProfile } from "../utils/profiles";

interface DrillFormValues {
  desiredHoleDepth: string;
  materialThickness: string;
  fastenerLength: string;
  screwType: ScrewType;
  screwDiameter: string;
  unit: Unit;
  toolContext: ToolContext;
  detailMode: "basic" | "advanced";
  toleranceMode: ToleranceMode;
}

type DrillArgs = {
  prefill?: string;
};

export default function DrillDepthCommand(props: LaunchProps<{ arguments: DrillArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parsePrefill(props.arguments.prefill);
  const hasPrefill = Boolean(props.arguments.prefill);
  const { data: activeProfile } = useCachedPromise(getActiveProfile, [prefs]);

  const [desiredHoleDepth, setDesiredHoleDepth] = useState(prefill.desiredHoleDepth ?? "");
  const [materialThickness, setMaterialThickness] = useState(prefill.materialThickness ?? "");
  const [fastenerLength, setFastenerLength] = useState(prefill.fastenerLength ?? "");
  const [screwType, setScrewType] = useState<ScrewType>(prefill.screwType ?? "wood");
  const [screwDiameter, setScrewDiameter] = useState(prefill.screwDiameter ?? "");
  const [unit, setUnit] = useState<Unit>(prefill.unit ?? (prefs.defaultUnit as Unit) ?? "inches");
  const [toolContext, setToolContext] = useState<ToolContext>(prefill.toolContext ?? "drill");
  const [detailMode, setDetailMode] = useState<"basic" | "advanced">("basic");
  const [toleranceMode, setToleranceMode] = useState<ToleranceMode>(prefill.toleranceMode ?? "standard");

  useEffect(() => {
    if (!activeProfile || hasPrefill) {
      return;
    }
    setUnit(activeProfile.unit);
    setToolContext(activeProfile.toolContext === "none" ? "drill" : activeProfile.toolContext);
    setToleranceMode(activeProfile.toleranceMode);
  }, [activeProfile, hasPrefill]);

  const preview = useMemo(() => {
    try {
      const input = parseInput({
        desiredHoleDepth,
        materialThickness,
        fastenerLength,
        screwType,
        screwDiameter,
        unit,
        toolContext,
        detailMode,
        toleranceMode,
      });
      if (!input) {
        return "Live preview: enter depth, material thickness, and fastener length.";
      }
      const result = calculateDrillDepth(input);
      return `Live preview: collar ${result.stopCollarSetting.toFixed(3)} ${unit}, through-hole risk ${result.throughHoleRisk ? "yes" : "no"}`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [desiredHoleDepth, materialThickness, fastenerLength, screwType, screwDiameter, unit, toolContext, toleranceMode]);

  async function handleSubmit(values: DrillFormValues) {
    try {
      const input = parseInput(values);
      if (!input) {
        throw new Error("Enter all required values.");
      }
      const result = calculateDrillDepth(input);
      await saveToHistory("drill-depth", input, result.summary);
      push(<DrillResultView result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check drill depth inputs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function loadExample() {
    setDesiredHoleDepth("0.75");
    setMaterialThickness("0.875");
    setFastenerLength("1.25");
    setScrewType("wood");
    setScrewDiameter("0.164");
    setUnit("inches");
    setToolContext("drill");
    setDetailMode("advanced");
    setToleranceMode("standard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Drill Depth Control" onSubmit={handleSubmit} />
          <Action title="Load Example" onAction={loadExample} />
          <Action
            title="Open Guided Start"
            onAction={() => launchCommand({ name: "guided-start", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Set stop-collar depth and through-hole risk checks for safer drilling." />
      <Form.Dropdown
        id="detailMode"
        title="Mode"
        value={detailMode}
        onChange={(value) => setDetailMode(value as "basic" | "advanced")}
      >
        <Form.Dropdown.Item value="basic" title="Basic" />
        <Form.Dropdown.Item value="advanced" title="Advanced" />
      </Form.Dropdown>
      <Form.TextField
        id="desiredHoleDepth"
        title="Desired Hole Depth"
        value={desiredHoleDepth}
        onChange={setDesiredHoleDepth}
        placeholder="0.75"
        info='Target blind-hole depth. Accepts suffix/fraction (0.75, 19mm, 3/4").'
        autoFocus
      />
      <Form.TextField
        id="materialThickness"
        title="Material Thickness"
        value={materialThickness}
        onChange={setMaterialThickness}
        placeholder="0.875"
        info="Actual stock thickness at drilling point. Accepts suffix/fraction."
      />
      <Form.TextField
        id="fastenerLength"
        title="Fastener Length"
        value={fastenerLength}
        onChange={setFastenerLength}
        placeholder="1.25"
        info="Installed fastener length. Accepts suffix/fraction."
      />
      <Form.Dropdown
        id="screwType"
        title="Screw Type"
        value={screwType}
        onChange={(value) => setScrewType(value as ScrewType)}
      >
        <Form.Dropdown.Item value="wood" title="Wood Screw" />
        <Form.Dropdown.Item value="sheet-metal" title="Sheet Metal" />
        <Form.Dropdown.Item value="lag" title="Lag Screw" />
        <Form.Dropdown.Item value="confirmat" title="Confirmat" />
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>
      {detailMode === "advanced" ? (
        <Form.TextField
          id="screwDiameter"
          title="Screw Diameter (optional)"
          value={screwDiameter}
          onChange={setScrewDiameter}
          placeholder="0.164"
          info="Major screw diameter for pilot recommendation. Accepts suffix/fraction."
        />
      ) : null}
      <Form.Dropdown id="unit" title="Unit" value={unit} onChange={(value) => setUnit(value as Unit)}>
        <Form.Dropdown.Item value="inches" title="Inches" />
        <Form.Dropdown.Item value="mm" title="Millimeters" />
        <Form.Dropdown.Item value="cm" title="Centimeters" />
      </Form.Dropdown>
      {detailMode === "advanced" ? (
        <>
          <Form.Dropdown
            id="toolContext"
            title="Safety Tool Context"
            value={toolContext}
            onChange={(value) => setToolContext(value as ToolContext)}
            info="Shows force-vector safety checklist in the output."
          >
            <Form.Dropdown.Item value="none" title="None" />
            <Form.Dropdown.Item value="router" title="Router" />
            <Form.Dropdown.Item value="table-saw" title="Table Saw" />
            <Form.Dropdown.Item value="drill" title="Drill" />
            <Form.Dropdown.Item value="pocket-screw" title="Pocket Screw" />
          </Form.Dropdown>
          <Form.Dropdown
            id="toleranceMode"
            title="Tolerance Mode"
            value={toleranceMode}
            onChange={(value) => setToleranceMode(value as ToleranceMode)}
            info="Tight mode increases safety margin from the back face."
          >
            <Form.Dropdown.Item value="tight" title="Tight" />
            <Form.Dropdown.Item value="standard" title="Standard" />
            <Form.Dropdown.Item value="loose" title="Loose" />
          </Form.Dropdown>
        </>
      ) : null}
      <Form.Separator />
      <Form.Description text={preview} />
    </Form>
  );
}

function DrillResultView({ result }: { result: DrillDepthResult }) {
  const warningStatus = result.warnings.length ? `Caution (${result.warnings.length})` : "Clear";
  const controlTable = [
    "| Parameter | Value |",
    "| --- | --- |",
    `| Stop collar setting | ${result.stopCollarSetting.toFixed(3)} ${result.input.unit} |`,
    `| Minimum safe depth | ${result.minimumSafeDepth.toFixed(3)} ${result.input.unit} |`,
    `| Through-hole risk | ${result.throughHoleRisk ? "Yes" : "No"} |`,
    `| Pilot recommendation | ${result.pilotHoleDiameter !== undefined ? `${result.pilotHoleDiameter.toFixed(3)} ${result.input.unit}` : "Not provided"} |`,
  ].join("\n");
  const axisDiagram = [
    "```text",
    `Surface -> |=========== stock ${result.input.materialThickness.toFixed(3)} ${result.input.unit} ===========|`,
    `Depth stop @ ${result.stopCollarSetting.toFixed(3)} ${result.input.unit}`,
    `Safe max before blowout ~ ${(result.input.materialThickness - 0.001).toFixed(3)} ${result.input.unit}`,
    "```",
  ].join("\n");
  const markdown = [
    result.summary,
    "",
    "**Drill Control Table**",
    controlTable,
    "",
    "**Assumptions**",
    ...result.assumptions.map((item) => `- ${item}`),
    "",
    axisDiagram,
    "",
    formatSafetyChecklist(result.input.toolContext),
  ].join("\n\n");
  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Stop Collar"
            text={`${result.stopCollarSetting.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label
            title="Minimum Safe Depth"
            text={`${result.minimumSafeDepth.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label title="Through-Hole Risk" text={result.throughHoleRisk ? "Yes" : "No"} />
          <Detail.Metadata.Label
            title="Pilot Diameter"
            text={
              result.pilotHoleDiameter !== undefined
                ? `${result.pilotHoleDiameter.toFixed(3)} ${result.input.unit}`
                : "N/A"
            }
          />
          <Detail.Metadata.Label title="Tolerance Mode" text={result.input.toleranceMode ?? "standard"} />
          <Detail.Metadata.TagList title="Warnings">
            <Detail.Metadata.TagList.Item text={warningStatus} color={result.warnings.length ? "#FF7A00" : "#0CA678"} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Summary" content={markdown.replace(/\*\*/g, "")} />
          <Action.CopyToClipboard
            title="Copy Collar Setting"
            content={`${result.stopCollarSetting.toFixed(3)} ${result.input.unit}`}
          />
          <Action.CopyToClipboard
            title="Copy Drill Controls"
            content={`Stop collar: ${result.stopCollarSetting.toFixed(3)} ${result.input.unit}\nMin safe depth: ${result.minimumSafeDepth.toFixed(3)} ${result.input.unit}\nThrough-hole risk: ${result.throughHoleRisk ? "Yes" : "No"}`}
          />
          <Action.CopyToClipboard title="Copy JSON Export" content={JSON.stringify(result, null, 2)} />
          <Action
            title="Save Revision to Jobs"
            onAction={async () => {
              const jobName = `Drill ${result.input.desiredHoleDepth.toFixed(2)} ${result.input.unit}`;
              await saveJobRevision({
                jobName,
                type: "drill-depth",
                summary: result.summary,
                input: result.input,
                output: result,
              });
              await showToast({ style: Toast.Style.Success, title: `Saved to ${jobName}` });
            }}
          />
          <Action
            title="Handoff: Open Hinge Layout"
            onAction={() =>
              launchCommand({
                name: "hinge-layout",
                type: LaunchType.UserInitiated,
                arguments: {
                  prefill: JSON.stringify({
                    doorHeight: result.input.unit === "inches" ? 28.2 : result.input.unit === "mm" ? 716 : 71.6,
                    topHingeOffset: result.stopCollarSetting * 4,
                    bottomHingeOffset: result.stopCollarSetting * 4,
                    cupDiameter: result.input.desiredHoleDepth * 2,
                    edgeSetback: result.input.desiredHoleDepth * 0.35,
                    mode: "overlay",
                    unit: result.input.unit,
                    toolContext: "drill",
                    toleranceMode: result.input.toleranceMode ?? "standard",
                  }),
                },
              })
            }
          />
        </ActionPanel>
      }
    />
  );
}

function parseInput(values: Partial<DrillFormValues>): DrillDepthInput | null {
  if (!values.desiredHoleDepth?.trim() || !values.materialThickness?.trim() || !values.fastenerLength?.trim()) {
    return null;
  }
  return {
    desiredHoleDepth: parseMeasurementInput(values.desiredHoleDepth, values.unit ?? "inches", "desired hole depth"),
    materialThickness: parseMeasurementInput(values.materialThickness, values.unit ?? "inches", "material thickness"),
    fastenerLength: parseMeasurementInput(values.fastenerLength, values.unit ?? "inches", "fastener length"),
    screwType: (values.screwType ?? "wood") as ScrewType,
    screwDiameter: values.screwDiameter?.trim()
      ? parseMeasurementInput(values.screwDiameter, values.unit ?? "inches", "screw diameter")
      : undefined,
    unit: (values.unit ?? "inches") as Unit,
    toolContext: (values.toolContext ?? "drill") as ToolContext,
    toleranceMode: (values.toleranceMode ?? "standard") as ToleranceMode,
  };
}

function parsePrefill(raw?: string): Partial<DrillFormValues> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DrillDepthInput>;
    return {
      desiredHoleDepth: parsed.desiredHoleDepth !== undefined ? String(parsed.desiredHoleDepth) : undefined,
      materialThickness: parsed.materialThickness !== undefined ? String(parsed.materialThickness) : undefined,
      fastenerLength: parsed.fastenerLength !== undefined ? String(parsed.fastenerLength) : undefined,
      screwType: parsed.screwType,
      screwDiameter: parsed.screwDiameter !== undefined ? String(parsed.screwDiameter) : undefined,
      unit: parsed.unit,
      toolContext: parsed.toolContext,
      toleranceMode: parsed.toleranceMode,
    };
  } catch {
    return {};
  }
}
