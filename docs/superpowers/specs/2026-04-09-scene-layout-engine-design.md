# Scene layout engine design

Zone-based auto-layout engine for interactive lab scene positioning and label rendering.

## Problem

The hood scene uses hand-tuned percentage coordinates for 12 items. Labels overlap (especially the three pipettes in the front row), there is no visual hierarchy emphasizing the T-75 flask, and every position change requires manual coordinate tweaking. The same layout problems will recur for future scenes (SDS-PAGE bench, PCR bench, microscopy station).

## Solution

A shared layout engine that:

- accepts semantic item declarations (zone, priority, label)
- distributes items within defined zones automatically
- computes label positions with collision resolution
- outputs render-ready coordinates consumed by a dumb renderer

## Type definitions

All types live in `parts/scene_types.ts`.

### SceneItem

What an item IS. No coordinates.

```typescript
type SceneItem = {
  id: string;
  asset: string;              // SVG asset key
  kind: 'flask' | 'plate' | 'bottle' | 'pipette' | 'rack' | 'waste' | 'equipment';
  zone: string;               // scene-specific zone name
  priority: number;           // 1 = most important
  widthScale: number;         // multiplier on asset default width (1.0 = normal)
  label: string;              // full semantic name (used for tooltips)
  shortLabel?: string;        // fallback if full label collides
  anchorY: 'bottom' | 'tip' | 'center';
  baselineOverride?: number;  // rare override for items not on zone baseline
};
```

### AssetSpec

How an asset looks. Derived from normalized SVGs.

```typescript
type AssetSpec = {
  defaultWidth: number;       // baseline width in scene %
  aspectRatio: number;        // height/width from viewBox
  labelWidth: number;         // estimated label width in % at base scale
  anchorYOffset?: number;     // tip adjustment in % points
};
```

### ZoneDef

How a scene organizes horizontal space.

```typescript
type ZoneDef = {
  x0: number;                 // left bound (%)
  x1: number;                 // right bound (%)
  baseline: number;           // Y reference line (%)
  gap: number;                // minimum gap between items (%)
  align?: 'center' | 'left' | 'right';  // default: 'center'
};
```

### SceneLayoutRules

Per-scene configuration.

```typescript
type SceneLayoutRules = {
  zones: Record<string, ZoneDef>;
  labelFontSize: number;      // px
  labelLineHeight: number;    // unitless
  labelOffsetY: number;       // % below item bottom
};
```

### ComputedItemLayout

What the renderer consumes. No layout logic needed.

```typescript
type ComputedItemLayout = {
  id: string;
  x: number;                  // left (%)
  y: number;                  // top (%)
  width: number;              // (%)
  height: number;             // (%)
  tooltip: string;            // full label for title attribute
  labelLines: string[];       // rendered text lines
  labelX: number;             // label center (%)
  labelY: number;             // label top (%)
  labelWidth: number;         // computed label width (%)
  labelMultiline: boolean;
};
```

## Layout algorithm

`computeSceneLayout()` in `parts/layout_engine.ts`.

### Step 1: group and sort

- Group items by zone
- Sort each group by (priority, id) for deterministic ordering

### Step 2: horizontal distribution

For each zone, look up `const zone = rules.zones[item.zone]`:

1. Compute rendered width for each item: `width = assetSpec.defaultWidth * item.widthScale`
2. Sum total item width
3. Handle single-item zones: if `n === 1`, place item based on `zone.align` (center/left/right within `[x0, x1]`) and skip gap logic
4. Compute effective gap for multi-item zones:
   - If items fit: `gap = max(zone.gap, (zoneWidth - totalItemWidth) / (n - 1))`
   - If items overflow: first shrink gaps to `zone.gap`, then scale all widths proportionally: `scaleFactor = (zoneWidth - totalGapWidth) / totalItemWidth`
5. Compute starting X from `zone.align` (default `'center'`):
   - `'center'`: center cluster in `[x0, x1]`
   - `'left'`: start at `x0`
   - `'right'`: end at `x1`
6. Assign X positions left-to-right

### Step 3: vertical positioning

For each item:

1. `const zone = rules.zones[item.zone]`
2. `baseline = item.baselineOverride ?? zone.baseline`
3. `height = width * aspectRatio * (viewportW / viewportH)` (converts width% to height% accounting for viewport aspect ratio)
4. `anchorOffset = assetSpec.anchorYOffset ?? 0`
5. Compute Y from baseline + anchorY:
   - `'bottom'`: `top = baseline - height`
   - `'tip'`: `top = baseline - height + anchorOffset`
   - `'center'`: `top = baseline - height / 2`

### Step 4: label layout

Separate pass, using item bounds from steps 2-3:

```typescript
const AVG_CHAR_WIDTH_PCT = 0.55;  // % per character at 9px font; tune as needed
```

1. Estimate label width: `max(charCount * AVG_CHAR_WIDTH_PCT, assetSpec.labelWidth * item.widthScale)` -- label width scales with item size
2. Try full label first
3. If wider than available space (`availableWidth = item.width`), split at nearest-middle space into 2 lines
4. If no space character or still too wide, use `shortLabel`
5. `labelX = item center`, clamped to `[zone.x0, zone.x1]`
6. `labelY = zone.baseline + labelOffsetY` (fixed per zone, applied uniformly to all zones since labelOffsetY is a relative offset from each zone's own baseline)

### Step 5: collision resolution

Horizontal only, within each zone. Single pass, no iteration.

1. For adjacent label pairs (sorted by X), check horizontal overlap (1-2% tolerance for text shadows)
2. Nudge apart symmetrically
3. Max nudge = `zone.gap`, clamped to zone bounds
4. No iterative drift: one pass only, accept result

## Hood scene configuration

Lives in `parts/hood_config.ts`.

### Zones

```
primary:   x[4-20],   baseline 50   -- flask dominates
secondary: x[22-62],  baseline 50   -- plate, media, trypsin
tools:     x[7-36],   baseline 68   -- ethanol + pipettes
dirty:     x[38-64],  baseline 68   -- drug dilutions, waste
outside:   x[78-92],  baseline 68   -- microscope, incubator
```

### Items

| id | zone | priority | widthScale | shortLabel |
| --- | --- | --- | --- | --- |
| flask | primary | 1 | 1.2 | -- |
| well_plate | secondary | 2 | 1.0 | -- |
| media_bottle | secondary | 3 | 1.0 | -- |
| trypsin_bottle | secondary | 4 | 1.0 | -- |
| ethanol_bottle | tools | 5 | 1.0 | -- |
| serological_pipette | tools | 6 | 1.0 | Sero Pipette |
| aspirating_pipette | tools | 7 | 1.0 | Aspirating |
| multichannel_pipette | tools | 8 | 1.0 | Multi Pipette |
| drug_vials | dirty | 9 | 1.0 | -- |
| waste_container | dirty | 10 | 1.0 | -- |
| microscope | outside | 11 | 1.0 | -- |
| incubator | outside | 12 | 1.0 | -- |

### Layout rules

- `labelFontSize`: 9px
- `labelLineHeight`: 1.1
- `labelOffsetY`: 2%

## Asset specs

Lives in `parts/asset_specs.ts`. Values derived from normalized SVG viewBoxes.

Each entry has: `defaultWidth` (%), `aspectRatio` (height/width), `labelWidth` (%), optional `anchorYOffset` (%).

Aspect ratios will be extracted from the actual SVG files during implementation.

## Renderer changes

`parts/hood_scene.ts` becomes a dumb renderer:

### DOM structure

```html
<div id="hood-scene">
  <div id="hood-bg"><!-- background SVG --></div>
  <div id="hood-items-layer">
    <div class="hood-item" data-item-id="flask"
         style="left:6%;top:28%;width:14%;height:22%;"
         role="button" tabindex="0" aria-label="T-75 Flask"
         data-x="6" data-y="28">
      <!-- SVG content -->
    </div>
    <!-- ... more items ... -->
  </div>
  <div id="hood-labels-layer">
    <div class="hood-item-label multiline"
         style="left:13%;top:52%;width:12%;">
      T-75<br>Flask
    </div>
    <!-- ... more labels ... -->
  </div>
</div>
```

### Layer styling

```css
#hood-items-layer  { position: absolute; inset: 0; z-index: 1; }
#hood-labels-layer { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
```

### Rendering approach

- Single pass builds `itemsHtml` and `labelsHtml` simultaneously
- Only coordinates are inline styles; everything else via CSS classes
- Labels use computed `labelWidth` as CSS `width`
- `pointer-events: none` on label layer (clicks pass through to items)
- SVGs fill containers: `.hood-item svg { width:100%; height:100%; display:block }`
- Debug attributes: `data-x`, `data-y` on items

### Accessibility

- `role="button"`, `tabindex="0"` on items
- `aria-label` with full label text
- `aria-pressed` for selected state

## File structure

### New files

| File | Purpose |
| --- | --- |
| `parts/scene_types.ts` | Type definitions |
| `parts/asset_specs.ts` | Per-asset metrics table |
| `parts/layout_engine.ts` | `computeSceneLayout()` + label layout |
| `parts/hood_config.ts` | Hood items, zones, layout rules |

### Modified files

| File | Changes |
| --- | --- |
| `parts/hood_scene.ts` | Consume `ComputedItemLayout[]`, remove inline layout math |
| `parts/constants.ts` | Remove `HOOD_ITEMS`, `HoodItemConfig`, `TIP_OFFSET`, row constants |
| `parts/style.css` | Updated label CSS, layer CSS, SVG scaling |

### Deleted files

| File | Reason |
| --- | --- |
| `content/tc_scenes.ts` | Dead code, superseded by new layout system |
| `ui/hood_scene.ts` | Dead code, superseded by new layout system |

## Units convention

- Layout (positions, widths, heights, gaps): percentage (%)
- Typography (font size, line height): pixels (px) or unitless

## Verification

1. Write a Playwright script (`devel/test_hood_layout.mjs`) that:
   - Opens the game, navigates to hood view
   - Screenshots to `test-results/hood_layout.png`
   - Measures bounding boxes of all `.hood-item-label` elements
   - Confirms no two labels overlap (with small tolerance)
   - Confirms flask is the visually largest item
2. Run existing tests to ensure no regressions
3. Visual inspection of screenshot

## Design constraints

- All layout units in `%` so scenes scale with viewport
- No class hierarchies; plain objects and pure functions
- Scene-specific rules passed into shared engine
- Label layout is a separate pass from item layout
- Renderer does zero layout math
- Layout is computed once per render; DOM measurements are not used (no reflow dependency)
- The outside zone shares a single baseline; vertical separation is not used unless semantically justified
