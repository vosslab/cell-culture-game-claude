// ============================================
// constants.ts - Game configuration and protocol definitions
// ============================================

// 96-well plate layout: 8 rows (A-H) x 12 columns (1-12)
const PLATE_ROWS = 8;
const PLATE_COLS = 12;

// Drug concentrations per column (uM) - legacy, kept for svg_assets.ts and microscope_scene.ts
const DRUG_CONCENTRATIONS_UM: number[] = [0, 0.1, 0.5, 1, 5, 10];
const DRUG_CONCENTRATION_LABELS: string[] = ['0 (ctrl)', '0.1', '0.5', '1', '5', '10'];

// Protocol step definitions
const PROTOCOL_STEPS: ProtocolStep[] = [
	{
		id: 'p1_aspirate_old_media',
		label: 'Aspirate old media from the flask',
		action: 'Aspirate old media from the flask',
		why: 'Old media has waste and dead cells. Remove it before washing.',
		partId: 'part1_split',
		dayId: 'day1',
		stepIndex: 1,
		requiredItems: ['flask', 'aspirating_pipette', 'waste_container'],
		errorHints: {
			wrong_tool: 'Aspirating pipette is the correct tool. Serological will splash media.',
			missed_waste: 'Waste went somewhere it should not. Route it to the vacuum waste.',
		},
		scene: 'hood',
		requiredAction: 'aspirate',
		targetItems: ['flask', 'aspirating_pipette', 'waste_container'],
	},
	{
		id: 'p1_pbs_wash',
		label: 'Wash the flask with 4 mL PBS',
		action: 'Wash the flask with 4 mL PBS',
		why: 'PBS rinses off leftover serum that would block trypsin.',
		partId: 'part1_split',
		dayId: 'day1',
		stepIndex: 2,
		requiredItems: ['flask', 'pbs_bottle', 'serological_pipette'],
		errorHints: {
			wrong_reagent: 'PBS is the wash buffer. Media will stop trypsin from working.',
			volume_off: 'Use about 4 mL of PBS so the whole surface is rinsed.',
		},
		scene: 'hood',
		requiredAction: 'pbs_wash',
		targetItems: ['flask', 'pbs_bottle', 'serological_pipette'],
	},
	{
		id: 'p1_add_trypsin',
		label: 'Add 3 mL trypsin to detach the cells',
		action: 'Add 3 mL trypsin to detach the cells',
		why: 'Trypsin breaks the bonds holding cells to the flask.',
		partId: 'part1_split',
		dayId: 'day1',
		stepIndex: 3,
		requiredItems: ['flask', 'trypsin_bottle', 'serological_pipette'],
		errorHints: {
			volume_off: 'Use 3 mL of trypsin. Too much stresses the cells.',
		},
		scene: 'hood',
		requiredAction: 'pipette_trypsin',
		targetItems: ['flask', 'trypsin_bottle', 'serological_pipette'],
	},
	{
		id: 'p1_neutralize',
		label: 'Neutralize with 9 mL complete media',
		action: 'Neutralize with 9 mL complete media',
		why: 'Serum in the media stops trypsin before it damages cells.',
		partId: 'part1_split',
		dayId: 'day1',
		stepIndex: 4,
		requiredItems: ['flask', 'media_bottle', 'serological_pipette'],
		errorHints: {
			volume_off: 'Use 3x the trypsin volume of media (9 mL) so trypsin is fully neutralized.',
		},
		scene: 'hood',
		requiredAction: 'pipette_media',
		correctVolumeMl: 9,
		toleranceMl: 1,
		targetItems: ['flask', 'media_bottle', 'serological_pipette'],
	},
	{
		id: 'p2_centrifuge',
		label: 'Spin cells down in the centrifuge',
		action: 'Spin cells down in the centrifuge',
		why: 'Spinning pulls cells into a pellet so you can resuspend at known density.',
		partId: 'part2_count',
		dayId: 'day1',
		stepIndex: 1,
		requiredItems: ['centrifuge', 'conical_15ml_rack'],
		errorHints: {
			wrong_tube: 'Use a 15 mL conical tube so the pellet is easy to see.',
		},
		scene: 'bench',
		requiredAction: 'centrifuge',
		targetItems: ['centrifuge', 'conical_15ml_rack'],
	},
	{
		id: 'p2_resuspend',
		label: 'Resuspend pellet in 12 mL media',
		action: 'Resuspend pellet in 12 mL media',
		why: 'A known volume lets you calculate cells per mL for seeding.',
		partId: 'part2_count',
		dayId: 'day1',
		stepIndex: 2,
		requiredItems: ['flask', 'media_bottle', 'serological_pipette'],
		errorHints: {
			volume_off: 'Use 12 mL so 100 uL per well gives 2e4 cells per well after counting.',
		},
		scene: 'hood',
		requiredAction: 'resuspend',
		correctVolumeMl: 12,
		toleranceMl: 1,
		targetItems: ['flask', 'media_bottle', 'serological_pipette'],
	},
	{
		id: 'p2_count',
		label: 'Count cells on the cell counter',
		action: 'Count cells on the cell counter',
		why: 'Cell count sets the seed density; wrong count ruins the dose response.',
		partId: 'part2_count',
		dayId: 'day1',
		stepIndex: 3,
		requiredItems: ['cell_counter', 'dilution_tube_rack'],
		errorHints: {
			low_viability: 'Viability under 90% means dead cells dominate. Re-split and retry.',
		},
		scene: 'bench',
		requiredAction: 'count_cells',
		targetItems: ['cell_counter', 'dilution_tube_rack'],
	},
	{
		id: 'p3_seed_plate',
		label: 'Seed 100 uL cell suspension per well',
		action: 'Seed 100 uL cell suspension per well',
		why: 'Seeds the 96-well plate at 2e4 cells per well for dosing tomorrow.',
		partId: 'part3_seed',
		dayId: 'day1',
		stepIndex: 1,
		requiredItems: ['well_plate', 'multichannel_pipette', 'flask'],
		errorHints: {
			wrong_volume: 'Seed 100 uL per well. Less means sparse wells and noisy readings.',
		},
		scene: 'hood',
		requiredAction: 'pipette_to_plate',
		targetItems: ['well_plate', 'multichannel_pipette', 'flask'],
	},
	{
		id: 'p3_incubate_day1',
		label: 'Place plate in the 37C incubator overnight',
		action: 'Place plate in the 37C incubator overnight',
		why: 'Cells need ~24 h to attach and recover before drug dosing.',
		partId: 'part3_seed',
		dayId: 'day1',
		stepIndex: 2,
		requiredItems: ['incubator', 'well_plate'],
		errorHints: {
			skipped: 'The plate must incubate overnight before treatment.',
		},
		scene: 'bench',
		requiredAction: 'place_in_incubator',
		targetItems: ['incubator', 'well_plate'],
	},
	{
		id: 'p4_carb_intermediate',
		label: 'Make Carboplatin 200 uM intermediate (20 uL + 980 uL)',
		action: 'Make Carboplatin 200 uM intermediate (20 uL + 980 uL)',
		why: 'Intermediate is the source for the low-dose working stocks.',
		partId: 'part4_dilute',
		dayId: 'day2',
		stepIndex: 1,
		requiredItems: ['carboplatin_stock', 'sterile_water', 'dilution_tube_rack'],
		errorHints: {
			volume_off: 'Use 20 uL drug and 980 uL media. Wrong ratios break the dose series.',
		},
		scene: 'hood',
		requiredAction: 'dilute_carb_intermediate',
		targetItems: ['carboplatin_stock', 'sterile_water', 'dilution_tube_rack'],
	},
	{
		id: 'p4_carb_low_range',
		label: 'Make 5 low-range working stocks from the intermediate',
		action: 'Make 5 low-range working stocks from the intermediate',
		why: 'These give the 10 nM to 500 nM final concentrations for rows B-F.',
		partId: 'part4_dilute',
		dayId: 'day2',
		stepIndex: 2,
		requiredItems: ['dilution_tube_rack', 'media_bottle'],
		errorHints: {
			wrong_count: 'You need 5 low-range working stocks, one per row B-F.',
		},
		scene: 'hood',
		requiredAction: 'dilute_carb_low',
		targetItems: ['dilution_tube_rack', 'media_bottle'],
	},
	{
		id: 'p4_carb_high_range',
		label: 'Make 2 high-range working stocks from the 10 mM stock',
		action: 'Make 2 high-range working stocks from the 10 mM stock',
		why: 'These give the 5 uM and 25 uM final concentrations for rows G and H.',
		partId: 'part4_dilute',
		dayId: 'day2',
		stepIndex: 3,
		requiredItems: ['carboplatin_stock', 'dilution_tube_rack', 'media_bottle'],
		errorHints: {
			wrong_count: 'You need 2 high-range working stocks (rows G and H).',
		},
		scene: 'hood',
		requiredAction: 'dilute_carb_high',
		targetItems: ['carboplatin_stock', 'dilution_tube_rack', 'media_bottle'],
	},
	{
		id: 'p4_metformin_stock',
		label: 'Make Metformin 10 mM working stock (10 uL + 990 uL)',
		action: 'Make Metformin 10 mM working stock (10 uL + 990 uL)',
		why: 'Fresh metformin working stock is prepared on the day of treatment.',
		partId: 'part4_dilute',
		dayId: 'day2',
		stepIndex: 4,
		requiredItems: ['metformin_stock', 'sterile_water', 'dilution_tube_rack'],
		errorHints: {
			volume_off: 'Use 10 uL stock and 990 uL media for a 10 mM working stock.',
		},
		scene: 'hood',
		requiredAction: 'dilute_metformin',
		targetItems: ['metformin_stock', 'sterile_water', 'dilution_tube_rack'],
	},
	{
		id: 'p4_prewarm_media',
		label: 'Pre-warm media adjustments in the 37C water bath',
		action: 'Pre-warm media adjustments in the 37C water bath',
		why: 'Cold media shocks cells and scatters the dose response.',
		partId: 'part4_dilute',
		dayId: 'day2',
		stepIndex: 5,
		requiredItems: ['water_bath', 'media_bottle'],
		errorHints: {
			skipped: 'Warm the media before adding to cells or you will kill some wells.',
		},
		scene: 'bench',
		requiredAction: 'prewarm',
		targetItems: ['water_bath', 'media_bottle'],
	},
	{
		id: 'p5_media_adjust',
		label: 'Add media adjustment to each well',
		action: 'Add media adjustment to each well',
		why: 'Media adjustment keeps total volume at 100 uL after adding drugs.',
		partId: 'part5_treat',
		dayId: 'day2',
		stepIndex: 1,
		requiredItems: ['well_plate', 'multichannel_pipette', 'media_bottle'],
		errorHints: {
			wrong_volume: 'Columns 1-6 row A need 100 uL; rows B-H need 95 uL. Columns 7-12 subtract 10 uL.',
		},
		scene: 'hood',
		requiredAction: 'media_adjust',
		targetItems: ['well_plate', 'multichannel_pipette', 'media_bottle'],
	},
	{
		id: 'p5_add_carboplatin',
		label: 'Add 5 uL carboplatin working stock per well (rows B-H)',
		action: 'Add 5 uL carboplatin working stock per well (rows B-H)',
		why: 'The 8-point dose series lets you compute an IC50 curve.',
		partId: 'part5_treat',
		dayId: 'day2',
		stepIndex: 2,
		requiredItems: ['well_plate', 'multichannel_pipette', 'dilution_tube_rack'],
		errorHints: {
			wrong_volume: 'Add 5 uL per well. Row A stays drug-free as a control.',
		},
		scene: 'hood',
		requiredAction: 'add_carboplatin',
		targetItems: ['well_plate', 'multichannel_pipette', 'dilution_tube_rack'],
	},
	{
		id: 'p5_add_metformin',
		label: 'Add 5 uL metformin working stock to columns 7-12',
		action: 'Add 5 uL metformin working stock to columns 7-12',
		why: 'Metformin sensitizes cells so the +metformin curve shifts left.',
		partId: 'part5_treat',
		dayId: 'day2',
		stepIndex: 3,
		requiredItems: ['well_plate', 'multichannel_pipette', 'dilution_tube_rack'],
		errorHints: {
			wrong_cols: 'Metformin only goes in columns 7-12. Columns 1-6 stay carboplatin only.',
		},
		scene: 'hood',
		requiredAction: 'add_metformin',
		targetItems: ['well_plate', 'multichannel_pipette', 'dilution_tube_rack'],
	},
	{
		id: 'p5_incubate_48h',
		label: 'Incubate 48 h at 37C',
		action: 'Incubate 48 h at 37C',
		why: 'Drug exposure over 48 h lets cells die so viability differences appear.',
		partId: 'part5_treat',
		dayId: 'day2',
		stepIndex: 4,
		requiredItems: ['incubator', 'well_plate'],
		errorHints: {
			skipped: 'The plate must incubate 48 h before MTT readout.',
		},
		scene: 'bench',
		requiredAction: 'place_in_incubator_48h',
		targetItems: ['incubator', 'well_plate'],
	},
	{
		id: 'p6_add_mtt',
		label: 'Add 25 uL 12 mM MTT per well',
		action: 'Add 25 uL 12 mM MTT per well',
		why: 'MTT is reduced to formazan only by live cells; the color shows viability.',
		partId: 'part6_mtt',
		dayId: 'day4',
		stepIndex: 1,
		requiredItems: ['well_plate', 'multichannel_pipette', 'mtt_vial'],
		errorHints: {
			wrong_volume: 'Add 25 uL MTT for a 1.5 mM final concentration.',
		},
		scene: 'hood',
		requiredAction: 'add_mtt',
		targetItems: ['well_plate', 'multichannel_pipette', 'mtt_vial'],
	},
	{
		id: 'p6_incubate_mtt',
		label: 'Incubate 1.5 h at 37C',
		action: 'Incubate 1.5 h at 37C',
		why: 'Live cells need time to convert MTT into purple formazan crystals.',
		partId: 'part6_mtt',
		dayId: 'day4',
		stepIndex: 2,
		requiredItems: ['incubator', 'well_plate'],
		errorHints: {
			skipped: 'The MTT must incubate 1.5 h or the signal is too weak.',
		},
		scene: 'bench',
		requiredAction: 'place_in_incubator_mtt',
		targetItems: ['incubator', 'well_plate'],
	},
	{
		id: 'p6_decant_mtt',
		label: 'Decant MTT into the biohazard bin',
		action: 'Decant MTT into the biohazard bin',
		why: 'MTT is toxic. It must leave the plate before DMSO solubilization.',
		partId: 'part6_mtt',
		dayId: 'day4',
		stepIndex: 3,
		requiredItems: ['well_plate', 'biohazard_decant'],
		errorHints: {
			wrong_waste: 'MTT goes into the biohazard bin, not the vacuum waste.',
		},
		scene: 'hood',
		requiredAction: 'decant_mtt',
		targetItems: ['well_plate', 'biohazard_decant'],
	},
	{
		id: 'p6_add_dmso',
		label: 'Add 200 uL DMSO per well and mix',
		action: 'Add 200 uL DMSO per well and mix',
		why: 'DMSO dissolves formazan so the plate reader can measure absorbance.',
		partId: 'part6_mtt',
		dayId: 'day4',
		stepIndex: 4,
		requiredItems: ['well_plate', 'multichannel_pipette', 'dmso_bottle'],
		errorHints: {
			wrong_volume: 'Add 200 uL DMSO per well and pipette up and down 10 times.',
		},
		scene: 'hood',
		requiredAction: 'add_dmso',
		targetItems: ['well_plate', 'multichannel_pipette', 'dmso_bottle'],
	},
	{
		id: 'p7_plate_read',
		label: 'Read absorbance at 560 nm',
		action: 'Read absorbance at 560 nm',
		why: 'Formazan absorbs at 560 nm; more signal means more live cells.',
		partId: 'part7_read',
		dayId: 'day4',
		stepIndex: 1,
		requiredItems: ['well_plate'],
		errorHints: {
			wrong_wavelength: 'Read at 560 nm. Other wavelengths miss the formazan peak.',
		},
		scene: 'plate_reader',
		requiredAction: 'read_plate',
		targetItems: ['well_plate'],
	},
	{
		id: 'p7_results',
		label: 'Review dose-response curves',
		action: 'Review dose-response curves',
		why: 'Compare the carboplatin-only and +metformin curves to find IC50 shift.',
		partId: 'part7_read',
		dayId: 'day4',
		stepIndex: 2,
		requiredItems: ['well_plate'],
		errorHints: {},
		scene: 'plate_reader',
		requiredAction: 'view_results',
		targetItems: ['well_plate'],
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


// Type definitions (used across all modules)
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
