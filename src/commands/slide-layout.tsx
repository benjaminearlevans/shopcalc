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
import { useMemo, useState } from "react";
import { parseMeasurementInput } from "../lib/measurements";
import { formatSafetyChecklist } from "../lib/safety";
import { calculateSlideLayout } from "../lib/slide-layout";
import { ExtensionPreferences, SlideLayoutInput, SlideLayoutResult, ToolContext, Unit } from "../types";
import { saveToHistory } from "../utils/history";

interface SlideFormValues {
  cabinetInteriorHeight: string;
  drawerCount: string;
  topMargin: string;
  gapSpacing: string;
  slideThickness: string;
  unit: Unit;
  toolContext: ToolContext;
  detailMode: "basic" | "advanced";
}

type SlideArgs = {
  prefill?: string;
};

export default function SlideLayoutCommand(props: LaunchProps<{ arguments: SlideArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parsePrefill(props.arguments.prefill);

  const [cabinetInteriorHeight, setCabinetInteriorHeight] = useState(prefill.cabinetInteriorHeight ?? "");
  const [drawerCount, setDrawerCount] = useState(prefill.drawerCount ?? "4");
  const [topMargin, setTopMargin] = useState(prefill.topMargin ?? "2");
  const [gapSpacing, setGapSpacing] = useState(prefill.gapSpacing ?? "8");
  const [slideThickness, setSlideThickness] = useState(prefill.slideThickness ?? "0.5");
  const [unit, setUnit] = useState<Unit>(prefill.unit ?? (prefs.defaultUnit as Unit) ?? "inches");
  const [toolContext, setToolContext] = useState<ToolContext>(prefill.toolContext ?? "none");
  const [detailMode, setDetailMode] = useState<"basic" | "advanced">("basic");

  const preview = useMemo(() => {
    try {
      const input = parseInput({
        cabinetInteriorHeight,
        drawerCount,
        topMargin,
        gapSpacing,
        slideThickness,
        unit,
        toolContext,
        detailMode,
      });
      if (!input) {
        return "Live preview: enter cabinet height and drawer count.";
      }
      const result = calculateSlideLayout(input);
      return `Live preview: ${result.coordinates.length} slide levels, spacer block ${result.spacerBlockHeight.toFixed(3)} ${unit}`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [cabinetInteriorHeight, drawerCount, topMargin, gapSpacing, slideThickness, unit, toolContext]);

  async function handleSubmit(values: SlideFormValues) {
    try {
      const input = parseInput(values);
      if (!input) {
        throw new Error("Enter all required values.");
      }
      const result = calculateSlideLayout(input);
      await saveToHistory("slide-layout", input, result.summary);
      push(<SlideResultView result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check slide layout inputs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function loadExample() {
    setCabinetInteriorHeight("30");
    setDrawerCount("4");
    setTopMargin("2");
    setGapSpacing("6");
    setSlideThickness("0.5");
    setUnit("inches");
    setToolContext("table-saw");
    setDetailMode("advanced");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Slide Layout" onSubmit={handleSubmit} />
          <Action title="Load Example" onAction={loadExample} />
          <Action
            title="Open Guided Start"
            onAction={() => launchCommand({ name: "guided-start", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Generate baseline-driven vertical slide placement and spacer block dimensions." />
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
        id="cabinetInteriorHeight"
        title="Cabinet Interior Height"
        value={cabinetInteriorHeight}
        onChange={setCabinetInteriorHeight}
        placeholder="30"
        info='Inside clear cabinet height. Accepts suffix/fraction (30, 762mm, 30").'
        autoFocus
      />
      <Form.TextField
        id="drawerCount"
        title="Number of Drawers"
        value={drawerCount}
        onChange={setDrawerCount}
        placeholder="4"
        info="Count of drawer slide levels to place."
      />
      <Form.TextField
        id="topMargin"
        title="Top Margin"
        value={topMargin}
        onChange={setTopMargin}
        placeholder="2"
        info="Offset from top edge to first slide. Accepts suffix/fraction."
      />
      <Form.TextField
        id="gapSpacing"
        title="Gap Spacing"
        value={gapSpacing}
        onChange={setGapSpacing}
        placeholder="6"
        info="Vertical gap between slide levels. Accepts suffix/fraction."
      />
      <Form.TextField
        id="slideThickness"
        title="Slide Thickness"
        value={slideThickness}
        onChange={setSlideThickness}
        placeholder="0.5"
        info="Installed slide stack thickness. Accepts suffix/fraction."
      />
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

function SlideResultView({ result }: { result: SlideLayoutResult }) {
  const coordinateTable = [
    "| Drawer | Top Y | Center Y | Bottom Y |",
    "| --- | --- | --- | --- |",
    ...result.coordinates.map(
      (row) =>
        `| ${row.drawerIndex} | ${row.topY.toFixed(3)} ${result.input.unit} | ${row.centerY.toFixed(3)} ${result.input.unit} | ${row.bottomY.toFixed(3)} ${result.input.unit} |`,
    ),
  ].join("\n");
  const markdown = [result.summary, "", result.diagram, "", formatSafetyChecklist(result.input.toolContext)].join(
    "\n\n",
  );
  return (
    <Detail
      markdown={[markdown, "", "**Coordinate Table**", coordinateTable].join("\n\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Slide Levels" text={`${result.coordinates.length}`} />
          <Detail.Metadata.Label
            title="Spacer Block Height"
            text={`${result.spacerBlockHeight.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label
            title="Baseline Offset"
            text={`${result.laserBaselineOffset.toFixed(3)} ${result.input.unit}`}
          />
          <Detail.Metadata.TagList title="Warnings">
            <Detail.Metadata.TagList.Item text="None" color="#0CA678" />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Summary" content={markdown.replace(/\*\*/g, "")} />
          <Action.CopyToClipboard
            title="Copy Coordinates"
            content={result.coordinates
              .map(
                (row) =>
                  `Drawer ${row.drawerIndex}: top ${row.topY.toFixed(3)}, center ${row.centerY.toFixed(3)}, bottom ${row.bottomY.toFixed(3)} ${result.input.unit}`,
              )
              .join("\n")}
          />
          <Action.CopyToClipboard
            title="Copy Spacer Block"
            content={`${result.spacerBlockHeight.toFixed(3)} ${result.input.unit}`}
          />
          <Action.CopyToClipboard title="Copy JSON Export" content={JSON.stringify(result, null, 2)} />
        </ActionPanel>
      }
    />
  );
}

function parseInput(values: Partial<SlideFormValues>): SlideLayoutInput | null {
  if (
    !values.cabinetInteriorHeight?.trim() ||
    !values.drawerCount?.trim() ||
    !values.topMargin?.trim() ||
    !values.gapSpacing?.trim() ||
    !values.slideThickness?.trim()
  ) {
    return null;
  }
  return {
    cabinetInteriorHeight: parseMeasurementInput(
      values.cabinetInteriorHeight,
      values.unit ?? "inches",
      "cabinet interior height",
    ),
    drawerCount: Number(values.drawerCount),
    topMargin: parseMeasurementInput(values.topMargin, values.unit ?? "inches", "top margin"),
    gapSpacing: parseMeasurementInput(values.gapSpacing, values.unit ?? "inches", "gap spacing"),
    slideThickness: parseMeasurementInput(values.slideThickness, values.unit ?? "inches", "slide thickness"),
    unit: (values.unit ?? "inches") as Unit,
    toolContext: (values.toolContext ?? "none") as ToolContext,
  };
}

function parsePrefill(raw?: string): Partial<SlideFormValues> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SlideLayoutInput>;
    return {
      cabinetInteriorHeight:
        parsed.cabinetInteriorHeight !== undefined ? String(parsed.cabinetInteriorHeight) : undefined,
      drawerCount: parsed.drawerCount !== undefined ? String(parsed.drawerCount) : undefined,
      topMargin: parsed.topMargin !== undefined ? String(parsed.topMargin) : undefined,
      gapSpacing: parsed.gapSpacing !== undefined ? String(parsed.gapSpacing) : undefined,
      slideThickness: parsed.slideThickness !== undefined ? String(parsed.slideThickness) : undefined,
      unit: parsed.unit,
      toolContext: parsed.toolContext,
    };
  } catch {
    return {};
  }
}
