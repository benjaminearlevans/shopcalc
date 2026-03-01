# ShopCalc Changelog

## [Unreleased]

- Expanded ShopCalc into a parametric fabrication toolset with 5 new commands:
  - Drawer Box Engine
  - Hinge Layout Generator
  - Slide Spacer Generator
  - Scribe & Oversize Planner
  - Drill Depth & Stop Control
- Added pure geometry engines for drawer math, hinge coordinates, slide baselines, scribe planning, and drill stop logic.
- Added force-vector safety prompt integration with context-specific checklists (`router`, `table-saw`, `drill`, `pocket-screw`).
- Added AI tools for all new fabrication modules.
- Added history replay/edit support for all new command types.
- Added core unit tests for each new module.
- Added beginner-focused command flow with Guided Start entrypoint.
- Added quick natural-language conversion command (`quick-convert`) with mixed fractions and cm/mm/in support.
- Added live previews while typing in Spacing, Convert, and Angle forms.
- Added history persistence (last 10 calculations) with rerun and edit-input actions.
- Added board and sheet cut list heuristics with kerf and optional sheet rotation.
- Added AI tools for spacing, unit conversion, cut lists, and angle calculations.
