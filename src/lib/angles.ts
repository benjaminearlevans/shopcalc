import { AngleInput, AngleResult } from "../types";
import { round } from "../utils/format";

export function calculateAngle(input: AngleInput): AngleResult {
  validateAngleInput(input);

  let miterAngle = 0;
  let bevelAngle = 0;
  let summary = "";
  let bladeSetting = "";
  const assumptions: string[] = [];

  switch (input.mode) {
    case "polygon": {
      const sides = input.sides as number;
      miterAngle = 180 / sides;
      summary = `**${sides}-sided polygon**\n\nEach piece needs a **${round(miterAngle, 2)}°** miter.`;
      bladeSetting = `Set miter gauge to ${round(miterAngle, 2)}°`;
      assumptions.push("Polygon joints assume equal side lengths and equal interior angles.");
      break;
    }
    case "stair-rail": {
      const slope = resolveSlope(input);
      miterAngle = 90 - slope;
      summary = [
        `**Stair pitch**: ${round(slope, 2)}°`,
        `**Rail cut angle**: ${round(miterAngle, 2)}°`,
        `**Complementary**: ${round(slope, 2)}°`,
      ].join("\n\n");
      bladeSetting = `Set miter gauge to ${round(miterAngle, 2)}°`;
      assumptions.push("Rail profile is treated as a straight miter cut in plan.");
      break;
    }
    case "compound": {
      const slope = input.slopeAngle as number;
      const tilt = input.tiltAngle as number;
      const slopeRad = (slope * Math.PI) / 180;
      const tiltRad = (tilt * Math.PI) / 180;

      miterAngle = (Math.atan(Math.sin(slopeRad) * Math.sin(tiltRad)) * 180) / Math.PI;
      bevelAngle = (Math.atan(Math.cos(slopeRad) * Math.sin(tiltRad)) * 180) / Math.PI;

      summary = [`**Compound cut**`, `Miter: **${round(miterAngle, 2)}°**`, `Bevel: **${round(bevelAngle, 2)}°**`].join(
        "\n\n",
      );
      bladeSetting = `Set miter to ${round(miterAngle, 2)}° and bevel to ${round(bevelAngle, 2)}°`;
      assumptions.push("Compound formula assumes single-axis blade tilt and miter rotation.");
      break;
    }
    case "bevel": {
      bevelAngle = input.slopeAngle as number;
      summary = `**Bevel cut**\n\nTilt blade to **${round(bevelAngle, 2)}°**.`;
      bladeSetting = `Tilt blade to ${round(bevelAngle, 2)}°`;
      assumptions.push("Bevel mode assumes miter angle remains 0°.");
      break;
    }
    case "miter":
    default: {
      const jointAngle = input.slopeAngle as number;
      miterAngle = jointAngle / 2;
      summary = [
        `**Joint angle**: ${round(jointAngle, 2)}°`,
        `Each piece gets **${round(miterAngle, 2)}°** miter`,
      ].join("\n\n");
      bladeSetting = `Set miter gauge to ${round(miterAngle, 2)}°`;
      assumptions.push("Miter mode assumes equal split of joint angle across both pieces.");
      break;
    }
  }

  return {
    input,
    miterAngle: round(miterAngle, 2),
    bevelAngle: round(bevelAngle, 2),
    complementary: round(90 - miterAngle, 2),
    assumptions,
    summary,
    bladeSetting,
  };
}

function resolveSlope(input: AngleInput): number {
  if (input.unit === "rise-run") {
    const rise = input.rise as number;
    const run = input.run as number;
    return (Math.atan2(rise, run) * 180) / Math.PI;
  }
  return input.slopeAngle as number;
}

function validateAngleInput(input: AngleInput): void {
  if (input.mode === "polygon") {
    if (!input.sides || !Number.isInteger(input.sides) || input.sides < 3) {
      throw new Error("Polygon mode requires an integer side count >= 3");
    }
    return;
  }

  if (input.mode === "stair-rail" && input.unit === "rise-run") {
    if (!isPositive(input.rise) || !isPositive(input.run)) {
      throw new Error("Rise/run mode requires positive rise and run values");
    }
    return;
  }

  if (input.mode === "compound") {
    if (!isFiniteNumber(input.slopeAngle) || !isFiniteNumber(input.tiltAngle)) {
      throw new Error("Compound mode requires slopeAngle and tiltAngle in degrees");
    }
    return;
  }

  if (
    (input.mode === "miter" || input.mode === "bevel" || input.mode === "stair-rail") &&
    !isFiniteNumber(input.slopeAngle)
  ) {
    throw new Error(`${input.mode} mode requires slopeAngle in degrees`);
  }
}

function isPositive(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
