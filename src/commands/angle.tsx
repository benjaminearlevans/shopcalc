import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LaunchProps,
  LaunchType,
  Toast,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { calculateAngle } from "../lib/angles";
import { AngleInput, AngleMode, AngleResult } from "../types";
import { saveToHistory } from "../utils/history";
import { saveJobRevision } from "../utils/jobs";

type BeginnerTask = "corner" | "stairs" | "polygon" | "advanced";

interface AngleFormValues {
  task: BeginnerTask;
  cornerAngle: string;
  pitchInput: "degrees" | "rise-run";
  stairPitch: string;
  rise: string;
  run: string;
  sides: string;
  advancedMode: AngleMode;
  advancedJointAngle: string;
  advancedTiltAngle: string;
}

type AngleArgs = {
  prefill?: string;
};

export default function AngleCommand(props: LaunchProps<{ arguments: AngleArgs }>) {
  const { push } = useNavigation();
  const prefill = parseAnglePrefill(props.arguments.prefill);

  const [task, setTask] = useState<BeginnerTask>(prefill.task ?? "corner");
  const [pitchInput, setPitchInput] = useState<"degrees" | "rise-run">(prefill.pitchInput ?? "degrees");
  const [advancedMode, setAdvancedMode] = useState<AngleMode>(prefill.advancedMode ?? "miter");

  const [cornerAngle, setCornerAngle] = useState(prefill.cornerAngle ?? "90");
  const [stairPitch, setStairPitch] = useState(prefill.stairPitch ?? "36");
  const [rise, setRise] = useState(prefill.rise ?? "");
  const [run, setRun] = useState(prefill.run ?? "");
  const [sides, setSides] = useState(prefill.sides ?? "6");
  const [advancedJointAngle, setAdvancedJointAngle] = useState(prefill.advancedJointAngle ?? "90");
  const [advancedTiltAngle, setAdvancedTiltAngle] = useState(prefill.advancedTiltAngle ?? "45");

  const taskHelp = useMemo(() => {
    switch (task) {
      case "corner":
        return "Use this when two pieces meet at a corner.";
      case "stairs":
        return "Use this for railings that follow stair slope.";
      case "polygon":
        return "Use this for hexagons, octagons, and other multi-side frames.";
      case "advanced":
        return "Use this if you already know woodworking angle terms.";
      default:
        return "";
    }
  }, [task]);

  const preview = useMemo(() => {
    try {
      const input = mapStateToAngleInput({
        task,
        cornerAngle,
        pitchInput,
        stairPitch,
        rise,
        run,
        sides,
        advancedMode,
        advancedJointAngle,
        advancedTiltAngle,
      });

      if (!input) {
        return "Live preview: enter enough values to preview saw settings.";
      }

      const result = calculateAngle(input);
      return `Live preview: miter ${result.miterAngle.toFixed(2)}°, bevel ${result.bevelAngle.toFixed(2)}°`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [
    task,
    cornerAngle,
    pitchInput,
    stairPitch,
    rise,
    run,
    sides,
    advancedMode,
    advancedJointAngle,
    advancedTiltAngle,
  ]);

  async function handleSubmit(values: AngleFormValues) {
    try {
      const input = mapStateToAngleInput(values);
      if (!input) {
        throw new Error("Enter enough values for an angle calculation.");
      }

      const result = calculateAngle(input);
      await saveToHistory("angle", input, result.summary);
      push(<AngleResultView result={result} task={values.task} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check your angle inputs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function loadCornerExample() {
    setTask("corner");
    setCornerAngle("90");
    setPitchInput("degrees");
    setStairPitch("36");
    setRise("");
    setRun("");
    setSides("6");
    setAdvancedMode("miter");
    setAdvancedJointAngle("90");
    setAdvancedTiltAngle("45");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Angle" onSubmit={handleSubmit} />
          <Action title="Load 90° Corner Example" onAction={loadCornerExample} />
          <Action
            title="Open Guided Start"
            onAction={() => launchCommand({ name: "guided-start", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="task"
        title="What are you trying to do?"
        value={task}
        onChange={(value) => setTask(value as BeginnerTask)}
      >
        <Form.Dropdown.Item value="corner" title="Join two pieces at a corner" />
        <Form.Dropdown.Item value="stairs" title="Cut a stair railing end" />
        <Form.Dropdown.Item value="polygon" title="Build a polygon frame" />
        <Form.Dropdown.Item value="advanced" title="Advanced angle modes" />
      </Form.Dropdown>
      <Form.Description text={taskHelp} />

      {task === "corner" && (
        <Form.TextField
          id="cornerAngle"
          title="Corner Angle (degrees)"
          value={cornerAngle}
          onChange={setCornerAngle}
          placeholder="90"
          info="For a right-angle corner, enter 90."
          autoFocus
        />
      )}

      {task === "stairs" && (
        <>
          <Form.Dropdown
            id="pitchInput"
            title="How do you know the stair slope?"
            value={pitchInput}
            onChange={(value) => setPitchInput(value as "degrees" | "rise-run")}
          >
            <Form.Dropdown.Item value="degrees" title="I know the angle in degrees" />
            <Form.Dropdown.Item value="rise-run" title="I know rise and run" />
          </Form.Dropdown>
          {pitchInput === "degrees" ? (
            <Form.TextField
              id="stairPitch"
              title="Stair Pitch (degrees)"
              value={stairPitch}
              onChange={setStairPitch}
              placeholder="36"
              autoFocus
            />
          ) : (
            <>
              <Form.TextField id="rise" title="Rise" value={rise} onChange={setRise} placeholder="7" autoFocus />
              <Form.TextField id="run" title="Run" value={run} onChange={setRun} placeholder="11" />
            </>
          )}
        </>
      )}

      {task === "polygon" && (
        <Form.TextField
          id="sides"
          title="Number of Sides"
          value={sides}
          onChange={setSides}
          placeholder="6"
          info="Example: 6 for hexagon, 8 for octagon."
          autoFocus
        />
      )}

      {task === "advanced" && (
        <>
          <Form.Dropdown
            id="advancedMode"
            title="Advanced Mode"
            value={advancedMode}
            onChange={(value) => setAdvancedMode(value as AngleMode)}
          >
            <Form.Dropdown.Item value="miter" title="Miter" />
            <Form.Dropdown.Item value="bevel" title="Bevel" />
            <Form.Dropdown.Item value="compound" title="Compound" />
          </Form.Dropdown>
          {(advancedMode === "miter" || advancedMode === "bevel" || advancedMode === "compound") && (
            <Form.TextField
              id="advancedJointAngle"
              title={advancedMode === "miter" ? "Joint Angle (degrees)" : "Slope Angle (degrees)"}
              value={advancedJointAngle}
              onChange={setAdvancedJointAngle}
              placeholder="90"
              autoFocus
            />
          )}
          {advancedMode === "compound" && (
            <Form.TextField
              id="advancedTiltAngle"
              title="Tilt Angle (degrees)"
              value={advancedTiltAngle}
              onChange={setAdvancedTiltAngle}
              placeholder="45"
            />
          )}
        </>
      )}

      <Form.Separator />
      <Form.Description text={preview} />
    </Form>
  );
}

function AngleResultView({ result, task }: { result: AngleResult; task: BeginnerTask }) {
  const instruction = buildInstruction(result, task);
  const assumptions = result.assumptions?.length
    ? ["**Assumptions**", ...result.assumptions.map((item) => `- ${item}`)].join("\n")
    : "";
  const markdown = [
    result.summary,
    "",
    "**What to do next**",
    instruction,
    "",
    assumptions,
    "",
    `**Saw setting**: ${result.bladeSetting}`,
  ].join("\n\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Miter" text={`${result.miterAngle.toFixed(2)}°`} />
          <Detail.Metadata.Label title="Bevel" text={`${result.bevelAngle.toFixed(2)}°`} />
          <Detail.Metadata.Label title="Complementary" text={`${result.complementary.toFixed(2)}°`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Full Result" content={markdown.replace(/\*\*/g, "")} />
          <Action.CopyToClipboard
            title="Copy Saw Setting"
            content={`Miter ${result.miterAngle.toFixed(2)}°, Bevel ${result.bevelAngle.toFixed(2)}°`}
          />
          <Action
            title="Save Revision to Jobs"
            onAction={async () => {
              const jobName = `Angle ${result.input.mode}`;
              await saveJobRevision({
                jobName,
                type: "angle",
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
                        length: 24,
                        width: 3,
                        quantity: 8,
                        label: `${result.input.mode} frame segment`,
                      },
                    ],
                    stock: {
                      type: "board",
                      length: 96,
                      width: 3.5,
                      unit: "inches",
                    },
                    kerf: 0.125,
                    unit: "inches",
                    allowRotation: true,
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

function buildInstruction(result: AngleResult, task: BeginnerTask): string {
  if (task === "corner") {
    return `Set your saw to **${result.miterAngle.toFixed(2)}°** and cut both pieces the same way. Test on scrap before final cuts.`;
  }
  if (task === "stairs") {
    return `Set your miter to **${result.miterAngle.toFixed(2)}°** for the railing end cut, then dry-fit against the post before final fastening.`;
  }
  if (task === "polygon") {
    return `Cut all frame pieces at **${result.miterAngle.toFixed(2)}°** and verify fit after 2 pieces before batch cutting.`;
  }
  return `Apply the listed miter/bevel settings and make a test cut first to verify orientation.`;
}

function mapStateToAngleInput(values: AngleFormValues): AngleInput | null {
  if (values.task === "corner") {
    if (!values.cornerAngle.trim()) {
      return null;
    }
    return {
      mode: "miter",
      slopeAngle: Number(values.cornerAngle),
      unit: "degrees",
    };
  }

  if (values.task === "stairs") {
    if (values.pitchInput === "rise-run") {
      if (!values.rise.trim() || !values.run.trim()) {
        return null;
      }
      return {
        mode: "stair-rail",
        unit: "rise-run",
        rise: Number(values.rise),
        run: Number(values.run),
      };
    }

    if (!values.stairPitch.trim()) {
      return null;
    }

    return {
      mode: "stair-rail",
      unit: "degrees",
      slopeAngle: Number(values.stairPitch),
    };
  }

  if (values.task === "polygon") {
    if (!values.sides.trim()) {
      return null;
    }
    return {
      mode: "polygon",
      sides: Number(values.sides),
    };
  }

  const mode = values.advancedMode;
  if (mode === "compound") {
    if (!values.advancedJointAngle.trim() || !values.advancedTiltAngle.trim()) {
      return null;
    }
    return {
      mode,
      slopeAngle: Number(values.advancedJointAngle),
      tiltAngle: Number(values.advancedTiltAngle),
      unit: "degrees",
    };
  }

  if (!values.advancedJointAngle.trim()) {
    return null;
  }

  return {
    mode,
    slopeAngle: Number(values.advancedJointAngle),
    unit: "degrees",
  };
}

function parseAnglePrefill(raw?: string): Partial<AngleFormValues> {
  if (!raw) {
    return {};
  }

  try {
    const input = JSON.parse(raw) as Partial<AngleInput>;

    if (input.mode === "stair-rail") {
      if (input.unit === "rise-run") {
        return {
          task: "stairs",
          pitchInput: "rise-run",
          rise: input.rise !== undefined ? String(input.rise) : undefined,
          run: input.run !== undefined ? String(input.run) : undefined,
        };
      }

      return {
        task: "stairs",
        pitchInput: "degrees",
        stairPitch: input.slopeAngle !== undefined ? String(input.slopeAngle) : undefined,
      };
    }

    if (input.mode === "polygon") {
      return {
        task: "polygon",
        sides: input.sides !== undefined ? String(input.sides) : undefined,
      };
    }

    if (input.mode === "miter") {
      return {
        task: "corner",
        cornerAngle: input.slopeAngle !== undefined ? String(input.slopeAngle) : undefined,
      };
    }

    if (input.mode === "bevel" || input.mode === "compound") {
      return {
        task: "advanced",
        advancedMode: input.mode,
        advancedJointAngle: input.slopeAngle !== undefined ? String(input.slopeAngle) : undefined,
        advancedTiltAngle: input.tiltAngle !== undefined ? String(input.tiltAngle) : undefined,
      };
    }

    return {};
  } catch {
    return {};
  }
}
