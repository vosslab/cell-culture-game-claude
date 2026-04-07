# Changelog

## [Unreleased]

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
