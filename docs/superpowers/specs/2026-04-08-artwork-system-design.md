# Artwork system design: Hybrid C visual language

## Context

The cell culture game currently renders all visuals as inline procedural SVGs
in `parts/svg_assets.ts` (735 lines, 16 functions). These are functional but
flat, visually basic, and tightly coupled to the TypeScript rendering code.
The artwork curator role is not decoration -- it is defining the visual language
of the simulator so students recognize function, understand state, and recall
protocol steps.

This spec covers upgrading the 16 existing cell culture equipment items to a
Hybrid C architecture: Inkscape-authored base SVGs with TypeScript-generated
dynamic overlays. Western blot equipment is out of scope for this milestone.

## Architecture: Hybrid C

### Separation of concerns

| Owner | Responsible for | Examples |
| --- | --- | --- |
| Curator (SVG files) | Shape, proportions, visual clarity, static labels | Equipment body, lid, cap, graduation marks |
| Engine (TypeScript) | State, interaction, animation, variability | Liquid level, highlights, error/correct indicators, arrows |

### File structure

```
assets/
  equipment/           # base SVG files (curator-owned)
    hood_cabinet.svg
    t75_flask.svg
    media_bottle.svg
    sero_pipette.svg
    aspirating_pipette.svg
    pipette_aid.svg
    micropipette.svg
    multichannel_pipette.svg
    ethanol_spray.svg
    waste_container.svg
    drug_vial_rack.svg
    microscope.svg
    well_plate_24.svg
    hemocytometer.svg
    incubator.svg
    plate_reader.svg
  components/           # reusable sub-parts
    well_single.svg
    pipette_tip.svg
    screw_cap.svg
    graduation_marks.svg
    rubber_bulb.svg
    cell_cluster.svg
    cell_single_alive.svg
    cell_single_dead.svg
```

### Build pipeline

The `build_game.sh` script already injects `cell-culture2.svg` as a constant.
Extend this pattern: read each `assets/equipment/*.svg`, strip XML declaration,
and inject as TypeScript string constants. The engine composites base SVG +
dynamic overlays at runtime.

## SVG layer contract

Every base SVG must follow this group structure. Not all groups are required
for every asset -- only include groups that the object actually has.

```xml
<svg id="equipment_name" viewBox="0 0 W H" xmlns="http://www.w3.org/2000/svg">
  <!-- STATIC BASE (curator-owned) -->
  <g id="body">...</g>           <!-- main container shape -->
  <g id="lid">...</g>            <!-- removable lid if any -->
  <g id="neck">...</g>           <!-- narrow section -->
  <g id="cap">...</g>            <!-- screw cap -->
  <g id="label_static">...</g>   <!-- baked-in product name -->
  <g id="graduation">...</g>     <!-- measurement marks -->
  <g id="controls">...</g>       <!-- buttons, knobs -->

  <!-- DYNAMIC OVERLAYS (engine-owned, injected by TS at runtime) -->
  <!-- These groups are NOT in the SVG file. The engine creates them. -->
</svg>
```

Dynamic overlay groups created by the engine:

| Group ID | Purpose | Parameterized by |
| --- | --- | --- |
| `liquid` | Fill level and color | level (0-1), color name |
| `highlight` | Glow on valid target | item ID, active step |
| `error_state` | Red indicator for mistakes | item ID, message |
| `correct_state` | Green indicator for correct action | item ID |
| `label_dynamic` | Volume readout, changing text | value, unit |
| `arrow` | Directional indicator | from position, to position |

## Color system

Colors have strict semantic meaning. Never reuse a color for a different meaning.

| Role | Hex | Usage |
| --- | --- | --- |
| Buffer/liquid | `#4a90d9` | Any water-based solution in containers |
| Gel/membrane | `#e8d4a0` | Agarose, PVDF, nitrocellulose |
| Plastic/housing | `#b0b0b0` | Equipment bodies, racks, holders |
| Metal | `#888888` | Electrodes, clamps, stage |
| Media (DMEM) | `#ff9a66` | Cell culture media specifically |
| Signal/bands | `#222222` | Protein bands, markers |
| Error state | `#d94444` | Contamination, wrong tool, overfill |
| Correct state | `#44aa66` | Valid action, completed step |
| Glass | `#f0f0f0` | Pipettes, flasks, vials |
| Drug/treatment | `#c8a0d8` | Drug solutions, treatment wells |
| Ethanol/sterile | `#e0e8f0` | 70% ethanol, sterile solutions |
| Waste | `#d4d4a0` | Discarded liquid |

## Stroke and shape rules

| Property | Value | Notes |
| --- | --- | --- |
| Outline stroke | 1.5px `#333` | Equipment outer edges |
| Detail stroke | 0.8px `#666` | Internal features, seams |
| Fine stroke | 0.4px `#999` | Graduation marks, subtle lines |
| Highlight stroke | 2.0px semantic color | Error/correct indicators |
| Corner radius (body) | rx=4 | Equipment main shapes |
| Corner radius (parts) | rx=2 | Buttons, sub-components |
| Corner radius (labels) | rx=1 | Text labels, tags |
| Perspective | 3/4 front, slight top-down | Consistent across all assets |
| Top face | Ellipse, ry = rx * 0.25 | For containers with openings |
| Depth offset | 2-4px right, 2-4px down | Fake depth on all equipment |

## Step-sequence design

For each protocol step, the overlay system must support these visual states:

| State | Visual treatment |
| --- | --- |
| Idle | Equipment at rest, no overlays |
| Target | Green dashed highlight border on valid items |
| Active | Animation in progress (liquid moving, level changing) |
| Complete | Subtle green check, state change persists |
| Error | Red flash, error indicator, warning message |

The 9 protocol steps and their equipment interactions:

1. `spray_hood` -- ethanol bottle target, spray particle overlay
2. `aspirate_old_media` -- aspirating pipette + flask targets, liquid level drops (yellow-orange)
3. `add_fresh_media` -- sero pipette + media bottle + flask targets, liquid level rises (pink-orange)
4. `microscope_check` -- microscope target, scene transitions to microscope view
5. `count_cells` -- hemocytometer overlay with cell sprites (alive=gray, dead=blue)
6. `transfer_to_plate` -- sero pipette + flask + well plate targets, wells fill pink
7. `add_drugs` -- multichannel pipette + drug vials + well plate targets, wells go purple (gradient by concentration)
8. `incubate` -- well plate target, transition to incubator scene with timer
9. `plate_read` -- transition to results scene with absorbance data

## Migration plan

### Phase 1: style system and build pipeline

- Create `assets/` directory structure
- Define color constants in a new `parts/style_constants.ts`
- Extend `build_game.sh` to inject SVG files as TS constants
- Create overlay utility functions in a new `parts/svg_overlays.ts`

### Phase 2: author base SVGs (priority order)

Priority based on screen time and teaching importance:

1. `t75_flask.svg` -- central to 3 protocol steps, needs liquid level overlay
2. `media_bottle.svg` -- used in media addition step
3. `sero_pipette.svg` -- used in 2 steps
4. `well_plate_24.svg` -- used in 3 steps, needs per-well color overlays
5. `aspirating_pipette.svg` -- used in aspiration step
6. `hood_cabinet.svg` -- background for most of the game
7. `microscope.svg` -- used in 2 steps
8. `waste_container.svg` -- fill level changes during play
9. `ethanol_spray.svg` -- first step of protocol
10. `drug_vial_rack.svg` -- used in drug addition
11. `micropipette.svg`
12. `multichannel_pipette.svg`
13. `pipette_aid.svg`
14. `hemocytometer.svg`
15. `incubator.svg`
16. `plate_reader.svg`

### Phase 3: integrate overlays

- Replace `svg_assets.ts` functions one at a time
- Each replacement: load base SVG constant + compose overlays
- Maintain backward compatibility during migration (old functions delegate to new system)
- Test each replacement against all protocol steps that use that equipment

### Phase 4: reusable components

- Extract shared parts (well, pipette tip, screw cap) as `components/`
- Wire up cell sprites (alive/dead) as reusable component for microscope scene

## Verification

- Visual: open `cell_culture_game.html` in browser, play through all 9 protocol steps
- Check each equipment item renders correctly at each step state
- Verify highlights appear on correct target items per step
- Verify liquid levels animate during aspiration and media addition
- Verify well plate colors change correctly during drug treatment
- Run `tests/test_pyflakes_code_lint.py` for any changed TypeScript build tooling
- Run `tests/test_ascii_compliance.py` on new SVG files

## Bioicons reference

The following CC0-licensed Bioicons assets may be useful as visual reference
(not for direct embedding -- style is inconsistent with our system):

- `Lab_apparatus/Marcel_Tisch/T75_flask.svg` -- T75 flask proportions
- `Lab_apparatus/KeHan/incubator.svg` -- incubator shape reference
- `Lab_apparatus/KeHan/tecan-plate-reader.svg` -- plate reader shape
- `Lab_apparatus/James-Lloyd/Pipette.svg` -- pipette proportions
- `Cell_culture/Marcel_Tisch/CC_dish.svg` -- culture dish reference
- `Cell_culture/KeHan/6_well_plate.svg` -- well plate reference

These are in `OTHER_REPOS/bioicons/static/icons/cc-0/` and can inform
proportions and functional details, but all game assets should be drawn
in our consistent style system.
