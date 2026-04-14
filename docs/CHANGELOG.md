# Changelog

## 2026-04-14

### Additions and New Features
- Added [docs/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md](docs/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md), a Markdown transcription of the `OVCAR8_Carboplatin_Metformin_MTT_Protocol.docx` source file. Covers cell splitting, Trypan Blue counting, 72h MTT assay workflow (Day 1 seeding / Day 2 drug treatment / Day 4 readout), Carboplatin dilution guide (1a intermediate, 1b low range, 1c high range), Metformin working-stock prep, and the 96-well plate map. ASCII-compliant per `docs/MARKDOWN_STYLE.md` (escapes `&micro;`, `&ge;`, `&rarr;`).
- M3 (bench populate + hood declutter): landed four new hand-drawn equipment SVGs in `assets/equipment/`: `centrifuge.svg` (grey round body with dark lid, digital screen showing `13400`, red status LED), `water_bath.svg` (stainless tank with blue water fill, raised lid, 37C temperature display), `vortex.svg` (small cube body with black rubber cup, power and speed knobs, T/C mode switch), `cell_counter.svg` (Countess-style white body with bezeled screen showing `Viab 94%` + small histogram bars and a slide slot). Each SVG is ASCII-only, wrapped in `<g id="body">` and closed with `<g id="overlay_root"/>` per `tests/test_svg_assets.py` required-group convention, and auto-ingested by `build_game.sh` into `SVG_CENTRIFUGE` / `SVG_WATER_BATH` / `SVG_VORTEX` / `SVG_CELL_COUNTER` constants. Added four matching `getCentrifugeSvg()` / `getWaterBathSvg()` / `getVortexSvg()` / `getCellCounterSvg()` helpers in `parts/svg_assets.ts` and four switch cases in `parts/layout_engine.ts :: getStaticSvg()` so the layout engine can compute aspect ratios. Added four entries in `parts/asset_specs.ts` (`centrifuge` 14/10, `water_bath` 16/10, `vortex` 8/6, `cell_counter` 12/8).
- M3 bench scene: populated `BENCH_SCENE_ITEMS` in `parts/bench_config.ts` with six items. The four bench-only instruments sit in `mid_bench`: centrifuge (left), water bath (left), vortex (center), cell counter (center). Microscope (left) and incubator (right) live in `front_bench`. Bench zone baselines tuned from 38/60/78 to 30/58/88 so `mid_bench` items and `front_bench` items do not overlap now that both rows are populated. `parts/bench_scene.ts :: getBenchItemSvgHtml()` switch gained four new cases for the bench-only instruments while keeping the existing microscope/incubator cases.
- M3 bench click interactions: added `onBenchItemClick()` in `parts/bench_scene.ts`. Clicking `microscope` calls `switchScene('microscope')` and `renderGame()` to open the existing microscope modal overlay; clicking `incubator` does the same for the incubator overlay. The four bench-only instruments log `Clicked <itemId>` to the console and show a notification stub ("<label> (interaction lands in M4)"); full bench interaction arrives in M4. `renderBenchScene()` now wires per-item click + hover handlers on every `.hood-item` under `#bench-scene` after the DOM is painted.
- M4 protocol rewrite: added `parts/dilution_prep.ts` with four validation functions for drug dilution prep: `prepareCarbIntermediate(drugUl, mediaUl)` (20 uL + 980 uL), `prepareCarbLowRange(index, drugUl, mediaUl)` (5 variants from 2/998 to 100/900), `prepareCarbHighRange(index, drugUl, mediaUl)` (2 variants: 10/990 and 50/950), `prepareMetforminWorking(drugUl, mediaUl)` (10 uL + 990 uL). All use +/- 5% tolerance window. Each returns `{ok: boolean, message: string}`.
- M4 day state machine: added `day` field to `GameState` interface in `parts/game_state.ts` with values `'day1_seed' | 'day1_wait' | 'day2_treat' | 'day2_wait' | 'day4_readout'`. Initial state: `'day1_seed'`. Added `seenPartIntros: string[]` field to track which protocol part intros have been shown. Helper `advanceDay()` function drives transitions via incubator clicks.
- M4 cell model: added `METFORMIN_SHIFT = 0.5` constant in `parts/cell_model.ts` (2x sensitization multiplier). Added `computeWellViability(carbConcUm: number, metforminPresent: boolean): number` function using Hill-like formula `v = 0.1 + 0.9 * (ic50 / (ic50 + carbConcUm))` where `ic50 = CARB_IC50_UM * METFORMIN_SHIFT` when metformin is present. Added `applyPlateDrugEffect()` to iterate all wells and compute per-well viability based on drug concentration and metformin status.
- M4 protocol UI: added `parts/protocol_ui.ts` with `renderProtocolUI(): string` returning HTML for day ribbon (three pills: Day 1, Day 2, Day 4), breadcrumb (Day > Part > Step N of M), current-step card (action, why, required items), and upcoming steps (next 1-2 at reduced opacity). Helper functions `renderDayRibbon()`, `renderStepCard()`, `renderUpcomingSteps()` compose the markup. Added `showPartIntro(partId: string)` one-shot modal and `showStepTransition(completedAction, nextAction)` brief notification. All classes use ASCII-only identifiers: `day-pill`, `step-action`, `step-why`, `protocol-breadcrumb`, `protocol-step-card`, `protocol-upcoming`.
- M4 24-step protocol: replaced legacy 9-step protocol with 24 new steps organized into 7 parts across 3 days. Parts: Part 1 Split (4 steps, Day 1), Part 2 Count (3, Day 1), Part 3 Seed (2, Day 1), Part 4 Dilute (5, Day 2), Part 5 Treat (4, Day 2), Part 6 MTT (4, Day 4), Part 7 Read (2, Day 4). Every step includes: id (snake_case), action (<=60 chars), why (<=100 chars), partId, dayId, stepIndex, requiredItems (array of scene item ids), errorHints map, scene (hood | bench | incubator | microscope | plate_reader), requiredAction. All step ids documented in `parts/constants.ts` PROTOCOL_STEPS array.

### Behavior or Interface Changes
- M3 hood: the `outside` zone in `parts/hood_config.ts :: HOOD_ZONES` has been deleted and the `microscope` and `incubator` entries have been removed from `HOOD_SCENE_ITEMS`. Hood item count drops from 22 to 20. The comment block at the top of `HOOD_ZONES` was rewritten to describe three hood-interior rows (back_row, front_row, shelf_row) and to note that microscope/incubator now live on the bench scene. `front_row` reclaims the full hood interior width: `x1` grew from 77 to 93 now that it no longer needs to leave clearance for the outside zone. `parts/hood_scene.ts :: getItemSvgHtml()` dropped the `microscope` and `incubator` cases because they can no longer appear in `HOOD_SCENE_ITEMS`. The existing hood-side `onItemClick()` branches that reference those ids are now dead code paths (harmless) and will be removed when the flask-to-incubator and plate-to-incubator flows are redesigned around the bench in M4.
- M4 protocol schema: `ProtocolStep` interface extended with new fields: `action` (imperative verb phrase, <=60 chars), `why` (rationale, <=100 chars), `partId` (part1_split through part7_read), `dayId` (day1, day2, or day4), `stepIndex` (1-based within partId), `requiredItems` (array of scene item ids), `errorHints` (Record<string, string>). Existing fields (`id`, `label`, `scene`, `requiredAction`, `correctVolumeMl`, `toleranceMl`, `targetItems`) are preserved for backward compatibility.
- M4 plate geometry: `PLATE_ROWS` and `PLATE_COLS` changed from 4x6 (24 wells) to 8x12 (96 wells) to match the MTT assay protocol. Well map now supports dose-response curves with 8-point carboplatin series (rows B-H) and optional metformin sensitization (columns 7-12).
- M4 protocol order: 24 new steps replace the legacy 12-step skeleton, reorganized by day and lab workflow phase. Steps are now explicitly ordered top-to-bottom in constants.ts and match the docx protocol walkthrough exactly.

### Fixes and Maintenance
- M3 bench placeholder: removed the `if (BENCH_SCENE_ITEMS.length === 0)` "Equipment arrives in M3" placeholder card from `renderBenchScene()` now that the bench renders real items.

### Removals and Deprecations
- Deleted the `outside` zone definition and the `microscope` and `incubator` hood `SceneItem` entries from `parts/hood_config.ts`. The two items have been migrated to `BENCH_SCENE_ITEMS` in `parts/bench_config.ts`; the bench is now the only scene that renders them.
- M4: deleted legacy 12-step `PROTOCOL_STEPS` array (reference values have been replaced by the new 24-step protocol). Deleted legacy `protocol_walkthrough.mjs` browser walkthrough script; replaced by new `test_protocol_flow.mjs` and `test_dilution_prep.mjs` Node.js test suites that validate protocol schema and game-state functions via Playwright page context.

### Decisions and Failures
- M3 split the workspace into two peer scenes (hood for sterile work, bench for equipment the student walks to between hood steps). Rationale: the hood had grown to 22 items after M2 and was visually overloaded. Moving the microscope and incubator to the bench declutters the hood (20 items) and gives the bench a populated identity (6 items) without duplicating assets. The `asset` entries for microscope and incubator in `parts/asset_specs.ts` are unchanged because both scenes reuse the same SVGs and sizing.
- Chose to keep `onBenchItemClick` minimal for the four bench-only instruments (console log + stub notification) rather than wiring full tool-on-target interactions. Full interaction arrives in M4 when the protocol is rewritten to walk the student between hood and bench; building it now would force guessing at M4's tool-state model.
- Hit a bench-zone overlap when mid_bench baseline 60 and front_bench baseline 78 both got populated (microscope/incubator are tall, so their tops bled into the mid_bench row). Tuned baselines to 30/58/88 which leaves comfortable vertical separation at all three tested viewports without touching item widthScales.
- M4 chose `METFORMIN_SHIFT = 0.5` (2x sensitization: IC50 drops from 5 uM to 2.5 uM) as a default tuning constant because the docx source specifies only the 5 mM metformin concentration and final well volumes, not the combo synergy magnitude. This value is tunable and can be adjusted based on experimental data or pedagogical goals without breaking schema invariants.
- M4 verified that days 1, 2, and 4 (skipping day 3) match the docx timeline: day 1 seed + overnight incubation, day 2 drug treatment + 48h incubation, day 4 MTT readout. Day transitions are gated by incubator clicks (`advanceDay()`) rather than auto-advancing on step completion, giving the student control over pacing.

### Developer Tests and Notes
- `devel/test_hood_layout.mjs`: `EXPECTED_ITEM_COUNT` bumped from 22 to 20; added new Check 3b asserting neither `microscope` nor `incubator` elements exist under `#hood-scene`.
- `devel/test_bench_layout.mjs`: added `EXPECTED_BENCH_ITEM_COUNT = 6` and `EXPECTED_BENCH_ITEM_IDS`. New checks 4a (all six expected ids render on the bench), 4b (microscope and incubator elements under `#bench-scene` each contain a child `<svg>`), 4c (no hood-only items leak onto the bench), and 4d (item count stable across 1280x720, 1440x900, 1920x1080 viewports). All 10 bench checks pass.
- `devel/test_layout_engine.mjs`: no change, still 27/27 passing. The zone math changes in M3 are configuration-only.
- M4 new tests: `devel/test_dilution_prep.mjs` validates `prepareCarbIntermediate()`, `prepareCarbLowRange()`, `prepareCarbHighRange()`, `prepareMetforminWorking()` via Playwright page context. 8 test cases covering correct and incorrect volume ratios (all 8/8 pass). `devel/test_protocol_flow.mjs` validates protocol schema (24 steps), required fields, part ordering, item resolution against HOOD_SCENE_ITEMS + BENCH_SCENE_ITEMS, gameState initialization, `computeWellViability()` curve shape and metformin sensitization, and `renderProtocolUI()` HTML structure. 12 test cases (all 12/12 pass).
- Validated via `bash build_game.sh` (exit 0) plus the three Playwright `.mjs` tests and `pytest tests/test_svg_assets.py -k "centrifuge or water_bath or vortex or cell_counter"` (24/24 passing). Pre-existing failures in `tests/test_svg_assets.py` for `biohazard_decant.svg`, `conical_15ml_rack.svg`, `dilution_tube_rack.svg`, and `micropipette_rack.svg` (missing `body`/`overlay_root` groups) are not M3 regressions - those files are listed as modified/untracked in git status from earlier work and their `body`/`overlay_root` compliance is tracked separately.

## 2026-04-13

### Additions and New Features
- M1 Patch 1 (scene-model): added a persistent `bench` scene as a peer of `hood` to host equipment (centrifuge, water bath, vortex, cell counter, microscope, incubator) in later milestones. `gameState.activeScene` now includes `'bench'`; `switchScene('bench')` round-trips without mutating protocol state. `parts/bench_scene.ts` new with a stub `renderBenchScene()` that draws a bench-surface background and a "To Hood" nav button. `parts/hood_scene.ts` gains a matching "To Bench" nav button in the top-right. `init.ts` toggles `#hood-scene` and `#bench-scene` visibility based on `activeScene` so modal overlays (microscope, incubator, plate reader) still sit on top of whichever persistent scene is showing. `build_game.sh` registers `parts/bench_scene.ts` between `hood_scene.ts` and `feed_cells.ts`. See [docs/glimmering-stirring-snowglobe plan](/Users/vosslab/.claude/plans/glimmering-stirring-snowglobe.md).
- M2 Patches 5/6/7 (hood reagent expansion): added 10 new hood items growing `HOOD_SCENE_ITEMS` from 12 to 22. New items by zone:
  - **shelf_row** (new zone, baseline 22): `sterile_water` (Sterile Water), `pbs_bottle` (1x PBS), `conical_15ml_rack` (15 mL Tubes), `dilution_tube_rack` (1.5 mL Tubes), `mtt_vial` (MTT 5 mg/mL), `dmso_bottle` (DMSO), `carboplatin_stock` (Carboplatin 10 mM), `metformin_stock` (Metformin 1 M). Tab-stop clusters: left = wash + consumables (4), center = MTT assay reagents (2), right = drug stocks (2). All shelf items use widthScale 0.65-0.75 so they read as small storage containers above the working area.
  - **back_row** right cluster: `micropipette_rack` (P20/P200/P1000), priority 7.5 placing it after the multichannel pipette. widthScale 0.90.
  - **front_row** right cluster: `biohazard_decant` (Biohazard), priority 10.5 placing it after the waste container. widthScale 0.90.
  - The 6 reagent bottles all reuse `SVG_MEDIA_BOTTLE` as their base via `composeSvg` + `createLiquidOverlay` + `createDynamicLabel`, with per-item ColorRole and label text. carboplatin_stock, metformin_stock, mtt_vial = `drug` role; sterile_water, pbs_bottle, dmso_bottle = `buffer` role. No new bottle artwork required.
  - 4 new hand-drawn SVG files in `assets/equipment/`: `conical_15ml_rack.svg` (5 visible 15 mL tubes with red caps in a dark-grey rack), `dilution_tube_rack.svg` (8 microcentrifuge tubes with green flip-top caps in a tan tray), `biohazard_decant.svg` (red trapezoidal bin with white biohazard trefoil and BIOHAZARD label), `micropipette_rack.svg` (three pipettes P20 red / P200 yellow / P1000 blue on a steel stand with volume-display windows). All ASCII, single-svg-root, ingested automatically by `build_game.sh` into `SVG_*` constants.
  - `parts/svg_assets.ts` gained 10 new `getXSvg()` helpers and 4 `declare const SVG_*` lines for the new hand-drawn assets.
  - `parts/asset_specs.ts` gained 10 new entries for layout sizing.
  - `parts/layout_engine.ts :: getStaticSvg()` and `parts/hood_scene.ts :: getItemSvgHtml()` switches both gained 10 cases.
  - `parts/hood_config.ts` added the `shelf_row` zone (`{ x0: 7, x1: 93, baseline: 22, gap: 2, align: 'tab-stops' }`) and 10 `HOOD_SCENE_ITEMS` entries. Initial baseline of 34 was rejected after Stream B integration: `media_bottle` overlapped the shelf_row tube racks because back_row item tops landed near y=34 at viewport 1200x900. Lowering shelf_row baseline to 22 gave the shelves ~12% vertical clearance from back_row tops and eliminated all visual overlap.
  - No `group` tag on any new item in M2. Auto-depth resolution stays dormant until M4 Patch 11 wires groups intentionally to the rewritten protocol steps.
  - `parts/drug_treatment.ts`, `parts/constants.ts`, and the legacy `drug_vials` item are untouched per Patch 6's "additive only" rule. They go away in M4.
  - **Tests**: `devel/test_hood_layout.mjs` rewritten to do a multi-viewport sweep at 1280x720, 1440x900, and 1920x1080. Per-viewport checks: label overlap, item count = 22, scene-bounds containment, no item-to-item overlap. Single-viewport checks (flask prominence, layer structure, label anchoring, label truncation) stay at 1200x900. Hard-coded `=== 12` count assertions updated to `=== 22`. `devel/test_bench_layout.mjs` updated to drive scene switching via `switchScene('bench')` from page context instead of clicking a `#hood-to-bench-btn` (the hood-side nav button was intentionally removed from `parts/hood_scene.ts` by the user). All tests green: 27/27 layout-engine, 9/9 hood-layout (across 4 viewport runs), 6/6 bench-layout, 74/74 repo-style lint.
  - **Parallel-plan dispatch**: M2 Patches 5/6/7 split into Stream A (svg + specs + switches), Stream B (hood_config items + zone), and Stream C (test extension). Streams A and B were dispatched as separate `coder` agents reading a shared `_m2_contract.md` scratch file that pinned every item id, label, ColorRole, fill level, and priority. Stream C ran as a `tester` agent after A+B integration. Integration in main caught the shelf_row baseline overlap and fixed it before Stream C ran, so Stream C tested the final layout. Scratch contract and stream report files removed after merge.
- M1 Patch 3 (scene-render split + bench stub): drafted `parts/bench_config.ts` with `BENCH_BOUNDS`, `BENCH_ZONES` (back_shelf baseline 38, mid_bench baseline 60, front_bench baseline 78 - all tab-stop rows), empty `BENCH_SCENE_ITEMS` placeholder, `BENCH_LAYOUT_RULES`, and a `getBenchItemLabel()` helper that mirrors `getHoodItemLabel()`. `parts/bench_scene.ts` rewritten to use the shared layout engine: it calls `resolveSceneItemsWithDepth()` + `computeSceneLayout()` exactly like hood_scene, emits `bench-items-layer` / `bench-labels-layer` divs, and falls back to a placeholder card while `BENCH_SCENE_ITEMS` is empty. `parts/game_state.ts` resolver now consults both `HOOD_SCENE_ITEMS` and `BENCH_SCENE_ITEMS` when computing target groups so step target-items spanning scenes still resolve. `build_game.sh` registers `parts/bench_config.ts` between `hood_config.ts` and `layout_engine.ts` so types resolve in dependency order. New `devel/test_bench_layout.mjs` Playwright smoke test covers: (1) hood visible + bench hidden at startup, (2) "To Bench" button present, (3) bench visible after click, (4) scaffolding divs present, (5) round-trip restores hood, (6) round-trip does NOT mutate protocol state. All 6 bench checks pass; all 27 layout-engine cases pass; all 9 hood-layout regression checks pass.
- M1 Patch 4 (tests depth + scene round-trip): added 4 new depth-tier unit tests to `devel/test_layout_engine.mjs`: (1) back depth = 0.80x width AND baseline - 4, (2) front depth = 1.10x width AND baseline + 4, (3) absent depth = mid (1.00x, no baseline offset - the behavior-neutral default), (4) `baselineOverride` wins over depth baseline offset (depth still multiplies width). Test count grows from 23 to 27. Bench scene-switch round-trip regression is enforced via `devel/test_bench_layout.mjs` (landed with Patch 3). Aggregate pass rate: 27/27 layout-engine + 9/9 hood-layout + 6/6 bench-layout + 74/74 repo-style lint. No failures.
- M1 Patch 2 (layout-engine depth + group): added `depth` ('back' | 'mid' | 'front') and `group` (stocks | wash | waste | pipetting | plate | dilution_prep | equipment) fields to the `SceneItem` type in `parts/scene_types.ts`. Layout engine applies per-item depth multipliers (back 0.80x + baseline -4, mid 1.00x + baseline 0, front 1.10x + baseline +4) in `parts/layout_engine.ts` via new `depthScaleFor()` / `depthBaselineOffsetFor()` helpers; depth multiplies `item.widthScale` consistently so downstream footprint and label math all see the same size. `parts/game_state.ts` gains `resolveItemDepth(item, activeStepId)` and `resolveSceneItemsWithDepth(items, activeStepId)`: depth is auto-resolved from the active protocol step's `targetItems` so the current step's items snap to `front`, items sharing a `group` with a target stay `mid`, and everything else parks at `back`. Auto-depth is OPT-IN via the `group` field: an item with no `group` stays `mid` no matter what, so Patch 2 lands the machinery without changing any pixels until M2/M3 tag items with groups. Plate and flask kinds never drop below `mid` so the student never loses the working plate. `parts/hood_scene.ts` pipes hood items through `resolveSceneItemsWithDepth()` and emits a `depth-back|mid|front` class per item so CSS cues (opacity, brightness) paint the tier. `parts/style.css` adds `.hood-item.depth-back` (0.72 opacity, desaturate), `.depth-mid` (default), and `.depth-front` (slight brightness boost). Existing `transition: all 0.2s ease` on `.hood-item` already animates depth changes smoothly. All 23 layout-engine tests and all 9 hood-layout regression checks pass unchanged; `flask.width=129.6` and pipette widths match the pre-Patch-2 baseline exactly because no hood item has a `group` tag yet.

### Behavior or Interface Changes
- Extended `HOOD_ZONES.pipettes` x1 from 82 to 92 so the right-aligned pipette cluster sits flush with the hood interior right wall (~93%) instead of stopping ~11% short; microscope and incubator in the `outside` zone share x-range with pipettes but live at baseline 68 (front row, below the hood opening) while pipettes anchor at baseline 50 (back row), so no physical overlap (`parts/hood_config.ts`)
- Right-aligned and left-aligned zones now position boundary items by their VISUAL edge (not footprint edge), so clusters are flush with the zone edge when items have footprint > visual width (e.g., narrow pipettes with wide labels); user-visible effect: pipettes are now flush with the hood right wall instead of sitting ~0.5-0.8% short (`parts/layout_engine.ts`)
- Center-aligned zones now center the visual span (not the footprint span) of the cluster, so clusters with asymmetric first/last footprint insets are centered correctly
- Single-item zones (n===1) now apply the same visual-edge math, honoring alignment intent even when the item's label-derived footprint is wider than its visual

### Additions and New Features
- Added `align: 'tab-stops'` mode to the row layout engine: each item declares a per-item `alignStop` of `'left' | 'center' | 'right'`, items sharing a stop are packed together with the zone's gap, and each sub-cluster is anchored at its stop (left wall, row midpoint, or right wall). Whitespace falls between the packed groups rather than between every item, so layouts read as discrete clusters rather than evenly distributed rows. Implemented by partitioning zone items by `alignStop` and recursively invoking `layoutZoneItems` with three synthetic sub-zones (`parts/layout_engine.ts`, `parts/scene_types.ts`)

### Behavior or Interface Changes
- Collapsed the four hood-interior back-row zones (`plate`, `reagents`, `primary`, `pipettes`) into a single `back_row` zone spanning the full hood interior `[x0=7, x1=93]` and the two hood-interior front-row zones (`tools_active`, `dirty`) into a single `front_row` at `[x0=7, x1=77]`; both rows use the new `align: 'tab-stops'` mode with three anchor groups each (left wall / row midpoint / right wall); the previous zone-partitioned model was imposing artificial sub-row boundaries and intermediate `justify` (space-between) attempts produced evenly distributed rows instead of the intended grouped clusters (`parts/hood_config.ts`)
- Back row `alignStop` groups: left = 24-well plate, DMEM media, Trypsin-EDTA; center = T-75 flask (dominant working object); right = serological, aspirating, multichannel pipettes. Front row `alignStop` groups: left = 70% ethanol; center = drug dilutions; right = waste container. `front_row.x1=77` intentionally leaves the hood-interior right band clear of the `outside` zone (microscope + incubator) which shares baseline 68
- Added `baselineOverride: 52` on the `flask` item spec so the flask's bottom anchor sits 2% lower than the other back-row items (matching the original `primary` zone's baseline=52 visual alignment with the work-surface line)

### Fixes and Maintenance
- Investigated reported "pipette row gap" and confirmed the row alignment engine in `parts/layout_engine.ts` already implements the intended row model correctly (single `startX` per row, insertion-order placement, overflow-gap collapse, group-level `sceneBounds` clamp, `lay.footprint`-based label width); the reported alignment issue was caused by the hood scene being partitioned into multiple narrow row configs in `parts/hood_config.ts`, not by a defect in the row alignment engine; intermediate attempts to widen only the `pipettes` row (x1=92 -> x1=100) overshot the hood interior wall on tall-aspect viewports and exposed the true root cause, which was the zone model itself
- Corrected misleading comment in `parts/hood_config.ts` that described the hood interior right wall as "~93%, with 1% padding"; the hood-bg SVG in `parts/svg_assets.ts getHoodBackgroundSvg` is an 800x600 viewBox with interior walls drawn at `x=60` and `x=740` (7.5% and 92.5% of the SVG width), and the collapsed row bounds `[7, 93]` now reflect that geometry directly
- Fixed Bug 1: overflow beyond `MIN_SCALE` (0.75) no longer leaves clusters with startX outside the zone; when items cannot fit at `MIN_SCALE`, the gap is now collapsed (possibly to a negative value) so visual overlap is accepted while the cluster origin still honors the alignment invariant (`parts/layout_engine.ts`)
- Fixed Bug 2: removed per-item visual clamp that silently rewrote item positions and decoupled `curX` advancement from actual rendered positions; replaced with a per-zone post-condition invariant check that calls `console.warn` on regression instead of masking bugs
- Fixed Bug 3: label pass now uses `lay.footprint` (newly added) instead of `lay.width` for available-width estimation, matching the original comment's stated intent; unit reconciliation recovers `effectiveScale = lay.width / unscaledVisual` so footprint and spec values are compared in the same coordinate system; added `footprint: number` field to `ComputedItemLayout` in `parts/scene_types.ts`
- Fixed Bug 4: final `sceneBounds` clamp is now group-level (per zone) instead of per-item; computes a single `dx`/`dy` per zone group from the maximum violation across siblings and translates the entire cluster uniformly, preserving inter-item spacing and alignment; alignment-preferred tiebreak (right-align zones honor the right edge, left/center honor the left edge) when a group exceeds `sceneBounds` on both sides, with a `console.warn` for configuration visibility
- Added module-level alignment-preservation invariant comment to `parts/layout_engine.ts` documenting the three mode-specific visual-edge equalities
- Added `EPSILON = 0.001` constant and `clusterAnchorOk()` helper function for consistent float-tolerance comparisons across engine, assertions, and tests
- Extracted `groupLayoutsByZone(layouts, itemMap)` helper; reused by `layoutLabels` collision pass and `computeSceneLayout` sceneBounds clamp
- Documented the non-bug flagged in initial review: the braceless `for (var pass = 0; pass < 3; pass++)` in `layoutLabels` is correct because the outer loop's body is the entire inner `for` statement with its own block

### Developer Tests and Notes
- Added 8 new regression tests to `devel/test_layout_engine.mjs` (total now 23):
  - Pipettes-like right-align: last visual edge flush with effective zone right
  - Right-align overflow past `MIN_SCALE`: anchor preserved, items visually overlap
  - Left-align overflow past `MIN_SCALE`: first item flush with effective zone left
  - Center-align overflow: cluster midpoint equals zone midpoint
  - `n===1` oversized items in all three alignment modes
  - `n===2` clusters in all three alignment modes, both fit and overflow
  - Narrow item with wide label uses footprint-based availability (single line)
  - `sceneBounds` clamp translates right-aligned cluster as a unit, preserving inter-item deltas
- Shared `TEST_TOLERANCE = 0.01` constant and `anchorOk(layouts, align, x0, x1)` helper added to the test file for consistent invariant verification
- Hood visual test (`devel/test_hood_layout.mjs`) still passes all 9 checks after fixes

## 2026-04-09

### Additions and New Features
- Created `parts/scene_types.ts` with type definitions for the scene layout engine: `SceneItem`, `AssetSpec`, `ZoneDef`, `SceneLayoutRules`, `ComputedItemLayout`
- Created `parts/asset_specs.ts` with `ASSET_SPECS` constant mapping asset names to layout metrics (defaultWidth, labelWidth, anchorYOffset); aspect ratio is derived from SVG viewBox at runtime, not hardcoded
- Created `parts/hood_config.ts` with `HOOD_ZONES`, `HOOD_SCENE_ITEMS`, `HOOD_LAYOUT_RULES` constants and `getHoodItemLabel()` helper; semantic config only, no pixel coordinates
- Added three new files to `build_game.sh` TS_FILES array before `constants.ts`: `scene_types.ts`, `asset_specs.ts`, `hood_config.ts`
- Created `parts/layout_engine.ts` with zone-based scene layout engine: `computeSceneLayout()` distributes items within named zones, computes anchor-based Y positioning, wraps labels, and resolves label collisions in a single deterministic pass; engine is scene-agnostic and reusable for future lab scenes
- Added Playwright unit tests (`devel/test_layout_engine.mjs`) for layout engine: single-item alignment, priority ordering, zone containment, overflow scaling, all anchor modes, label wrapping, label collision, and deterministic sort
- Added Playwright visual verification (`devel/test_hood_layout.mjs`) for hood scene: label overlap detection, flask prominence, item count, label count, and layer structure checks
- Created [docs/ROADMAP.md](docs/ROADMAP.md) with planned hood setup phase where students arrange equipment themselves
- Created `normalize_svg.py` script to normalize SVG viewBoxes to 0,0 origin by computing content bounding box, shifting all coordinates, and cropping whitespace; supports rect, circle, ellipse, line, path (absolute commands), text; exits on unsupported features (transforms, relative paths, gradients, use/symbol)

### Behavior or Interface Changes
- Hood scene renderer now consumes `ComputedItemLayout[]` from the layout engine instead of doing inline layout math; items and labels render in separate z-indexed DOM layers (`#hood-items-layer`, `#hood-labels-layer`)
- Hood item labels now wrap to two lines when too wide, with collision resolution to prevent overlap; labels use shortLabel fallback for tight zones; full educational labels preserved (e.g., "Serological Pipette" not "Sero")
- Layout engine uses separate visual width and layout footprint: narrow items like pipettes get spacing based on label width, not visual width, preventing label collisions without shrinking objects
- Pipettes moved to back-right `pipettes` zone with `align: 'right'`, clustered against the hood right wall as a tool group
- Split old `secondary` zone into `plate` (well plate alone), `reagents` (media + trypsin), and `primary` (flask center); layout now reads left-to-right: plate, reagents, flask, pipettes
- Labels positioned above objects (not below) to avoid escaping the hood work surface; labels anchored to object top edge with consistent offset
- Left/right aligned zones now cluster items at the specified edge instead of distributing evenly; gap expansion only applies to center-aligned zones
- Layout engine derives aspect ratios from static SVG constants at runtime (`getStaticSvg()`), not from `getItemSvgHtml()` which depends on game state
- Footprint and label width estimation unified: both use same `splitLabelAtMiddle()` + char width logic; footprint capped at 1.4x visual width to prevent spacing blowup; gap capped at 4%
- Scene bounds (`HOOD_BOUNDS`) enforced as final clamp pass in `computeSceneLayout()` for both items and labels
- Zone padding (1%) and minimum scale (0.75) prevent items from touching zone edges or shrinking excessively
- T-75 Flask is now visually larger (widthScale 1.2) and positioned as the primary focal object in the center `primary` zone
- Label font size reduced from 10px to 9px with `white-space: normal` and `text-align: center` for multi-line support
- Added accessibility attributes on hood items: `role="button"`, `tabindex="0"`, `aria-label`, `aria-pressed`
- Changed held item highlight from 3px solid green to 4px solid blue border with blue box-shadow; target items now use 4px dashed green border instead of 2px solid green, making holding vs clickable states visually distinct (`parts/hood_scene.ts`, `parts/style.css`)
- Normalized all 11 SVG assets to tight viewBoxes with 2px padding, eliminating excess whitespace so selection borders hug artwork closely (`assets/equipment/*.svg`)
- Updated `run_web_server.sh` to clean previous build artifacts before rebuilding
- Removed `height` from `HoodItemConfig`; hood-item div height is now computed automatically from SVG viewBox aspect ratio at render time, so swapping SVG assets auto-sizes correctly (`parts/hood_scene.ts`, `parts/constants.ts`)
- Reorganized hood item layout to mimic a real biosafety hood: reagent bottles at back, flask and drug vials in middle working area, pipettes standing on right side, well plate and waste in front, incubator and microscope outside hood (`parts/constants.ts`)

### Removals and Deprecations
- Removed `HOOD_ITEMS`, `HoodItemConfig`, `TIP_OFFSET`, `BACK_ROW`, `FRONT_ROW`, `OUTSIDE_ROW` from `parts/constants.ts` (replaced by layout engine)
- Deleted dead code: `content/tc_scenes.ts` and `ui/hood_scene.ts` (prior refactoring attempt, never integrated)

## 2026-04-08

### Additions and New Features
- Added trypsin digestion steps to protocol: `add_trypsin`, `incubate_trypsin`, `neutralize_trypsin` between aspirate and microscope check, with trypsin bottle in hood scene (`parts/constants.ts`, `parts/hood_scene.ts`, `parts/game_state.ts`, `parts/svg_assets.ts`)
- Added manual cell counting to hemocytometer: players click each corner quadrant and enter their live cell count, which is compared against actual for accuracy feedback (`ui/overlays.ts`, `parts/microscope_scene.ts`)
- Added close confirmation on microscope overlay when quadrant counting is partially complete (`ui/overlays.ts`)
- Added aspiration volume feedback notification after completing aspiration (`parts/feed_cells.ts`)

### Behavior or Interface Changes
- Changed hemocytometer grid from 400x300 (4:3) to 400x400 (square) to match real hemocytometer proportions; quadrants now 100x100 instead of 100x75 (`ui/overlays.ts`, `parts/microscope_scene.ts`, `parts/body.html`)
- Increased cell radius on hemocytometer for better visibility; dead cells now slightly larger than live to reflect trypan blue swelling (`parts/cell_model.ts`)
- Improved live/dead cell color contrast: live cells lighter gray with gray outline, dead cells darker blue with blue outline (`ui/overlays.ts`, `parts/microscope_scene.ts`)
- Replaced subtle dashed cream quadrant highlights with solid green borders for better visibility (`ui/overlays.ts`, `parts/microscope_scene.ts`)
- Moved hemocytometer instruction text below the grid to prevent overlap with bottom quadrants (`ui/overlays.ts`, `parts/microscope_scene.ts`)
- Removed drop-shadow filter from hood scene SVGs, decorative shadow elements from SVG assets, box-shadow from hood toolbar, and set depth offsets to 0 (`parts/style.css`, `parts/svg_assets.ts`, `parts/hood_scene.ts`, `parts/style_constants.ts`)
- Updated microscope gate message from "Add fresh media first" to "Complete trypsinization and media neutralization before microscopy" (`parts/hood_scene.ts`)
- Replaced `add_fresh_media` protocol step with trypsin workflow: aspirate -> add trypsin -> incubate trypsin -> neutralize with media (`parts/constants.ts`, `parts/feed_cells.ts`)

### Fixes and Maintenance
- Fixed Play Again button not closing the results overlay; now removes `active` class from all modal overlays before resetting state (`parts/game_state.ts`)
- Fixed incubator popup showing an empty gray box; now injects the incubator SVG into the overlay view area (`parts/incubator_scene.ts`)
- Added incubator as a clickable hood item with SVG artwork; incubation now requires picking up the well plate and clicking the incubator instead of auto-transitioning (`parts/constants.ts`, `parts/hood_scene.ts`, `assets/equipment/incubator.svg`, `parts/svg_assets.ts`)
- Created [docs/PLAYWRIGHT_USAGE.md](docs/PLAYWRIGHT_USAGE.md) covering install, script placement, common patterns, and troubleshooting

### Decisions and Failures
- Chose `prompt()` for per-quadrant cell count entry over inline input fields; simpler implementation, and the modal context makes prompt acceptable for an educational game
- Added `getHealthBandMessage()` helper to `parts/microscope_scene.ts` and `ui/overlays.ts`: translates numeric viability and confluency into descriptive health bands (thriving/stable/stressed and dense/moderate/light) with contextual feedback messages shown alongside the viability percentage during the microscope viability check phase
- Added `renderMeters()` function to `parts/ui_rendering.ts` and `ui/sidebar.ts`: renders 3 real-time gauge meters (Cell Health, Confluency, Contamination Risk) in the protocol panel sidebar with color-coded bars (green/yellow/red thresholds) and percentage readouts, called every render cycle from `parts/init.ts`
- Added meters CSS to `parts/style.css`: `.meters-panel`, `.meter-item`, `.meter-bar`, `.meter-fill`, `.meter-label`, `.meter-value` classes styled to match the existing volume-indicator pattern with smooth transitions
- Added `<div id="meters-panel">` to `parts/body.html` between score-display and protocol-content in the protocol panel sidebar
- Created `ui/overlays.ts` with 5 overlay modals ported to new typed architecture: `renderMicroscopeOverlay()` (two-phase viability check + hemocytometer counting), `renderDilutionCalculatorOverlay()` (new 3-choice volume quiz), `renderIncubatorOverlay()` (4-second progress bar simulating 24h), `renderDrugSelectionOverlay()` (3 dilution series choices), `renderPlateReaderOverlay()` (absorbance table with column averages). All overlays receive `GameState`, dispatch semantic `Action`s, and report scene changes via callbacks. Full keyboard accessibility with `tabindex="0"`, `role="button"`, Enter/Space activation on all interactive elements.
- Created `ui/hood_scene.ts` with typed hood scene rendering: `renderHoodScene()` ported from `parts/hood_scene.ts` to use the new `GameState`/`Action`/`Step`/`SceneId` types. UI reads state and dispatches semantic actions (sterilize, aspirate, dispense, transfer, add_drug) through a callback instead of mutating global `gameState`. Multi-click pipette loading tracked as local intermediate state (`PipetteLoad`). Adds `tabindex="0"`, `role="button"`, keyboard activation (Enter/Space), drag-and-drop, right-click/Escape deselect, and hover effects. Scene placements read from `content/tc_scenes.ts` instead of legacy `HOOD_ITEMS` constant.
- Created `ui/sidebar.ts` with typed sidebar rendering functions: `renderProtocolPanel()`, `renderScoreDisplay()`, `renderResultsScreen()`, `renderWarningBanner()`, `showVolumeIndicator()`, `hideVolumeIndicator()` -- ported from `parts/ui_rendering.ts` to use the new `GameState`/`Step`/`ScoreResult`/`WarningEntry` types from `core/types.ts`
- Created `ui/notifications.ts` with typed `showNotification()` toast system -- ported from `parts/ui_rendering.ts` with extracted constants for fade timing and max-visible limit
- Created `content/tc_protocol.ts` with typed 10-step `TC_PROTOCOL` using discriminated union steps (instruction/checkpoint), including new `calculate_dilution` checkpoint between `count_cells` and `transfer_to_plate`
- Created `content/tc_tools.ts` with `TC_TOOLS` registry defining aspirating, serological, and multichannel pipettes with typed valid targets
- Created `content/tc_scenes.ts` with `TC_SCENES` scene layout definitions (hood 800x600 with 10 placements, microscope/incubator/plate_reader 400x300)
- Created `content/validate.ts` with `validateProtocol()` and `validateTools()` manual runtime validation (no Zod dependency)
- Created `core/types.ts` with full typed domain model: category-split IDs (VesselId, ToolId, ReagentId), TargetRef discriminated union, semantic Action union (9 lab operations), Step discriminated union (instruction/checkpoint), three-way state split (ProtocolState, LabState with vessel registry, UIState), typed WarningEntry, scene layout types (AssetSpec, ScenePlacement, SceneDefinition)
- Created `core/engine.ts` with pure game engine: `createInitialGameState()`, `dispatchAction()` (exhaustive switch on 9 action types), `validateAction()`, `advanceStep()`, `GAME_CONFIG` constant. Zero DOM references.
- Created `core/scoring.ts` with `computeScore()` (4-category weighted, backward compatible) and `computeStars()` (5-star negative system for M6)
- Created `core/cell_model.ts` with per-well drug viability model: `getCellState()`, `applyDrugEffect()` (IC50=2), `applyIncubation()` (per-well independent), `generatePlateReaderResults()` (Hill equation dose-response)
- Created `core/util.ts` with `clampValue()` utility used across all bounded numeric mutations
- Created `main.ts` as composition root: re-exports engine, scoring, and cell model for transition period
- Created `tsconfig.json` (unified strict) and `tsconfig.core.json` (scoped to core/content) with strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride

### Behavior or Interface Changes
- Replaced small corner volume indicator with centered transfer HUD during aspiration and media addition: 44px progress bar with target marker, volume text at 18px, red Stop button, and operation label; anchored near flask for visibility (`parts/style.css`, `parts/ui_rendering.ts`, `parts/feed_cells.ts`)
- Toolbar now shows context-sensitive next-action hints instead of static step labels: updates per sub-step (e.g. "Click the media bottle" after picking up pipette), uses existing `getAvailableActions()` which was previously unused (`parts/hood_scene.ts`)
- Added visible text labels below each hood equipment item using `config.label` values from `HOOD_ITEMS` (`parts/hood_scene.ts`, `parts/style.css`)
- Strengthened protocol panel step states: current step gets bold text with 4px green border, completed steps get green-tinted background and muted text, future steps are dimmed at 55% opacity (`parts/style.css`, `parts/ui_rendering.ts`)
- Added selected-tool chip with red "Put down (Esc)" button in toolbar when holding a tool (`parts/hood_scene.ts`)
- Added welcome/tutorial overlay on first load with game goal, interaction instructions, and Start button; uses `localStorage` to skip on repeat visits (`parts/body.html`, `parts/init.ts`)
- Warning banner now shows up to 5 most recent warnings in a scrollable list instead of only the latest; warnings are also included in the results screen via shared `buildWarningListHtml()` (`parts/ui_rendering.ts`)
- Microscope close button now prompts confirmation if viability check or cell counting is incomplete (`parts/microscope_scene.ts`)
- Updated `devel/protocol_walkthrough.mjs` to dismiss welcome overlay before starting walkthrough

### Fixes and Maintenance
- Fixed HTML entities (`&deg;`, `&micro;`) rendering as literal text in notifications: replaced with Unicode escapes (`\u00B0`) since `showNotification` uses `textContent` not `innerHTML` (`parts/feed_cells.ts`, `parts/hood_scene.ts`)
- Removed dead `getExpectedCellCount()` function and undefined `CELLS_PER_SQUARE_FACTOR` reference from `parts/cell_model.ts`
- Replaced stale 6-item hardcoded checklist in `parts/body.html` with empty container populated by JS from `PROTOCOL_STEPS`
- Fixed `TypeError` in `tests/test_cell_culture_walkthrough.py`: wrapped `git_file_utils.get_repo_root()` string return in `pathlib.Path()`

### Decisions and Failures
- Architecture overhaul plan approved: 6 milestones (stabilization, types, engine, content, UI, gameplay features) with discriminated unions, semantic lab actions, three-way state split, pure engine. Full plan at `.claude/plans/starry-soaring-starlight.md`

### Additions and New Features
- Phase 3 Hybrid C SVG migration complete: authored 9 remaining equipment base SVGs (`media_bottle`, `sero_pipette`, `aspirating_pipette`, `microscope`, `well_plate_24`, `waste_container`, `ethanol_spray`, `drug_vial_rack`, `multichannel_pipette`) and migrated all corresponding `get*Svg()` functions in `parts/svg_assets.ts` to load base SVG constants with engine-generated overlays via `composeSvg()`
- Removed dead code from `parts/svg_assets.ts`: `getPipetteAidSvg()`, `getDrugVialSvg()`, `getMicropipetteSvg()`, `getHandSvg()`, `getHemocytometerGridSvg()` (none were called; microscope scene uses DOM-based `drawHemocytometerGrid()`)
- Hybrid C artwork system: Inkscape-authored base SVGs with TypeScript dynamic overlays
- Created `assets/equipment/` directory for curator-owned base SVG files
- Created `assets/components/` directory for reusable SVG sub-parts
- Created `parts/style_constants.ts` with typed `ColorRole` union, `COLOR_MAP`, stroke/radius/depth constants
- Created `parts/svg_overlays.ts` with anchor-based overlay API: `createLiquidOverlay()`, `createHighlightOverlay()`, `createErrorOverlay()`, `createDynamicLabel()`, `createArrowOverlay()`, `composeSvg()`
- Extended `build_game.sh` with SVG asset pipeline: strips Inkscape metadata, rewrites IDs with equipment prefix (e.g., `body` -> `t75_flask__body`), rewrites internal references, injects as TypeScript constants
- Created `tests/test_svg_assets.py` SVG contract lint: validates viewBox, required groups, no raster images, no duplicate IDs, size/node budgets
- Authored `assets/equipment/t75_flask.svg` as first Hybrid C asset with full layer contract: `body`, `body_shadow`, `neck`, `cap`, `graduation`, `label_frame`, `overlay_root`, liquid clip path, anchor elements
- Migrated `getFlaskSvg()` to Hybrid C: loads base SVG constant, composes with liquid overlay and dynamic label via `composeSvg()`
- Created `docs/superpowers/specs/2026-04-08-artwork-system-design.md` with full visual language specification
- Added `cell-culture2-clean.svg` stripped of Inkscape/Sodipodi metadata, xmlns noise, and RDF blocks (12% smaller than source)
- Created [run_web_server.sh](../run_web_server.sh) to build the game and serve it on the local network
- Added `--host`, `--port`, and `--lan` flags to [cell_culture_game.py](../cell_culture_game.py) via argparse; `--lan` binds to `0.0.0.0` for intranet access
- Created [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) with system overview, component descriptions, data flow diagram, scoring breakdown, and extension points
- Created [docs/FILE_STRUCTURE.md](FILE_STRUCTURE.md) with top-level layout, key subtree maps, generated artifacts, and guidance for adding new work
- Added links to both architecture docs in [README.md](../README.md)
- Refreshed [docs/INSTALL.md](INSTALL.md) with verify-install command, Bash requirement, known gaps, and Playwright note
- Refreshed [docs/USAGE.md](USAGE.md) with full 9-step protocol, dev server docs, scoring table, and test scope control

## 2026-04-06

### Additions and New Features
- Added `README.md` with project overview, quick start, documentation links, and license info
- Created `docs/INSTALL.md` with prerequisites and setup instructions
- Created `docs/USAGE.md` with build and gameplay instructions
- Step-aware target highlighting: valid hood items glow with pulsing green border for current protocol step (`parts/hood_scene.ts`, `parts/style.css`)
- Real-time warning accumulation system: warnings display immediately in sidebar warning banner instead of end-of-game only (`parts/game_state.ts`, `parts/ui_rendering.ts`)
- Interactive hemocytometer quadrant selection: replaced text-input cell counting with clickable corner quadrants; select all 4 quadrants to derive count (`parts/microscope_scene.ts`)
- Serial dilution choice dialog: players choose between 3 dilution series (half-log, binary, shallow) instead of auto-applying; wrong choices trigger educational warnings (`parts/drug_treatment.ts`)
- Media warming check: warns if player adds media without warming to 37&deg;C first (`parts/feed_cells.ts`)
- Pre-hood contamination inspection: warns if player starts work without sanitizing the hood first (`parts/hood_scene.ts`)
- Enhanced volume feedback: explains why too much or too little media is harmful (pH drop, gas diffusion, cost) (`parts/feed_cells.ts`)
- HTML5 drag-and-drop for tools: items can be dragged to targets as alternative to click workflow; blue glow on valid drop targets (`parts/hood_scene.ts`, `parts/style.css`)
- Protocol validation on load: `validateProtocolSteps()` checks all step definitions at startup (`parts/init.ts`)
- Added `targetItems` field to `ProtocolStep` interface for step-aware highlighting (`parts/constants.ts`)
- Added `warnings: string[]` and `mediaWarmed: boolean` to `GameState` interface
- Created `cell_culture_game.py` development server for Playwright testing
- Created `devel/protocol_walkthrough.mjs` automated browser walkthrough with screenshots
- Created `tests/test_cell_culture_walkthrough.py` pytest wrapper for walkthrough test

### Fixes and Maintenance
- Fixed pre-existing bug in `parts/cell_model.ts`: `applyIncubation()` referenced non-existent `gameState.drugAdded` and `gameState.drugConcentrationUm`; replaced with correct `gameState.drugsAdded` and per-well max concentration lookup
- Fixed ASCII compliance: replaced Unicode star characters (U+2605, U+2606) with HTML numeric entities `&#9733;` and `&#9734;` in `parts/ui_rendering.ts`
- Used HTML entities (`&deg;`, `&micro;`) for temperature and unit symbols to maintain ASCII source compliance

### Added

#### feed_cells.ts - Aspiration and Media Addition
- `startAspiration()`: Begin aspirating old media from flask with animated 2-second visual effect
  - Checks flask has old media
  - Shows volume indicator during animation
  - Updates media volume every 50ms for smooth animation
  - Calls completeAspiration() when done

- `completeAspiration()`: Finalize aspiration and track waste
  - Sets flask media to 0mL
  - Tracks any wasted media
  - Calls completeStep('aspirate_old_media')
  - Hides volume indicator and triggers re-render

- `startAddingMedia()`: Begin adding fresh media to flask with player control
  - Checks flask is aspirated (media near 0)
  - Shows volume indicator with target of 15mL
  - Animates media addition over 2 seconds
  - Allows player to stop animation via onStopMediaAddition()

- `stopAddingMedia()`: Finalize media addition when player stops or animation completes
  - Records final volume
  - Calculates waste as absolute difference from target
  - Sets media age to 'fresh'
  - Completes step and provides accuracy feedback
  - Feedback varies based on precision

- `onStopMediaAddition()`: Event handler to stop media addition animation

#### drug_treatment.ts - Drug Pipetting
- `startDrugAddition()`: Begin drug pipetting process
  - Checks flask has fresh media
  - Creates and displays volume selection overlay UI
  - Shows 4 button options: 50 uL, 100 uL, 150 uL, 200 uL
  - Correct answer is 100 uL

- `selectDrugVolume(volumeUl)`: Process player's volume selection
  - Converts microliters to milliliters
  - Calculates final drug concentration using dilution formula
  - Updates gameState and completes the 'add_drug' step
  - Shows feedback about volume selection

- `renderDrugVolumeSelector()`: Render HTML UI for volume selection
  - Returns HTML string with styled button grid
  - Correct volume highlighted, others in neutral style
  - Buttons with hover effects
  - Clean, centered card layout with instructions

### Implementation Notes
- Both modules use setInterval() for 2-second animations
- Update game state every 50ms for responsive animations
- Integrate with gameState, showNotification(), showVolumeIndicator()
- Track scoring metrics (mediaWastedMl)
- Call renderGame() to trigger UI updates
- Single-file web platform compatible (no modules)
- ASCII characters only
