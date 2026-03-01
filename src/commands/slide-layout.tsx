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
      <Form.TextField
        id="cabinetInteriorHeight"
        title="Cabinet Interior Height"
        value={cabinetInteriorHeight}
        onChange={setCabinetInteriorHeight}
        placeholder="30"
        autoFocus
      />
      <Form.TextField
        id="drawerCount"
        title="Number of Drawers"
        value={drawerCount}
        onChange={setDrawerCount}
        placeholder="4"
      />
      <Form.TextField id="topMargin" title="Top Margin" value={topMargin} onChange={setTopMargin} placeholder="2" />
      <Form.TextField id="gapSpacing" title="Gap Spacing" value={gapSpacing} onChange={setGapSpacing} placeholder="6" />
      <Form.TextField
        id="slideThickness"
        title="Slide Thickness"
        value={slideThickness}
        onChange={setSlideThickness}
        placeholder="0.5"
      />
      <Form.Dropdown id="unit" title="Unit" value={unit} onChange={(value) => setUnit(value as Unit)}>
        <Form.Dropdown.Item value="inches" title="Inches" />
        <Form.Dropdown.Item value="mm" title="Millimeters" />
        <Form.Dropdown.Item value="cm" title="Centimeters" />
      </Form.Dropdown>
      <Form.Dropdown
        id="toolContext"
        title="Safety Tool Context"
        value={toolContext}
        onChange={(value) => setToolContext(value as ToolContext)}
      >
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="router" title="Router" />
        <Form.Dropdown.Item value="table-saw" title="Table Saw" />
        <Form.Dropdown.Item value="drill" title="Drill" />
        <Form.Dropdown.Item value="pocket-screw" title="Pocket Screw" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description text={preview} />
    </Form>
  );
}

function SlideResultView({ result }: { result: SlideLayoutResult }) {
  const markdown = [result.summary, "", result.diagram, "", formatSafetyChecklist(result.input.toolContext)].join(
    "\n\n",
  );
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Summary" content={markdown.replace(/\*\*/g, "")} />
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
    cabinetInteriorHeight: Number(values.cabinetInteriorHeight),
    drawerCount: Number(values.drawerCount),
    topMargin: Number(values.topMargin),
    gapSpacing: Number(values.gapSpacing),
    slideThickness: Number(values.slideThickness),
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
