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
import { calculateCutList, formatCutListResult } from "../lib/cutlist";
import { CutListInput, CutListResult, CutPiece, ExtensionPreferences, Unit } from "../types";
import { saveToHistory } from "../utils/history";

interface CutListFormValues {
  piece1Length: string;
  piece1Width: string;
  piece1Qty: string;
  piece1Label: string;
  piece2Length: string;
  piece2Width: string;
  piece2Qty: string;
  piece2Label: string;
  piece3Length: string;
  piece3Width: string;
  piece3Qty: string;
  piece3Label: string;
  piece4Length: string;
  piece4Width: string;
  piece4Qty: string;
  piece4Label: string;
  stockType: "board" | "sheet";
  stockLength: string;
  stockWidth: string;
  unit: Unit;
  kerf: string;
  allowRotation: "true" | "false";
}

type CutListArgs = {
  prefill?: string;
};

const EXAMPLE_CUTLIST_PREFILL = JSON.stringify({
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
});

export default function CutListCommand(props: LaunchProps<{ arguments: CutListArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parseCutListPrefill(props.arguments.prefill);

  async function handleSubmit(values: CutListFormValues) {
    try {
      const pieces = buildPieces(values);

      const input: CutListInput = {
        pieces,
        stock: {
          type: values.stockType,
          length: Number(values.stockLength),
          width: Number(values.stockWidth),
          unit: values.unit,
        },
        unit: values.unit,
        kerf: Number(values.kerf || prefs.kerfWidth || "0.125"),
        allowRotation: values.allowRotation === "true",
      };

      const result = calculateCutList(input);
      await saveToHistory("cutlist", input, result.summary);
      push(<CutListResultView result={result} unit={values.unit} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check your cut list inputs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function loadExample() {
    await launchCommand({
      name: "cutlist",
      type: LaunchType.UserInitiated,
      arguments: { prefill: EXAMPLE_CUTLIST_PREFILL },
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Calculate Material Needed" onSubmit={handleSubmit} />
          <Action title="Load Example Cut List" onAction={loadExample} />
          <Action
            title="Open Guided Start"
            onAction={() => launchCommand({ name: "guided-start", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Add up to 4 different piece types. Leave unused rows blank." />

      <Form.Separator />
      <Form.Description text="Piece Type 1 (required)" />
      <Form.TextField
        id="piece1Length"
        title="Length"
        defaultValue={prefill.piece1Length}
        placeholder="3.25"
        info="Cut length for this piece type."
        autoFocus
      />
      <Form.TextField
        id="piece1Width"
        title="Width"
        defaultValue={prefill.piece1Width}
        placeholder="1.5"
        info="Cut width for this piece type."
      />
      <Form.TextField
        id="piece1Qty"
        title="Quantity"
        defaultValue={prefill.piece1Qty}
        placeholder="24"
        info="How many of this same piece."
      />
      <Form.TextField id="piece1Label" title="Label (optional)" defaultValue={prefill.piece1Label} placeholder="Rail" />

      <Form.Separator />
      <Form.Description text="Piece Type 2 (optional)" />
      <Form.TextField id="piece2Length" title="Length" defaultValue={prefill.piece2Length} placeholder="" />
      <Form.TextField id="piece2Width" title="Width" defaultValue={prefill.piece2Width} placeholder="" />
      <Form.TextField id="piece2Qty" title="Quantity" defaultValue={prefill.piece2Qty} placeholder="" />
      <Form.TextField id="piece2Label" title="Label (optional)" defaultValue={prefill.piece2Label} placeholder="" />

      <Form.Separator />
      <Form.Description text="Piece Type 3 (optional)" />
      <Form.TextField id="piece3Length" title="Length" defaultValue={prefill.piece3Length} placeholder="" />
      <Form.TextField id="piece3Width" title="Width" defaultValue={prefill.piece3Width} placeholder="" />
      <Form.TextField id="piece3Qty" title="Quantity" defaultValue={prefill.piece3Qty} placeholder="" />
      <Form.TextField id="piece3Label" title="Label (optional)" defaultValue={prefill.piece3Label} placeholder="" />

      <Form.Separator />
      <Form.Description text="Piece Type 4 (optional)" />
      <Form.TextField id="piece4Length" title="Length" defaultValue={prefill.piece4Length} placeholder="" />
      <Form.TextField id="piece4Width" title="Width" defaultValue={prefill.piece4Width} placeholder="" />
      <Form.TextField id="piece4Qty" title="Quantity" defaultValue={prefill.piece4Qty} placeholder="" />
      <Form.TextField id="piece4Label" title="Label (optional)" defaultValue={prefill.piece4Label} placeholder="" />

      <Form.Separator />
      <Form.Dropdown id="stockType" title="Material Type" defaultValue={prefill.stockType ?? "board"}>
        <Form.Dropdown.Item value="board" title="Boards (long strips)" />
        <Form.Dropdown.Item value="sheet" title="Sheets (plywood panels)" />
      </Form.Dropdown>
      <Form.TextField
        id="stockLength"
        title="Stock Length"
        defaultValue={prefill.stockLength}
        placeholder="96"
        info="For boards: board length. For sheets: sheet long side."
      />
      <Form.TextField
        id="stockWidth"
        title="Stock Width"
        defaultValue={prefill.stockWidth}
        placeholder="3.5"
        info="For boards: board width/thickness. For sheets: sheet short side."
      />
      <Form.Dropdown id="unit" title="Unit" defaultValue={prefill.unit ?? (prefs.defaultUnit as Unit) ?? "inches"}>
        <Form.Dropdown.Item value="inches" title="Inches" />
        <Form.Dropdown.Item value="mm" title="Millimeters" />
        <Form.Dropdown.Item value="cm" title="Centimeters" />
      </Form.Dropdown>
      <Form.TextField
        id="kerf"
        title="Saw Blade Thickness (kerf)"
        defaultValue={prefill.kerf}
        placeholder={prefs.kerfWidth ?? "0.125"}
        info="Width of material removed per cut (often 0.125 in = 1/8 in)."
      />
      <Form.Dropdown
        id="allowRotation"
        title="Allow Piece Rotation (sheet mode)"
        defaultValue={prefill.allowRotation ?? "true"}
      >
        <Form.Dropdown.Item value="true" title="Yes" />
        <Form.Dropdown.Item value="false" title="No" />
      </Form.Dropdown>
    </Form>
  );
}

function CutListResultView({ result, unit }: { result: CutListResult; unit: Unit }) {
  const instructions = [
    "**What to do next**",
    `1. Buy **${result.stockNeeded}** stock piece(s).`,
    "2. Follow the listed layout order when cutting.",
    `3. Expect about **${result.wastePercent.toFixed(2)}%** waste.`,
  ].join("\n");

  const markdown = [formatCutListResult(result, unit), "", instructions].join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Stock Needed" text={`${result.stockNeeded}`} />
          <Detail.Metadata.Label title="Estimated Waste" text={`${result.waste.toFixed(3)}`} />
          <Detail.Metadata.Label title="Waste Percent" text={`${result.wastePercent.toFixed(2)}%`} />
          <Detail.Metadata.Label title="Total Cut Length" text={`${result.totalCutLength.toFixed(3)}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Full Result" content={markdown.replace(/\*\*/g, "")} />
          <Action.CopyToClipboard title="Copy Layout" content={result.layout} />
        </ActionPanel>
      }
    />
  );
}

function buildPieces(values: CutListFormValues): CutPiece[] {
  const rows = [
    {
      length: values.piece1Length,
      width: values.piece1Width,
      qty: values.piece1Qty,
      label: values.piece1Label,
      index: 1,
    },
    {
      length: values.piece2Length,
      width: values.piece2Width,
      qty: values.piece2Qty,
      label: values.piece2Label,
      index: 2,
    },
    {
      length: values.piece3Length,
      width: values.piece3Width,
      qty: values.piece3Qty,
      label: values.piece3Label,
      index: 3,
    },
    {
      length: values.piece4Length,
      width: values.piece4Width,
      qty: values.piece4Qty,
      label: values.piece4Label,
      index: 4,
    },
  ];

  const pieces: CutPiece[] = [];

  for (const row of rows) {
    const hasAnyValue = row.length || row.width || row.qty || row.label;
    if (!hasAnyValue) {
      continue;
    }

    if (!row.length || !row.width || !row.qty) {
      throw new Error(`Piece type ${row.index}: provide length, width, and quantity.`);
    }

    const length = Number(row.length);
    const width = Number(row.width);
    const quantity = Number(row.qty);

    if (!Number.isFinite(length) || length <= 0) {
      throw new Error(`Piece type ${row.index}: length must be a positive number.`);
    }
    if (!Number.isFinite(width) || width <= 0) {
      throw new Error(`Piece type ${row.index}: width must be a positive number.`);
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Piece type ${row.index}: quantity must be a whole number greater than 0.`);
    }

    pieces.push({
      length,
      width,
      quantity,
      label: row.label || undefined,
    });
  }

  if (!pieces.length) {
    throw new Error("Add at least one piece type.");
  }

  return pieces;
}

function parseCutListPrefill(raw?: string): Partial<CutListFormValues> {
  if (!raw) {
    return {};
  }

  try {
    const input = JSON.parse(raw) as Partial<CutListInput>;
    const pieces = input.pieces ?? [];

    return {
      piece1Length: pieces[0]?.length !== undefined ? String(pieces[0].length) : undefined,
      piece1Width: pieces[0]?.width !== undefined ? String(pieces[0].width) : undefined,
      piece1Qty: pieces[0]?.quantity !== undefined ? String(pieces[0].quantity) : undefined,
      piece1Label: pieces[0]?.label,
      piece2Length: pieces[1]?.length !== undefined ? String(pieces[1].length) : undefined,
      piece2Width: pieces[1]?.width !== undefined ? String(pieces[1].width) : undefined,
      piece2Qty: pieces[1]?.quantity !== undefined ? String(pieces[1].quantity) : undefined,
      piece2Label: pieces[1]?.label,
      piece3Length: pieces[2]?.length !== undefined ? String(pieces[2].length) : undefined,
      piece3Width: pieces[2]?.width !== undefined ? String(pieces[2].width) : undefined,
      piece3Qty: pieces[2]?.quantity !== undefined ? String(pieces[2].quantity) : undefined,
      piece3Label: pieces[2]?.label,
      piece4Length: pieces[3]?.length !== undefined ? String(pieces[3].length) : undefined,
      piece4Width: pieces[3]?.width !== undefined ? String(pieces[3].width) : undefined,
      piece4Qty: pieces[3]?.quantity !== undefined ? String(pieces[3].quantity) : undefined,
      piece4Label: pieces[3]?.label,
      stockType: input.stock?.type,
      stockLength: input.stock?.length !== undefined ? String(input.stock.length) : undefined,
      stockWidth: input.stock?.width !== undefined ? String(input.stock.width) : undefined,
      unit: input.unit,
      kerf: input.kerf !== undefined ? String(input.kerf) : undefined,
      allowRotation: input.allowRotation !== undefined ? (String(input.allowRotation) as "true" | "false") : undefined,
    };
  } catch {
    return {};
  }
}
