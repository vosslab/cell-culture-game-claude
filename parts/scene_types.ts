// ============================================
// scene_types.ts - Type definitions for the scene layout engine
// ============================================

type SceneItem = {
	id: string;
	asset: string;
	kind: 'flask' | 'plate' | 'bottle' | 'pipette' | 'rack' | 'waste' | 'equipment';
	zone: string;
	priority: number;
	widthScale: number;
	label: string;
	shortLabel?: string;
	anchorY: 'bottom' | 'tip' | 'center';
	baselineOverride?: number;
};

type AssetSpec = {
	defaultWidth: number;       // baseline width in scene %
	labelWidth: number;         // estimated label width in % at base scale
	anchorYOffset?: number;     // tip adjustment in % points
	// aspectRatio is derived from SVG viewBox at runtime, not hardcoded
};

// Resolved zone with computed x0/x1 (what the engine uses)
type ZoneDef = {
	x0: number;
	x1: number;
	baseline: number;
	gap: number;
	align?: 'center' | 'left' | 'right';
};

// Semantic zone definition (what humans write)
// region + widthPct get resolved to x0/x1 against scene bounds
type SemanticZoneDef = {
	region: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'outside-right';
	widthPct: number;       // how much of the scene width this zone occupies
	baseline: number;
	gap: number;
	align?: 'center' | 'left' | 'right';
};

// Physical scene container bounds (% of viewport)
// Items outside these bounds indicate a zone configuration error
type SceneBounds = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

type SceneLayoutRules = {
	zones: Record<string, ZoneDef>;
	labelFontSize: number;
	labelLineHeight: number;
	labelOffsetY: number;
	sceneBounds?: SceneBounds;  // optional hard clamp for all items
};

type ComputedItemLayout = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	tooltip: string;
	labelLines: string[];
	labelX: number;
	labelY: number;
	labelWidth: number;
	labelMultiline: boolean;
};
