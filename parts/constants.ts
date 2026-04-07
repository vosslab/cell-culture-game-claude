// ============================================
// constants.ts - Game configuration and protocol definitions
// ============================================

// 24-well plate layout: 4 rows (A-D) x 6 columns (1-6)
// Column layout for drug concentrations (serial dilution)
const PLATE_ROWS = 4;
const PLATE_COLS = 6;
// Drug concentrations per column (uM), column 1 = no drug (control)
const DRUG_CONCENTRATIONS_UM: number[] = [0, 0.1, 0.5, 1, 5, 10];
const DRUG_CONCENTRATION_LABELS: string[] = ['0 (ctrl)', '0.1', '0.5', '1', '5', '10'];

// Protocol step definitions
const PROTOCOL_STEPS: ProtocolStep[] = [
	{
		id: 'spray_hood',
		label: 'Spray hood with 70% ethanol',
		scene: 'hood',
		requiredAction: 'spray_ethanol',
	},
	{
		id: 'aspirate_old_media',
		label: 'Aspirate old media from flask',
		scene: 'hood',
		requiredAction: 'aspirate',
		correctVolumeMl: 12,
		toleranceMl: 2,
	},
	{
		id: 'add_fresh_media',
		label: 'Add fresh media to flask',
		scene: 'hood',
		requiredAction: 'pipette_media',
		correctVolumeMl: 15,
		toleranceMl: 1,
	},
	{
		id: 'microscope_check',
		label: 'Check cell viability under microscope',
		scene: 'microscope',
		requiredAction: 'check_viability',
	},
	{
		id: 'count_cells',
		label: 'Count cells on hemocytometer',
		scene: 'microscope',
		requiredAction: 'count_cells',
	},
	{
		id: 'transfer_to_plate',
		label: 'Transfer cells to 24-well plate',
		scene: 'hood',
		requiredAction: 'pipette_to_plate',
	},
	{
		id: 'add_drugs',
		label: 'Add drug dilutions to plate',
		scene: 'hood',
		requiredAction: 'pipette_drug',
	},
	{
		id: 'incubate',
		label: 'Place plate in incubator',
		scene: 'incubator',
		requiredAction: 'place_in_incubator',
	},
	{
		id: 'plate_read',
		label: 'Read plate on plate reader',
		scene: 'plate_reader',
		requiredAction: 'read_plate',
	},
];

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

// Hood item positions (as percentage of hood SVG viewBox)
const HOOD_ITEMS: Record<string, HoodItemConfig> = {
	flask: { x: 30, y: 25, width: 16, height: 28, label: 'T-75 Flask' },
	well_plate: { x: 25, y: 58, width: 40, height: 22, label: '24-Well Plate' },
	media_bottle: { x: 8, y: 18, width: 12, height: 26, label: 'DMEM Media' },
	aspirating_pipette: { x: 72, y: 12, width: 5, height: 32, label: 'Aspirating Pipette' },
	serological_pipette: { x: 64, y: 12, width: 4, height: 32, label: 'Serological Pipette' },
	waste_container: { x: 82, y: 50, width: 12, height: 18, label: 'Waste' },
	drug_vials: { x: 8, y: 55, width: 14, height: 18, label: 'Drug Dilutions' },
	multichannel_pipette: { x: 78, y: 35, width: 10, height: 22, label: 'Multichannel Pipette' },
	ethanol_bottle: { x: 88, y: 12, width: 8, height: 18, label: '70% Ethanol' },
	microscope: { x: 75, y: 58, width: 12, height: 22, label: 'Microscope' },
};

// Type definitions (used across all modules)
interface ProtocolStep {
	id: string;
	label: string;
	scene: 'hood' | 'incubator' | 'microscope' | 'plate_reader';
	requiredAction: string;
	correctVolumeMl?: number;
	toleranceMl?: number;
}

interface HoodItemConfig {
	x: number;
	y: number;
	width: number;
	height: number;
	label: string;
}

interface WellData {
	row: number;
	col: number;
	hasCells: boolean;
	drugConcentrationUm: number;
	absorbance: number; // plate reader result
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
		order: ScoreCategory;
		cleanliness: ScoreCategory;
		wastedMedia: ScoreCategory;
		timing: ScoreCategory;
	};
}

interface ScoreCategory {
	points: number;
	maxPoints: number;
	feedback: string;
}
