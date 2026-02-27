import { Action, ActionPanel, Color, Icon, List, LaunchType, launchCommand } from "@raycast/api";

const EXAMPLES = {
  spacing: JSON.stringify({
    totalLength: 67.5,
    count: 20,
    elementWidth: 0.75,
    unit: "inches",
    edgeOffset: 2.5,
    centerToCenter: false,
  }),
  convert: JSON.stringify({
    value: 12.875,
    from: "inches",
    to: "mm",
    precision: 16,
  }),
  cutlist: JSON.stringify({
    pieces: [
      { length: 3.25, width: 1.5, quantity: 24, label: "Rails" },
      { length: 12, width: 1.5, quantity: 6, label: "Stiles" },
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
  angle: JSON.stringify({
    mode: "miter",
    slopeAngle: 90,
    unit: "degrees",
  }),
};

export default function GuidedStartCommand() {
  return (
    <List searchBarPlaceholder="What are you trying to do?">
      <List.Item
        icon={{ source: Icon.Ruler, tintColor: Color.Blue }}
        title="I need evenly spaced pieces"
        subtitle="Slats, dividers, dados"
        accessories={[{ text: "Spacing" }]}
        actions={
          <ActionPanel>
            <Action
              title="Open Spacing Calculator"
              onAction={() => launchCommand({ name: "spacing", type: LaunchType.UserInitiated })}
            />
            <Action
              title="Open Spacing Example"
              onAction={() =>
                launchCommand({
                  name: "spacing",
                  type: LaunchType.UserInitiated,
                  arguments: { prefill: EXAMPLES.spacing },
                })
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{ source: Icon.ArrowsExpand, tintColor: Color.Purple }}
        title="I need to convert measurements"
        subtitle="mm/cm <-> inches with fractions"
        accessories={[{ text: "Convert" }]}
        actions={
          <ActionPanel>
            <Action
              title="Open Unit Converter"
              onAction={() => launchCommand({ name: "convert", type: LaunchType.UserInitiated })}
            />
            <Action
              title="Open Fraction Example"
              onAction={() =>
                launchCommand({
                  name: "convert",
                  type: LaunchType.UserInitiated,
                  arguments: { prefill: EXAMPLES.convert },
                })
              }
            />
            <Action
              title="Open Quick Convert (Natural Language)"
              onAction={() =>
                launchCommand({
                  name: "quick-convert",
                  type: LaunchType.UserInitiated,
                  arguments: { query: "12-7/8 in to mm" },
                })
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{ source: Icon.List, tintColor: Color.Orange }}
        title="I need to know how much material to buy"
        subtitle="Boards/sheets, waste, layout"
        accessories={[{ text: "Cut List" }]}
        actions={
          <ActionPanel>
            <Action
              title="Open Cut List Calculator"
              onAction={() => launchCommand({ name: "cutlist", type: LaunchType.UserInitiated })}
            />
            <Action
              title="Open Cut List Example"
              onAction={() =>
                launchCommand({
                  name: "cutlist",
                  type: LaunchType.UserInitiated,
                  arguments: { prefill: EXAMPLES.cutlist },
                })
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={{ source: Icon.Compass, tintColor: Color.Green }}
        title="I need saw angle settings"
        subtitle="Corners, stairs, polygon frames"
        accessories={[{ text: "Angles" }]}
        actions={
          <ActionPanel>
            <Action
              title="Open Angle Calculator"
              onAction={() => launchCommand({ name: "angle", type: LaunchType.UserInitiated })}
            />
            <Action
              title="Open 90° Corner Example"
              onAction={() =>
                launchCommand({
                  name: "angle",
                  type: LaunchType.UserInitiated,
                  arguments: { prefill: EXAMPLES.angle },
                })
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
