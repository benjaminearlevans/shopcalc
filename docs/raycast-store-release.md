# Raycast Store Release Guide (ShopCalc)

This project is ready for store submission once you complete the checks below.

## 1. Identity and Metadata

Verify `/Users/benjamin/Projects/raycast-inches/inches/package.json`:

- `name`: `shopcalc`
- `title`: `ShopCalc`
- `description`: clear and beginner-friendly
- `author`: must be your Raycast username
- command and tool names/descriptions are accurate

## 2. Visual Assets

- Replace `/Users/benjamin/Projects/raycast-inches/inches/assets/extension-icon.png` if you want a final branded icon.
- Keep image size and quality aligned with Raycast icon guidance.

## 3. Local Quality Gates

Run before publishing:

```bash
cd /Users/benjamin/Projects/raycast-inches/inches
npm install
npm run test
npm run build
npx ray lint
```

If `ray lint` cannot access `raycast.com` in your shell environment, rerun in an environment with outbound network access.

## 4. Publish to Store

```bash
cd /Users/benjamin/Projects/raycast-inches/inches
npm run publish
```

This calls the Raycast publish command and starts review.

## 5. Post-Publish Tasks

- Monitor review feedback.
- Update `/Users/benjamin/Projects/raycast-inches/inches/CHANGELOG.md` for each release.
- Re-run full quality gates for every update.

## References

- https://developers.raycast.com/information/developer-tools/templates
- https://developers.raycast.com/basics/prepare-an-extension-for-store
- https://developers.raycast.com/basics/publish-an-extension
