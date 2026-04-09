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

type ZoneDef = {
	x0: number;
	x1: number;
	baseline: number;
	gap: number;
	align?: 'center' | 'left' | 'right';
};

type SceneLayoutRules = {
	zones: Record<string, ZoneDef>;
	labelFontSize: number;
	labelLineHeight: number;
	labelOffsetY: number;
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
