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
  drawer: JSON.stringify({
    openingWidth: 21,
    drawerDepth: 18,
    slideType: "side-mount",
    slideClearance: 0.5,
    materialThickness: 0.75,
    joineryType: "dado",
    bottomInsetDepth: 0.25,
    bottomThickness: 0.25,
    unit: "inches",
    toolContext: "table-saw",
  }),
  hinge: JSON.stringify({
    doorHeight: 716,
    topHingeOffset: 100,
    bottomHingeOffset: 100,
    cupDiameter: 35,
    edgeSetback: 5,
    mode: "overlay",
    unit: "mm",
    includeStlParams: true,
    toolContext: "drill",
  }),
  slide: JSON.stringify({
    cabinetInteriorHeight: 30,
    drawerCount: 4,
    topMargin: 2,
    gapSpacing: 6,
    slideThickness: 0.5,
    unit: "inches",
    toolContext: "table-saw",
  }),
  scribe: JSON.stringify({
    nominalWallWidth: 30,
    highDeviation: 0.12,
    lowDeviation: -0.08,
    plumbDeviation: 0.1,
    desiredVisibleWidth: 29.5,
    unit: "inches",
    toolContext: "router",
  }),
  drill: JSON.stringify({
    desiredHoleDepth: 0.75,
    materialThickness: 0.875,
    fastenerLength: 1.25,
    screwType: "wood",
    screwDiameter: 0.164,
    unit: "inches",
    toolContext: "drill",
  }),
};

export default function GuidedStartCommand() {
  return (
    <List searchBarPlaceholder="What are you trying to do?">
      <List.Section title="Workspace">
        <List.Item
          icon={{ source: Icon.List, tintColor: Color.Green }}
          title="Start from a template"
          subtitle="Use prefilled workflows for common jobs"
          accessories={[{ text: "Template Library" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Template Library"
                onAction={() => launchCommand({ name: "templates", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Person, tintColor: Color.Orange }}
          title="Set project profile defaults"
          subtitle="Units, kerf, tolerance, safety context"
          accessories={[{ text: "Project Profiles" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Project Profiles"
                onAction={() => launchCommand({ name: "profiles", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Box, tintColor: Color.Purple }}
          title="Review and compare saved jobs"
          subtitle="Track revisions and numeric deltas"
          accessories={[{ text: "Saved Jobs" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Saved Jobs"
                onAction={() => launchCommand({ name: "jobs", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Layout">
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
          icon={{ source: Icon.List, tintColor: Color.Orange }}
          title="I need drawer slide baseline coordinates"
          subtitle="Spacer block and vertical placements"
          accessories={[{ text: "Slide Layout" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Slide Layout"
                onAction={() => launchCommand({ name: "slide-layout", type: LaunchType.UserInitiated })}
              />
              <Action
                title="Open Slide Example"
                onAction={() =>
                  launchCommand({
                    name: "slide-layout",
                    type: LaunchType.UserInitiated,
                    arguments: { prefill: EXAMPLES.slide },
                  })
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Ruler, tintColor: Color.Blue }}
          title="I need wall scribe oversize planning"
          subtitle="Rough cut and shim-risk guidance"
          accessories={[{ text: "Scribe Planner" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Scribe Planner"
                onAction={() => launchCommand({ name: "scribe-planner", type: LaunchType.UserInitiated })}
              />
              <Action
                title="Open Scribe Example"
                onAction={() =>
                  launchCommand({
                    name: "scribe-planner",
                    type: LaunchType.UserInitiated,
                    arguments: { prefill: EXAMPLES.scribe },
                  })
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Joinery">
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
        <List.Item
          icon={{ source: Icon.Hammer, tintColor: Color.Red }}
          title="I need drawer box cut dimensions"
          subtitle="Slide clearance + joinery-aware sizing"
          accessories={[{ text: "Drawer Engine" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Drawer Engine"
                onAction={() => launchCommand({ name: "drawer-engine", type: LaunchType.UserInitiated })}
              />
              <Action
                title="Open Drawer Example"
                onAction={() =>
                  launchCommand({
                    name: "drawer-engine",
                    type: LaunchType.UserInitiated,
                    arguments: { prefill: EXAMPLES.drawer },
                  })
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: Icon.Pin, tintColor: Color.Purple }}
          title="I need hinge cup drill coordinates"
          subtitle="Mirror-safe top/bottom layout"
          accessories={[{ text: "Hinge Layout" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Hinge Layout"
                onAction={() => launchCommand({ name: "hinge-layout", type: LaunchType.UserInitiated })}
              />
              <Action
                title="Open Hinge Example"
                onAction={() =>
                  launchCommand({
                    name: "hinge-layout",
                    type: LaunchType.UserInitiated,
                    arguments: { prefill: EXAMPLES.hinge },
                  })
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Utility">
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
      </List.Section>
      <List.Section title="Safety">
        <List.Item
          icon={{ source: Icon.Bolt, tintColor: Color.Green }}
          title="I need drill stop depth settings"
          subtitle="Stop collar + through-hole warnings"
          accessories={[{ text: "Drill Depth" }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Drill Depth"
                onAction={() => launchCommand({ name: "drill-depth", type: LaunchType.UserInitiated })}
              />
              <Action
                title="Open Drill Example"
                onAction={() =>
                  launchCommand({
                    name: "drill-depth",
                    type: LaunchType.UserInitiated,
                    arguments: { prefill: EXAMPLES.drill },
                  })
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
