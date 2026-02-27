export type Unit = "inches" | "mm" | "cm";
export type FractionPrecision = 8 | 16 | 32 | 64;

export interface FractionalInch {
  decimal: number;
  whole: number;
  numerator: number;
  denominator: number;
  display: string;
  ticks: number;
}

export interface SpacingInput {
  totalLength: number;
  count: number;
  elementWidth: number;
  unit: Unit;
  edgeOffset?: number;
  centerToCenter?: boolean;
}

export interface SpacingResult {
  input: SpacingInput;
  gap: number;
  positions: number[];
  centerPositions: number[];
  remainingSpace: number;
  repeatingUnit: number;
  diagram: string;
  summary: string;
}

export interface ConversionInput {
  value: number;
  from: Unit;
  to?: Unit;
  precision?: FractionPrecision;
}

export interface ConversionResult {
  input: ConversionInput;
  inches: number;
  mm: number;
  cm: number;
  fractional: FractionalInch;
  summary: string;
}

export interface QuickConvertHistoryInput {
  query: string;
  defaultUnit: Unit;
  precision: FractionPrecision;
}

export interface CutPiece {
  length: number;
  width: number;
  quantity: number;
  label?: string;
}

export interface StockMaterial {
  length: number;
  width: number;
  unit: Unit;
  type: "board" | "sheet";
}

export interface CutListInput {
  pieces: CutPiece[];
  stock: StockMaterial;
  kerf: number;
  unit: Unit;
  allowRotation?: boolean;
}

export interface BoardLayout {
  stockIndex: number;
  pieceLabels: string[];
  usedLength: number;
  remainingLength: number;
}

export interface SheetPlacement {
  stockIndex: number;
  pieceLabel: string;
  x: number;
  y: number;
  length: number;
  width: number;
  rotated: boolean;
}

export interface CutListResult {
  input: CutListInput;
  stockNeeded: number;
  totalCutLength: number;
  waste: number;
  wastePercent: number;
  layout: string;
  boardLayouts?: BoardLayout[];
  sheetPlacements?: SheetPlacement[];
  summary: string;
}

export type AngleMode = "miter" | "bevel" | "compound" | "polygon" | "stair-rail";

export interface AngleInput {
  mode: AngleMode;
  slopeAngle?: number;
  sides?: number;
  tiltAngle?: number;
  unit?: "degrees" | "rise-run";
  rise?: number;
  run?: number;
}

export interface AngleResult {
  input: AngleInput;
  miterAngle: number;
  bevelAngle: number;
  complementary: number;
  summary: string;
  bladeSetting: string;
}

export type CalculationType = "spacing" | "conversion" | "cutlist" | "angle" | "quick-convert";

export interface HistoryEntry {
  id: string;
  type: CalculationType;
  timestamp: number;
  input: SpacingInput | ConversionInput | CutListInput | AngleInput | QuickConvertHistoryInput;
  summary: string;
}

export interface ExtensionPreferences {
  defaultUnit?: Unit;
  fractionPrecision?: string;
  kerfWidth?: string;
}
