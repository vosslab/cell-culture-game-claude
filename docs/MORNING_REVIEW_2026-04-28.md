# Morning review 2026-04-28

All milestones M1 through M5 landed overnight. Walkthrough 25/25 throughout.

## What shipped

- **M1**: YAML-authored protocol pipeline. `content/cell_culture/{items,reagents,protocol}.yaml`
  drives generated `parts/protocol_data.ts` and `parts/inventory_data.ts` via
  `tools/build_protocol_data.py` (run from `build_game.sh`).
- **M1.5**: `parts/interaction_resolver.ts` routes the first 8 steps' clicks data-driven
  from YAML `allowedInteractions`. `devel/test_yaml_swap_runtime.mjs` proves a YAML-only
  edit changes runtime behavior.
- **M2**: 25-step audit at [docs/STEP_AUDIT_2026-04-28.md](docs/STEP_AUDIT_2026-04-28.md).
  Wired `microscope` into `count_cells`, marked unused items `visualOnly`. New
  `devel/test_step_completeness.mjs` (152/152) wired into `walkthrough.sh`.
- **M3**: Professor coach card overlay (top-left, `pointer-events:none`, mood swings on
  errors/successes). Bench equipment widthScale ratios applied; `back_shelf` populated
  with `tip_box`, `glove_box`, `waste_tray`. `devel/test_layout_metrics.mjs` enforces
  invariants. See [docs/LAYOUT_METRICS.md](docs/LAYOUT_METRICS.md).
- **M4**: Serological pipette liquid fill via `anchor_liquid_clip`. `gameState.heldLiquid`
  added; legacy `_with_X` tokens kept for one milestone. Color map in
  `parts/style_constants.ts` matches `reagents.yaml`. See
  [docs/PIPETTE_LIQUID_CONVENTION.md](docs/PIPETTE_LIQUID_CONVENTION.md).
- **M5**: Two flask variants shipped as available assets:
  `assets/equipment/t75_flask_v2.svg` (vented modern) and `t75_flask_v3.svg` (classic
  Corning). Default unchanged. See
  [docs/FLASK_DESIGN_REVIEW.md](docs/FLASK_DESIGN_REVIEW.md) for side-by-side screenshots.

## Decisions awaiting you

- **OQ-3** (bench scaling ratios): plan default 1.6:1.5:1.4:1.2:1.0:0.9:0.6 was loosened
  in implementation to 0.95/0.90/0.88/0.86/0.85/0.82/0.75 (relative scales) to keep the
  layout coherent at all viewports. Re-tune if you want a more dramatic size hierarchy.
- **OQ-5** (flask variant choice): pick v1 (current), v2 (vented), or v3 (classic) in
  `docs/FLASK_DESIGN_REVIEW.md`. Currently still v1. Switch is one line in
  `parts/svg_assets.ts:getFlaskSvg()`.
- **OQ-2** (professor corner): defaulted to top-left; trivial to move.

## Verification commands

```
bash build_game.sh
bash walkthrough.sh                 # 25/25 + step completeness
node devel/test_layout_metrics.mjs
node devel/test_pipette_liquid.mjs
node devel/test_yaml_swap_runtime.mjs
```

Nothing committed. All edits staged or unstaged for your review.
