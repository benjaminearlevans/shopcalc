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
import { convertUnits } from "../lib/conversion";
import { parseInchValue } from "../lib/fractions";
import { ConversionInput, ConversionResult, ExtensionPreferences, FractionPrecision, Unit } from "../types";
import { saveToHistory } from "../utils/history";

interface ConvertFormValues {
  value: string;
  from: Unit;
  to: Unit;
  precision: string;
}

type ConvertArgs = {
  prefill?: string;
};

export default function ConvertCommand(props: LaunchProps<{ arguments: ConvertArgs }>) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const prefill = parseConvertPrefill(props.arguments.prefill);

  const defaultFrom = (prefill.from ?? (prefs.defaultUnit as Unit) ?? "mm") as Unit;
  const defaultTo = defaultFrom === "inches" ? "mm" : "inches";

  const [valueInput, setValueInput] = useState(prefill.value !== undefined ? String(prefill.value) : "");
  const [fromUnit, setFromUnit] = useState<Unit>(defaultFrom);
  const [toUnit, setToUnit] = useState<Unit>(prefill.to ?? defaultTo);
  const [precision, setPrecision] = useState<string>(
    prefill.precision !== undefined ? String(prefill.precision) : (prefs.fractionPrecision ?? "16"),
  );

  const isMetricOnly = fromUnit !== "inches" && toUnit !== "inches";

  const helper = useMemo(() => {
    if (fromUnit === "inches") {
      return "Examples: 12.875, 12-7/8, 12 7/8, or 7/8";
    }
    if (fromUnit === "cm") {
      return "Example: 32.7 or 32.7cm";
    }
    return "Example: 476 or 476mm";
  }, [fromUnit]);

  const preview = useMemo(() => {
    if (!valueInput.trim()) {
      return "Live preview: enter a value to preview conversion.";
    }

    try {
      const parsed = parseMeasurementInput(valueInput, fromUnit);
      const previewResult = convertUnits({
        value: parsed,
        from: fromUnit,
        precision: Number(precision || prefs.fractionPrecision || "16") as FractionPrecision,
      });

      if (toUnit === "inches") {
        return `Live preview: ${previewResult.fractional.display} (${previewResult.inches.toFixed(6)} in)`;
      }
      if (toUnit === "mm") {
        return `Live preview: ${previewResult.mm.toFixed(2)} mm`;
      }
      return `Live preview: ${previewResult.cm.toFixed(3)} cm`;
    } catch (error) {
      return `Live preview: ${error instanceof Error ? error.message : "invalid input"}`;
    }
  }, [valueInput, fromUnit, toUnit, precision, prefs.fractionPrecision]);

  async function handleSubmit(values: ConvertFormValues) {
    try {
      const input: ConversionInput = {
        value: parseMeasurementInput(values.value, values.from),
        from: values.from,
        to: values.to,
        precision: Number(values.precision || prefs.fractionPrecision || "16") as FractionPrecision,
      };

      const result = convertUnits(input);
      await saveToHistory("conversion", input, result.summary);
      push(<ConvertResultView result={result} to={values.to} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check your conversion inputs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function swapUnits() {
    const nextFrom = toUnit;
    const nextTo = fromUnit;
    setFromUnit(nextFrom);
    setToUnit(nextTo);
  }

  function handleFromChange(nextFrom: Unit) {
    setFromUnit(nextFrom);
    if (nextFrom === toUnit) {
      setToUnit(nextAvailableUnit(nextFrom));
    }
  }

  function handleToChange(nextTo: Unit) {
    setToUnit(nextTo);
    if (nextTo === fromUnit) {
      setFromUnit(nextAvailableUnit(nextTo));
    }
  }

  function loadFractionExample() {
    setValueInput("12-7/8");
    setFromUnit("inches");
    setToUnit("mm");
    setPrecision("16");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert" onSubmit={handleSubmit} />
          <Action title="Swap Units" onAction={swapUnits} />
          <Action title="Load Fraction Example" onAction={loadFractionExample} />
          <Action
            title="Open Guided Start"
            onAction={() => launchCommand({ name: "guided-start", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Convert measurements with decimal, centimeter, and fractional-inch output." />
      <Form.TextField
        id="value"
        title="Value"
        value={valueInput}
        onChange={setValueInput}
        placeholder="476"
        info={helper}
        autoFocus
      />
      <Form.Dropdown id="from" title="I Have" value={fromUnit} onChange={(value) => handleFromChange(value as Unit)}>
        <Form.Dropdown.Item value="mm" title="Millimeters" />
        <Form.Dropdown.Item value="cm" title="Centimeters" />
        <Form.Dropdown.Item value="inches" title="Inches" />
      </Form.Dropdown>
      <Form.Dropdown id="to" title="Convert To" value={toUnit} onChange={(value) => handleToChange(value as Unit)}>
        <Form.Dropdown.Item value="inches" title="Inches" />
        <Form.Dropdown.Item value="mm" title="Millimeters" />
        <Form.Dropdown.Item value="cm" title="Centimeters" />
      </Form.Dropdown>
      {!isMetricOnly ? (
        <Form.Dropdown id="precision" title="Fraction Detail" value={precision} onChange={setPrecision}>
          <Form.Dropdown.Item value="8" title={'Nearest 1/8"'} />
          <Form.Dropdown.Item value="16" title={'Nearest 1/16"'} />
          <Form.Dropdown.Item value="32" title={'Nearest 1/32"'} />
          <Form.Dropdown.Item value="64" title={'Nearest 1/64"'} />
        </Form.Dropdown>
      ) : (
        <Form.Description text="Fraction detail is hidden because this conversion is metric-only." />
      )}
      <Form.Separator />
      <Form.Description text={preview} />
    </Form>
  );
}

function parseConvertPrefill(raw?: string): Partial<ConvertFormValues> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ConversionInput>;
    return {
      value: typeof parsed.value === "number" ? String(parsed.value) : undefined,
      from: parsed.from,
      to: parsed.to,
      precision: parsed.precision !== undefined ? String(parsed.precision) : undefined,
    };
  } catch {
    return {};
  }
}

function parseMeasurementInput(raw: string, from: Unit): number {
  if (from === "inches") {
    return parseInchValue(raw);
  }

  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, "");

  const match = normalized.match(/^(-?\d*\.?\d+)(mm|cm)?$/);
  if (!match) {
    throw new Error(`${from === "mm" ? "Millimeter" : "Centimeter"} input must be a number (example: 476 or 32.7cm)`);
  }

  const numeric = Number(match[1]);
  const suffix = match[2];
  if (!Number.isFinite(numeric)) {
    throw new Error(`${from === "mm" ? "Millimeter" : "Centimeter"} input must be a number`);
  }
  if (suffix && suffix !== from) {
    throw new Error(`Input unit suffix (${suffix}) does not match selected source unit (${from})`);
  }
  return numeric;
}

function nextAvailableUnit(excluded: Unit): Unit {
  const order: Unit[] = ["inches", "mm", "cm"];
  return order.find((unit) => unit !== excluded) ?? "inches";
}

function ConvertResultView({ result, to }: { result: ConversionResult; to: Unit }) {
  const instruction =
    to === "inches"
      ? `Use **${result.fractional.display}** for tape-measure marking, or **${result.inches.toFixed(6)} in** for machine setup.`
      : to === "mm"
        ? `Use **${result.mm.toFixed(2)} mm** for metric tools. Centimeter equivalent is **${result.cm.toFixed(3)} cm**.`
        : `Use **${result.cm.toFixed(3)} cm** for metric layouts. Millimeter equivalent is **${result.mm.toFixed(2)} mm**.`;

  const markdown = [result.summary, "", "**What to do next**", instruction].join("\n\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Inches (decimal)" text={`${result.inches.toFixed(6)} in`} />
          <Detail.Metadata.Label title="Inches (fraction)" text={result.fractional.display} />
          <Detail.Metadata.Label title="Millimeters" text={`${result.mm.toFixed(2)} mm`} />
          <Detail.Metadata.Label title="Centimeters" text={`${result.cm.toFixed(3)} cm`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Full Result" content={markdown.replace(/\*\*/g, "")} />
          <Action.CopyToClipboard
            title="Copy Short Result"
            content={`${result.inches.toFixed(6)} in (${result.fractional.display}) / ${result.mm.toFixed(2)} mm / ${result.cm.toFixed(3)} cm`}
          />
        </ActionPanel>
      }
    />
  );
}
