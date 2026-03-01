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
import { calculateDrawerBox } from "../lib/drawer-box";
import { formatSafetyChecklist } from "../lib/safety";
import {
  DrawerBoxInput,
  DrawerBoxResult,
  DrawerSlideType,
  ExtensionPreferences,
  JoineryType,
  ToolContext,
  Unit,
} from "../types";
import { saveToHistory } from "../utils/history";

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
}

type DrawerArgs = {
  prefill?: string;
};

export default function DrawerEngineCommand(props: LaunchProps<{ arguments: DrawerArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parsePrefill(props.arguments.prefill);

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
      <Form.TextField
        id="openingWidth"
        title="Opening Width"
        value={openingWidth}
        onChange={setOpeningWidth}
        placeholder="21"
        autoFocus
      />
      <Form.TextField
        id="drawerDepth"
        title="Drawer Depth"
        value={drawerDepth}
        onChange={setDrawerDepth}
        placeholder="18"
      />
      <Form.Dropdown
        id="slideType"
        title="Slide Type"
        value={slideType}
        onChange={(value) => setSlideType(value as DrawerSlideType)}
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
      />
      <Form.TextField
        id="materialThickness"
        title="Material Thickness"
        value={materialThickness}
        onChange={setMaterialThickness}
        placeholder="0.75"
      />
      <Form.Dropdown
        id="joineryType"
        title="Joinery Type"
        value={joineryType}
        onChange={(value) => setJoineryType(value as JoineryType)}
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
      />
      <Form.TextField
        id="bottomThickness"
        title="Bottom Thickness"
        value={bottomThickness}
        onChange={setBottomThickness}
        placeholder="0.25"
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

function DrawerResultView({ result }: { result: DrawerBoxResult }) {
  const safetyMarkdown = formatSafetyChecklist(result.input.toolContext);
  const markdown = [result.summary, "", result.diagram, "", safetyMarkdown].join("\n\n");

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

function parseInput(values: Partial<DrawerFormValues>): DrawerBoxInput | null {
  if (
    !values.openingWidth?.trim() ||
    !values.drawerDepth?.trim() ||
    !values.slideClearance?.trim() ||
    !values.materialThickness?.trim() ||
    !values.bottomInsetDepth?.trim() ||
    !values.bottomThickness?.trim()
  ) {
    return null;
  }

  return {
    openingWidth: Number(values.openingWidth),
    drawerDepth: Number(values.drawerDepth),
    slideType: (values.slideType ?? "side-mount") as DrawerSlideType,
    slideClearance: Number(values.slideClearance),
    materialThickness: Number(values.materialThickness),
    joineryType: (values.joineryType ?? "dado") as JoineryType,
    bottomInsetDepth: Number(values.bottomInsetDepth),
    bottomThickness: Number(values.bottomThickness),
    unit: (values.unit ?? "inches") as Unit,
    toolContext: (values.toolContext ?? "none") as ToolContext,
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
    };
  } catch {
    return {};
  }
}
