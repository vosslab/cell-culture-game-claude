# Changelog

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
