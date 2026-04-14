// ============================================
// bench_config.ts - Bench scene zone layout and item declarations
// ============================================
// The bench sits outside the hood and holds equipment the student uses
// between hood steps: centrifuge, water bath, vortex, cell counter,
// microscope, incubator. Artwork is sourced from
// OTHER_REPOS/bioicons/ where possible.
//
// Zone design mirrors hood_config.ts so bench_scene.ts can reuse the
// layout engine verbatim. All six instruments live in one row now; the
// back_shelf zone is kept for future parked/secondary equipment.
//
// back_shelf [5-95]  baseline 22 -> parked / back-depth equipment (unused today)
// mid_bench  [5-95]  baseline 75 -> the single working row. Six instruments
//                                   spread evenly across the bench surface.
//
// The old two-row layout (mid_bench + front_bench) put microscope and
// incubator in a second row that rendered below the bench surface edge
// and looked like they were on the floor. One row reads as a single
// continuous workspace.

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
	// Parked equipment: back shelf, small and high on screen. Unused
	// in the current bench layout but kept so future work can park
	// secondary equipment without adding a new zone.
	back_shelf:  { x0: 5, x1: 95, baseline: 22, gap: 3, align: 'tab-stops' },
	// Single working row: every bench instrument sits here, spread
	// across the width via tab-stop alignment.
	mid_bench:   { x0: 5, x1: 95, baseline: 75, gap: 3, align: 'tab-stops' },
};

// Bench holds six items, all in a single working row. Left-to-right
// order is workflow order: centrifuge first (after hood), then water
// bath, cell counter, microscope, vortex, incubator (last, where the
// plate lands overnight). Items below width 0.85 so six fit across.
const BENCH_SCENE_ITEMS: SceneItem[] = [
	{ id: 'centrifuge',   asset: 'centrifuge',   kind: 'equipment', zone: 'mid_bench', priority: 1, widthScale: 0.85, label: 'Centrifuge',   anchorY: 'bottom', alignStop: 'left'   },
	{ id: 'water_bath',   asset: 'water_bath',   kind: 'equipment', zone: 'mid_bench', priority: 2, widthScale: 0.85, label: '37C Water Bath', shortLabel: 'Water Bath', anchorY: 'bottom', alignStop: 'left'   },
	{ id: 'cell_counter', asset: 'cell_counter', kind: 'equipment', zone: 'mid_bench', priority: 3, widthScale: 0.85, label: 'Cell Counter', anchorY: 'bottom', alignStop: 'center' },
	{ id: 'microscope',   asset: 'microscope',   kind: 'equipment', zone: 'mid_bench', priority: 4, widthScale: 0.85, label: 'Microscope',   anchorY: 'bottom', alignStop: 'center' },
	{ id: 'vortex',       asset: 'vortex',       kind: 'equipment', zone: 'mid_bench', priority: 5, widthScale: 0.85, label: 'Vortex',       anchorY: 'bottom', alignStop: 'right'  },
	{ id: 'incubator',    asset: 'incubator',    kind: 'equipment', zone: 'mid_bench', priority: 6, widthScale: 0.85, label: 'Incubator',    anchorY: 'bottom', alignStop: 'right'  },
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
