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
// groundY = bottom edge percentage; items on the same surface share a groundY
// Hood interior: x ~7-93%, y ~33-92% (walls, glass sash, work surface)
// Layout follows sterile technique: clean-to-dirty left-to-right
//   Back row: vessels that stay put (flask, well plate, media, trypsin)
//   Center: pipettes and ethanol (active working zone)
//   Front-right: waste container (dirty side)
//   Outside hood (right of hood wall): microscope and incubator
const BACK_ROW = 50;   // back row sitting on hood floor
const FRONT_ROW = 68;  // front row in the working zone
const OUTSIDE_ROW = 68; // outside hood equipment on lab bench
const HOOD_ITEMS: Record<string, HoodItemConfig> = {
	// Back row (left to right): clean vessels, do not block airflow
	flask: { x: 8, groundY: BACK_ROW, width: 12, label: 'T-75 Flask', alignY: 'bottom' },
	well_plate: { x: 22, groundY: BACK_ROW, width: 18, label: '24-Well Plate', alignY: 'bottom' },
	media_bottle: { x: 42, groundY: BACK_ROW, width: 8, label: 'DMEM Media', alignY: 'bottom' },
	trypsin_bottle: { x: 52, groundY: BACK_ROW, width: 7, label: 'Trypsin-EDTA', alignY: 'bottom' },
	// Center working area: pipettes and ethanol (left to right, clean to dirty)
	ethanol_bottle: { x: 8, groundY: FRONT_ROW, width: 5, label: '70% Ethanol', alignY: 'bottom' },
	serological_pipette: { x: 18, groundY: FRONT_ROW, width: 3, label: 'Serological Pipette', alignY: 'tip' },
	aspirating_pipette: { x: 23, groundY: FRONT_ROW, width: 3, label: 'Aspirating Pipette', alignY: 'tip' },
	multichannel_pipette: { x: 28, groundY: FRONT_ROW, width: 5, label: 'Multichannel Pipette', alignY: 'tip' },
	drug_vials: { x: 38, groundY: FRONT_ROW, width: 14, label: 'Drug Dilutions', alignY: 'bottom' },
	// Front-right corner: waste (dirty side)
	waste_container: { x: 56, groundY: FRONT_ROW, width: 7, label: 'Waste', alignY: 'bottom' },
	// Outside hood (right side wall area, x>78%): lab equipment
	incubator: { x: 78, groundY: OUTSIDE_ROW, width: 10, label: 'Incubator', alignY: 'bottom' },
	microscope: { x: 78, groundY: 35, width: 8, label: 'Microscope', alignY: 'bottom' },
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

// Anchor documents how groundY should be interpreted for layout.
// For the current normalized assets, 'bottom' and 'tip' produce the same
// vertical placement. They remain separate semantic anchors by design:
// 1. Future assets may not share that geometry
// 2. The config stays self-documenting
// 3. Other anchors such as 'center' remain available for flat objects
type VerticalAlign = 'bottom' | 'tip' | 'center' | 'top';

interface HoodItemConfig {
	x: number;
	groundY: number;  // reference line (percentage); meaning depends on alignY
	width: number;
	label: string;
	alignY?: VerticalAlign;  // default: 'bottom'
}

// Per-item tip offset in percentage points, for when pipette tips
// do not exactly coincide with the SVG bottom edge
const TIP_OFFSET: Record<string, number> = {
	serological_pipette: 0,
	aspirating_pipette: 0,
	multichannel_pipette: 0,
};

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
