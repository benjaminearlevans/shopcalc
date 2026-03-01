import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { calculateAngle } from "../lib/angles";
import { convertUnits } from "../lib/conversion";
import { calculateCutList, formatCutListResult } from "../lib/cutlist";
import { calculateDrawerBox } from "../lib/drawer-box";
import { calculateDrillDepth } from "../lib/drill-depth";
import { calculateHingeLayout } from "../lib/hinge-layout";
import { evaluateQuickConversion } from "../lib/quick-convert";
import { calculateScribePlan } from "../lib/scribe-planner";
import { calculateSpacing } from "../lib/spacing";
import { calculateSlideLayout } from "../lib/slide-layout";
import {
  AngleInput,
  ConversionInput,
  CutListInput,
  DrawerBoxInput,
  DrillDepthInput,
  FractionPrecision,
  HingeLayoutInput,
  HistoryEntry,
  QuickConvertHistoryInput,
  ScribePlannerInput,
  SlideLayoutInput,
  SpacingInput,
  Unit,
} from "../types";
import { clearHistory, getHistory } from "../utils/history";

export default function HistoryCommand() {
  const { push } = useNavigation();
  const { data: history = [], isLoading, revalidate } = useCachedPromise(getHistory, []);

  async function handleClearHistory() {
    const confirmed = await confirmAlert({
      title: "Clear calculation history?",
      message: "This removes all saved ShopCalc calculations.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await clearHistory();
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
    await revalidate();
  }

  async function rerun(entry: HistoryEntry) {
    try {
      const markdown = recomputeMarkdown(entry);
      push(
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Result" content={markdown.replace(/\*\*/g, "")} />
            </ActionPanel>
          }
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not re-run calculation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function editInputs(entry: HistoryEntry) {
    try {
      if (entry.type === "quick-convert") {
        const input = entry.input as QuickConvertHistoryInput;
        await launchCommand({
          name: "quick-convert",
          type: LaunchType.UserInitiated,
          arguments: { query: input.query },
        });
        return;
      }

      const commandName = mapHistoryTypeToCommand(entry.type);
      await launchCommand({
        name: commandName,
        type: LaunchType.UserInitiated,
        arguments: { prefill: JSON.stringify(entry.input) },
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open input editor",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent calculations"
      actions={
        <ActionPanel>
          <Action
            title="Clear History"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleClearHistory}
          />
        </ActionPanel>
      }
    >
      {!history.length && !isLoading ? <List.EmptyView title="No calculations saved" /> : null}
      {history.map((entry) => {
        const preview = historyPreview(entry);

        return (
          <List.Item
            key={entry.id}
            icon={iconForType(entry.type)}
            title={preview.title}
            subtitle={preview.subtitle}
            accessories={[{ tag: typeTitle(entry) }, { date: new Date(entry.timestamp) }]}
            actions={
              <ActionPanel>
                <Action title="View Summary" onAction={() => push(<Detail markdown={entry.summary} />)} />
                <Action title="Edit Inputs" icon={Icon.Pencil} onAction={() => editInputs(entry)} />
                <Action title="Run Again" icon={Icon.ArrowClockwise} onAction={() => rerun(entry)} />
                <Action.CopyToClipboard title="Copy Summary" content={entry.summary.replace(/\*\*/g, "")} />
                <Action.CopyToClipboard title="Copy Inputs (JSON)" content={JSON.stringify(entry.input, null, 2)} />
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={handleClearHistory}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function recomputeMarkdown(entry: HistoryEntry): string {
  if (entry.type === "spacing") {
    const result = calculateSpacing(entry.input as SpacingInput);
    return [result.summary, "", result.diagram].join("\n");
  }

  if (entry.type === "conversion") {
    return convertUnits(entry.input as ConversionInput).summary;
  }

  if (entry.type === "quick-convert") {
    const input = entry.input as QuickConvertHistoryInput;
    return evaluateQuickConversion(input.query, input.defaultUnit, input.precision as FractionPrecision).display;
  }

  if (entry.type === "cutlist") {
    const result = calculateCutList(entry.input as CutListInput);
    return formatCutListResult(result, (entry.input as CutListInput).unit as Unit);
  }

  if (entry.type === "drawer-box") {
    const result = calculateDrawerBox(entry.input as DrawerBoxInput);
    return [result.summary, "", result.diagram].join("\n");
  }

  if (entry.type === "hinge-layout") {
    const result = calculateHingeLayout(entry.input as HingeLayoutInput);
    return result.summary;
  }

  if (entry.type === "slide-layout") {
    const result = calculateSlideLayout(entry.input as SlideLayoutInput);
    return [result.summary, "", result.diagram].join("\n");
  }

  if (entry.type === "scribe-planner") {
    const result = calculateScribePlan(entry.input as ScribePlannerInput);
    return result.summary;
  }

  if (entry.type === "drill-depth") {
    const result = calculateDrillDepth(entry.input as DrillDepthInput);
    return result.summary;
  }

  const result = calculateAngle(entry.input as AngleInput);
  return [result.summary, "", `**Saw setting**: ${result.bladeSetting}`].join("\n");
}

function historyPreview(entry: HistoryEntry): { title: string; subtitle: string } {
  if (entry.type === "spacing") {
    const input = entry.input as SpacingInput;
    return {
      title: `${input.count} pieces across ${input.totalLength} ${input.unit}`,
      subtitle: "Spacing calculation",
    };
  }

  if (entry.type === "conversion") {
    const input = entry.input as ConversionInput;
    const target = input.to ? ` to ${input.to}` : "";
    return {
      title: `${input.value} ${input.from}${target}`,
      subtitle: "Unit conversion",
    };
  }

  if (entry.type === "quick-convert") {
    const input = entry.input as QuickConvertHistoryInput;
    return {
      title: input.query,
      subtitle: "Quick conversion expression",
    };
  }

  if (entry.type === "cutlist") {
    const input = entry.input as CutListInput;
    return {
      title: `${input.pieces.length} piece type(s), ${input.stock.type} stock`,
      subtitle: "Material estimate",
    };
  }

  if (entry.type === "drawer-box") {
    const input = entry.input as DrawerBoxInput;
    return {
      title: `Drawer ${input.openingWidth} ${input.unit} opening`,
      subtitle: "Drawer box engine",
    };
  }

  if (entry.type === "hinge-layout") {
    const input = entry.input as HingeLayoutInput;
    return {
      title: `Door ${input.doorHeight} ${input.unit}, ${input.mode}`,
      subtitle: "Hinge layout",
    };
  }

  if (entry.type === "slide-layout") {
    const input = entry.input as SlideLayoutInput;
    return {
      title: `${input.drawerCount} drawers in ${input.cabinetInteriorHeight} ${input.unit}`,
      subtitle: "Slide layout",
    };
  }

  if (entry.type === "scribe-planner") {
    const input = entry.input as ScribePlannerInput;
    return {
      title: `Scribe plan ${input.desiredVisibleWidth} ${input.unit}`,
      subtitle: "Oversize planner",
    };
  }

  if (entry.type === "drill-depth") {
    const input = entry.input as DrillDepthInput;
    return {
      title: `Depth ${input.desiredHoleDepth} ${input.unit}`,
      subtitle: "Drill depth control",
    };
  }

  const input = entry.input as AngleInput;
  return {
    title: `Angle task (${input.mode})`,
    subtitle: "Saw setting calculation",
  };
}

function typeTitle(entry: HistoryEntry): string {
  switch (entry.type) {
    case "spacing":
      return "Spacing";
    case "conversion":
      return "Conversion";
    case "cutlist":
      return "Cut List";
    case "angle":
      return "Angle";
    case "quick-convert":
      return "Quick Convert";
    case "drawer-box":
      return "Drawer";
    case "hinge-layout":
      return "Hinge";
    case "slide-layout":
      return "Slide";
    case "scribe-planner":
      return "Scribe";
    case "drill-depth":
      return "Drill";
    default:
      return "Calculation";
  }
}

function iconForType(type: HistoryEntry["type"]): { source: Icon; tintColor: Color } {
  switch (type) {
    case "spacing":
      return { source: Icon.Ruler, tintColor: Color.Blue };
    case "conversion":
      return { source: Icon.ArrowsExpand, tintColor: Color.Purple };
    case "cutlist":
      return { source: Icon.List, tintColor: Color.Orange };
    case "angle":
      return { source: Icon.Compass, tintColor: Color.Green };
    case "quick-convert":
      return { source: Icon.Bolt, tintColor: Color.Yellow };
    case "drawer-box":
      return { source: Icon.Hammer, tintColor: Color.Red };
    case "hinge-layout":
      return { source: Icon.Pin, tintColor: Color.Purple };
    case "slide-layout":
      return { source: Icon.List, tintColor: Color.Orange };
    case "scribe-planner":
      return { source: Icon.Ruler, tintColor: Color.Blue };
    case "drill-depth":
      return { source: Icon.Bolt, tintColor: Color.Green };
    default:
      return { source: Icon.Document, tintColor: Color.SecondaryText };
  }
}

function mapHistoryTypeToCommand(type: HistoryEntry["type"]): string {
  switch (type) {
    case "conversion":
      return "convert";
    case "drawer-box":
      return "drawer-engine";
    case "hinge-layout":
      return "hinge-layout";
    case "slide-layout":
      return "slide-layout";
    case "scribe-planner":
      return "scribe-planner";
    case "drill-depth":
      return "drill-depth";
    default:
      return type;
  }
}
