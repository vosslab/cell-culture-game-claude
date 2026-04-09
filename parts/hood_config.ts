// ============================================
// hood_config.ts - Hood scene item declarations and zone layout rules
// ============================================
// Semantic config only: what items exist, which zone they belong to,
// and how they should be prioritized. No pixel coordinates.

// Scene panel bounds (% of viewport)
// Includes both hood interior and outside equipment area
const HOOD_BOUNDS: SceneBounds = {
	left: 1,
	right: 99,
	top: 1,
	bottom: 98,
};

// ============================================
// Zone layout: explicit coordinates within hood interior
// Hood interior: left wall ~7%, right wall ~93%
// Back row baseline: 50%, Front row baseline: 68%
//
// Layout mirrors real lab workflow: left-to-right, clean-to-dirty
//
// Back row (left to right):
//   plate [8-22]     -> 24-well plate (destination vessel)
//   reagents [23-34] -> media + trypsin bottles
//   primary [35-54]  -> T-75 FLASK (center, dominant working object)
//   pipettes [56-76] -> pipettes grouped as tool cluster
//
// Front row (left to right):
//   tools_active [8-20]  -> ethanol (near working area)
//   dirty [30-54]        -> drug dilutions, waste
//
// Outside hood:
//   outside [74-97]  -> microscope, incubator (generous spacing)

const HOOD_ZONES: Record<string, ZoneDef> = {
	plate:         { x0: 8,  x1: 20, baseline: 50, gap: 2 },
	reagents:      { x0: 21, x1: 40, baseline: 50, gap: 2 },
	primary:       { x0: 40, x1: 56, baseline: 52, gap: 3, align: 'center' },
	tools_active:  { x0: 8,  x1: 20, baseline: 68, gap: 2 },
	dirty:         { x0: 30, x1: 54, baseline: 68, gap: 3 },
	pipettes:      { x0: 54, x1: 82, baseline: 50, gap: 2, align: 'right' },
	outside:       { x0: 78, x1: 97, baseline: 68, gap: 6, align: 'left' },
};

const HOOD_SCENE_ITEMS: SceneItem[] = [
	{ id: 'flask',                asset: 'flask',                kind: 'flask',     zone: 'primary',       priority: 1,  widthScale: 1.2, label: 'T-75 Flask',           anchorY: 'bottom' },
	{ id: 'well_plate',           asset: 'well_plate',           kind: 'plate',     zone: 'plate',         priority: 2,  widthScale: 1.0, label: '24-Well Plate',        anchorY: 'bottom' },
	{ id: 'media_bottle',         asset: 'media_bottle',         kind: 'bottle',    zone: 'reagents',      priority: 3,  widthScale: 1.0, label: 'DMEM Media',           anchorY: 'bottom' },
	{ id: 'trypsin_bottle',       asset: 'trypsin_bottle',       kind: 'bottle',    zone: 'reagents',      priority: 4,  widthScale: 1.0, label: 'Trypsin-EDTA',         anchorY: 'bottom' },
	{ id: 'ethanol_bottle',       asset: 'ethanol_bottle',       kind: 'bottle',    zone: 'tools_active',  priority: 5,  widthScale: 1.0, label: '70% Ethanol',          anchorY: 'bottom' },
	{ id: 'serological_pipette',  asset: 'serological_pipette',  kind: 'pipette',   zone: 'pipettes',      priority: 6,  widthScale: 1.0, label: 'Serological Pipette',  shortLabel: 'Serological',  anchorY: 'tip' },
	{ id: 'aspirating_pipette',   asset: 'aspirating_pipette',   kind: 'pipette',   zone: 'pipettes',      priority: 7,  widthScale: 1.0, label: 'Aspirating Pipette',   shortLabel: 'Aspirating',   anchorY: 'tip' },
	{ id: 'multichannel_pipette', asset: 'multichannel_pipette', kind: 'pipette',   zone: 'pipettes',      priority: 8,  widthScale: 1.0, label: 'Multichannel Pipette', shortLabel: 'Multichannel', anchorY: 'tip' },
	{ id: 'drug_vials',           asset: 'drug_vials',           kind: 'rack',      zone: 'dirty',     priority: 9,  widthScale: 1.0, label: 'Drug Dilutions',       anchorY: 'bottom' },
	{ id: 'waste_container',      asset: 'waste_container',      kind: 'waste',     zone: 'dirty',     priority: 10, widthScale: 1.0, label: 'Waste',                anchorY: 'bottom' },
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
