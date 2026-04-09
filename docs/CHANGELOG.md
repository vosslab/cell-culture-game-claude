# Changelog

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
