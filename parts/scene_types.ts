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
	// alignStop: only meaningful when the zone uses align: 'tab-stops'.
	// Items at the same stop are packed together with the zone's gap and
	// the cluster is anchored to its stop (left wall, row midpoint, or
	// right wall). Unset items default to 'center'.
	alignStop?: 'left' | 'center' | 'right';
	// depth: back = parked on rear shelf (smaller, higher), mid = working
	// area, front = active item (larger, lower, outlined). Unset defaults
	// to 'mid'. Auto-resolved from the active protocol step's targetItems
	// by resolveItemDepth(); a manual depth here overrides the resolver.
	depth?: 'back' | 'mid' | 'front';
	// group: functional grouping used for auto-depth (items in the same
	// group as the active step's targetItems get promoted to 'mid') and
	// for visual clustering within tab-stop zones. Unset defaults to
	// 'equipment'.
	group?: SceneItemGroup;
};

type SceneItemGroup =
	| 'stocks'
	| 'wash'
	| 'waste'
	| 'pipetting'
	| 'plate'
	| 'dilution_prep'
	| 'equipment';

type AssetSpec = {
	defaultWidth: number;       // baseline width in scene %
	labelWidth: number;         // estimated label width in % at base scale
	anchorYOffset?: number;     // tip adjustment in % points
	// aspectRatio is derived from SVG viewBox at runtime, not hardcoded
};

// Resolved zone with computed x0/x1 (what the engine uses)
// align:
//   'left'      -> first item visual left edge flush with effectiveX0
//   'right'     -> last item visual right edge flush with effectiveX1
//   'center'    -> cluster visual midpoint at row bounds midpoint, gaps
//                  capped at MAX_GAP so the cluster may not span the row
//   'justify'   -> first item flush-left AND last item flush-right; gap
//                  expands to fill the row (space-between distribution)
//   'tab-stops' -> each item has a per-item `alignStop` of 'left',
//                  'center', or 'right'. Items sharing a stop are packed
//                  with the zone's gap, and each sub-cluster is anchored
//                  at its stop (like word-processor tab stops). Used for
//                  grouped layouts (e.g. 3 left, 1 center, 3 right) that
//                  leave whitespace between groups.
type ZoneDef = {
	x0: number;
	x1: number;
	baseline: number;
	gap: number;
	align?: 'center' | 'left' | 'right' | 'justify' | 'tab-stops';
};

// Semantic zone definition (what humans write)
// region + widthPct get resolved to x0/x1 against scene bounds
type SemanticZoneDef = {
	region: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'outside-right';
	widthPct: number;       // how much of the scene width this zone occupies
	baseline: number;
	gap: number;
	align?: 'center' | 'left' | 'right' | 'justify' | 'tab-stops';
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
	// footprint is the horizontal spacing slot for this item, always >= width,
	// in the same units/scale as width (post-scaleFactor scene %). Used by the
	// label pass to estimate available label width.
	footprint: number;
	tooltip: string;
	labelLines: string[];
	labelX: number;
	labelY: number;
	labelWidth: number;
	labelMultiline: boolean;
};
