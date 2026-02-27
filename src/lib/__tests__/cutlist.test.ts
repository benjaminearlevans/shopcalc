import { describe, expect, it } from "vitest";
import { calculateCutList } from "../cutlist";

describe("cutlist", () => {
  it("packs board stock with kerf", () => {
    const result = calculateCutList({
      pieces: [{ length: 3.25, width: 1.5, quantity: 24, label: "Rail" }],
      stock: { type: "board", length: 96, width: 1.5, unit: "inches" },
      unit: "inches",
      kerf: 0.125,
    });

    expect(result.stockNeeded).toBe(1);
    expect(result.waste).toBeGreaterThan(0);
  });

  it("packs sheet stock with rotation", () => {
    const result = calculateCutList({
      pieces: [
        { length: 24, width: 12, quantity: 4, label: "Panel" },
        { length: 18, width: 10, quantity: 4, label: "Shelf" },
      ],
      stock: { type: "sheet", length: 96, width: 48, unit: "inches" },
      unit: "inches",
      kerf: 0.125,
      allowRotation: true,
    });

    expect(result.stockNeeded).toBeGreaterThan(0);
    expect(result.sheetPlacements?.length).toBe(8);
  });

  it("rejects impossible piece", () => {
    expect(() =>
      calculateCutList({
        pieces: [{ length: 100, width: 10, quantity: 1 }],
        stock: { type: "sheet", length: 96, width: 48, unit: "inches" },
        unit: "inches",
        kerf: 0.125,
      }),
    ).toThrow();
  });
});
