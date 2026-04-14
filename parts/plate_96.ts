// ============================================
// plate_96.ts - 96-well plate dose map and helpers
// ============================================

const PLATE_96_ROWS = 8;
const PLATE_96_COLS = 12;

const CARB_CONC_BY_ROW_UM: number[] = [0.0, 0.010, 0.050, 0.125, 0.250, 0.500, 5.0, 25.0];
const ROW_LABELS: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COL_LABELS: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// ============================================
/**
 * Get carboplatin concentration (uM) for a given row
 */
function getCarbConcUm(row: number): number {
	return CARB_CONC_BY_ROW_UM[row];
}

// ============================================
/**
 * Check if a well (by column) receives metformin treatment
 * Columns 0-5 (labeled 1-6): false
 * Columns 6-11 (labeled 7-12): true
 */
function hasMetformin(col: number): boolean {
	return col >= 6;
}

// ============================================
/**
 * Seed every well in gameState.wellPlate with its drug concentration and metformin flag.
 * Called after the plate is initialized.
 */
function applyPlateDoseMap(): void {
	for (let row = 0; row < PLATE_96_ROWS; row++) {
		for (let col = 0; col < PLATE_96_COLS; col++) {
			const w = gameState.wellPlate[row * PLATE_96_COLS + col];
			w.drugConcentrationUm = getCarbConcUm(row);
			w.metforminPresent = hasMetformin(col);
		}
	}
}
