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
		targetItems: ['ethanol_bottle'],
	},
	{
		id: 'aspirate_old_media',
		label: 'Aspirate old media from flask',
		scene: 'hood',
		requiredAction: 'aspirate',
		correctVolumeMl: 12,
		toleranceMl: 2,
		targetItems: ['aspirating_pipette', 'flask'],
	},
	{
		id: 'add_trypsin',
		label: 'Add trypsin to detach cells',
		scene: 'hood',
		requiredAction: 'pipette_trypsin',
		targetItems: ['serological_pipette', 'trypsin_bottle', 'flask'],
	},
	{
		id: 'incubate_trypsin',
		label: 'Incubate with trypsin (3-5 min at 37C)',
		scene: 'hood',
		requiredAction: 'wait_trypsin',
		targetItems: ['flask', 'incubator'],
	},
	{
		id: 'neutralize_trypsin',
		label: 'Neutralize trypsin with fresh media',
		scene: 'hood',
		requiredAction: 'pipette_media',
		correctVolumeMl: 15,
		toleranceMl: 1,
		targetItems: ['serological_pipette', 'media_bottle', 'flask'],
	},
	{
		id: 'load_hemocytometer',
		label: 'Mix sample with trypan blue and load hemocytometer',
		scene: 'hood',
		requiredAction: 'load_hemocytometer',
		targetItems: ['serological_pipette', 'flask', 'microscope'],
	},
	{
		id: 'microscope_check',
		label: 'Check cell viability under microscope',
		scene: 'microscope',
		requiredAction: 'check_viability',
		targetItems: ['microscope'],
	},
	{
		id: 'count_cells',
		label: 'Count cells on hemocytometer',
		scene: 'microscope',
		requiredAction: 'count_cells',
		targetItems: ['microscope'],
	},
	{
		id: 'transfer_to_plate',
		label: 'Transfer cells to 24-well plate',
		scene: 'hood',
		requiredAction: 'pipette_to_plate',
		targetItems: ['serological_pipette', 'flask', 'well_plate'],
	},
	{
		id: 'add_drugs',
		label: 'Add drug dilutions to plate',
		scene: 'hood',
		requiredAction: 'pipette_drug',
		targetItems: ['multichannel_pipette', 'drug_vials', 'well_plate'],
	},
	{
		id: 'incubate',
		label: 'Place plate in incubator',
		scene: 'incubator',
		requiredAction: 'place_in_incubator',
		targetItems: ['well_plate', 'incubator'],
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

// Hood item positions (as percentage of hood scene area)
// All items should be inside the hood cabinet (y < 55%)
const HOOD_ITEMS: Record<string, HoodItemConfig> = {
	flask: { x: 30, y: 22, width: 16, height: 28, label: 'T-75 Flask' },
	well_plate: { x: 10, y: 52, width: 35, height: 18, label: '24-Well Plate' },
	media_bottle: { x: 8, y: 15, width: 12, height: 26, label: 'DMEM Media' },
	trypsin_bottle: { x: 20, y: 15, width: 10, height: 22, label: 'Trypsin-EDTA' },
	aspirating_pipette: { x: 72, y: 10, width: 5, height: 32, label: 'Aspirating Pipette' },
	serological_pipette: { x: 64, y: 10, width: 4, height: 32, label: 'Serological Pipette' },
	waste_container: { x: 82, y: 42, width: 12, height: 18, label: 'Waste' },
	drug_vials: { x: 52, y: 25, width: 14, height: 18, label: 'Drug Dilutions' },
	multichannel_pipette: { x: 78, y: 28, width: 10, height: 22, label: 'Multichannel Pipette' },
	ethanol_bottle: { x: 88, y: 10, width: 8, height: 18, label: '70% Ethanol' },
	microscope: { x: 82, y: 52, width: 12, height: 22, label: 'Microscope' },
	incubator: { x: 52, y: 48, width: 14, height: 24, label: 'Incubator' },
};

// Type definitions (used across all modules)
interface ProtocolStep {
	id: string;
	label: string;
	scene: 'hood' | 'incubator' | 'microscope' | 'plate_reader';
	requiredAction: string;
	correctVolumeMl?: number;
	toleranceMl?: number;
	// Hood items that should glow as valid targets for this step
	targetItems?: string[];
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
