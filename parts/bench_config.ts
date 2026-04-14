// ============================================
// bench_config.ts - Bench scene zone layout and item declarations
// ============================================
// The bench sits outside the hood and holds equipment the student uses
// between hood steps: centrifuge, water bath, vortex, cell counter,
// microscope, incubator. Patch 3 ships the zone scaffolding and an empty
// BENCH_SCENE_ITEMS array; M3 (Patch 8) lands the real items with
// artwork sourced from OTHER_REPOS/bioicons/ where possible.
//
// Zone design mirrors hood_config.ts so bench_scene.ts can reuse the
// layout engine verbatim. Three tab-stop rows plus a back shelf:
//
// back_shelf [5-95]  baseline 38 -> parked / back-depth equipment
// mid_bench  [5-95]  baseline 60 -> default working area (centrifuge,
//                                   water bath, vortex, cell counter)
// front_bench [5-95] baseline 78 -> pulled-forward active instrument
//                                   (microscope, incubator)
//
// Baselines leave enough headroom above/below for depth-tier offsets
// (back -4, front +4) without items overflowing SCENE_BOUNDS.

// Bench panel bounds (% of viewport). Like the hood, the bench scene is
// a plain <div id="bench-scene"> whose background is drawn in
// bench_scene.ts, so these bounds describe the clickable workspace.
const BENCH_BOUNDS: SceneBounds = {
	left: 1,
	right: 99,
	top: 1,
	bottom: 98,
};

// ============================================
const BENCH_ZONES: Record<string, ZoneDef> = {
	// Parked equipment: back shelf, small and high on screen.
	back_shelf:  { x0: 5, x1: 95, baseline: 30, gap: 3, align: 'tab-stops' },
	// Default working row: where most equipment sits.
	mid_bench:   { x0: 5, x1: 95, baseline: 58, gap: 3, align: 'tab-stops' },
	// Pulled-forward row: the instrument the student is using right now.
	front_bench: { x0: 5, x1: 95, baseline: 88, gap: 3, align: 'tab-stops' },
};

// M3: bench holds six items. The four bench-only instruments sit in
// mid_bench; the two modal-opening instruments (microscope, incubator)
// sit in front_bench so the student is visually "pulled forward" to
// use them, and their click handlers switch scene to the existing
// microscope/incubator modal overlays.
const BENCH_SCENE_ITEMS: SceneItem[] = [
	{ id: 'centrifuge',   asset: 'centrifuge',   kind: 'equipment', zone: 'mid_bench',   priority: 1, widthScale: 1.0, label: 'Centrifuge',   anchorY: 'bottom', alignStop: 'left'   },
	{ id: 'water_bath',   asset: 'water_bath',   kind: 'equipment', zone: 'mid_bench',   priority: 2, widthScale: 1.0, label: '37C Water Bath', shortLabel: 'Water Bath', anchorY: 'bottom', alignStop: 'left'   },
	{ id: 'vortex',       asset: 'vortex',       kind: 'equipment', zone: 'mid_bench',   priority: 3, widthScale: 1.0, label: 'Vortex',       anchorY: 'bottom', alignStop: 'center' },
	{ id: 'cell_counter', asset: 'cell_counter', kind: 'equipment', zone: 'mid_bench',   priority: 4, widthScale: 1.0, label: 'Cell Counter', anchorY: 'bottom', alignStop: 'center' },
	{ id: 'microscope',   asset: 'microscope',   kind: 'equipment', zone: 'front_bench', priority: 5, widthScale: 1.0, label: 'Microscope',   anchorY: 'bottom', alignStop: 'left'   },
	{ id: 'incubator',    asset: 'incubator',    kind: 'equipment', zone: 'front_bench', priority: 6, widthScale: 1.0, label: 'Incubator',    anchorY: 'bottom', alignStop: 'right'  },
];

const BENCH_LAYOUT_RULES: SceneLayoutRules = {
	zones: BENCH_ZONES,
	labelFontSize: 9,
	labelLineHeight: 1.1,
	labelOffsetY: 3,
	sceneBounds: BENCH_BOUNDS,
};

// ============================================
// Helper: look up a bench item label by ID (used by bench interaction code).
function getBenchItemLabel(itemId: string): string {
	for (let i = 0; i < BENCH_SCENE_ITEMS.length; i++) {
		if (BENCH_SCENE_ITEMS[i].id === itemId) {
			return BENCH_SCENE_ITEMS[i].label;
		}
	}
	return itemId;
}
