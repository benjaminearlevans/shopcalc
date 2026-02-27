# ShopCalc

ShopCalc is a Raycast extension for woodworking calculations with a beginner-friendly flow.

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

6. `Calculation History`

- Keeps the last 10 calculations.
- Actions: view, rerun, edit inputs, copy summary, copy inputs JSON, clear history.

## AI Tools

Use with Raycast AI (`@ShopCalc`):

- `calculate-spacing`
- `convert-units`
- `calculate-cutlist`
- `calculate-angle`

Examples:

- `@ShopCalc space 21 slats across 67.5 inches, 3/4 thick`
- `@ShopCalc convert 476mm to inches`
- `@ShopCalc convert 32.7cm to inches`
- `@ShopCalc what angle for a 36 degree stair pitch`
- `@ShopCalc 24 pieces at 3.25 inches from 8 foot boards with 1/8 kerf`

## Notes

- All direct command calculations run locally.
- Fraction precision supports 1/8, 1/16, 1/32, and 1/64.
- Cut list layout uses deterministic heuristics, not a global optimum nesting solver.

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
