# Layout Metrics

Visual layout invariants and scaling ratios for Milestone M3 (visual layout and professor character).

## Professor Coach Card

The angry professor character is rendered as a fixed-position overlay in the top-left corner of the screen (OQ-2 default).

- **Width bounds**: 96-120px on viewports >=1280px wide; 68-80px on narrower viewports
- **Position**: top-left, with 12px offset from edges
- **Clickability**: non-clickable (pointer-events: none)
- **Dialogue chip**: displays current step's `why` text
- **Mood indicator**: background and border colors reflect `gameState.professorMood`
  - neutral: #f5f5f5 background + #999 border
  - pleased: #e8f5e9 background + #4caf50 border (appears on step completion)
  - annoyed: #ffebee background + #f44336 border (appears on error/wrong tool)
  - Auto-fades back to neutral after 2 seconds

## Bench Equipment Scaling

Bench items are scaled to approximate real-world equipment sizes relative to each other.

| Equipment | widthScale | Rationale |
| --- | --- | --- |
| centrifuge | 0.95 | Largest bench item; base unit for scaling |
| water_bath | 0.90 | Slightly smaller than centrifuge |
| incubator | 0.88 | Compact enclosure, smaller footprint than bath |
| plate_reader | 0.86 | Similar size to incubator, slightly smaller |
| cell_counter | 0.85 | Medium-sized countertop instrument |
| microscope | 0.82 | Smaller optical instrument |
| vortex | 0.75 | Smallest bench item; compact mixer |

Scaling is tuned for visual coherence and tab-stop alignment across the mid_bench zone. The ratios preserve the relative ordering (centrifuge > water_bath > ... > vortex) while keeping all items clickable and labels legible.

## Bench Occupancy

Bench items collectively occupy the working row (mid_bench zone) to maintain visual activity and prevent excessive empty space.

- **Minimum occupancy**: 65% of bench width (from left edge of leftmost item to right edge of rightmost item)
- **Measurement**: `(maxX - minX) / benchWidth`, where benchWidth is 98% of [5, 95]% bounds
- **Test location**: `devel/test_layout_metrics.mjs` assertion 2

Empty space above the working row is intentional and used for protocol step display and user messaging.

## Item Overlap

Visible items must not overlap excessively. This prevents occluding labels or creating confusing visual stacking.

- **Maximum overlap**: 8% of the smaller item's bounding box area
- **Applies to**: all `.hood-item` and `.bench-item` visible elements
- **Exceptions**: depth-layering (front/mid/back) is allowed; the constraint measures pixel-level box overlap
- **Test location**: `devel/test_layout_metrics.mjs` assertion 3

If overflow occurs (item visually clips canvas), the layout engine re-centers the item row rather than hiding or clamping items. Visible overlap is the signal that content is oversized; silently repositioning is not acceptable.

## Empty Space Metric

The bench scene uses empty space intentionally, but excessive unused area indicates poor item sizing or missing content.

- **Maximum empty-space fraction**: 0.45 (45% of total bench-scene area unused)
- **Relaxation threshold**: +5% allowed for viewports <1280px wide
- **Calculation**: `1 - (totalItemArea / benchSceneArea)`
- **Measurement**: includes only `#bench-scene` bounds and rendered `.bench-item` elements
- **Test location**: `devel/test_layout_metrics.mjs` assertion 5

Back shelf decoration items (tip_box, glove_box, waste_tray) contribute to occupancy and help fill upper space.

## Pipette Height Constraint

Serological, aspirating, and multichannel pipettes must not exceed the height of large bench instruments (centrifuge, water bath, incubator, plate reader), since pipettes are hand-held tools, not fixed equipment.

- **Reference items**: centrifuge, water_bath, incubator, plate_reader
- **Maximum pipette height**: <=height of smallest reference item
- **Relaxation**: this constraint is advisory; pipettes can extend vertically during use animations
- **Test location**: `devel/test_layout_metrics.mjs` assertion 4

## Viewport Coverage

Layout metrics are enforced across three representative viewports:

- **1280x720**: common laptop/monitor, 16:9 aspect ratio
- **1440x900**: larger laptop, 16:10 aspect ratio
- **1920x1080**: desktop monitor, 16:9 aspect ratio (Full HD)

All assertions must pass on each viewport. Failure on one viewport blocks M3 closure.

## Back Shelf Decoration

The back_shelf zone (baseline 22, top of scene) is populated with three visual-only decoration items to reduce the "floating empty space" effect.

- **tip_box**: blue plastic tip rack, 9% default width, left-aligned
- **glove_box**: tan/beige hinged glove container, 10% default width, center-aligned
- **waste_tray**: gray stainless waste tray, 12% default width, right-aligned

These items are not protocol targets; they carry `visualOnly: true` in items.yaml and do not trigger any game state changes when clicked. They exist purely to fill visual space and set the bench's "laboratory environment" tone.

## Test Execution

Run the layout metrics test with:

```bash
node devel/test_layout_metrics.mjs
```

Or include it in the walkthrough suite:

```bash
bash walkthrough.sh
```

The test logs pass/fail status for each viewport and assertion. Final exit code 0 indicates all metrics pass; non-zero indicates regression.

## References

- [parts/bench_config.ts](../parts/bench_config.ts) - bench zone and item layout configuration
- [parts/asset_specs.ts](../parts/asset_specs.ts) - equipment widthScale and visual metrics
- [parts/professor_overlay.ts](../parts/professor_overlay.ts) - coach card rendering and mood
- [devel/test_layout_metrics.mjs](../devel/test_layout_metrics.mjs) - automated layout test
- Plan section 5 (Milestone M3) for visual layout requirements
