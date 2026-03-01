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
import { calculateScribePlan } from "../lib/scribe-planner";
import { ExtensionPreferences, ScribePlannerInput, ScribePlannerResult, ToolContext, Unit } from "../types";
import { saveToHistory } from "../utils/history";

interface ScribeFormValues {
  nominalWallWidth: string;
  highDeviation: string;
  lowDeviation: string;
  plumbDeviation: string;
  desiredVisibleWidth: string;
  unit: Unit;
  toolContext: ToolContext;
}

type ScribeArgs = {
  prefill?: string;
};

export default function ScribePlannerCommand(props: LaunchProps<{ arguments: ScribeArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parsePrefill(props.arguments.prefill);

  const [nominalWallWidth, setNominalWallWidth] = useState(prefill.nominalWallWidth ?? "");
  const [highDeviation, setHighDeviation] = useState(prefill.highDeviation ?? "0");
  const [lowDeviation, setLowDeviation] = useState(prefill.lowDeviation ?? "0");
  const [plumbDeviation, setPlumbDeviation] = useState(prefill.plumbDeviation ?? "0");
  const [desiredVisibleWidth, setDesiredVisibleWidth] = useState(prefill.desiredVisibleWidth ?? "");
  const [unit, setUnit] = useState<Unit>(prefill.unit ?? (prefs.defaultUnit as Unit) ?? "inches");
  const [toolContext, setToolContext] = useState<ToolContext>(prefill.toolContext ?? "none");

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
      });
      if (!input) {
        return "Live preview: enter nominal width and target visible width.";
      }
      const result = calculateScribePlan(input);
      return `Live preview: rough cut ${result.roughCutDimension.toFixed(3)} ${unit}, oversize ${result.oversizeMargin.toFixed(3)} ${unit}`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [nominalWallWidth, highDeviation, lowDeviation, plumbDeviation, desiredVisibleWidth, unit, toolContext]);

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
      <Form.TextField
        id="nominalWallWidth"
        title="Nominal Wall Width"
        value={nominalWallWidth}
        onChange={setNominalWallWidth}
        placeholder="30"
        autoFocus
      />
      <Form.TextField
        id="desiredVisibleWidth"
        title="Desired Final Visible Width"
        value={desiredVisibleWidth}
        onChange={setDesiredVisibleWidth}
        placeholder="29.5"
      />
      <Form.TextField
        id="highDeviation"
        title="Measured High Deviation"
        value={highDeviation}
        onChange={setHighDeviation}
        placeholder="0.12"
      />
      <Form.TextField
        id="lowDeviation"
        title="Measured Low Deviation"
        value={lowDeviation}
        onChange={setLowDeviation}
        placeholder="-0.08"
      />
      <Form.TextField
        id="plumbDeviation"
        title="Measured Plumb Deviation"
        value={plumbDeviation}
        onChange={setPlumbDeviation}
        placeholder="0.1"
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

function ScribeResultView({ result }: { result: ScribePlannerResult }) {
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

function parseInput(values: Partial<ScribeFormValues>): ScribePlannerInput | null {
  if (!values.nominalWallWidth?.trim() || !values.desiredVisibleWidth?.trim()) {
    return null;
  }
  return {
    nominalWallWidth: Number(values.nominalWallWidth),
    highDeviation: Number(values.highDeviation || "0"),
    lowDeviation: Number(values.lowDeviation || "0"),
    plumbDeviation: Number(values.plumbDeviation || "0"),
    desiredVisibleWidth: Number(values.desiredVisibleWidth),
    unit: (values.unit ?? "inches") as Unit,
    toolContext: (values.toolContext ?? "none") as ToolContext,
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
    };
  } catch {
    return {};
  }
}
