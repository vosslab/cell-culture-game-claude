// ============================================
// hood_config.ts - Hood scene item declarations and zone layout rules
// ============================================
// Semantic config only: what items exist, which zone they belong to,
// and how they should be prioritized. No pixel coordinates.

const HOOD_ZONES: Record<string, ZoneDef> = {
	// Flask dominates left side
	primary:       { x0: 3,  x1: 20, baseline: 50, gap: 2 },
	// Plate, media, trypsin across the back
	secondary:     { x0: 22, x1: 46, baseline: 50, gap: 3 },
	// Ethanol in front working area near flask
	tools_active:  { x0: 6,  x1: 18, baseline: 68, gap: 2 },
	// Drug dilutions and waste in front
	dirty:         { x0: 28, x1: 50, baseline: 68, gap: 3 },
	// Pipettes stored together, right side back row
	tools_storage: { x0: 50, x1: 76, baseline: 50, gap: 2 },
	// Outside hood: microscope and incubator
	outside:       { x0: 78, x1: 96, baseline: 68, gap: 2, align: 'left' },
};

const HOOD_SCENE_ITEMS: SceneItem[] = [
	{ id: 'flask',                asset: 'flask',                kind: 'flask',     zone: 'primary',   priority: 1,  widthScale: 1.2, label: 'T-75 Flask',           anchorY: 'bottom' },
	{ id: 'well_plate',           asset: 'well_plate',           kind: 'plate',     zone: 'secondary', priority: 2,  widthScale: 1.0, label: '24-Well Plate',        anchorY: 'bottom' },
	{ id: 'media_bottle',         asset: 'media_bottle',         kind: 'bottle',    zone: 'secondary', priority: 3,  widthScale: 1.0, label: 'DMEM Media',           anchorY: 'bottom' },
	{ id: 'trypsin_bottle',       asset: 'trypsin_bottle',       kind: 'bottle',    zone: 'secondary', priority: 4,  widthScale: 1.0, label: 'Trypsin-EDTA',         anchorY: 'bottom' },
	{ id: 'ethanol_bottle',       asset: 'ethanol_bottle',       kind: 'bottle',    zone: 'tools_active',  priority: 5,  widthScale: 1.0, label: '70% Ethanol',          anchorY: 'bottom' },
	{ id: 'serological_pipette',  asset: 'serological_pipette',  kind: 'pipette',   zone: 'tools_storage', priority: 6,  widthScale: 1.0, label: 'Serological Pipette',  shortLabel: 'Serological',  anchorY: 'tip' },
	{ id: 'aspirating_pipette',   asset: 'aspirating_pipette',   kind: 'pipette',   zone: 'tools_storage', priority: 7,  widthScale: 1.0, label: 'Aspirating Pipette',   shortLabel: 'Aspirating',   anchorY: 'tip' },
	{ id: 'multichannel_pipette', asset: 'multichannel_pipette', kind: 'pipette',   zone: 'tools_storage', priority: 8,  widthScale: 1.0, label: 'Multichannel Pipette', shortLabel: 'Multichannel', anchorY: 'tip' },
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
