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
import { calculateHingeLayout } from "../lib/hinge-layout";
import { parseMeasurementInput } from "../lib/measurements";
import { formatSafetyChecklist } from "../lib/safety";
import {
  ExtensionPreferences,
  HingeLayoutInput,
  HingeLayoutResult,
  HingeMode,
  ToleranceMode,
  ToolContext,
  Unit,
} from "../types";
import { saveToHistory } from "../utils/history";
import { saveJobRevision } from "../utils/jobs";
import { getActiveProfile } from "../utils/profiles";

interface HingeFormValues {
  doorHeight: string;
  topHingeOffset: string;
  bottomHingeOffset: string;
  cupDiameter: string;
  edgeSetback: string;
  mode: HingeMode;
  unit: Unit;
  includeStlParams: "true" | "false";
  toolContext: ToolContext;
  detailMode: "basic" | "advanced";
  toleranceMode: ToleranceMode;
}

type HingeArgs = {
  prefill?: string;
};

export default function HingeLayoutCommand(props: LaunchProps<{ arguments: HingeArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parsePrefill(props.arguments.prefill);
  const hasPrefill = Boolean(props.arguments.prefill);
  const { data: activeProfile } = useCachedPromise(getActiveProfile, [prefs]);

  const [doorHeight, setDoorHeight] = useState(prefill.doorHeight ?? "");
  const [topHingeOffset, setTopHingeOffset] = useState(prefill.topHingeOffset ?? "100");
  const [bottomHingeOffset, setBottomHingeOffset] = useState(prefill.bottomHingeOffset ?? "100");
  const [cupDiameter, setCupDiameter] = useState(prefill.cupDiameter ?? "35");
  const [edgeSetback, setEdgeSetback] = useState(prefill.edgeSetback ?? "5");
  const [mode, setMode] = useState<HingeMode>(prefill.mode ?? "overlay");
  const [unit, setUnit] = useState<Unit>(prefill.unit ?? (prefs.defaultUnit as Unit) ?? "mm");
  const [includeStlParams, setIncludeStlParams] = useState<"true" | "false">(prefill.includeStlParams ?? "false");
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
        doorHeight,
        topHingeOffset,
        bottomHingeOffset,
        cupDiameter,
        edgeSetback,
        mode,
        unit,
        includeStlParams,
        toolContext,
        detailMode,
        toleranceMode,
      });
      if (!input) {
        return "Live preview: enter door height and hinge offsets.";
      }
      const result = calculateHingeLayout(input);
      return `Live preview: top Y ${result.topHoleY.toFixed(3)}, bottom Y ${result.bottomHoleY.toFixed(3)} ${unit}`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [
    doorHeight,
    topHingeOffset,
    bottomHingeOffset,
    cupDiameter,
    edgeSetback,
    mode,
    unit,
    includeStlParams,
    toolContext,
    detailMode,
    toleranceMode,
  ]);

  async function handleSubmit(values: HingeFormValues) {
    try {
      const input = parseInput(values);
      if (!input) {
        throw new Error("Enter all required values.");
      }
      const result = calculateHingeLayout(input);
      await saveToHistory("hinge-layout", input, result.summary);
      push(<HingeResultView result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check hinge layout inputs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function loadExample() {
    setDoorHeight("716");
    setTopHingeOffset("100");
    setBottomHingeOffset("100");
    setCupDiameter("35");
    setEdgeSetback("5");
    setMode("overlay");
    setUnit("mm");
    setIncludeStlParams("true");
    setToolContext("drill");
    setDetailMode("advanced");
    setToleranceMode("standard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Hinge Layout" onSubmit={handleSubmit} />
          <Action title="Load Example" onAction={loadExample} />
          <Action
            title="Open Guided Start"
            onAction={() => launchCommand({ name: "guided-start", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Generate mirror-safe cup drilling coordinates and optional jig parameter export." />
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
        id="doorHeight"
        title="Door Height"
        value={doorHeight}
        onChange={setDoorHeight}
        placeholder="716"
        info='Full door height. Accepts suffix/fraction (716mm, 71.6cm, 28-3/16").'
        autoFocus
      />
      <Form.TextField
        id="topHingeOffset"
        title="Top Hinge Offset"
        value={topHingeOffset}
        onChange={setTopHingeOffset}
        placeholder="100"
        info="Distance from top edge to top cup center. Accepts suffix/fraction."
      />
      <Form.TextField
        id="bottomHingeOffset"
        title="Bottom Hinge Offset"
        value={bottomHingeOffset}
        onChange={setBottomHingeOffset}
        placeholder="100"
        info="Distance from bottom edge to bottom cup center. Accepts suffix/fraction."
      />
      <Form.TextField
        id="cupDiameter"
        title="Cup Diameter"
        value={cupDiameter}
        onChange={setCupDiameter}
        placeholder="35"
        info="Hinge cup bore size (often 35mm for Euro hinges)."
      />
      <Form.TextField
        id="edgeSetback"
        title="Edge Setback"
        value={edgeSetback}
        onChange={setEdgeSetback}
        placeholder="5"
        info="Distance from door edge to cup-bore edge."
      />
      <Form.Dropdown id="mode" title="Door Mode" value={mode} onChange={(value) => setMode(value as HingeMode)}>
        <Form.Dropdown.Item value="overlay" title="Overlay" />
        <Form.Dropdown.Item value="inset" title="Inset" />
      </Form.Dropdown>
      <Form.Dropdown id="unit" title="Unit" value={unit} onChange={(value) => setUnit(value as Unit)}>
        <Form.Dropdown.Item value="mm" title="Millimeters" />
        <Form.Dropdown.Item value="cm" title="Centimeters" />
        <Form.Dropdown.Item value="inches" title="Inches" />
      </Form.Dropdown>
      {detailMode === "advanced" ? (
        <>
          <Form.Dropdown
            id="includeStlParams"
            title="Include STL Param Export"
            value={includeStlParams}
            onChange={(value) => setIncludeStlParams(value as "true" | "false")}
            info="Emit parameter JSON suitable for future jig model generation."
          >
            <Form.Dropdown.Item value="false" title="No" />
            <Form.Dropdown.Item value="true" title="Yes" />
          </Form.Dropdown>
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
            info="Tight mode enforces stricter mirror symmetry."
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

function HingeResultView({ result }: { result: HingeLayoutResult }) {
  const warningStatus = result.warnings.length ? `Caution (${result.warnings.length})` : "Clear";
  const coordinateTable = [
    "| Hinge | X | Y |",
    "| --- | --- | --- |",
    `| Top | ${result.cupCenterX.toFixed(3)} ${result.input.unit} | ${result.topHoleY.toFixed(3)} ${result.input.unit} |`,
    `| Bottom | ${result.cupCenterX.toFixed(3)} ${result.input.unit} | ${result.bottomHoleY.toFixed(3)} ${result.input.unit} |`,
  ].join("\n");
  const axisDiagram = [
    "```text",
    "(0,0) top-left origin",
    "x ->",
    "|",
    "v y",
    `Top cup:    (${result.cupCenterX.toFixed(3)}, ${result.topHoleY.toFixed(3)})`,
    `Bottom cup: (${result.cupCenterX.toFixed(3)}, ${result.bottomHoleY.toFixed(3)})`,
    "```",
  ].join("\n");
  const assumptions = ["**Assumptions**", ...result.assumptions.map((item) => `- ${item}`)].join("\n");
  const parts = [result.summary, "", assumptions, "", formatSafetyChecklist(result.input.toolContext)];
  parts.unshift(axisDiagram);
  parts.unshift("");
  parts.unshift(coordinateTable);
  parts.unshift("**Drill Coordinates**");
  if (result.stlParams) {
    parts.push("", "**STL Parameters (JSON)**", "```json", result.stlParams, "```");
  }
  const markdown = parts.join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Top Cup Center"
            text={`X ${result.cupCenterX.toFixed(3)}, Y ${result.topHoleY.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label
            title="Bottom Cup Center"
            text={`X ${result.cupCenterX.toFixed(3)}, Y ${result.bottomHoleY.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label title="Mirror-Safe" text={result.mirrorSafe ? "Yes" : "No"} />
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
            title="Copy Drill Coordinates"
            content={`Top: X ${result.cupCenterX.toFixed(3)}, Y ${result.topHoleY.toFixed(3)} ${result.input.unit}\nBottom: X ${result.cupCenterX.toFixed(3)}, Y ${result.bottomHoleY.toFixed(3)} ${result.input.unit}`}
          />
          <Action.CopyToClipboard title="Copy Template Reference" content={result.printableTemplateRef} />
          <Action.CopyToClipboard title="Copy JSON Export" content={JSON.stringify(result, null, 2)} />
          <Action
            title="Save Revision to Jobs"
            onAction={async () => {
              const jobName = `Hinge ${result.input.doorHeight.toFixed(0)} ${result.input.unit}`;
              await saveJobRevision({
                jobName,
                type: "hinge-layout",
                summary: result.summary,
                input: result.input,
                output: result,
              });
              await showToast({ style: Toast.Style.Success, title: `Saved to ${jobName}` });
            }}
          />
          <Action
            title="Handoff: Open Drill Depth"
            onAction={() =>
              launchCommand({
                name: "drill-depth",
                type: LaunchType.UserInitiated,
                arguments: {
                  prefill: JSON.stringify({
                    desiredHoleDepth: result.input.cupDiameter * 0.45,
                    materialThickness: result.input.cupDiameter,
                    fastenerLength: result.input.cupDiameter * 0.6,
                    screwType: "wood",
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

function parseInput(values: Partial<HingeFormValues>): HingeLayoutInput | null {
  if (
    !values.doorHeight?.trim() ||
    !values.topHingeOffset?.trim() ||
    !values.bottomHingeOffset?.trim() ||
    !values.cupDiameter?.trim() ||
    !values.edgeSetback?.trim()
  ) {
    return null;
  }

  return {
    doorHeight: parseMeasurementInput(values.doorHeight, values.unit ?? "mm", "door height"),
    topHingeOffset: parseMeasurementInput(values.topHingeOffset, values.unit ?? "mm", "top hinge offset"),
    bottomHingeOffset: parseMeasurementInput(values.bottomHingeOffset, values.unit ?? "mm", "bottom hinge offset"),
    cupDiameter: parseMeasurementInput(values.cupDiameter, values.unit ?? "mm", "cup diameter"),
    edgeSetback: parseMeasurementInput(values.edgeSetback, values.unit ?? "mm", "edge setback"),
    mode: (values.mode ?? "overlay") as HingeMode,
    unit: (values.unit ?? "mm") as Unit,
    includeStlParams: (values.includeStlParams ?? "false") === "true",
    toolContext: (values.toolContext ?? "none") as ToolContext,
    toleranceMode: (values.toleranceMode ?? "standard") as ToleranceMode,
  };
}

function parsePrefill(raw?: string): Partial<HingeFormValues> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Partial<HingeLayoutInput>;
    return {
      doorHeight: parsed.doorHeight !== undefined ? String(parsed.doorHeight) : undefined,
      topHingeOffset: parsed.topHingeOffset !== undefined ? String(parsed.topHingeOffset) : undefined,
      bottomHingeOffset: parsed.bottomHingeOffset !== undefined ? String(parsed.bottomHingeOffset) : undefined,
      cupDiameter: parsed.cupDiameter !== undefined ? String(parsed.cupDiameter) : undefined,
      edgeSetback: parsed.edgeSetback !== undefined ? String(parsed.edgeSetback) : undefined,
      mode: parsed.mode,
      unit: parsed.unit,
      includeStlParams:
        parsed.includeStlParams !== undefined ? (String(parsed.includeStlParams) as "true" | "false") : undefined,
      toolContext: parsed.toolContext,
      toleranceMode: parsed.toleranceMode,
    };
  } catch {
    return {};
  }
}
