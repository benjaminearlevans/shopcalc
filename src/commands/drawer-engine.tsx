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
import { calculateDrawerBox } from "../lib/drawer-box";
import { parseMeasurementInput } from "../lib/measurements";
import { formatSafetyChecklist } from "../lib/safety";
import {
  DrawerBoxInput,
  DrawerBoxResult,
  DrawerSlideType,
  ExtensionPreferences,
  JoineryType,
  ToleranceMode,
  ToolContext,
  Unit,
} from "../types";
import { saveToHistory } from "../utils/history";
import { saveJobRevision } from "../utils/jobs";
import { getActiveProfile } from "../utils/profiles";

interface DrawerFormValues {
  openingWidth: string;
  drawerDepth: string;
  slideType: DrawerSlideType;
  slideClearance: string;
  materialThickness: string;
  joineryType: JoineryType;
  bottomInsetDepth: string;
  bottomThickness: string;
  unit: Unit;
  toolContext: ToolContext;
  detailMode: "basic" | "advanced";
  toleranceMode: ToleranceMode;
}

type DrawerArgs = {
  prefill?: string;
};

export default function DrawerEngineCommand(props: LaunchProps<{ arguments: DrawerArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parsePrefill(props.arguments.prefill);
  const hasPrefill = Boolean(props.arguments.prefill);
  const { data: activeProfile } = useCachedPromise(getActiveProfile, [prefs]);

  const [openingWidth, setOpeningWidth] = useState(prefill.openingWidth ?? "");
  const [drawerDepth, setDrawerDepth] = useState(prefill.drawerDepth ?? "");
  const [slideType, setSlideType] = useState<DrawerSlideType>(prefill.slideType ?? "side-mount");
  const [slideClearance, setSlideClearance] = useState(prefill.slideClearance ?? "0.5");
  const [materialThickness, setMaterialThickness] = useState(prefill.materialThickness ?? "0.75");
  const [joineryType, setJoineryType] = useState<JoineryType>(prefill.joineryType ?? "dado");
  const [bottomInsetDepth, setBottomInsetDepth] = useState(prefill.bottomInsetDepth ?? "0.25");
  const [bottomThickness, setBottomThickness] = useState(prefill.bottomThickness ?? "0.25");
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
        openingWidth,
        drawerDepth,
        slideType,
        slideClearance,
        materialThickness,
        joineryType,
        bottomInsetDepth,
        bottomThickness,
        unit,
        toolContext,
        detailMode,
        toleranceMode,
      });
      if (!input) {
        return "Live preview: fill opening width, drawer depth, and material values.";
      }
      const result = calculateDrawerBox(input);
      return `Live preview: side ${result.sidePanelLength.toFixed(3)} ${unit}, front/back ${result.frontBackPanelLength.toFixed(3)} ${unit}`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [
    openingWidth,
    drawerDepth,
    slideType,
    slideClearance,
    materialThickness,
    joineryType,
    bottomInsetDepth,
    bottomThickness,
    unit,
    toolContext,
    detailMode,
    toleranceMode,
  ]);

  async function handleSubmit(values: DrawerFormValues) {
    try {
      const input = parseInput(values);
      if (!input) {
        throw new Error("Enter all required values.");
      }
      const result = calculateDrawerBox(input);
      await saveToHistory("drawer-box", input, result.summary);
      push(<DrawerResultView result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check drawer inputs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function loadExample() {
    setOpeningWidth("21");
    setDrawerDepth("18");
    setSlideType("side-mount");
    setSlideClearance("0.5");
    setMaterialThickness("0.75");
    setJoineryType("dado");
    setBottomInsetDepth("0.25");
    setBottomThickness("0.25");
    setUnit("inches");
    setToolContext("table-saw");
    setDetailMode("advanced");
    setToleranceMode("standard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Drawer Box" onSubmit={handleSubmit} />
          <Action title="Load Example" onAction={loadExample} />
          <Action
            title="Open Guided Start"
            onAction={() => launchCommand({ name: "guided-start", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Compute drawer parts and joinery dimensions from opening + slide constraints." />
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
        id="openingWidth"
        title="Opening Width"
        value={openingWidth}
        onChange={setOpeningWidth}
        placeholder="21"
        info='Inside cabinet width available for the drawer. Accepts suffix/fraction (21, 533.4mm, 21").'
        autoFocus
      />
      <Form.TextField
        id="drawerDepth"
        title="Drawer Depth"
        value={drawerDepth}
        onChange={setDrawerDepth}
        placeholder="18"
        info='Front-to-back drawer length target. Accepts suffix/fraction (18, 457.2mm, 18").'
      />
      <Form.Dropdown
        id="slideType"
        title="Slide Type"
        value={slideType}
        onChange={(value) => setSlideType(value as DrawerSlideType)}
        info="Side-mount usually needs larger side clearance than undermount."
      >
        <Form.Dropdown.Item value="side-mount" title="Side Mount" />
        <Form.Dropdown.Item value="undermount" title="Undermount" />
      </Form.Dropdown>
      <Form.TextField
        id="slideClearance"
        title="Slide Clearance (each side)"
        value={slideClearance}
        onChange={setSlideClearance}
        placeholder="0.5"
        info="Required gap on EACH side for slide hardware. Accepts suffix/fraction (0.5, 12.7mm)."
      />
      <Form.TextField
        id="materialThickness"
        title="Material Thickness"
        value={materialThickness}
        onChange={setMaterialThickness}
        placeholder="0.75"
        info='Panel stock thickness. Accepts suffix/fraction (0.75, 19mm, 3/4").'
      />
      {detailMode === "advanced" ? (
        <>
          <Form.Dropdown
            id="joineryType"
            title="Joinery Type"
            value={joineryType}
            onChange={(value) => setJoineryType(value as JoineryType)}
            info="Choose how front/back joins to sides."
          >
            <Form.Dropdown.Item value="butt" title="Butt" />
            <Form.Dropdown.Item value="rabbet" title="Rabbet" />
            <Form.Dropdown.Item value="dado" title="Dado" />
          </Form.Dropdown>
          <Form.TextField
            id="bottomInsetDepth"
            title="Bottom Inset Depth"
            value={bottomInsetDepth}
            onChange={setBottomInsetDepth}
            placeholder="0.25"
            info="Distance from panel edge to bottom groove/rabbet. Accepts suffix/fraction."
          />
          <Form.TextField
            id="bottomThickness"
            title="Bottom Thickness"
            value={bottomThickness}
            onChange={setBottomThickness}
            placeholder="0.25"
            info="Drawer bottom panel thickness. Accepts suffix/fraction."
          />
          <Form.Dropdown
            id="toleranceMode"
            title="Tolerance Mode"
            value={toleranceMode}
            onChange={(value) => setToleranceMode(value as ToleranceMode)}
            info="Tight: more precision, less forgiveness. Loose: easier assembly."
          >
            <Form.Dropdown.Item value="tight" title="Tight" />
            <Form.Dropdown.Item value="standard" title="Standard" />
            <Form.Dropdown.Item value="loose" title="Loose" />
          </Form.Dropdown>
        </>
      ) : null}
      <Form.Dropdown id="unit" title="Unit" value={unit} onChange={(value) => setUnit(value as Unit)}>
        <Form.Dropdown.Item value="inches" title="Inches" />
        <Form.Dropdown.Item value="mm" title="Millimeters" />
        <Form.Dropdown.Item value="cm" title="Centimeters" />
      </Form.Dropdown>
      {detailMode === "advanced" ? (
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
      ) : null}
      <Form.Separator />
      <Form.Description text={preview} />
    </Form>
  );
}

function DrawerResultView({ result }: { result: DrawerBoxResult }) {
  const safetyMarkdown = formatSafetyChecklist(result.input.toolContext);
  const warningStatus = result.warnings.length ? `Caution (${result.warnings.length})` : "Clear";
  const cutTable = [
    "| Part | Dimension |",
    "| --- | --- |",
    `| Side Panels | ${result.sidePanelLength.toFixed(3)} ${result.input.unit} |`,
    `| Front/Back Panels | ${result.frontBackPanelLength.toFixed(3)} ${result.input.unit} |`,
    `| Bottom Panel | ${result.bottomPanelWidth.toFixed(3)} x ${result.bottomPanelLength.toFixed(3)} ${result.input.unit} |`,
  ].join("\n");
  const assumptions = ["**Assumptions**", ...result.assumptions.map((item) => `- ${item}`)].join("\n");
  const markdown = [
    result.summary,
    "",
    "**Cut Table**",
    cutTable,
    "",
    assumptions,
    "",
    result.diagram,
    "",
    safetyMarkdown,
  ].join("\n\n");
  const joineryText = `${result.rabbetDepth.toFixed(3)} ${result.input.unit} deep x ${result.rabbetWidth.toFixed(3)} ${result.input.unit} wide`;
  const cutListText = [
    `Side: ${result.sidePanelLength.toFixed(3)} ${result.input.unit}`,
    `Front/Back: ${result.frontBackPanelLength.toFixed(3)} ${result.input.unit}`,
    `Bottom: ${result.bottomPanelWidth.toFixed(3)} x ${result.bottomPanelLength.toFixed(3)} ${result.input.unit}`,
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Side Panel Length"
            text={`${result.sidePanelLength.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label
            title="Front/Back Length"
            text={`${result.frontBackPanelLength.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label
            title="Bottom Panel"
            text={`${result.bottomPanelWidth.toFixed(3)} x ${result.bottomPanelLength.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label
            title="Slide Spacing"
            text={`${result.requiredSlideSpacing.toFixed(3)} ${result.input.unit}`}
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
          <Action.CopyToClipboard title="Copy Cut Dimensions" content={cutListText} />
          <Action.CopyToClipboard
            title="Copy Bottom Panel Only"
            content={`${result.bottomPanelWidth.toFixed(3)} x ${result.bottomPanelLength.toFixed(3)} ${result.input.unit}`}
          />
          <Action.CopyToClipboard title="Copy Joinery Settings" content={joineryText} />
          <Action.CopyToClipboard title="Copy JSON Export" content={JSON.stringify(result, null, 2)} />
          <Action
            title="Save Revision to Jobs"
            onAction={async () => {
              const jobName = `Drawer ${result.input.openingWidth.toFixed(2)} ${result.input.unit}`;
              await saveJobRevision({
                jobName,
                type: "drawer-box",
                summary: result.summary,
                input: result.input,
                output: result,
              });
              await showToast({ style: Toast.Style.Success, title: `Saved to ${jobName}` });
            }}
          />
          <Action
            title="Handoff: Open Slide Layout"
            onAction={() =>
              launchCommand({
                name: "slide-layout",
                type: LaunchType.UserInitiated,
                arguments: {
                  prefill: JSON.stringify({
                    cabinetInteriorHeight: result.sidePanelLength + result.input.materialThickness * 4,
                    drawerCount: 4,
                    topMargin: result.input.materialThickness,
                    gapSpacing: result.requiredSlideSpacing,
                    slideThickness: result.input.materialThickness / 2,
                    unit: result.input.unit,
                    toolContext: result.input.toolContext ?? "none",
                    toleranceMode: result.input.toleranceMode ?? "standard",
                  }),
                },
              })
            }
          />
          <Action
            title="Handoff: Open Drill Depth"
            onAction={() =>
              launchCommand({
                name: "drill-depth",
                type: LaunchType.UserInitiated,
                arguments: {
                  prefill: JSON.stringify({
                    desiredHoleDepth: result.input.bottomInsetDepth + result.input.bottomThickness,
                    materialThickness: result.input.materialThickness,
                    fastenerLength: result.input.materialThickness * 1.5,
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

function parseInput(values: Partial<DrawerFormValues>): DrawerBoxInput | null {
  if (
    !values.openingWidth?.trim() ||
    !values.drawerDepth?.trim() ||
    !values.slideClearance?.trim() ||
    !values.materialThickness?.trim()
  ) {
    return null;
  }

  const unit = (values.unit ?? "inches") as Unit;

  return {
    openingWidth: parseMeasurementInput(values.openingWidth, unit, "opening width"),
    drawerDepth: parseMeasurementInput(values.drawerDepth, unit, "drawer depth"),
    slideType: (values.slideType ?? "side-mount") as DrawerSlideType,
    slideClearance: parseMeasurementInput(values.slideClearance, unit, "slide clearance"),
    materialThickness: parseMeasurementInput(values.materialThickness, unit, "material thickness"),
    joineryType: (values.joineryType ?? "dado") as JoineryType,
    bottomInsetDepth: parseMeasurementInput(values.bottomInsetDepth ?? "0.25", unit, "bottom inset depth"),
    bottomThickness: parseMeasurementInput(values.bottomThickness ?? "0.25", unit, "bottom thickness"),
    unit,
    toolContext: (values.toolContext ?? "none") as ToolContext,
    toleranceMode: (values.toleranceMode ?? "standard") as ToleranceMode,
  };
}

function parsePrefill(raw?: string): Partial<DrawerFormValues> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DrawerBoxInput>;
    return {
      openingWidth: parsed.openingWidth !== undefined ? String(parsed.openingWidth) : undefined,
      drawerDepth: parsed.drawerDepth !== undefined ? String(parsed.drawerDepth) : undefined,
      slideType: parsed.slideType,
      slideClearance: parsed.slideClearance !== undefined ? String(parsed.slideClearance) : undefined,
      materialThickness: parsed.materialThickness !== undefined ? String(parsed.materialThickness) : undefined,
      joineryType: parsed.joineryType,
      bottomInsetDepth: parsed.bottomInsetDepth !== undefined ? String(parsed.bottomInsetDepth) : undefined,
      bottomThickness: parsed.bottomThickness !== undefined ? String(parsed.bottomThickness) : undefined,
      unit: parsed.unit,
      toolContext: parsed.toolContext,
      toleranceMode: parsed.toleranceMode,
    };
  } catch {
    return {};
  }
}
