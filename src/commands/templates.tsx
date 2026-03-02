import { Action, ActionPanel, Color, Icon, LaunchType, List, launchCommand } from "@raycast/api";
import { useMemo, useState } from "react";
import { ShopTemplate, getTemplateLibrary } from "../utils/templates";

type TemplateFilter = "all" | "layout" | "joinery" | "installation" | "safety" | "conversion";

export default function TemplatesCommand() {
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const templates = getTemplateLibrary();

  const visible = useMemo(() => {
    if (filter === "all") {
      return templates;
    }
    return templates.filter((item) => item.category === filter);
  }, [filter, templates]);

  return (
    <List
      searchBarPlaceholder="Search starter templates"
      searchBarAccessory={
        <List.Dropdown value={filter} onChange={(value) => setFilter(value as TemplateFilter)} tooltip="Filter">
          <List.Dropdown.Item value="all" title="All" />
          <List.Dropdown.Item value="layout" title="Layout" />
          <List.Dropdown.Item value="joinery" title="Joinery" />
          <List.Dropdown.Item value="installation" title="Installation" />
          <List.Dropdown.Item value="safety" title="Safety" />
          <List.Dropdown.Item value="conversion" title="Conversion" />
        </List.Dropdown>
      }
    >
      {visible.map((template) => (
        <List.Item
          key={template.id}
          icon={iconForCategory(template)}
          title={template.title}
          subtitle={template.description}
          accessories={[{ tag: categoryTitle(template.category) }]}
          actions={
            <ActionPanel>
              <Action title="Use Template" onAction={() => openTemplate(template)} />
              <Action.CopyToClipboard title="Copy Prefill JSON" content={template.prefill} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function openTemplate(template: ShopTemplate) {
  await launchCommand({
    name: template.command,
    type: LaunchType.UserInitiated,
    arguments: { prefill: template.prefill },
  });
}

function categoryTitle(category: ShopTemplate["category"]): string {
  if (category === "layout") {
    return "Layout";
  }
  if (category === "joinery") {
    return "Joinery";
  }
  if (category === "installation") {
    return "Installation";
  }
  if (category === "safety") {
    return "Safety";
  }
  return "Conversion";
}

function iconForCategory(template: ShopTemplate): { source: Icon; tintColor: Color } {
  if (template.category === "layout") {
    return { source: Icon.Ruler, tintColor: Color.Blue };
  }
  if (template.category === "joinery") {
    return { source: Icon.Hammer, tintColor: Color.Red };
  }
  if (template.category === "installation") {
    return { source: Icon.HardDrive, tintColor: Color.Orange };
  }
  if (template.category === "safety") {
    return { source: Icon.Bolt, tintColor: Color.Green };
  }
  return { source: Icon.ArrowsExpand, tintColor: Color.Purple };
}
