# ShopCalc

ShopCalc is a Raycast extension for woodworking and fabrication calculations with a beginner-friendly flow.

## Start Here

- Open `Guided Start` if you are unsure which calculator to use.
- Pick what you are trying to do in plain language.
- Use the example actions in each command if you want a working sample immediately.

## Commands

1. `Guided Start`

- Plain-language launcher for all calculators.

2. `Spacing Calculator`

- Inputs: total span, piece count, piece width, margin, gap style.
- Output: gap size, position marks, and step-by-step marking instructions.

3. `Unit Converter`

- Inputs: value, source unit, target unit, fraction detail.
- Output: decimal + fractional inches, millimeters, and centimeters.

4. `Cut List Calculator`

- Inputs: up to 4 piece types (length/width/qty), stock dimensions, kerf, material type.
- Output: stock count, waste %, and layout guidance.

5. `Joint Angle Calculator`

- Starts with task intent (corner, stairs, polygon, advanced).
- Output: saw settings + next-step instructions.

6. `Drawer Box Engine`

- Inputs: opening width, drawer depth, slide mode/clearance, material thickness, joinery, bottom inset/thickness.
- Output: side and front/back panel dimensions, bottom panel size, joinery rabbet values, clearance warnings.

7. `Hinge Layout Generator`

- Inputs: door height, top/bottom offsets, cup diameter, edge setback, overlay/inset.
- Output: mirror-safe drilling coordinates, template reference, optional STL parameter JSON.

8. `Slide Spacer Generator`

- Inputs: cabinet interior height, drawer count, top margin, gap spacing, slide thickness.
- Output: exact vertical slide coordinates, spacer block size, baseline offset system.

9. `Scribe & Oversize Planner`

- Inputs: nominal width, high/low/plumb deviations, desired visible width.
- Output: recommended rough-cut dimension, oversize margin, max scribe allowance, shim-risk flag.

10. `Drill Depth & Stop Control`

- Inputs: desired hole depth, material thickness, fastener length, optional screw diameter/type.
- Output: stop collar setting, minimum safe drilling depth, through-hole warning, pilot recommendation.

11. `Calculation History`

- Keeps the last 10 calculations.
- Actions: view, rerun, edit inputs, copy summary, copy inputs JSON, clear history.

## AI Tools

Use with Raycast AI (`@ShopCalc`):

- `calculate-spacing`
- `convert-units`
- `calculate-cutlist`
- `calculate-angle`
- `calculate-drawer-box`
- `generate-hinge-layout`
- `generate-slide-layout`
- `plan-scribe-oversize`
- `calculate-drill-depth`

Examples:

- `@ShopCalc space 21 slats across 67.5 inches, 3/4 thick`
- `@ShopCalc convert 476mm to inches`
- `@ShopCalc convert 32.7cm to inches`
- `@ShopCalc what angle for a 36 degree stair pitch`
- `@ShopCalc 24 pieces at 3.25 inches from 8 foot boards with 1/8 kerf`
- `@ShopCalc drawer box for 21 inch opening, side mount slides, 3/4 material`
- `@ShopCalc hinge coordinates for 716mm door with 100mm top and bottom offsets`
- `@ShopCalc slide layout for 4 drawers in 30 inch cabinet interior`
- `@ShopCalc scribe oversize plan with 0.12 high and -0.08 low deviation`
- `@ShopCalc drill stop for 0.75 depth in 7/8 stock with 1.25 screw`

## Notes

- All direct command calculations run locally.
- Fraction precision supports 1/8, 1/16, 1/32, and 1/64.
- Cut list layout uses deterministic heuristics, not a global optimum nesting solver.
- New fabrication commands output copy-ready dimensions plus JSON export for downstream workflows.
- Force-vector safety prompts are integrated by tool context (`router`, `table-saw`, `drill`, `pocket-screw`).
- Most numeric fields now accept mixed input styles (`12-7/8`, `35mm`, `2.54cm`) and convert automatically to selected units.
- New fabrication commands include `Basic` and `Advanced` modes to reduce form complexity for first-time users.

## Production Checklist (Raycast Store)

1. Confirm extension metadata in `/Users/benjamin/Projects/raycast-inches/inches/package.json`:

- `title`, `description`, categories, keywords.
- `author` must be your real Raycast username.

2. Replace `/Users/benjamin/Projects/raycast-inches/inches/assets/extension-icon.png` with final branded icon if needed.
3. Run local verification:

```bash
npm install
npm run test
npm run build
npx ray lint
```

4. Publish with Raycast CLI:

```bash
npm run publish
```

5. Watch review status in Raycast dashboard and respond to reviewer notes if requested.

Reference docs:

- [Raycast templates](https://developers.raycast.com/information/developer-tools/templates)
- [Prepare extension for store](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Publish extension](https://developers.raycast.com/basics/publish-an-extension)

## Development

```bash
npm install
npm run lint
npm run build
npm run test
```
