import { FractionPrecision, Unit } from "../types";
import { round } from "../utils/format";
import { toFractionalInch } from "./fractions";

type CanonicalUnit = "in" | "mm" | "cm" | "m" | "ft";

type NumberToken = {
  type: "number";
  value: number;
  unit?: CanonicalUnit;
};

type OperatorToken = {
  type: "operator";
  value: "+" | "-" | "*" | "/" | "(" | ")" | "u-";
};

type Token = NumberToken | OperatorToken;

type Quantity = {
  value: number;
  hasUnit: boolean;
};

type BinaryOperator = "+" | "-" | "*" | "/";

export interface QuickConvertResult {
  query: string;
  normalizedExpression: string;
  targetUnit: CanonicalUnit;
  targetValue: number;
  inches: number;
  mm: number;
  cm: number;
  display: string;
}

const UNIT_ALIASES: Record<string, CanonicalUnit> = {
  in: "in",
  inch: "in",
  inches: "in",
  mm: "mm",
  millimeter: "mm",
  millimeters: "mm",
  cm: "cm",
  centimeter: "cm",
  centimeters: "cm",
  m: "m",
  meter: "m",
  meters: "m",
  ft: "ft",
  foot: "ft",
  feet: "ft",
};

export function evaluateQuickConversion(
  query: string,
  defaultInputUnit: Unit,
  precision: FractionPrecision,
): QuickConvertResult {
  const { expression, targetRaw } = splitExpressionAndTarget(query);
  const normalized = normalizeExpression(expression);
  const tokens = tokenize(normalized);
  const usedUnits = new Set<CanonicalUnit>();

  tokens.forEach((token) => {
    if (token.type === "number" && token.unit) {
      usedUnits.add(token.unit);
    }
  });

  const quantity = evaluateTokens(tokens);
  let inches = quantity.value;

  if (!quantity.hasUnit) {
    if (defaultInputUnit === "inches") {
      inches = quantity.value;
    } else if (defaultInputUnit === "mm") {
      inches = quantity.value / 25.4;
    } else {
      inches = quantity.value / 2.54;
    }
  }

  const targetUnit = targetRaw ? parseUnit(targetRaw) : inferTargetUnit(usedUnits, defaultInputUnit);
  const targetValue = convertFromInches(inches, targetUnit);
  const mm = inches * 25.4;
  const cm = inches * 2.54;

  const targetDisplay = formatTargetValue(targetValue, targetUnit, precision);
  const inchesFraction = toFractionalInch(inches, precision).display;
  const inchesDecimal = `${round(inches, 4)} in`;
  const mmDisplay = `${round(mm, 2)} mm`;
  const cmDisplay = `${round(cm, 3)} cm`;

  const display = [
    `**Input**: ${query.trim()}`,
    `**Result**: ${targetDisplay}`,
    "",
    `Inches: **${inchesFraction}** (${inchesDecimal})`,
    `Millimeters: **${mmDisplay}**`,
    `Centimeters: **${cmDisplay}**`,
  ].join("\n");

  return {
    query,
    normalizedExpression: normalized,
    targetUnit,
    targetValue,
    inches,
    mm,
    cm,
    display,
  };
}

function splitExpressionAndTarget(query: string): { expression: string; targetRaw?: string } {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Enter a conversion expression, for example: 12-7/8 in to mm");
  }

  const match = trimmed.match(/^(.*?)(?:\s(?:to|->|=>)\s)([a-zA-Z"']+)\s*$/);
  if (!match) {
    return { expression: trimmed };
  }

  return {
    expression: match[1].trim(),
    targetRaw: match[2].trim(),
  };
}

function normalizeExpression(input: string): string {
  let expression = input.toLowerCase().trim();

  expression = expression
    .replace(/,/g, " ")
    .replace(/×/g, "*")
    .replace(/(?<=\d)\s*[xX]\s*(?=\d)/g, "*")
    .replace(/(\d)\s*"/g, "$1in")
    .replace(/(\d)\s*'/g, "$1ft");

  expression = replaceMixedFractions(expression);

  expression = expression
    .replace(/\bmillimeters?\b/g, "mm")
    .replace(/\bcentimeters?\b/g, "cm")
    .replace(/\bmeters?\b/g, "m")
    .replace(/\binches?\b/g, "in")
    .replace(/\binch\b/g, "in")
    .replace(/\bfeet\b/g, "ft")
    .replace(/\bfoot\b/g, "ft");

  expression = expression.replace(/(\d*\.?\d+)\s+(in|mm|cm|m|ft)\b/g, "$1$2");

  while (/(\d*\.?\d+(?:in|mm|cm|m|ft))\s+(\d*\.?\d+(?:in|mm|cm|m|ft))/.test(expression)) {
    expression = expression.replace(/(\d*\.?\d+(?:in|mm|cm|m|ft))\s+(\d*\.?\d+(?:in|mm|cm|m|ft))/g, "$1 + $2");
  }

  expression = expression.replace(/\s+/g, " ").trim();
  return expression;
}

function replaceMixedFractions(input: string): string {
  let expression = input;

  expression = expression.replace(/(-?\d+)\s*-\s*(\d+)\s*\/\s*(\d+)/g, (_, w, n, d) => {
    return decimalFromMixed(Number(w), Number(n), Number(d));
  });

  expression = expression.replace(/(-?\d+)\s+(\d+)\s*\/\s*(\d+)/g, (_, w, n, d) => {
    return decimalFromMixed(Number(w), Number(n), Number(d));
  });

  expression = expression.replace(
    /(^|[+\-*/(]\s*)(-?\d+)\s*\/\s*(\d+)(?=\s*(?:[+\-*/)]|$|in\b|mm\b|cm\b|m\b|ft\b))/g,
    (_, lead, n, d) => {
      return `${lead}${decimalFromMixed(0, Number(n), Number(d))}`;
    },
  );

  return expression;
}

function decimalFromMixed(whole: number, numerator: number, denominator: number): string {
  if (!Number.isFinite(whole) || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    throw new Error("Invalid fraction in expression");
  }

  const sign = whole < 0 ? -1 : 1;
  const value = Math.abs(whole) + numerator / denominator;
  return String(sign * value);
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (char === " ") {
      index += 1;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/" || char === "(" || char === ")") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (isDigitOrDot(char)) {
      let numberText = "";
      while (index < expression.length && isDigitOrDot(expression[index])) {
        numberText += expression[index];
        index += 1;
      }

      let unitText = "";
      while (index < expression.length && /[a-z]/.test(expression[index])) {
        unitText += expression[index];
        index += 1;
      }

      const value = Number(numberText);
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number in expression: ${numberText}`);
      }

      if (unitText) {
        tokens.push({ type: "number", value, unit: parseUnit(unitText) });
      } else {
        tokens.push({ type: "number", value });
      }
      continue;
    }

    throw new Error(`Unexpected token near: ${expression.slice(index)}`);
  }

  return tokens;
}

function evaluateTokens(tokens: Token[]): Quantity {
  const output: Token[] = [];
  const operators: OperatorToken[] = [];

  let prev: Token | undefined;
  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token);
      prev = token;
      continue;
    }

    if (token.value === "(") {
      operators.push(token);
      prev = token;
      continue;
    }

    if (token.value === ")") {
      while (operators.length > 0 && operators[operators.length - 1].value !== "(") {
        output.push(operators.pop() as OperatorToken);
      }
      if (operators.length === 0) {
        throw new Error("Mismatched parentheses in expression");
      }
      operators.pop();
      prev = token;
      continue;
    }

    const isUnaryMinus = token.value === "-" && (!prev || (prev.type === "operator" && prev.value !== ")"));
    const normalizedOperator: OperatorToken = {
      type: "operator",
      value: isUnaryMinus ? "u-" : token.value,
    };

    while (
      operators.length > 0 &&
      operators[operators.length - 1].value !== "(" &&
      precedence(operators[operators.length - 1].value) >= precedence(normalizedOperator.value)
    ) {
      output.push(operators.pop() as OperatorToken);
    }

    operators.push(normalizedOperator);
    prev = token;
  }

  while (operators.length > 0) {
    const op = operators.pop() as OperatorToken;
    if (op.value === "(" || op.value === ")") {
      throw new Error("Mismatched parentheses in expression");
    }
    output.push(op);
  }

  const stack: Quantity[] = [];

  for (const token of output) {
    if (token.type === "number") {
      stack.push(numberTokenToQuantity(token));
      continue;
    }

    if (token.value === "u-") {
      const value = stack.pop();
      if (!value) {
        throw new Error("Invalid expression");
      }
      stack.push({ value: -value.value, hasUnit: value.hasUnit });
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();
    if (!left || !right) {
      throw new Error("Invalid expression");
    }

    if (token.value !== "+" && token.value !== "-" && token.value !== "*" && token.value !== "/") {
      throw new Error("Invalid expression operator");
    }
    stack.push(applyOperator(left, right, token.value));
  }

  if (stack.length !== 1) {
    throw new Error("Could not parse conversion expression");
  }

  return stack[0];
}

function numberTokenToQuantity(token: NumberToken): Quantity {
  if (!token.unit) {
    return { value: token.value, hasUnit: false };
  }

  return {
    value: convertToInches(token.value, token.unit),
    hasUnit: true,
  };
}

function applyOperator(left: Quantity, right: Quantity, operator: BinaryOperator): Quantity {
  if (operator === "+" || operator === "-") {
    if (left.hasUnit !== right.hasUnit) {
      throw new Error("You can only add/subtract values with matching units");
    }
    return {
      value: operator === "+" ? left.value + right.value : left.value - right.value,
      hasUnit: left.hasUnit,
    };
  }

  if (operator === "*") {
    if (left.hasUnit && right.hasUnit) {
      throw new Error("Multiplying two unit values is not supported");
    }
    return {
      value: left.value * right.value,
      hasUnit: left.hasUnit || right.hasUnit,
    };
  }

  if (right.value === 0) {
    throw new Error("Division by zero");
  }
  if (right.hasUnit) {
    throw new Error("Division by a unit value is not supported");
  }

  return {
    value: left.value / right.value,
    hasUnit: left.hasUnit,
  };
}

function parseUnit(raw: string): CanonicalUnit {
  const cleaned = raw.trim().toLowerCase().replace(/"/g, "in").replace(/'/g, "ft");
  const canonical = UNIT_ALIASES[cleaned];
  if (!canonical) {
    throw new Error(`Unknown unit: ${raw}`);
  }
  return canonical;
}

function inferTargetUnit(usedUnits: Set<CanonicalUnit>, defaultInputUnit: Unit): CanonicalUnit {
  if (usedUnits.size > 0) {
    const allImperial = [...usedUnits].every((unit) => unit === "in" || unit === "ft");
    if (allImperial) {
      return "mm";
    }
    return "in";
  }

  return defaultInputUnit === "inches" ? "mm" : "in";
}

function convertToInches(value: number, unit: CanonicalUnit): number {
  switch (unit) {
    case "in":
      return value;
    case "mm":
      return value / 25.4;
    case "cm":
      return value / 2.54;
    case "m":
      return value / 0.0254;
    case "ft":
      return value * 12;
    default:
      return value;
  }
}

function convertFromInches(inches: number, unit: CanonicalUnit): number {
  switch (unit) {
    case "in":
      return inches;
    case "mm":
      return inches * 25.4;
    case "cm":
      return inches * 2.54;
    case "m":
      return inches * 0.0254;
    case "ft":
      return inches / 12;
    default:
      return inches;
  }
}

function formatTargetValue(value: number, target: CanonicalUnit, precision: FractionPrecision): string {
  if (target === "in") {
    const fractional = toFractionalInch(value, precision).display;
    return `${fractional} (${round(value, 4)} in)`;
  }

  if (target === "mm") {
    return `${round(value, 2)} mm`;
  }

  if (target === "cm") {
    return `${round(value, 3)} cm`;
  }

  if (target === "m") {
    return `${round(value, 4)} m`;
  }

  return `${round(value, 4)} ft`;
}

function precedence(operator: OperatorToken["value"]): number {
  if (operator === "u-") {
    return 3;
  }
  if (operator === "*" || operator === "/") {
    return 2;
  }
  if (operator === "+" || operator === "-") {
    return 1;
  }
  return 0;
}

function isDigitOrDot(char: string): boolean {
  return /[0-9.]/.test(char);
}
