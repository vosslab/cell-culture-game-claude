// ============================================
// hood_config.ts - Hood scene item declarations and zone layout rules
// ============================================
// Semantic config only: what items exist, which zone they belong to,
// and how they should be prioritized. No pixel coordinates.

// Scene panel bounds (% of viewport).
// The hood "scene" is a plain <div id="hood-scene"> with a gradient
// background; there is no drawn hood-wall SVG. The visible hood boundary
// IS the scene container edge, so HOOD_BOUNDS.right is the authoritative
// right wall for alignment. Alignment is relative to row bounds: if a row
// is intended to visually sit flush with the hood right wall, the row's
// x1 must be chosen so effectiveX1 (x1 - ZONE_PADDING) equals
// HOOD_BOUNDS.right. Alignment logic does not override narrower row
// geometry.
const HOOD_BOUNDS: SceneBounds = {
	left: 1,
	right: 99,
	top: 1,
	bottom: 98,
};

// ============================================
// Zone layout: two hood-interior rows plus an outside equipment row.
//
// The hood-bg SVG (see parts/svg_assets.ts getHoodBackgroundSvg) is an
// 800x600 viewBox with interior walls at x=60 and x=740, i.e. the hood
// interior spans 7.5% to 92.5% of the SVG width. The scene container
// stretches the SVG and items share the same percentage coordinate
// system, so hood-interior row bounds are x0=7, x1=93 (effectiveX0=8,
// effectiveX1=92 after ZONE_PADDING=1).
//
// Each zone is a single horizontal row. The hood-interior rows use
// align: 'tab-stops' with three anchor positions (left wall, row
// midpoint, right wall), like word-processor tab stops. Each item
// declares an `alignStop` of 'left', 'center', or 'right' and items at
// the same stop are packed with the zone's gap. The whitespace falls
// between the packed groups, not inside them, so the layout reads as
// discrete clusters flush to the walls and centered on the flask.
//
// back_row  [7-93]  baseline 50 -> left(plate,media,trypsin)
//                                  center(flask)
//                                  right(serological,aspirating,multi)
// front_row [7-77]  baseline 68 -> left(ethanol) center(drug) right(waste)
//                                  (x1=77 leaves room for the outside
//                                  zone so front-row items do not collide
//                                  with microscope/incubator on the same
//                                  baseline)
// outside   [78-97] baseline 68 -> microscope, incubator (right of hood)
//
// Insertion order in each row reflects real lab workflow, left to
// right, clean to dirty. Flask is the dominant working object in the
// back row and sits near the middle by insertion position; its bottom
// anchor sits at baseline 52 via baselineOverride (2% lower than the
// other back-row items to align visually with the work surface).

const HOOD_ZONES: Record<string, ZoneDef> = {
	// Hood interior back row: spans the full hood interior, tab-stop
	// groups of 3 left / 1 center (flask) / 3 right (pipettes).
	back_row:  { x0: 7,  x1: 93, baseline: 50, gap: 2, align: 'tab-stops' },
	// Hood interior front row: three tab-stop groups. x1=77 keeps the
	// row clear of the outside zone on the same baseline.
	front_row: { x0: 7,  x1: 77, baseline: 68, gap: 2, align: 'tab-stops' },
	// Outside the hood: microscope and incubator, left-aligned so they
	// sit in the right-hand area without crowding the hood boundary.
	outside:   { x0: 78, x1: 97, baseline: 68, gap: 6, align: 'left' },
};

// Priority is set to the final left-to-right order within each row;
// computeSceneLayout sorts zone items by priority, so this also
// defines insertion order. Flask uses baselineOverride=52 so its bottom
// anchor sits 2% lower than the other back-row items, matching the
// work-surface visual line in the hood-bg SVG.
const HOOD_SCENE_ITEMS: SceneItem[] = [
	// Back row, three tab-stop groups:
	//   left  : well_plate, media, trypsin
	//   center: flask (dominant working object)
	//   right : serological, aspirating, multichannel pipettes
	{ id: 'well_plate',           asset: 'well_plate',           kind: 'plate',     zone: 'back_row',  priority: 1,  widthScale: 1.0, label: '24-Well Plate',        anchorY: 'bottom', alignStop: 'left'   },
	{ id: 'media_bottle',         asset: 'media_bottle',         kind: 'bottle',    zone: 'back_row',  priority: 2,  widthScale: 1.0, label: 'DMEM Media',           anchorY: 'bottom', alignStop: 'left'   },
	{ id: 'trypsin_bottle',       asset: 'trypsin_bottle',       kind: 'bottle',    zone: 'back_row',  priority: 3,  widthScale: 1.0, label: 'Trypsin-EDTA',         anchorY: 'bottom', alignStop: 'left'   },
	{ id: 'flask',                asset: 'flask',                kind: 'flask',     zone: 'back_row',  priority: 4,  widthScale: 1.2, label: 'T-75 Flask',           anchorY: 'bottom', alignStop: 'center', baselineOverride: 52 },
	{ id: 'serological_pipette',  asset: 'serological_pipette',  kind: 'pipette',   zone: 'back_row',  priority: 5,  widthScale: 1.0, label: 'Serological Pipette',  shortLabel: 'Serological',  anchorY: 'tip',    alignStop: 'right'  },
	{ id: 'aspirating_pipette',   asset: 'aspirating_pipette',   kind: 'pipette',   zone: 'back_row',  priority: 6,  widthScale: 1.0, label: 'Aspirating Pipette',   shortLabel: 'Aspirating',   anchorY: 'tip',    alignStop: 'right'  },
	{ id: 'multichannel_pipette', asset: 'multichannel_pipette', kind: 'pipette',   zone: 'back_row',  priority: 7,  widthScale: 1.0, label: 'Multichannel Pipette', shortLabel: 'Multichannel', anchorY: 'tip',    alignStop: 'right'  },
	// Front row, three tab-stop groups: ethanol | drug dilutions | waste
	{ id: 'ethanol_bottle',       asset: 'ethanol_bottle',       kind: 'bottle',    zone: 'front_row', priority: 8,  widthScale: 1.0, label: '70% Ethanol',          anchorY: 'bottom', alignStop: 'left'   },
	{ id: 'drug_vials',           asset: 'drug_vials',           kind: 'rack',      zone: 'front_row', priority: 9,  widthScale: 1.0, label: 'Drug Dilutions',       anchorY: 'bottom', alignStop: 'center' },
	{ id: 'waste_container',      asset: 'waste_container',      kind: 'waste',     zone: 'front_row', priority: 10, widthScale: 1.0, label: 'Waste',                anchorY: 'bottom', alignStop: 'right'  },
	// Outside the hood
	{ id: 'microscope',           asset: 'microscope',           kind: 'equipment', zone: 'outside',   priority: 11, widthScale: 1.0, label: 'Microscope',           anchorY: 'bottom' },
	{ id: 'incubator',            asset: 'incubator',            kind: 'equipment', zone: 'outside',   priority: 12, widthScale: 1.0, label: 'Incubator',            anchorY: 'bottom' },
];

const HOOD_LAYOUT_RULES: SceneLayoutRules = {
	zones: HOOD_ZONES,
	labelFontSize: 9,
	labelLineHeight: 1.1,
	labelOffsetY: 3,
	sceneBounds: HOOD_BOUNDS,
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
