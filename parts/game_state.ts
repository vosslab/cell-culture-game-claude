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
	activeScene: 'hood' | 'incubator' | 'microscope' | 'plate_reader' | 'results';
	// Tracking for scoring
	stepsInCorrectOrder: number;
	stepsOutOfOrder: number;
	mediaWastedMl: number;
	cleanlinessErrors: number;
	startTime: number;
	endTime: number | null;
	selectedTool: string | null;
	pipetteVolumeMl: number;
	isDragging: boolean;
	dragItem: string | null;
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
		startTime: Date.now(),
		endTime: null,
		selectedTool: null,
		pipetteVolumeMl: 0,
		isDragging: false,
		dragItem: null,
	};
}

// Global game state
let gameState: GameState = createInitialGameState();

// ============================================
function resetGame(): void {
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
function switchScene(scene: 'hood' | 'incubator' | 'microscope' | 'plate_reader' | 'results'): void {
	gameState.activeScene = scene;
	renderGame();
}

// ============================================
function selectTool(toolId: string | null): void {
	gameState.selectedTool = toolId;
	renderGame();
}

// ============================================
function recordCleanlinessError(): void {
	gameState.cleanlinessErrors++;
	showNotification('Contamination risk! Remember sterile technique.', 'warning');
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
function showNotification(message: string, type: string = 'info'): void {
	// Implemented in ui_rendering.ts
}
