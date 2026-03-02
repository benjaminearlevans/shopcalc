import { CalculationType } from "../types";

export type TemplateCommand =
  | "spacing"
  | "convert"
  | "cutlist"
  | "angle"
  | "drawer-engine"
  | "hinge-layout"
  | "slide-layout"
  | "scribe-planner"
  | "drill-depth";

export interface ShopTemplate {
  id: string;
  title: string;
  description: string;
  command: TemplateCommand;
  category: "layout" | "joinery" | "installation" | "safety" | "conversion";
  prefill: string;
  historyType: CalculationType;
}

const TEMPLATE_LIBRARY: ShopTemplate[] = [
  {
    id: "layout-spacing-slats",
    title: "Even Slat Layout",
    description: "20 slats across a 67.5in span with 2.5in edge margins.",
    command: "spacing",
    category: "layout",
    historyType: "spacing",
    prefill: JSON.stringify({
      totalLength: 67.5,
      count: 20,
      elementWidth: 0.75,
      unit: "inches",
      edgeOffset: 2.5,
      centerToCenter: false,
      toleranceMode: "standard",
    }),
  },
  {
    id: "joinery-drawer-standard",
    title: "Standard Side-Mount Drawer",
    description: "21in opening, 18in depth, dado bottom.",
    command: "drawer-engine",
    category: "joinery",
    historyType: "drawer-box",
    prefill: JSON.stringify({
      openingWidth: 21,
      drawerDepth: 18,
      slideType: "side-mount",
      slideClearance: 0.5,
      materialThickness: 0.75,
      joineryType: "dado",
      bottomInsetDepth: 0.25,
      bottomThickness: 0.25,
      unit: "inches",
      toleranceMode: "standard",
      toolContext: "table-saw",
    }),
  },
  {
    id: "joinery-hinge-euro",
    title: "Euro Hinge Layout",
    description: "35mm cup, 5mm setback, symmetric offsets.",
    command: "hinge-layout",
    category: "joinery",
    historyType: "hinge-layout",
    prefill: JSON.stringify({
      doorHeight: 716,
      topHingeOffset: 100,
      bottomHingeOffset: 100,
      cupDiameter: 35,
      edgeSetback: 5,
      mode: "overlay",
      unit: "mm",
      includeStlParams: true,
      toleranceMode: "standard",
      toolContext: "drill",
    }),
  },
  {
    id: "layout-slide-stack",
    title: "4-Drawer Slide Stack",
    description: "Baseline layout for 4 drawers in 30in interior height.",
    command: "slide-layout",
    category: "layout",
    historyType: "slide-layout",
    prefill: JSON.stringify({
      cabinetInteriorHeight: 30,
      drawerCount: 4,
      topMargin: 2,
      gapSpacing: 6,
      slideThickness: 0.5,
      unit: "inches",
      toleranceMode: "standard",
      toolContext: "table-saw",
    }),
  },
  {
    id: "installation-scribe-wall",
    title: "Wall Scribe Oversize",
    description: "Rough-cut planning from measured wall deviations.",
    command: "scribe-planner",
    category: "installation",
    historyType: "scribe-planner",
    prefill: JSON.stringify({
      nominalWallWidth: 30,
      highDeviation: 0.12,
      lowDeviation: -0.08,
      plumbDeviation: 0.1,
      desiredVisibleWidth: 29.5,
      unit: "inches",
      toleranceMode: "standard",
      toolContext: "router",
    }),
  },
  {
    id: "safety-drill-depth",
    title: "Blind Hole Stop Collar",
    description: "Set drill depth with through-hole checks and pilot suggestion.",
    command: "drill-depth",
    category: "safety",
    historyType: "drill-depth",
    prefill: JSON.stringify({
      desiredHoleDepth: 0.75,
      materialThickness: 0.875,
      fastenerLength: 1.25,
      screwType: "wood",
      screwDiameter: 0.164,
      unit: "inches",
      toleranceMode: "standard",
      toolContext: "drill",
    }),
  },
  {
    id: "conversion-mm-inch",
    title: "Metric to Fractional",
    description: "Convert 476mm to inches with fractional output.",
    command: "convert",
    category: "conversion",
    historyType: "conversion",
    prefill: JSON.stringify({
      value: 476,
      from: "mm",
      to: "inches",
      precision: 16,
    }),
  },
];

export function getTemplateLibrary(): ShopTemplate[] {
  return [...TEMPLATE_LIBRARY];
}
