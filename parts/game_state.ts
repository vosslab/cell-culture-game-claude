// ============================================
// game_state.ts - State machine and protocol tracking
// ============================================

interface GameState {
	currentStep: number;
	flaskMediaMl: number;
	flaskMediaAge: 'old' | 'fresh';
	// 24-well plate state
	wellPlate: WellData[];
	cellsTransferred: boolean;
	drugsAdded: boolean;
	incubated: boolean;
	// Cell tracking
	cellCount: number | null;
	actualCellCount: number;
	cellViability: number;
	// Plate reader results
	plateReadComplete: boolean;
	score: number;
	completedSteps: string[];
	hoodSprayed: boolean;
	activeScene: 'hood' | 'bench' | 'incubator' | 'microscope' | 'plate_reader' | 'results';
	// Tracking for scoring
	stepsInCorrectOrder: number;
	stepsOutOfOrder: number;
	mediaWastedMl: number;
	cleanlinessErrors: number;
	// Real-time warning messages
	warnings: string[];
	// Trypsin digestion tracking
	trypsinAdded: boolean;
	trypsinIncubated: boolean;
	trypsinNeutralized: boolean;
	// Hemocytometer loading
	hemocytometerLoaded: boolean;
	// Protocol realism tracking
	mediaWarmed: boolean;
	startTime: number;
	endTime: number | null;
	selectedTool: string | null;
	pipetteVolumeMl: number;
	isDragging: boolean;
	dragItem: string | null;
	// Day state machine
	day: 'day1_seed' | 'day1_wait' | 'day2_treat' | 'day2_wait' | 'day4_readout';
	seenPartIntros: string[];
	// M5 protocol fidelity counters
	dilutionErrors: number;
	plateMapErrors: number;
	mttTechniqueErrors: number;
	incubationTimingOk: boolean;
}

// ============================================
function createWellPlate(): WellData[] {
	const wells: WellData[] = [];
	for (let row = 0; row < PLATE_ROWS; row++) {
		for (let col = 0; col < PLATE_COLS; col++) {
			wells.push({
				row: row,
				col: col,
				hasCells: false,
				drugConcentrationUm: 0,
				absorbance: 0,
			});
		}
	}
	return wells;
}

// ============================================
function createInitialGameState(): GameState {
	return {
		currentStep: 0,
		flaskMediaMl: FLASK_STARTING_MEDIA_ML,
		flaskMediaAge: 'old',
		wellPlate: createWellPlate(),
		cellsTransferred: false,
		drugsAdded: false,
		incubated: false,
		cellCount: null,
		actualCellCount: INITIAL_CELL_COUNT,
		cellViability: INITIAL_VIABILITY,
		plateReadComplete: false,
		score: 0,
		completedSteps: [],
		hoodSprayed: false,
		activeScene: 'hood',
		stepsInCorrectOrder: 0,
		stepsOutOfOrder: 0,
		mediaWastedMl: 0,
		cleanlinessErrors: 0,
		warnings: [],
		trypsinAdded: false,
		trypsinIncubated: false,
		trypsinNeutralized: false,
		hemocytometerLoaded: false,
		mediaWarmed: false,
		startTime: Date.now(),
		endTime: null,
		selectedTool: null,
		pipetteVolumeMl: 0,
		isDragging: false,
		dragItem: null,
		day: 'day1_seed',
		seenPartIntros: [],
		dilutionErrors: 0,
		plateMapErrors: 0,
		mttTechniqueErrors: 0,
		incubationTimingOk: true,
	};
}

// Global game state
let gameState: GameState = createInitialGameState();

// ============================================
function resetGame(): void {
	// Close all modal overlays before resetting
	const overlays = document.querySelectorAll('.modal-overlay');
	for (let i = 0; i < overlays.length; i++) {
		overlays[i].classList.remove('active');
	}
	gameState = createInitialGameState();
	renderGame();
}

// ============================================
function getCurrentStep(): ProtocolStep | null {
	if (gameState.currentStep >= PROTOCOL_STEPS.length) {
		return null;
	}
	return PROTOCOL_STEPS[gameState.currentStep];
}

// ============================================
function completeStep(stepId: string): void {
	if (gameState.completedSteps.includes(stepId)) {
		return;
	}

	// Check if this is the expected next step (for order scoring)
	const expectedStep = getCurrentStep();
	if (expectedStep && expectedStep.id === stepId) {
		gameState.stepsInCorrectOrder++;
	} else {
		gameState.stepsOutOfOrder++;
	}

	gameState.completedSteps.push(stepId);

	// Advance currentStep to the next uncompleted step
	while (gameState.currentStep < PROTOCOL_STEPS.length &&
		gameState.completedSteps.includes(PROTOCOL_STEPS[gameState.currentStep].id)) {
		gameState.currentStep++;
	}

	// Check if protocol is complete
	if (gameState.currentStep >= PROTOCOL_STEPS.length) {
		gameState.endTime = Date.now();
		gameState.activeScene = 'results';
	}

	showNotification('Completed: ' + getStepLabel(stepId));
	renderGame();
}

// ============================================
function getStepLabel(stepId: string): string {
	const step = PROTOCOL_STEPS.find(s => s.id === stepId);
	return step ? step.label : stepId;
}

// ============================================
function switchScene(scene: 'hood' | 'bench' | 'incubator' | 'microscope' | 'plate_reader' | 'results'): void {
	gameState.activeScene = scene;
	renderGame();
}

// ============================================
// resolveItemDepth(item, activeStepId)
//
// Depth is automatic first, manual second. Given an item and the currently
// active protocol step, return the tier the item should render at:
//
//   'front' : item.id is in the active step's targetItems (the student
//             needs to interact with it now)
//   'mid'   : item shares a group with one of the step's targetItems
//             (same functional cluster; keeps context close at hand)
//   'back'  : everything else parks on the back shelf, smaller and higher
//
// A manual item.depth on the item spec wins - explicit intent overrides
// auto-resolution. Critical items (plate and bottle kinds) never drop
// below 'mid' so the student never loses sight of the working plate or
// the active reagent.
//
// Returns the resolved depth tier. Pure function; does not mutate.
// ============================================
function resolveItemDepth(
	item: SceneItem,
	activeStepId: string | null
): 'back' | 'mid' | 'front' {
	// Manual override wins - explicit intent beats auto-resolution.
	if (item.depth) return item.depth;

	// Auto-depth is OPT-IN via the `group` field. An item without a group
	// tag keeps the pre-depth behavior ('mid'). This means Patch 2 lands
	// the resolver machinery but changes no pixels until M2/M3 tags items
	// with groups. Once an item is groupable, it participates in
	// front-promote-on-target and back-park-on-idle.
	if (!item.group) return 'mid';

	// No active step -> default to mid (current rendering).
	if (!activeStepId) return 'mid';

	var step = PROTOCOL_STEPS.find(function (s) { return s.id === activeStepId; });
	if (!step || !step.targetItems || step.targetItems.length === 0) {
		return 'mid';
	}
	var targets = step.targetItems;

	// Item itself is a target: promote to front.
	if (targets.indexOf(item.id) >= 0) return 'front';

	// Critical items never drop below mid (plate and the active flask).
	if (item.kind === 'plate' || item.kind === 'flask') return 'mid';

	// Share a functional group with one of the targets: stay mid.
	// Consult both hood and bench item pools so a target-items list
	// spanning both scenes resolves correctly.
	var targetGroups: string[] = [];
	var pools: SceneItem[][] = [HOOD_SCENE_ITEMS, BENCH_SCENE_ITEMS];
	for (var pi = 0; pi < pools.length; pi++) {
		var pool = pools[pi];
		for (var ii = 0; ii < pool.length; ii++) {
			var it = pool[ii];
			if (targets.indexOf(it.id) >= 0 && it.group) {
				if (targetGroups.indexOf(it.group) < 0) {
					targetGroups.push(it.group);
				}
			}
		}
	}
	if (targetGroups.indexOf(item.group) >= 0) return 'mid';

	// Otherwise park the item on the back shelf.
	return 'back';
}

// ============================================
// resolveSceneItemsWithDepth - return a shallow copy of items with
// `depth` populated from the auto-resolver. Leaves the input array
// untouched so callers can safely pass HOOD_SCENE_ITEMS / BENCH_SCENE_ITEMS.
// ============================================
function resolveSceneItemsWithDepth(
	items: SceneItem[],
	activeStepId: string | null
): SceneItem[] {
	var out: SceneItem[] = [];
	for (var i = 0; i < items.length; i++) {
		var src = items[i];
		var resolved = resolveItemDepth(src, activeStepId);
		// Short-circuit: if the resolved tier matches the existing
		// (absent or already-set) depth, push the original reference to
		// avoid churn in downstream identity checks.
		if (src.depth === resolved) {
			out.push(src);
		} else {
			out.push({
				id: src.id,
				asset: src.asset,
				kind: src.kind,
				zone: src.zone,
				priority: src.priority,
				widthScale: src.widthScale,
				label: src.label,
				shortLabel: src.shortLabel,
				anchorY: src.anchorY,
				baselineOverride: src.baselineOverride,
				alignStop: src.alignStop,
				group: src.group,
				depth: resolved,
			});
		}
	}
	return out;
}

// ============================================
function selectTool(toolId: string | null): void {
	gameState.selectedTool = toolId;
	renderGame();
}

// ============================================
function registerWarning(message: string): void {
	gameState.warnings.push(message);
	showNotification(message, 'warning');
	// Update the warning display in the protocol panel
	renderWarningBanner();
}

// ============================================
function recordCleanlinessError(message?: string): void {
	gameState.cleanlinessErrors++;
	const warningMsg = message || 'Contamination risk! Remember sterile technique.';
	registerWarning(warningMsg);
}

// ============================================
// Forward declaration - overridden by ui_rendering.ts
function renderWarningBanner(): void {
	// Implemented in ui_rendering.ts
}

// ============================================
function getWell(row: number, col: number): WellData {
	return gameState.wellPlate[row * PLATE_COLS + col];
}

// ============================================
// Forward declarations - overridden by later modules
function renderGame(): void {
	// Implemented in init.ts
}

// ============================================
function advanceDay(): void {
	switch (gameState.day) {
		case 'day1_seed':
			// day1_seed -> day1_wait (after p3_incubate_day1 completes)
			gameState.day = 'day1_wait';
			break;
		case 'day1_wait':
			// day1_wait -> day2_treat (via incubator click)
			gameState.day = 'day2_treat';
			break;
		case 'day2_treat':
			// day2_treat -> day2_wait (after p5_incubate_48h completes)
			gameState.day = 'day2_wait';
			break;
		case 'day2_wait':
			// day2_wait -> day4_readout (via incubator click)
			gameState.day = 'day4_readout';
			break;
		case 'day4_readout':
			// Already at final day; illegal transition
			console.warn('advanceDay: illegal from day4_readout');
			return;
		default:
			console.warn('advanceDay: illegal from ' + gameState.day);
			return;
	}
}

// ============================================
function showNotification(message: string, type: string = 'info'): void {
	// Implemented in ui_rendering.ts
}
