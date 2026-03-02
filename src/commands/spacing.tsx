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
import { calculateSpacing } from "../lib/spacing";
import { ExtensionPreferences, SpacingInput, SpacingResult, ToleranceMode, Unit } from "../types";
import { saveToHistory } from "../utils/history";
import { saveJobRevision } from "../utils/jobs";
import { getActiveProfile } from "../utils/profiles";

interface SpacingFormValues {
  totalLength: string;
  count: string;
  elementWidth: string;
  unit: Unit;
  edgeOffset: string;
  centerToCenter: "false" | "true";
  toleranceMode: ToleranceMode;
}

type SpacingArgs = {
  prefill?: string;
};

type SpacingPrefill = {
  totalLength?: string;
  count?: string;
  elementWidth?: string;
  unit?: Unit;
  edgeOffset?: string;
  centerToCenter?: "false" | "true";
  toleranceMode?: ToleranceMode;
};

export default function SpacingCommand(props: LaunchProps<{ arguments: SpacingArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parseSpacingPrefill(props.arguments.prefill);
  const hasPrefill = Boolean(props.arguments.prefill);
  const { data: activeProfile } = useCachedPromise(getActiveProfile, [prefs]);

  const [totalLength, setTotalLength] = useState(prefill.totalLength ?? "");
  const [count, setCount] = useState(prefill.count ?? "");
  const [elementWidth, setElementWidth] = useState(prefill.elementWidth ?? "");
  const [unit, setUnit] = useState<Unit>(prefill.unit ?? (prefs.defaultUnit as Unit) ?? "inches");
  const [edgeOffset, setEdgeOffset] = useState(prefill.edgeOffset ?? "0");
  const [centerToCenter, setCenterToCenter] = useState<"false" | "true">(prefill.centerToCenter ?? "false");
  const [toleranceMode, setToleranceMode] = useState<ToleranceMode>(prefill.toleranceMode ?? "standard");

  useEffect(() => {
    if (!activeProfile || hasPrefill) {
      return;
    }
    setUnit(activeProfile.unit);
    setToleranceMode(activeProfile.toleranceMode);
  }, [activeProfile, hasPrefill]);

  const preview = useMemo(() => {
    const input = buildSpacingInput({
      totalLength,
      count,
      elementWidth,
      unit,
      edgeOffset,
      centerToCenter,
      toleranceMode,
    });

    if (!input) {
      return "Live preview: fill total span, piece count, and piece width.";
    }

    try {
      const result = calculateSpacing(input);
      return `Live preview: gap ${result.gap.toFixed(4)} ${result.input.unit}, step ${result.repeatingUnit.toFixed(4)} ${result.input.unit}`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [totalLength, count, elementWidth, unit, edgeOffset, centerToCenter, toleranceMode]);

  async function handleSubmit(values: SpacingFormValues) {
    try {
      const input = buildSpacingInput(values);
      if (!input) {
        throw new Error("Enter total span, piece count, and piece width.");
      }

      const result = calculateSpacing(input);
      await saveToHistory("spacing", input, result.summary);
      push(<SpacingResultView result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check your spacing inputs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function loadExample() {
    setTotalLength("67.5");
    setCount("20");
    setElementWidth("0.75");
    setUnit("inches");
    setEdgeOffset("2.5");
    setCenterToCenter("false");
    setToleranceMode("standard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Spacing" onSubmit={handleSubmit} />
          <Action title="Load Spacing Example" onAction={loadExample} />
          <Action
            title="Open Guided Start"
            onAction={() => launchCommand({ name: "guided-start", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Use this when you want evenly spaced pieces (like slats or dividers)." />
      <Form.TextField
        id="totalLength"
        title="Total Span"
        value={totalLength}
        onChange={setTotalLength}
        placeholder="67.5"
        info='The full distance you are filling with pieces. Accepts suffix/fraction (example: 67.5, 1714.5mm, 67-1/2").'
        autoFocus
      />
      <Form.TextField
        id="count"
        title="How Many Pieces"
        value={count}
        onChange={setCount}
        placeholder="21"
        info="Number of repeated pieces to place."
      />
      <Form.TextField
        id="elementWidth"
        title="Piece Width"
        value={elementWidth}
        onChange={setElementWidth}
        placeholder="0.75"
        info='Width of one piece. Accepts suffix/fraction (example: 0.75, 19mm, 3/4").'
      />
      <Form.Dropdown id="unit" title="Unit" value={unit} onChange={(value) => setUnit(value as Unit)}>
        <Form.Dropdown.Item value="inches" title="Inches" />
        <Form.Dropdown.Item value="mm" title="Millimeters" />
        <Form.Dropdown.Item value="cm" title="Centimeters" />
      </Form.Dropdown>
      <Form.TextField
        id="edgeOffset"
        title="Left/Right Margin"
        value={edgeOffset}
        onChange={setEdgeOffset}
        placeholder="0"
        info='Extra empty space at both ends. Accepts suffix/fraction (example: 0, 2.5, 64mm, 2-1/2").'
      />
      <Form.Dropdown
        id="centerToCenter"
        title="Gap Measurement Style"
        value={centerToCenter}
        onChange={(value) => setCenterToCenter(value as "false" | "true")}
      >
        <Form.Dropdown.Item value="false" title="Gap between piece edges (recommended)" />
        <Form.Dropdown.Item value="true" title="Distance between piece centers" />
      </Form.Dropdown>
      <Form.Dropdown
        id="toleranceMode"
        title="Tolerance Mode"
        value={toleranceMode}
        onChange={(value) => setToleranceMode(value as ToleranceMode)}
      >
        <Form.Dropdown.Item value="tight" title="Tight" />
        <Form.Dropdown.Item value="standard" title="Standard" />
        <Form.Dropdown.Item value="loose" title="Loose" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description text={preview} />
    </Form>
  );
}

function buildSpacingInput(values: SpacingFormValues): SpacingInput | null {
  if (!values.totalLength.trim() || !values.count.trim() || !values.elementWidth.trim()) {
    return null;
  }

  return {
    totalLength: parseMeasurementInput(values.totalLength, values.unit, "total span"),
    count: Number(values.count),
    elementWidth: parseMeasurementInput(values.elementWidth, values.unit, "piece width"),
    unit: values.unit,
    edgeOffset: values.edgeOffset ? parseMeasurementInput(values.edgeOffset, values.unit, "edge offset") : 0,
    centerToCenter: values.centerToCenter === "true",
    toleranceMode: values.toleranceMode ?? "standard",
  };
}

function parseSpacingPrefill(raw?: string): SpacingPrefill {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SpacingInput>;
    return {
      totalLength: parsed.totalLength !== undefined ? String(parsed.totalLength) : undefined,
      count: parsed.count !== undefined ? String(parsed.count) : undefined,
      elementWidth: parsed.elementWidth !== undefined ? String(parsed.elementWidth) : undefined,
      unit: parsed.unit,
      edgeOffset: parsed.edgeOffset !== undefined ? String(parsed.edgeOffset) : undefined,
      centerToCenter:
        parsed.centerToCenter !== undefined ? (String(parsed.centerToCenter) as "false" | "true") : undefined,
      toleranceMode: parsed.toleranceMode,
    };
  } catch {
    return {};
  }
}

function SpacingResultView({ result }: { result: SpacingResult }) {
  const firstMark = result.positions[0];
  const instructions = [
    "**What to do next**",
    `1. Mark the first piece start at **${firstMark.toFixed(4)} ${result.input.unit}** from the left edge.`,
    `2. Mark each next start by adding **${result.repeatingUnit.toFixed(4)} ${result.input.unit}**.`,
    `3. You should end with **${result.remainingSpace.toFixed(4)} ${result.input.unit}** remaining on the right side.`,
  ].join("\n");

  const assumptions = result.assumptions?.length
    ? ["**Assumptions**", ...result.assumptions.map((item) => `- ${item}`)].join("\n")
    : "";
  const markdown = [result.summary, "", instructions, "", assumptions, "", result.diagram].join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Gap Between Pieces" text={`${result.gap.toFixed(4)} ${result.input.unit}`} />
          <Detail.Metadata.Label
            title="Step Size (piece + gap)"
            text={`${result.repeatingUnit.toFixed(4)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label title="Piece Count" text={`${result.input.count}`} />
          <Detail.Metadata.Label
            title="Right-Side Remaining"
            text={`${result.remainingSpace.toFixed(4)} ${result.input.unit}`}
          />
          <Detail.Metadata.Label title="Tolerance Mode" text={result.input.toleranceMode ?? "standard"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Full Result" content={markdown.replace(/\*\*/g, "")} />
          <Action.CopyToClipboard
            title="Copy Mark Positions"
            content={result.positions
              .map((position, index) => `Piece ${index + 1} start: ${position.toFixed(4)} ${result.input.unit}`)
              .join("\n")}
          />
          <Action
            title="Save Revision to Jobs"
            onAction={async () => {
              const jobName = `Spacing ${result.input.count}pcs ${result.input.totalLength}${result.input.unit}`;
              await saveJobRevision({
                jobName,
                type: "spacing",
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
                        length: result.input.elementWidth,
                        width: result.input.elementWidth,
                        quantity: result.input.count,
                        label: "Even Parts",
                      },
                    ],
                    stock: {
                      type: "board",
                      length: result.input.totalLength,
                      width: result.input.elementWidth * 2,
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
