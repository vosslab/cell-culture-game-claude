// ============================================
// constants.ts - Game configuration and protocol definitions
// ============================================

// 96-well plate layout: 8 rows (A-H) x 12 columns (1-12)
const PLATE_ROWS = 8;
const PLATE_COLS = 12;

// Drug concentrations per column (uM) - legacy, kept for svg_assets.ts and microscope_scene.ts
const DRUG_CONCENTRATIONS_UM: number[] = [0, 0.1, 0.5, 1, 5, 10];
const DRUG_CONCENTRATION_LABELS: string[] = ['0 (ctrl)', '0.1', '0.5', '1', '5', '10'];


// Volume constants (mL)
const FLASK_MAX_VOLUME_ML = 20;
const FLASK_STARTING_MEDIA_ML = 12;
const FRESH_MEDIA_TARGET_ML = 15;
const WELL_VOLUME_UL = 500; // microliters per well
const DRUG_STOCK_CONCENTRATION_UM = 100; // micromolar stock solution

// Cell parameters
const INITIAL_CELL_COUNT = 500000;
const INITIAL_VIABILITY = 0.95;
const INITIAL_CONFLUENCY = 0.6;

// Scoring weights (out of 100 total)
const SCORE_WEIGHTS = {
	order: 30,
	cleanliness: 25,
	wastedMedia: 20,
	timing: 25,
};

// Star thresholds
const STAR_THRESHOLDS = {
	threeStar: 80,
	twoStar: 50,
};


// Type definitions (used across all modules)

// Trigger specification: documents the wiring intent (scene + event)
// for each protocol step. Advisory in this pass; future refactors will
// use this for step-driven trigger resolution.
type TriggerSpec = {
	scene: 'hood' | 'bench' | 'incubator' | 'microscope' | 'plate_reader';
	event: string;
};

// Explicit successor in the state machine. String form for linear transitions,
// function form reserved for future branching. null marks the final step.
// When adding a future step between X and Y, change X.nextId to the new id
// and point the new step's nextId at Y. Reordering is now local.
type NextStep = string | null | ((state: GameState) => string | null);

// Interaction specification: one valid click in a two-stage (load-then-discharge)
// transfer sequence, or a single-click action. Part of allowedInteractions block.
interface AllowedInteraction {
	actor: string;
	source?: string;
	target?: string;
	liquid?: string;
	volumeMl?: number;
	consumesVolumeMl?: number;
	event?: string;
	result?: {
		heldLiquid?: {
			tool: string;
			liquid: string;
			volumeMl: number;
			colorKey: string;
		};
	};
}

interface ProtocolStep {
	id: string;
	label: string;
	action: string;
	why: string;
	partId: 'part1_split' | 'part2_count' | 'part3_seed' | 'part4_dilute' | 'part5_treat' | 'part6_mtt' | 'part7_read';
	dayId: 'day1' | 'day2' | 'day4';
	stepIndex: number;
	requiredItems: string[];
	errorHints: Record<string, string>;
	scene: 'hood' | 'bench' | 'incubator' | 'microscope' | 'plate_reader';
	requiredAction: string;
	correctVolumeMl?: number;
	toleranceMl?: number;
	targetItems?: string[];
	// Explicit successor for the state machine. null marks the final step.
	// Function form is reserved for future branching; unused in this pass.
	nextId: NextStep;
	// Declarative wiring intent. Advisory in this pass -- actual wiring still
	// goes through triggerStep() calls in scene handlers. Future refactors
	// will use this for step-driven trigger resolution.
	trigger: TriggerSpec | null;
	// Modal-driven steps reference a modal owner and screen name.
	modal?: { owner: 'drug_treatment' | 'microscope' | 'incubator' | 'plate_reader'; screen: string };
	// Pure incubation steps with no resolver interaction.
	isIncubation?: boolean;
	// Resolver-driven steps list valid click sequences that advance the step.
	allowedInteractions?: AllowedInteraction[];
}



interface WellData {
	row: number;
	col: number;
	hasCells: boolean;
	drugConcentrationUm: number;
	absorbance: number; // plate reader result
	metforminPresent?: boolean;
}

interface CellState {
	totalCells: number;
	liveCells: number;
	deadCells: number;
	viability: number;
	confluency: number;
	positions: CellPosition[];
}

interface CellPosition {
	x: number;
	y: number;
	alive: boolean;
	radius: number;
}

interface ScoreResult {
	stars: number;
	totalPoints: number;
	categories: {
		dilutionAccuracy: ScoreCategory;
		plateMap: ScoreCategory;
		timing: ScoreCategory;
		mttTechnique: ScoreCategory;
		absorbancePlausibility: ScoreCategory;
	};
}

interface ScoreCategory {
	points: number;
	maxPoints: number;
	feedback: string;
}
