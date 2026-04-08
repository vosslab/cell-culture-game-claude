# Code architecture

## Overview

An interactive browser-based educational simulation that teaches cell culture
laboratory techniques. The game compiles from TypeScript modules into a single
self-contained HTML file with no external runtime dependencies. A Python
development server and Playwright-based test suite support local development.

## Major components

### TypeScript game modules (`parts/`)

The game logic lives in 12 TypeScript files compiled and concatenated into one
JavaScript bundle. All declarations are global (no ES module wrapping).

- [parts/constants.ts](../parts/constants.ts) - Protocol step definitions,
  plate layout, scoring weights, and the `ProtocolStep` interface
- [parts/game_state.ts](../parts/game_state.ts) - `GameState` interface and
  well plate initialization
- [parts/cell_model.ts](../parts/cell_model.ts) - Cell population model with
  IC50-style drug response curve
- [parts/svg_assets.ts](../parts/svg_assets.ts) - SVG rendering for all visual
  elements (largest module)
- [parts/hood_scene.ts](../parts/hood_scene.ts) - Sterile hood interaction
  scene with drag-and-drop tool handling
- [parts/microscope_scene.ts](../parts/microscope_scene.ts) - Cell counting
  via hemocytometer quadrant selection
- [parts/incubator_scene.ts](../parts/incubator_scene.ts) - Incubation
  placement scene
- [parts/feed_cells.ts](../parts/feed_cells.ts) - Media aspiration and
  addition logic with volume validation
- [parts/drug_treatment.ts](../parts/drug_treatment.ts) - Serial dilution
  series selection (half-log, binary, shallow)
- [parts/ui_rendering.ts](../parts/ui_rendering.ts) - Sidebar HUD, warning
  banner, and score display
- [parts/scoring.ts](../parts/scoring.ts) - Final score calculation across
  four categories (order, cleanliness, waste, timing)
- [parts/init.ts](../parts/init.ts) - Bootstrap, protocol validation, and
  render dispatcher

### Build pipeline (`build_game.sh`)

[build_game.sh](../build_game.sh) concatenates TypeScript files in dependency
order, compiles to JavaScript via esbuild (ES2020 target, type-stripping only),
and assembles the final HTML from [parts/head.html](../parts/head.html),
[parts/style.css](../parts/style.css), [parts/body.html](../parts/body.html),
and [parts/tail.html](../parts/tail.html).

### Development server (`cell_culture_game.py`)

[cell_culture_game.py](../cell_culture_game.py) serves the built HTML on
`127.0.0.1:5080` with auto-rebuild when the output is missing or stale.
Used for local testing and Playwright automation.

### Test suite (`tests/`)

pytest-based tests covering code quality (pyflakes, bandit, ASCII compliance,
import policy, indentation) and an end-to-end Playwright walkthrough that
exercises the full 9-step protocol.

## Data flow

```text
User input (click / drag-drop)
  |
  v
Event handlers in scene modules
  |
  v
updateGameState() mutations on GameState
  |
  v
Validation (volume, sequence, cleanliness)
  |
  v
warnings[] accumulation (real-time sidebar display)
  |
  v
renderGame() dispatcher (init.ts)
  |
  v
Scene-specific renderers (hood, microscope, incubator, plate reader)
  |
  v
SVG/HTML output to DOM
  |
  v
completeStep() advances protocol
  |
  v
Results scene: calculateScore() -> 3-star rating
```

## Game protocol

The 9-step guided workflow mirrors a real cell culture experiment:

1. Spray/sanitize hood
2. Aspirate old media
3. Add fresh media
4. Microscope viability check
5. Count cells (hemocytometer quadrants)
6. Transfer cells to plate
7. Add drug dilutions
8. Incubate
9. Read plate results

## Scoring

Four weighted categories in [parts/scoring.ts](../parts/scoring.ts):

| Category | Max points | Tracks |
| --- | --- | --- |
| Order | 30 | Steps completed in correct sequence |
| Cleanliness | 25 | Contamination and sterile technique errors |
| Waste | 20 | Excess media usage |
| Timing | 25 | Speed to completion |

Final score maps to a 1-3 star rating.

## Testing and verification

```bash
source source_me.sh && python3 -m pytest tests/
```

- **Linting:** pyflakes, bandit security scan, ASCII compliance
- **Style:** indentation (tabs), whitespace, shebang consistency
- **Imports:** no `import *`, no relative imports, all third-party in
  requirements files
- **E2E:** Playwright walkthrough exercises all 9 protocol steps with
  screenshot capture

Test scope is controllable via environment variables (`FAST_REPO_HYGIENE=1`,
`REPO_HYGIENE_SCOPE=changed`, `SKIP_REPO_HYGIENE=1`).

## Extension points

- **New protocol steps:** Add entries to `PROTOCOL_STEPS` in
  [parts/constants.ts](../parts/constants.ts) and implement the corresponding
  scene renderer
- **New scenes:** Create a new `*_scene.ts` file in `parts/`, add it to the
  build order in [build_game.sh](../build_game.sh), and register it in the
  render dispatcher in [parts/init.ts](../parts/init.ts)
- **Drug models:** Modify the IC50 curve parameters in
  [parts/cell_model.ts](../parts/cell_model.ts)
- **Scoring adjustments:** Change weights and thresholds in
  [parts/scoring.ts](../parts/scoring.ts)

## Known gaps

- No automated TypeScript linting or type checking beyond esbuild compilation
- E2E test depends on Playwright and Chromium installation; may not run in all
  CI environments
