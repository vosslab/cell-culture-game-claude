# Scene Layout Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-tuned hood layout coordinates with a zone-based auto-layout engine that computes item positions and label placement, producing render-ready output consumed by a dumb renderer.

**Architecture:** Semantic item declarations (zone, priority, label) feed into `computeSceneLayout()` which distributes items within named zones, computes vertical anchoring, and resolves label collisions. The renderer only consumes `ComputedItemLayout[]` and does zero layout math. The engine is scene-agnostic and reusable for future lab scenes.

**Tech Stack:** TypeScript (single-file browser build via `cell_culture_game.html` script concatenation), CSS, Playwright for visual verification.

**Spec:** [docs/superpowers/specs/2026-04-09-scene-layout-engine-design.md](../specs/2026-04-09-scene-layout-engine-design.md)

---

## File structure

| File | Action | Purpose |
| --- | --- | --- |
| `parts/scene_types.ts` | Create | Type definitions: SceneItem, AssetSpec, ZoneDef, SceneLayoutRules, ComputedItemLayout |
| `parts/asset_specs.ts` | Create | Per-asset metrics table (aspect ratios from SVG viewBoxes) |
| `parts/layout_engine.ts` | Create | `computeSceneLayout()` + label layout + collision resolution |
| `parts/hood_config.ts` | Create | Hood-specific items, zones, and layout rules |
| `parts/hood_scene.ts` | Modify | Consume `ComputedItemLayout[]`, remove inline layout math, add layer structure |
| `parts/constants.ts` | Modify | Remove `HOOD_ITEMS`, `HoodItemConfig`, `TIP_OFFSET`, row constants |
| `parts/style.css` | Modify | Update label CSS, add layer CSS, SVG scaling |
| `content/tc_scenes.ts` | Delete | Dead code superseded by layout engine |
| `ui/hood_scene.ts` | Delete | Dead code superseded by layout engine |
| `cell_culture_game.html` | Modify | Add script tags for new TS files in correct order |
| `devel/test_hood_layout.mjs` | Create | Playwright visual verification script |
| `devel/test_layout_engine.mjs` | Create | Unit tests for layout engine (single item, overflow, anchors, labels) |
| `docs/CHANGELOG.md` | Modify | Record changes |

---

### Task 1: Create type definitions

**Files:**
- Create: `parts/scene_types.ts`

- [ ] **Step 1: Create `parts/scene_types.ts`**

```typescript
// ============================================
// scene_types.ts - Type definitions for the scene layout engine
// ============================================

// What an item IS (semantic, no coordinates)
type SceneItem = {
	id: string;
	asset: string;              // SVG asset key (e.g., 'flask')
	kind: 'flask' | 'plate' | 'bottle' | 'pipette' | 'rack' | 'waste' | 'equipment';
	zone: string;               // scene-specific zone name
	priority: number;           // 1 = most important, higher = less
	widthScale: number;         // multiplier on asset default width (1.0 = normal)
	label: string;              // full semantic name (used for tooltips)
	shortLabel?: string;        // fallback if full label collides
	anchorY: 'bottom' | 'tip' | 'center';
	baselineOverride?: number;  // rare: override zone baseline for this item
};

// How an asset looks (derived from normalized SVGs)
type AssetSpec = {
	defaultWidth: number;       // baseline width in scene %
	aspectRatio: number;        // height/width from SVG viewBox
	labelWidth: number;         // estimated label width in % at base scale
	anchorYOffset?: number;     // tip adjustment in % points
};

// How a scene organizes horizontal space
type ZoneDef = {
	x0: number;                 // left bound (%)
	x1: number;                 // right bound (%)
	baseline: number;           // Y reference line (%)
	gap: number;                // minimum gap between items (%)
	align?: 'center' | 'left' | 'right';  // default: 'center'
};

// Per-scene configuration
type SceneLayoutRules = {
	zones: Record<string, ZoneDef>;
	labelFontSize: number;      // px
	labelLineHeight: number;    // unitless
	labelOffsetY: number;       // % below item bottom
};

// What the renderer consumes (no layout logic needed)
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

- [ ] **Step 2: Add script tag to `cell_culture_game.html`**

Find the script tag block in `cell_culture_game.html` that includes `parts/constants.ts`. Add `parts/scene_types.ts` immediately before it (types must load first):

```html
<script src="parts/scene_types.ts"></script>
```

- [ ] **Step 3: Verify build**

Run: `source source_me.sh && python3 -m pytest tests/ -k "pyflakes or ascii" -x -q`

Expected: All tests pass (types are ambient, no runtime impact yet).

- [ ] **Step 4: Commit**

```
feat: add scene layout engine type definitions

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 2: Create asset specs

**Files:**
- Create: `parts/asset_specs.ts`

- [ ] **Step 1: Create `parts/asset_specs.ts`**

Aspect ratios computed from SVG viewBoxes. The `aspectRatio` is height/width. `defaultWidth` is the current width from `HOOD_ITEMS`. `labelWidth` is estimated from label character count * 0.55%.

```typescript
// ============================================
// asset_specs.ts - Per-asset visual metrics derived from normalized SVGs
// ============================================
// aspectRatio = viewBox height / viewBox width
// defaultWidth = baseline width in scene % (from current layout)
// labelWidth = estimated label rendering width in %
// anchorYOffset = tip adjustment for pipettes (% points)

const ASSET_SPECS: Record<string, AssetSpec> = {
	flask:                { defaultWidth: 12, aspectRatio: 1.627, labelWidth: 6,  },
	well_plate:           { defaultWidth: 18, aspectRatio: 0.650, labelWidth: 8,  },
	media_bottle:         { defaultWidth: 8,  aspectRatio: 2.046, labelWidth: 7,  },
	trypsin_bottle:       { defaultWidth: 7,  aspectRatio: 2.046, labelWidth: 8,  },
	ethanol_bottle:       { defaultWidth: 5,  aspectRatio: 2.920, labelWidth: 7,  },
	serological_pipette:  { defaultWidth: 3,  aspectRatio: 8.875, labelWidth: 8,  anchorYOffset: 0 },
	aspirating_pipette:   { defaultWidth: 3,  aspectRatio: 8.688, labelWidth: 8,  anchorYOffset: 0 },
	multichannel_pipette: { defaultWidth: 5,  aspectRatio: 4.854, labelWidth: 8,  anchorYOffset: 0 },
	drug_vials:           { defaultWidth: 14, aspectRatio: 0.492, labelWidth: 8,  },
	waste_container:      { defaultWidth: 7,  aspectRatio: 1.659, labelWidth: 5,  },
	microscope:           { defaultWidth: 8,  aspectRatio: 1.797, labelWidth: 7,  },
	incubator:            { defaultWidth: 10, aspectRatio: 1.269, labelWidth: 6,  },
};
```

- [ ] **Step 2: Add script tag to `cell_culture_game.html`**

Add after `scene_types.ts` and before `constants.ts`:

```html
<script src="parts/asset_specs.ts"></script>
```

- [ ] **Step 3: Verify build**

Run: `source source_me.sh && python3 -m pytest tests/ -k "pyflakes or ascii" -x -q`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```
feat: add asset specs with SVG-derived metrics

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 3: Create hood config

**Files:**
- Create: `parts/hood_config.ts`

- [ ] **Step 1: Create `parts/hood_config.ts`**

```typescript
// ============================================
// hood_config.ts - Hood scene item declarations and zone layout rules
// ============================================
// Semantic config only: what items exist, which zone they belong to,
// and how they should be prioritized. No pixel coordinates.

const HOOD_ZONES: Record<string, ZoneDef> = {
	// Flask dominates left side
	primary:   { x0: 4,  x1: 20, baseline: 50, gap: 2 },
	// Plate, media, trypsin across the back
	secondary: { x0: 22, x1: 62, baseline: 50, gap: 3 },
	// Ethanol + pipette cluster in front working area
	tools:     { x0: 7,  x1: 36, baseline: 68, gap: 2 },
	// Drug dilutions and waste on the dirty side
	dirty:     { x0: 38, x1: 64, baseline: 68, gap: 3 },
	// Outside hood: microscope and incubator share one baseline
	outside:   { x0: 78, x1: 92, baseline: 68, gap: 2, align: 'left' },
};

const HOOD_SCENE_ITEMS: SceneItem[] = [
	{ id: 'flask',                asset: 'flask',                kind: 'flask',     zone: 'primary',   priority: 1,  widthScale: 1.2, label: 'T-75 Flask',           anchorY: 'bottom' },
	{ id: 'well_plate',           asset: 'well_plate',           kind: 'plate',     zone: 'secondary', priority: 2,  widthScale: 1.0, label: '24-Well Plate',        anchorY: 'bottom' },
	{ id: 'media_bottle',         asset: 'media_bottle',         kind: 'bottle',    zone: 'secondary', priority: 3,  widthScale: 1.0, label: 'DMEM Media',           anchorY: 'bottom' },
	{ id: 'trypsin_bottle',       asset: 'trypsin_bottle',       kind: 'bottle',    zone: 'secondary', priority: 4,  widthScale: 1.0, label: 'Trypsin-EDTA',         anchorY: 'bottom' },
	{ id: 'ethanol_bottle',       asset: 'ethanol_bottle',       kind: 'bottle',    zone: 'tools',     priority: 5,  widthScale: 1.0, label: '70% Ethanol',          anchorY: 'bottom' },
	{ id: 'serological_pipette',  asset: 'serological_pipette',  kind: 'pipette',   zone: 'tools',     priority: 6,  widthScale: 1.0, label: 'Serological Pipette',  shortLabel: 'Sero Pipette',  anchorY: 'tip' },
	{ id: 'aspirating_pipette',   asset: 'aspirating_pipette',   kind: 'pipette',   zone: 'tools',     priority: 7,  widthScale: 1.0, label: 'Aspirating Pipette',   shortLabel: 'Aspirating',    anchorY: 'tip' },
	{ id: 'multichannel_pipette', asset: 'multichannel_pipette', kind: 'pipette',   zone: 'tools',     priority: 8,  widthScale: 1.0, label: 'Multichannel Pipette', shortLabel: 'Multi Pipette', anchorY: 'tip' },
	{ id: 'drug_vials',           asset: 'drug_vials',           kind: 'rack',      zone: 'dirty',     priority: 9,  widthScale: 1.0, label: 'Drug Dilutions',       anchorY: 'bottom' },
	{ id: 'waste_container',      asset: 'waste_container',      kind: 'waste',     zone: 'dirty',     priority: 10, widthScale: 1.0, label: 'Waste',                anchorY: 'bottom' },
	{ id: 'microscope',           asset: 'microscope',           kind: 'equipment', zone: 'outside',   priority: 11, widthScale: 1.0, label: 'Microscope',           anchorY: 'bottom' },
	{ id: 'incubator',            asset: 'incubator',            kind: 'equipment', zone: 'outside',   priority: 12, widthScale: 1.0, label: 'Incubator',            anchorY: 'bottom' },
];

const HOOD_LAYOUT_RULES: SceneLayoutRules = {
	zones: HOOD_ZONES,
	labelFontSize: 9,
	labelLineHeight: 1.1,
	labelOffsetY: 2,
};

// ============================================
// Helper: look up an item label by ID (used by interaction code)
function getHoodItemLabel(itemId: string): string {
	for (let i = 0; i < HOOD_SCENE_ITEMS.length; i++) {
		if (HOOD_SCENE_ITEMS[i].id === itemId) {
			return HOOD_SCENE_ITEMS[i].label;
		}
	}
	return itemId;
}
```

- [ ] **Step 2: Add script tag to `cell_culture_game.html`**

Add after `asset_specs.ts` and before `constants.ts`:

```html
<script src="parts/hood_config.ts"></script>
```

- [ ] **Step 3: Verify build**

Run: `source source_me.sh && python3 -m pytest tests/ -k "pyflakes or ascii" -x -q`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```
feat: add hood scene semantic config with zones and priorities

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 4: Create layout engine

**Files:**
- Create: `parts/layout_engine.ts`

- [ ] **Step 1: Create `parts/layout_engine.ts`**

```typescript
// ============================================
// layout_engine.ts - Zone-based scene layout engine
// ============================================
// Computes item positions and label placement from semantic config.
// Scene-agnostic: works for any lab scene that provides items, specs, and rules.
// Layout is computed once per render; DOM measurements are not used.

// Average character width in % at base font size (tune as needed)
const AVG_CHAR_WIDTH_PCT = 0.55;

// ============================================
// computeSceneLayout - main entry point
function computeSceneLayout(
	items: SceneItem[],
	specs: Record<string, AssetSpec>,
	rules: SceneLayoutRules,
	viewportW: number,
	viewportH: number,
): ComputedItemLayout[] {
	// Step 1: group items by zone, sort by (priority, id)
	const groups: Record<string, SceneItem[]> = {};
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!groups[item.zone]) {
			groups[item.zone] = [];
		}
		groups[item.zone].push(item);
	}
	// Sort each group deterministically
	const zoneNames = Object.keys(groups);
	for (let z = 0; z < zoneNames.length; z++) {
		groups[zoneNames[z]].sort(function(a: SceneItem, b: SceneItem): number {
			if (a.priority !== b.priority) return a.priority - b.priority;
			if (a.id < b.id) return -1;
			if (a.id > b.id) return 1;
			return 0;
		});
	}

	// Step 2 + 3: compute positions per zone
	const positioned: ComputedItemLayout[] = [];
	for (let z = 0; z < zoneNames.length; z++) {
		const zoneName = zoneNames[z];
		const zone = rules.zones[zoneName];
		if (!zone) continue;
		const zoneItems = groups[zoneName];
		const zoneLayouts = layoutZoneItems(zoneItems, zone, specs, viewportW, viewportH);
		for (let j = 0; j < zoneLayouts.length; j++) {
			positioned.push(zoneLayouts[j]);
		}
	}

	// Step 4 + 5: label layout and collision resolution
	layoutLabels(positioned, items, specs, rules);

	return positioned;
}

// ============================================
// layoutZoneItems - distribute items horizontally within a zone and compute Y
function layoutZoneItems(
	zoneItems: SceneItem[],
	zone: ZoneDef,
	specs: Record<string, AssetSpec>,
	viewportW: number,
	viewportH: number,
): ComputedItemLayout[] {
	const n = zoneItems.length;
	if (n === 0) return [];

	const zoneWidth = zone.x1 - zone.x0;
	const align = zone.align || 'center';

	// Compute rendered widths
	const widths: number[] = [];
	let totalItemWidth = 0;
	for (let i = 0; i < n; i++) {
		const spec = specs[zoneItems[i].asset];
		const w = spec ? spec.defaultWidth * zoneItems[i].widthScale : 5;
		widths.push(w);
		totalItemWidth += w;
	}

	// Compute effective gaps
	let effectiveGap = zone.gap;
	let scaleFactor = 1.0;
	if (n === 1) {
		// Single item: no gap needed
		effectiveGap = 0;
	} else {
		const totalGapWidth = zone.gap * (n - 1);
		if (totalItemWidth + totalGapWidth <= zoneWidth) {
			// Items fit: distribute extra space as gaps
			effectiveGap = (zoneWidth - totalItemWidth) / (n - 1);
		} else {
			// Overflow: shrink gaps to minimum, then scale widths
			effectiveGap = zone.gap;
			const availableForItems = zoneWidth - totalGapWidth;
			if (availableForItems > 0 && totalItemWidth > 0) {
				scaleFactor = Math.min(availableForItems / totalItemWidth, 1.0);
			}
		}
	}

	// Apply scale factor to widths
	for (let i = 0; i < n; i++) {
		widths[i] = widths[i] * scaleFactor;
	}
	totalItemWidth = totalItemWidth * scaleFactor;

	// Compute starting X based on alignment
	let startX = zone.x0;
	const clusterWidth = totalItemWidth + effectiveGap * Math.max(n - 1, 0);
	if (n === 1) {
		// Single item placement
		if (align === 'center') {
			startX = zone.x0 + (zoneWidth - widths[0]) / 2;
		} else if (align === 'right') {
			startX = zone.x1 - widths[0];
		}
		// 'left' stays at zone.x0
	} else {
		if (align === 'center') {
			startX = zone.x0 + (zoneWidth - clusterWidth) / 2;
		} else if (align === 'right') {
			startX = zone.x1 - clusterWidth;
		}
		// 'left' stays at zone.x0
	}

	// Assign positions
	const results: ComputedItemLayout[] = [];
	let curX = startX;
	for (let i = 0; i < n; i++) {
		const item = zoneItems[i];
		const spec = specs[item.asset];
		const w = widths[i];

		// Height: convert width% to height% accounting for viewport aspect ratio
		const aspectRatio = spec ? spec.aspectRatio : 1.0;
		const h = w * aspectRatio * (viewportW / viewportH);

		// Vertical position from baseline + anchor
		const baseline = item.baselineOverride !== undefined ? item.baselineOverride : zone.baseline;
		const anchorOffset = spec && spec.anchorYOffset !== undefined ? spec.anchorYOffset : 0;
		let top = baseline - h;
		if (item.anchorY === 'tip') {
			top = baseline - h + anchorOffset;
		} else if (item.anchorY === 'center') {
			top = baseline - h / 2;
		}
		// 'bottom' is the default: top = baseline - h

		results.push({
			id: item.id,
			x: curX,
			y: top,
			width: w,
			height: h,
			tooltip: item.label,
			labelLines: [item.label],
			labelX: curX + w / 2,
			labelY: 0,
			labelWidth: 0,
			labelMultiline: false,
		});

		curX += w + effectiveGap;
	}

	return results;
}

// ============================================
// layoutLabels - compute label text, position, and resolve collisions
function layoutLabels(
	layouts: ComputedItemLayout[],
	items: SceneItem[],
	specs: Record<string, AssetSpec>,
	rules: SceneLayoutRules,
): void {
	// Build lookup maps
	const itemMap: Record<string, SceneItem> = {};
	for (let i = 0; i < items.length; i++) {
		itemMap[items[i].id] = items[i];
	}

	// Group layouts by zone for collision resolution
	const zoneGroups: Record<string, ComputedItemLayout[]> = {};
	for (let i = 0; i < layouts.length; i++) {
		const item = itemMap[layouts[i].id];
		if (!item) continue;
		const zoneName = item.zone;
		if (!zoneGroups[zoneName]) {
			zoneGroups[zoneName] = [];
		}
		zoneGroups[zoneName].push(layouts[i]);
	}

	// Process each layout
	for (let i = 0; i < layouts.length; i++) {
		const layout = layouts[i];
		const item = itemMap[layout.id];
		if (!item) continue;
		const spec = specs[item.asset];
		const zone = rules.zones[item.zone];
		if (!zone) continue;

		// Estimate label width
		const specLabelWidth = spec ? spec.labelWidth * item.widthScale : 5;
		const charWidth = item.label.length * AVG_CHAR_WIDTH_PCT;
		let labelW = Math.max(charWidth, specLabelWidth);

		// Try full label; wrap if wider than item width
		const availableWidth = layout.width;
		let labelText = item.label;
		let lines: string[] = [labelText];
		let multiline = false;

		if (labelW > availableWidth && labelText.indexOf(' ') >= 0) {
			// Split at nearest-middle space
			lines = splitLabelAtMiddle(labelText);
			multiline = true;
			// Recalculate width as max line width
			let maxLineWidth = 0;
			for (let li = 0; li < lines.length; li++) {
				const lineW = lines[li].length * AVG_CHAR_WIDTH_PCT;
				if (lineW > maxLineWidth) maxLineWidth = lineW;
			}
			labelW = Math.max(maxLineWidth, specLabelWidth);
		}

		// If still too wide and shortLabel exists, use it
		if (labelW > availableWidth && item.shortLabel) {
			labelText = item.shortLabel;
			if (labelText.indexOf(' ') >= 0) {
				lines = splitLabelAtMiddle(labelText);
				multiline = true;
			} else {
				lines = [labelText];
				multiline = false;
			}
			let maxLineWidth = 0;
			for (let li = 0; li < lines.length; li++) {
				const lineW = lines[li].length * AVG_CHAR_WIDTH_PCT;
				if (lineW > maxLineWidth) maxLineWidth = lineW;
			}
			labelW = Math.max(maxLineWidth, specLabelWidth);
		}

		// If still too wide, no shortLabel, no spaces: truncate with ellipsis
		if (labelW > availableWidth && lines.length === 1 && lines[0].indexOf(' ') < 0) {
			// Estimate max chars that fit
			const maxChars = Math.floor(availableWidth / AVG_CHAR_WIDTH_PCT);
			if (maxChars > 3 && lines[0].length > maxChars) {
				lines = [lines[0].substring(0, maxChars - 1) + '...'];
				labelW = maxChars * AVG_CHAR_WIDTH_PCT;
			}
		}

		// Position: centered on item, clamped to zone bounds (accounting for label width)
		let labelX = layout.x + layout.width / 2;
		const halfLabel = labelW / 2;
		if (labelX - halfLabel < zone.x0) {
			labelX = zone.x0 + halfLabel;
		}
		if (labelX + halfLabel > zone.x1) {
			labelX = zone.x1 - halfLabel;
		}

		// Vertical: fixed offset below zone baseline
		const labelY = zone.baseline + rules.labelOffsetY;

		layout.labelLines = lines;
		layout.labelX = labelX;
		layout.labelY = labelY;
		layout.labelWidth = labelW;
		layout.labelMultiline = multiline;
	}

	// Collision resolution: single pass per zone, horizontal only
	const resolvedZones = Object.keys(zoneGroups);
	for (let z = 0; z < resolvedZones.length; z++) {
		const zoneName = resolvedZones[z];
		const zone = rules.zones[zoneName];
		if (!zone) continue;
		const group = zoneGroups[zoneName];

		// Sort by labelX after clamping
		group.sort(function(a: ComputedItemLayout, b: ComputedItemLayout): number {
			return a.labelX - b.labelX;
		});

		// Check adjacent pairs and nudge apart (single pass, no iteration)
		for (let i = 0; i < group.length - 1; i++) {
			const left = group[i];
			const right = group[i + 1];
			const leftEdge = left.labelX + left.labelWidth / 2;
			const rightEdge = right.labelX - right.labelWidth / 2;
			// 1% tolerance for text shadows
			const overlap = leftEdge - rightEdge + 1;
			if (overlap > 0) {
				// Nudge apart symmetrically, max = zone.gap
				const nudge = Math.min(overlap / 2, zone.gap);
				left.labelX -= nudge;
				right.labelX += nudge;
				// Clamp to zone bounds (accounting for label width)
				const leftHalf = left.labelWidth / 2;
				const rightHalf = right.labelWidth / 2;
				if (left.labelX - leftHalf < zone.x0) {
					left.labelX = zone.x0 + leftHalf;
				}
				if (right.labelX + rightHalf > zone.x1) {
					right.labelX = zone.x1 - rightHalf;
				}
			}
		}
	}
}

// ============================================
// splitLabelAtMiddle - split text at the space nearest the middle
function splitLabelAtMiddle(text: string): string[] {
	const mid = text.length / 2;
	let bestIdx = -1;
	let bestDist = text.length;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === ' ') {
			const dist = Math.abs(i - mid);
			if (dist < bestDist) {
				bestDist = dist;
				bestIdx = i;
			}
		}
	}
	if (bestIdx < 0) return [text];
	return [text.substring(0, bestIdx), text.substring(bestIdx + 1)];
}
```

- [ ] **Step 2: Add script tag to `cell_culture_game.html`**

Add after `hood_config.ts` and before `constants.ts`:

```html
<script src="parts/layout_engine.ts"></script>
```

- [ ] **Step 3: Verify build**

Run: `source source_me.sh && python3 -m pytest tests/ -k "pyflakes or ascii" -x -q`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```
feat: add zone-based scene layout engine

Computes item positions and label placement from semantic config.
Handles zone distribution, anchor-based Y, label wrapping, and
collision resolution in a single deterministic pass.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 5: Layout engine unit tests

**Files:**
- Create: `devel/test_layout_engine.mjs`

These tests run the layout engine in a browser context via Playwright, using small controlled scenarios to validate engine invariants independently of the hood scene.

- [ ] **Step 1: Create `devel/test_layout_engine.mjs`**

```javascript
import { chromium } from 'playwright';
import path from 'path';

const gamePath = path.resolve('cell_culture_game.html');
const url = 'file://' + gamePath;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(url);
await page.waitForTimeout(300);

let passed = 0;
let failed = 0;

function assert(condition, msg) {
	if (condition) {
		passed++;
	} else {
		failed++;
		console.log('FAIL: ' + msg);
	}
}

function closeTo(a, b, tol) {
	return Math.abs(a - b) <= tol;
}

// Run tests inside the page context where layout engine is loaded
const results = await page.evaluate(() => {
	const out = [];

	// Helper: make a minimal scene item
	function item(id, priority, widthScale, anchorY, shortLabel) {
		return {
			id: id, asset: id, kind: 'bottle',
			zone: 'test', priority: priority,
			widthScale: widthScale || 1.0,
			label: 'Label ' + id,
			shortLabel: shortLabel,
			anchorY: anchorY || 'bottom',
		};
	}

	// Helper: minimal asset spec
	function spec(defaultWidth, aspectRatio) {
		return { defaultWidth: defaultWidth, aspectRatio: aspectRatio, labelWidth: 5 };
	}

	const specs = {
		a: spec(10, 1.0),
		b: spec(10, 1.0),
		c: spec(10, 1.0),
		d: spec(15, 2.0),
		pip: spec(3, 8.0),
	};

	// Test 1: Single item, center align
	const zone1 = { x0: 0, x1: 100, baseline: 50, gap: 2 };
	const rules1 = { zones: { test: zone1 }, labelFontSize: 9, labelLineHeight: 1.1, labelOffsetY: 2 };
	const r1 = computeSceneLayout([item('a', 1)], specs, rules1, 800, 600);
	const it1 = r1[0];
	// Centered: item center should be at zone center
	const center1 = it1.x + it1.width / 2;
	out.push({ name: 'single-item-center', pass: Math.abs(center1 - 50) < 1 });
	out.push({ name: 'single-item-width', pass: Math.abs(it1.width - 10) < 0.1 });

	// Test 2: Single item, left align
	const zone2 = { x0: 10, x1: 90, baseline: 50, gap: 2, align: 'left' };
	const rules2 = { zones: { test: zone2 }, labelFontSize: 9, labelLineHeight: 1.1, labelOffsetY: 2 };
	const r2 = computeSceneLayout([item('a', 1)], specs, rules2, 800, 600);
	out.push({ name: 'single-item-left', pass: Math.abs(r2[0].x - 10) < 0.1 });

	// Test 3: Single item, right align
	const zone3 = { x0: 10, x1: 90, baseline: 50, gap: 2, align: 'right' };
	const rules3 = { zones: { test: zone3 }, labelFontSize: 9, labelLineHeight: 1.1, labelOffsetY: 2 };
	const r3 = computeSceneLayout([item('a', 1)], specs, rules3, 800, 600);
	out.push({ name: 'single-item-right', pass: Math.abs((r3[0].x + r3[0].width) - 90) < 0.1 });

	// Test 4: Two items, priority ordering
	const r4 = computeSceneLayout([item('b', 2), item('a', 1)], specs, rules1, 800, 600);
	out.push({ name: 'two-items-order', pass: r4[0].id === 'a' && r4[1].id === 'b' });
	out.push({ name: 'two-items-left-first', pass: r4[0].x < r4[1].x });

	// Test 5: Items stay within zone
	const r5 = computeSceneLayout(
		[item('a', 1), item('b', 2), item('c', 3)], specs, rules1, 800, 600
	);
	for (let i = 0; i < r5.length; i++) {
		const it = r5[i];
		out.push({ name: 'zone-contain-left-' + it.id, pass: it.x >= 0 });
		out.push({ name: 'zone-contain-right-' + it.id, pass: (it.x + it.width) <= 100 });
	}

	// Test 6: Overflow scaling
	const narrowZone = { x0: 0, x1: 25, baseline: 50, gap: 2 };
	const rulesN = { zones: { test: narrowZone }, labelFontSize: 9, labelLineHeight: 1.1, labelOffsetY: 2 };
	const r6 = computeSceneLayout(
		[item('a', 1), item('b', 2), item('c', 3)], specs, rulesN, 800, 600
	);
	for (let i = 0; i < r6.length; i++) {
		out.push({ name: 'overflow-within-' + r6[i].id,
			pass: r6[i].x >= 0 && (r6[i].x + r6[i].width) <= 25 + 1 });
	}
	// Widths should be scaled down
	out.push({ name: 'overflow-scaled', pass: r6[0].width < 10 });

	// Test 7: Anchor types
	const squareZone = { x0: 0, x1: 100, baseline: 80, gap: 2 };
	const rulesS = { zones: { test: squareZone }, labelFontSize: 9, labelLineHeight: 1.1, labelOffsetY: 2 };
	// bottom anchor: item bottom = baseline
	const rBot = computeSceneLayout([item('a', 1, 1.0, 'bottom')], specs, rulesS, 100, 100);
	const botBottom = rBot[0].y + rBot[0].height;
	out.push({ name: 'anchor-bottom', pass: Math.abs(botBottom - 80) < 1 });

	// center anchor: item center = baseline
	const rCen = computeSceneLayout([item('a', 1, 1.0, 'center')], specs, rulesS, 100, 100);
	const cenCenter = rCen[0].y + rCen[0].height / 2;
	out.push({ name: 'anchor-center', pass: Math.abs(cenCenter - 80) < 1 });

	// Test 8: Label wrapping
	const longItem = {
		id: 'long', asset: 'a', kind: 'bottle', zone: 'test',
		priority: 1, widthScale: 0.5, label: 'Very Long Label Name',
		anchorY: 'bottom',
	};
	const rL = computeSceneLayout([longItem], specs, rules1, 800, 600);
	out.push({ name: 'label-wraps', pass: rL[0].labelMultiline === true });
	out.push({ name: 'label-two-lines', pass: rL[0].labelLines.length === 2 });

	// Test 9: Label collision (two close items)
	const tightZone = { x0: 0, x1: 30, baseline: 50, gap: 1 };
	const rulesT = { zones: { test: tightZone }, labelFontSize: 9, labelLineHeight: 1.1, labelOffsetY: 2 };
	const rC = computeSceneLayout([item('a', 1), item('b', 2)], specs, rulesT, 800, 600);
	const leftEdge = rC[0].labelX + rC[0].labelWidth / 2;
	const rightEdge = rC[1].labelX - rC[1].labelWidth / 2;
	out.push({ name: 'labels-no-overlap', pass: leftEdge <= rightEdge + 2 });

	// Test 10: Deterministic sort (same priority uses id)
	const rD = computeSceneLayout(
		[item('c', 1), item('a', 1), item('b', 1)], specs, rules1, 800, 600
	);
	out.push({ name: 'deterministic-a-first', pass: rD[0].id === 'a' });
	out.push({ name: 'deterministic-b-second', pass: rD[1].id === 'b' });
	out.push({ name: 'deterministic-c-third', pass: rD[2].id === 'c' });

	return out;
});

// Report results
for (const r of results) {
	assert(r.pass, r.name);
	if (r.pass) console.log('  OK: ' + r.name);
}

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
	process.exitCode = 1;
}

await browser.close();
```

- [ ] **Step 2: Run unit tests**

```bash
node devel/test_layout_engine.mjs
```

Expected: All tests pass. If any fail, fix the layout engine before proceeding.

- [ ] **Step 3: Commit**

```
test: add layout engine unit tests for zones, anchors, labels, overflow

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 6: Update CSS for layout layers and labels

**Files:**
- Modify: `parts/style.css:572-584`

- [ ] **Step 1: Replace label CSS and add layer styles**

Replace the existing `.hood-item-label` block (lines 572-584) with:

```css
/* ===== Hood Scene Layers ===== */
#hood-items-layer {
	position: absolute;
	inset: 0;
	z-index: 1;
}

#hood-labels-layer {
	position: absolute;
	inset: 0;
	z-index: 2;
	pointer-events: none;
}

/* ===== Hood Item Labels ===== */
.hood-item-label {
	position: absolute;
	transform: translateX(-50%);
	font-size: 9px;
	font-weight: 600;
	color: var(--color-text-dark);
	white-space: normal;
	line-height: 1.1;
	text-align: center;
	pointer-events: none;
	text-shadow: 0 0 3px var(--color-white), 0 0 3px var(--color-white);
}

/* ===== Hood Item SVG Scaling ===== */
.hood-item svg {
	width: 100%;
	height: 100%;
	display: block;
}
```

- [ ] **Step 2: Verify no CSS syntax errors by opening in browser**

Open `cell_culture_game.html` in a browser and check the console for errors.

- [ ] **Step 3: Commit**

```
style: update CSS for layout engine layers and label rendering

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 6: Rewrite hood_scene.ts renderer to consume layout engine

**Files:**
- Modify: `parts/hood_scene.ts:1-120`

This is the core integration. The renderer stops doing layout math and consumes `ComputedItemLayout[]`.

- [ ] **Step 1: Replace the rendering section of `renderHoodScene()`**

Replace lines 1-120 of `parts/hood_scene.ts` (everything from the top through the item rendering loop, NOT the toolbar or event listener code) with:

```typescript
// ============================================
// hood_scene.ts - Main hood view rendering and interaction
// ============================================

//============================================
// Map item IDs to their SVG generator functions
function getItemSvgHtml(itemId: string): string {
	switch (itemId) {
		case 'flask':
			const mediaLevel = gameState.flaskMediaMl / FLASK_MAX_VOLUME_ML;
			const mediaColor = gameState.flaskMediaAge === 'old' ? '#e6a840' : '#f0a0b0';
			return getFlaskSvg(mediaLevel, mediaColor);
		case 'well_plate': return getWellPlateSvg(gameState.wellPlate);
		case 'media_bottle': return getMediaBottleSvg();
		case 'trypsin_bottle': return getTrypsinBottleSvg();
		case 'aspirating_pipette': return getAspiratingPipetteSvg();
		case 'serological_pipette': return getSeroPipetteSvg();
		case 'waste_container': return getWasteContainerSvg();
		case 'drug_vials': return getDrugVialsSvg();
		case 'multichannel_pipette': return getMultichannelPipetteSvg();
		case 'ethanol_bottle': return getEthanolBottleSvg();
		case 'microscope': return getMicroscopeSvg();
		case 'incubator': return getIncubatorSvg();
		default: return '';
	}
}

// ============================================
function renderHoodScene(): void {
	const hoodScene = document.getElementById('hood-scene');
	if (!hoodScene) return;

	// Compute layout from semantic config (no DOM measurements)
	const viewportW = hoodScene.clientWidth || 800;
	const viewportH = hoodScene.clientHeight || 600;
	const layout = computeSceneLayout(
		HOOD_SCENE_ITEMS, ASSET_SPECS, HOOD_LAYOUT_RULES, viewportW, viewportH
	);

	// Determine active targets for current protocol step
	const currentStepData = getCurrentStep();
	const activeTargets: string[] = currentStepData && currentStepData.targetItems
		? currentStepData.targetItems : [];

	// Build items and labels in one pass, into separate layer strings
	let itemsHtml = '';
	let labelsHtml = '';

	for (let i = 0; i < layout.length; i++) {
		const item = layout[i];
		const isSelected = gameState.selectedTool === item.id;
		const isTarget = activeTargets.indexOf(item.id) >= 0;
		const activeClass = isTarget && !isSelected ? ' is-active' : '';
		const selectedClass = isSelected ? ' is-selected' : '';
		const svgHtml = getItemSvgHtml(item.id);

		// Item div: only coordinates are inline
		itemsHtml += '<div class="hood-item' + activeClass + selectedClass + '"';
		itemsHtml += ' data-item-id="' + item.id + '"';
		itemsHtml += ' tabindex="0" role="button"';
		itemsHtml += ' aria-label="' + item.tooltip + '"';
		itemsHtml += ' aria-pressed="' + (isSelected ? 'true' : 'false') + '"';
		itemsHtml += ' data-x="' + item.x.toFixed(1) + '"';
		itemsHtml += ' data-y="' + item.y.toFixed(1) + '"';
		itemsHtml += ' draggable="true"';
		itemsHtml += ' title="' + item.tooltip + '"';
		itemsHtml += ' style="left:' + item.x.toFixed(1) + '%;';
		itemsHtml += 'top:' + item.y.toFixed(1) + '%;';
		itemsHtml += 'width:' + item.width.toFixed(1) + '%;';
		itemsHtml += 'height:' + item.height.toFixed(1) + '%;">';
		itemsHtml += svgHtml;
		itemsHtml += '</div>';

		// Label div: positioned by layout engine
		const multiClass = item.labelMultiline ? ' multiline' : '';
		labelsHtml += '<div class="hood-item-label' + multiClass + '"';
		labelsHtml += ' style="left:' + item.labelX.toFixed(1) + '%;';
		labelsHtml += 'top:' + item.labelY.toFixed(1) + '%;';
		labelsHtml += 'width:' + item.labelWidth.toFixed(1) + '%;">';
		for (let li = 0; li < item.labelLines.length; li++) {
			if (li > 0) labelsHtml += '<br>';
			labelsHtml += item.labelLines[li];
		}
		labelsHtml += '</div>';
	}

	// Assemble full HTML with layer structure
	let html = '';
	// Hood background SVG
	html += '<div id="hood-bg" style="position:absolute;top:0;left:0;width:100%;height:100%;">';
	html += getHoodBackgroundSvg();
	html += '</div>';
	// Items layer
	html += '<div id="hood-items-layer">';
	html += itemsHtml;
	html += '</div>';
	// Labels layer
	html += '<div id="hood-labels-layer">';
	html += labelsHtml;
	html += '</div>';
```

Keep everything from the toolbar code onward (line 122+) unchanged, except update the two `HOOD_ITEMS` references:

- [ ] **Step 2: Replace `HOOD_ITEMS[gameState.selectedTool]` references**

On the line that reads `const toolConfig = HOOD_ITEMS[gameState.selectedTool];` (around current line 135), replace with:

```typescript
		const toolLabel = getHoodItemLabel(gameState.selectedTool);
```

And update the line that uses `toolConfig.label` to just use `toolLabel` directly. The full pattern:

Old:
```typescript
		const toolConfig = HOOD_ITEMS[gameState.selectedTool];
		const toolLabel = toolConfig ? toolConfig.label : gameState.selectedTool;
```

New:
```typescript
		const toolLabel = getHoodItemLabel(gameState.selectedTool);
```

- [ ] **Step 3: Replace `HOOD_ITEMS[itemId].label` reference**

On the line `showNotification('Picked up ' + HOOD_ITEMS[itemId].label);` (around current line 240), replace with:

```typescript
		showNotification('Picked up ' + getHoodItemLabel(itemId));
```

- [ ] **Step 4: Remove old functions**

Delete the `getItemTopY()` function (old lines 7-23) and `getSvgAspectRatio()` function (old lines 27-37). These are replaced by the layout engine.

- [ ] **Step 5: Add `is-selected` CSS class**

In `parts/style.css`, add after the `.is-active` rule:

```css
.hood-item.is-selected {
	border: 4px solid #2196f3 !important;
	border-radius: 4px;
	box-shadow: 0 0 12px rgba(33, 150, 243, 0.5);
}
```

This replaces the inline border/box-shadow styling that was in the old renderer.

- [ ] **Step 6: Update `.hood-item` base styles**

Add to `parts/style.css`:

```css
.hood-item {
	position: absolute;
	cursor: pointer;
	border: 2px solid transparent;
	border-radius: 4px;
	transition: all 0.2s ease;
}
```

- [ ] **Step 7: Verify build and game loads**

Open `cell_culture_game.html` in a browser. Click "Start Game". The hood scene should render with items positioned by the layout engine.

Run: `source source_me.sh && python3 -m pytest tests/ -k "pyflakes or ascii" -x -q`

Expected: All tests pass.

- [ ] **Step 8: Commit**

```
refactor: rewrite hood renderer to consume layout engine output

Renderer is now a dumb consumer of ComputedItemLayout[].
Items and labels render in separate z-indexed layers.
No inline layout math; all positioning from computeSceneLayout().

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 7: Remove old layout code from constants.ts

**Files:**
- Modify: `parts/constants.ts:130-194`

- [ ] **Step 1: Remove old hood layout constants**

Delete these sections from `parts/constants.ts`:
- Lines 130-158: `BACK_ROW`, `FRONT_ROW`, `OUTSIDE_ROW`, and the `HOOD_ITEMS` record
- Lines 172-186: `VerticalAlign` type and `HoodItemConfig` interface
- Lines 188-194: `TIP_OFFSET` record

Keep the comments about hood interior coordinates if they are useful context, but remove the actual constant definitions and type definitions.

- [ ] **Step 2: Verify no remaining references**

Search for `HOOD_ITEMS`, `HoodItemConfig`, `TIP_OFFSET`, `BACK_ROW`, `FRONT_ROW`, `OUTSIDE_ROW` across all files. The only references should be in the new files (`hood_config.ts` uses its own constants, not these old names).

- [ ] **Step 3: Verify build**

Run: `source source_me.sh && python3 -m pytest tests/ -k "pyflakes or ascii" -x -q`

Open `cell_culture_game.html` and verify the hood scene still works.

Expected: All tests pass, game renders correctly.

- [ ] **Step 4: Commit**

```
refactor: remove old hand-tuned layout constants from constants.ts

HOOD_ITEMS, HoodItemConfig, TIP_OFFSET, and row constants replaced
by the layout engine system in hood_config.ts and layout_engine.ts.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 8: Delete dead code files

**Files:**
- Delete: `content/tc_scenes.ts`
- Delete: `ui/hood_scene.ts`

- [ ] **Step 1: Remove script tags from `cell_culture_game.html`**

If `content/tc_scenes.ts` or `ui/hood_scene.ts` are referenced in any script tags, remove those tags.

- [ ] **Step 2: Delete the files**

```bash
git rm content/tc_scenes.ts ui/hood_scene.ts
```

- [ ] **Step 3: Verify build**

Run: `source source_me.sh && python3 -m pytest tests/ -k "pyflakes or ascii" -x -q`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```
chore: remove dead layout code (tc_scenes.ts, ui/hood_scene.ts)

These files were from a prior refactoring attempt that was never
integrated. Superseded by the new layout engine.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 9: Playwright visual verification

**Files:**
- Create: `devel/test_hood_layout.mjs`

- [ ] **Step 1: Create Playwright test script**

```javascript
import { chromium } from 'playwright';
import path from 'path';

const gamePath = path.resolve('cell_culture_game.html');
const url = 'file://' + gamePath;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(url);
await page.waitForTimeout(500);

// Click start button to enter hood scene
await page.click('#welcome-start-btn');
await page.waitForTimeout(500);

// Screenshot the hood scene
await page.screenshot({ path: 'test-results/hood_layout.png' });
console.log('Screenshot saved to test-results/hood_layout.png');

// Measure all label bounding boxes and check for overlaps
const labels = await page.locator('.hood-item-label').all();
const boxes = [];
for (const label of labels) {
	const box = await label.boundingBox();
	if (box) {
		const text = await label.textContent();
		boxes.push({ text: text, x: box.x, y: box.y, w: box.width, h: box.height });
		console.log('Label: "' + text + '" at x=' + box.x.toFixed(0) + ' w=' + box.width.toFixed(0));
	}
}

// Check for horizontal overlaps (tolerance of 2px for text shadows)
const tolerance = 2;
let overlaps = 0;
for (let i = 0; i < boxes.length; i++) {
	for (let j = i + 1; j < boxes.length; j++) {
		const a = boxes[i];
		const b = boxes[j];
		// Only check labels on same approximate Y (same row)
		if (Math.abs(a.y - b.y) > 20) continue;
		const aRight = a.x + a.w;
		const bLeft = b.x;
		const bRight = b.x + b.w;
		const aLeft = a.x;
		// Check overlap
		if (aRight - tolerance > bLeft && bRight - tolerance > aLeft) {
			console.log('OVERLAP: "' + a.text + '" and "' + b.text + '"');
			overlaps++;
		}
	}
}

if (overlaps === 0) {
	console.log('OK: No label overlaps detected');
} else {
	console.log('FAIL: ' + overlaps + ' label overlap(s) detected');
}

// Verify flask is the widest item
const items = await page.locator('.hood-item').all();
let flaskWidth = 0;
let maxOtherWidth = 0;
for (const item of items) {
	const id = await item.getAttribute('data-item-id');
	const box = await item.boundingBox();
	if (!box) continue;
	if (id === 'flask') {
		flaskWidth = box.width;
	} else {
		if (box.width > maxOtherWidth) maxOtherWidth = box.width;
	}
}

// Flask should be wider than most items (well_plate may be wider due to aspect ratio)
console.log('Flask width: ' + flaskWidth.toFixed(0) + 'px');
console.log('Max other item width: ' + maxOtherWidth.toFixed(0) + 'px');

await browser.close();
```

- [ ] **Step 2: Run the verification**

```bash
node devel/test_hood_layout.mjs
```

Expected: Screenshot saved, no overlaps detected, flask is prominent.

- [ ] **Step 3: Visually inspect `test-results/hood_layout.png`**

Confirm:
- T-75 Flask is large and prominent on the left
- Pipette labels do not overlap
- Labels are readable at 2 lines where wrapped
- Outside equipment (microscope, incubator) is on the right edge
- Drug dilutions and waste are pushed to the right

- [ ] **Step 4: Commit**

```
test: add Playwright visual verification for hood layout

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

### Task 10: Update changelog

**Files:**
- Modify: `docs/CHANGELOG.md`

- [ ] **Step 1: Add changelog entry**

Add under today's date heading (`## 2026-04-09`):

```markdown
### Additions and New Features

- Added zone-based scene layout engine (`parts/layout_engine.ts`) that computes item positions and label placement from semantic config. Engine is scene-agnostic and reusable for future lab scenes.
- Added `parts/scene_types.ts` with type definitions for `SceneItem`, `AssetSpec`, `ZoneDef`, `SceneLayoutRules`, and `ComputedItemLayout`.
- Added `parts/asset_specs.ts` with per-asset visual metrics derived from normalized SVG viewBoxes.
- Added `parts/hood_config.ts` with semantic hood scene config: zone definitions, item declarations with priorities, and layout rules.
- Added Playwright visual verification script `devel/test_hood_layout.mjs` for label overlap detection.

### Behavior or Interface Changes

- Hood scene renderer now consumes computed layout output instead of doing inline layout math. Items and labels render in separate z-indexed DOM layers.
- Hood item labels now wrap to two lines when too wide, with collision resolution to prevent overlap.
- T-75 Flask is now visually larger (widthScale 1.2) and positioned as the primary focal object.
- Pipette labels shortened via shortLabel fallback: "Sero Pipette", "Aspirating", "Multi Pipette".
- Label font size reduced from 10px to 9px for better fit.
- Added accessibility attributes: `role="button"`, `tabindex="0"`, `aria-label`, `aria-pressed` on hood items.

### Removals and Deprecations

- Removed `HOOD_ITEMS`, `HoodItemConfig`, `TIP_OFFSET`, `BACK_ROW`, `FRONT_ROW`, `OUTSIDE_ROW` from `parts/constants.ts` (replaced by layout engine).
- Deleted dead code: `content/tc_scenes.ts` and `ui/hood_scene.ts` (prior refactoring attempt, never integrated).
```

- [ ] **Step 2: Commit**

```
docs: update changelog for layout engine refactor

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```
