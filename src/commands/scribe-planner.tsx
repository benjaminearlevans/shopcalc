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
import { parseMeasurementInput } from "../lib/measurements";
import { formatSafetyChecklist } from "../lib/safety";
import { calculateScribePlan } from "../lib/scribe-planner";
import {
  ExtensionPreferences,
  ScribePlannerInput,
  ScribePlannerResult,
  ToleranceMode,
  ToolContext,
  Unit,
} from "../types";
import { saveToHistory } from "../utils/history";
import { saveJobRevision } from "../utils/jobs";
import { getActiveProfile } from "../utils/profiles";

interface ScribeFormValues {
  nominalWallWidth: string;
  highDeviation: string;
  lowDeviation: string;
  plumbDeviation: string;
  desiredVisibleWidth: string;
  unit: Unit;
  toolContext: ToolContext;
  detailMode: "basic" | "advanced";
  toleranceMode: ToleranceMode;
}

type ScribeArgs = {
  prefill?: string;
};

export default function ScribePlannerCommand(props: LaunchProps<{ arguments: ScribeArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parsePrefill(props.arguments.prefill);
  const hasPrefill = Boolean(props.arguments.prefill);
  const { data: activeProfile } = useCachedPromise(getActiveProfile, [prefs]);

  const [nominalWallWidth, setNominalWallWidth] = useState(prefill.nominalWallWidth ?? "");
  const [highDeviation, setHighDeviation] = useState(prefill.highDeviation ?? "0");
  const [lowDeviation, setLowDeviation] = useState(prefill.lowDeviation ?? "0");
  const [plumbDeviation, setPlumbDeviation] = useState(prefill.plumbDeviation ?? "0");
  const [desiredVisibleWidth, setDesiredVisibleWidth] = useState(prefill.desiredVisibleWidth ?? "");
  const [unit, setUnit] = useState<Unit>(prefill.unit ?? (prefs.defaultUnit as Unit) ?? "inches");
  const [toolContext, setToolContext] = useState<ToolContext>(prefill.toolContext ?? "none");
  const [detailMode, setDetailMode] = useState<"basic" | "advanced">("basic");
  const [toleranceMode, setToleranceMode] = useState<ToleranceMode>(prefill.toleranceMode ?? "standard");

  useEffect(() => {
    if (!activeProfile || hasPrefill) {
      return;
    }
    setUnit(activeProfile.unit);
    setToolContext(activeProfile.toolContext);
    setToleranceMode(activeProfile.toleranceMode);
  }, [activeProfile, hasPrefill]);

  const preview = useMemo(() => {
    try {
      const input = parseInput({
        nominalWallWidth,
        highDeviation,
        lowDeviation,
        plumbDeviation,
        desiredVisibleWidth,
        unit,
        toolContext,
        detailMode,
        toleranceMode,
      });
      if (!input) {
        return "Live preview: enter nominal width and target visible width.";
      }
      const result = calculateScribePlan(input);
      return `Live preview: rough cut ${result.roughCutDimension.toFixed(3)} ${unit}, oversize ${result.oversizeMargin.toFixed(3)} ${unit}`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [
    nominalWallWidth,
    highDeviation,
    lowDeviation,
    plumbDeviation,
    desiredVisibleWidth,
    unit,
    toolContext,
    toleranceMode,
  ]);

  async function handleSubmit(values: ScribeFormValues) {
    try {
      const input = parseInput(values);
      if (!input) {
        throw new Error("Enter all required values.");
      }
      const result = calculateScribePlan(input);
      await saveToHistory("scribe-planner", input, result.summary);
      push(<ScribeResultView result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check scribe planner inputs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function loadExample() {
    setNominalWallWidth("30");
    setHighDeviation("0.12");
    setLowDeviation("-0.08");
    setPlumbDeviation("0.1");
    setDesiredVisibleWidth("29.5");
    setUnit("inches");
    setToolContext("router");
    setDetailMode("advanced");
    setToleranceMode("standard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Scribe Plan" onSubmit={handleSubmit} />
          <Action title="Load Example" onAction={loadExample} />
          <Action
            title="Open Guided Start"
            onAction={() => launchCommand({ name: "guided-start", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Plan oversize and scribe allowance from measured wall deviations." />
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
        id="nominalWallWidth"
        title="Nominal Wall Width"
        value={nominalWallWidth}
        onChange={setNominalWallWidth}
        placeholder="30"
        info="Original wall opening width. Accepts suffix/fraction."
        autoFocus
      />
      <Form.TextField
        id="desiredVisibleWidth"
        title="Desired Final Visible Width"
        value={desiredVisibleWidth}
        onChange={setDesiredVisibleWidth}
        placeholder="29.5"
        info="Target installed visible width after scribing. Accepts suffix/fraction."
      />
      <Form.TextField
        id="highDeviation"
        title="Measured High Deviation"
        value={highDeviation}
        onChange={setHighDeviation}
        placeholder="0.12"
        info="Positive for proud/high spots; negative if recessed. Accepts suffix/fraction."
      />
      <Form.TextField
        id="lowDeviation"
        title="Measured Low Deviation"
        value={lowDeviation}
        onChange={setLowDeviation}
        placeholder="-0.08"
        info="Deviation at low point. Negative allowed. Accepts suffix/fraction."
      />
      <Form.TextField
        id="plumbDeviation"
        title="Measured Plumb Deviation"
        value={plumbDeviation}
        onChange={setPlumbDeviation}
        placeholder="0.1"
        info="Out-of-plumb deviation over panel height. Negative allowed. Accepts suffix/fraction."
      />
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
            info="Tight mode adds more oversize margin before final scribe."
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

function ScribeResultView({ result }: { result: ScribePlannerResult }) {
  const warningStatus = result.warnings.length ? `Caution (${result.warnings.length})` : "Clear";
  const deviationTable = [
    "| Measure | Value |",
    "| --- | --- |",
    `| High deviation | ${result.input.highDeviation.toFixed(3)} ${result.input.unit} |`,
    `| Low deviation | ${result.input.lowDeviation.toFixed(3)} ${result.input.unit} |`,
    `| Plumb deviation | ${result.input.plumbDeviation.toFixed(3)} ${result.input.unit} |`,
  ].join("\n");
  const markdown = [
    result.summary,
    "",
    "**Deviation Table**",
    deviationTable,
    "",
    "**Assumptions**",
    ...result.assumptions.map((item) => `- ${item}`),
    "",
    formatSafetyChecklist(result.input.toolContext),
  ].join("\n\n");
  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Rough Cut"
            text={`${result.roughCutDimension.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label
            title="Oversize Margin"
            text={`${result.oversizeMargin.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label
            title="Max Scribe Allowance"
            text={`${result.maximumScribeAllowance.toFixed(3)} ${result.input.unit}`}
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
            title="Copy Rough Cut + Scribe"
            content={`Rough cut: ${result.roughCutDimension.toFixed(3)} ${result.input.unit}\nOversize: ${result.oversizeMargin.toFixed(3)} ${result.input.unit}\nMax scribe: ${result.maximumScribeAllowance.toFixed(3)} ${result.input.unit}`}
          />
          <Action.CopyToClipboard title="Copy JSON Export" content={JSON.stringify(result, null, 2)} />
          <Action
            title="Save Revision to Jobs"
            onAction={async () => {
              const jobName = `Scribe ${result.input.desiredVisibleWidth.toFixed(2)} ${result.input.unit}`;
              await saveJobRevision({
                jobName,
                type: "scribe-planner",
                summary: result.summary,
                input: result.input,
                output: result,
              });
              await showToast({ style: Toast.Style.Success, title: `Saved to ${jobName}` });
            }}
          />
          <Action
            title="Handoff: Open Cut List"
            onAction={() =>
              launchCommand({
                name: "cutlist",
                type: LaunchType.UserInitiated,
                arguments: {
                  prefill: JSON.stringify({
                    pieces: [
                      {
                        length: result.roughCutDimension,
                        width: result.input.nominalWallWidth,
                        quantity: 1,
                        label: "Scribe Blank",
                      },
                    ],
                    stock: {
                      type: "sheet",
                      length: result.roughCutDimension + result.oversizeMargin,
                      width: result.input.nominalWallWidth + result.oversizeMargin,
                      unit: result.input.unit,
                    },
                    kerf: result.input.unit === "inches" ? 0.125 : result.input.unit === "mm" ? 3.2 : 0.32,
                    unit: result.input.unit,
                    allowRotation: true,
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

function parseInput(values: Partial<ScribeFormValues>): ScribePlannerInput | null {
  if (!values.nominalWallWidth?.trim() || !values.desiredVisibleWidth?.trim()) {
    return null;
  }
  return {
    nominalWallWidth: parseMeasurementInput(values.nominalWallWidth, values.unit ?? "inches", "nominal wall width"),
    highDeviation: parseMeasurementInput(values.highDeviation || "0", values.unit ?? "inches", "high deviation"),
    lowDeviation: parseMeasurementInput(values.lowDeviation || "0", values.unit ?? "inches", "low deviation"),
    plumbDeviation: parseMeasurementInput(values.plumbDeviation || "0", values.unit ?? "inches", "plumb deviation"),
    desiredVisibleWidth: parseMeasurementInput(
      values.desiredVisibleWidth,
      values.unit ?? "inches",
      "desired final visible width",
    ),
    unit: (values.unit ?? "inches") as Unit,
    toolContext: (values.toolContext ?? "none") as ToolContext,
    toleranceMode: (values.toleranceMode ?? "standard") as ToleranceMode,
  };
}

function parsePrefill(raw?: string): Partial<ScribeFormValues> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ScribePlannerInput>;
    return {
      nominalWallWidth: parsed.nominalWallWidth !== undefined ? String(parsed.nominalWallWidth) : undefined,
      highDeviation: parsed.highDeviation !== undefined ? String(parsed.highDeviation) : undefined,
      lowDeviation: parsed.lowDeviation !== undefined ? String(parsed.lowDeviation) : undefined,
      plumbDeviation: parsed.plumbDeviation !== undefined ? String(parsed.plumbDeviation) : undefined,
      desiredVisibleWidth: parsed.desiredVisibleWidth !== undefined ? String(parsed.desiredVisibleWidth) : undefined,
      unit: parsed.unit,
      toolContext: parsed.toolContext,
      toleranceMode: parsed.toleranceMode,
    };
  } catch {
    return {};
  }
}
