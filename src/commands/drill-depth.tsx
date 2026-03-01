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
import { calculateDrillDepth } from "../lib/drill-depth";
import { formatSafetyChecklist } from "../lib/safety";
import { DrillDepthInput, DrillDepthResult, ExtensionPreferences, ScrewType, ToolContext, Unit } from "../types";
import { saveToHistory } from "../utils/history";

interface DrillFormValues {
  desiredHoleDepth: string;
  materialThickness: string;
  fastenerLength: string;
  screwType: ScrewType;
  screwDiameter: string;
  unit: Unit;
  toolContext: ToolContext;
}

type DrillArgs = {
  prefill?: string;
};

export default function DrillDepthCommand(props: LaunchProps<{ arguments: DrillArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parsePrefill(props.arguments.prefill);

  const [desiredHoleDepth, setDesiredHoleDepth] = useState(prefill.desiredHoleDepth ?? "");
  const [materialThickness, setMaterialThickness] = useState(prefill.materialThickness ?? "");
  const [fastenerLength, setFastenerLength] = useState(prefill.fastenerLength ?? "");
  const [screwType, setScrewType] = useState<ScrewType>(prefill.screwType ?? "wood");
  const [screwDiameter, setScrewDiameter] = useState(prefill.screwDiameter ?? "");
  const [unit, setUnit] = useState<Unit>(prefill.unit ?? (prefs.defaultUnit as Unit) ?? "inches");
  const [toolContext, setToolContext] = useState<ToolContext>(prefill.toolContext ?? "drill");

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
      });
      if (!input) {
        return "Live preview: enter depth, material thickness, and fastener length.";
      }
      const result = calculateDrillDepth(input);
      return `Live preview: collar ${result.stopCollarSetting.toFixed(3)} ${unit}, through-hole risk ${result.throughHoleRisk ? "yes" : "no"}`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [desiredHoleDepth, materialThickness, fastenerLength, screwType, screwDiameter, unit, toolContext]);

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
      <Form.TextField
        id="desiredHoleDepth"
        title="Desired Hole Depth"
        value={desiredHoleDepth}
        onChange={setDesiredHoleDepth}
        placeholder="0.75"
        autoFocus
      />
      <Form.TextField
        id="materialThickness"
        title="Material Thickness"
        value={materialThickness}
        onChange={setMaterialThickness}
        placeholder="0.875"
      />
      <Form.TextField
        id="fastenerLength"
        title="Fastener Length"
        value={fastenerLength}
        onChange={setFastenerLength}
        placeholder="1.25"
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
      <Form.TextField
        id="screwDiameter"
        title="Screw Diameter (optional)"
        value={screwDiameter}
        onChange={setScrewDiameter}
        placeholder="0.164"
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

function DrillResultView({ result }: { result: DrillDepthResult }) {
  const markdown = [result.summary, "", formatSafetyChecklist(result.input.toolContext)].join("\n\n");
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

function parseInput(values: Partial<DrillFormValues>): DrillDepthInput | null {
  if (!values.desiredHoleDepth?.trim() || !values.materialThickness?.trim() || !values.fastenerLength?.trim()) {
    return null;
  }
  return {
    desiredHoleDepth: Number(values.desiredHoleDepth),
    materialThickness: Number(values.materialThickness),
    fastenerLength: Number(values.fastenerLength),
    screwType: (values.screwType ?? "wood") as ScrewType,
    screwDiameter: values.screwDiameter?.trim() ? Number(values.screwDiameter) : undefined,
    unit: (values.unit ?? "inches") as Unit,
    toolContext: (values.toolContext ?? "drill") as ToolContext,
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
    };
  } catch {
    return {};
  }
}
