// ============================================
// mtt_readout.ts - MTT assay readout conversion to OD560 absorbance
// ============================================

const OD560_MAX = 1.20;   // control absorbance
const OD560_BLANK = 0.05; // blank absorbance
const OD560_NOISE = 0.03; // gaussian-ish noise magnitude

// ============================================
/**
 * Convert well viability to OD560 absorbance with realistic noise.
 * Signal scales linearly from blank to max based on viability.
 * Noise is added to simulate measurement variability.
 */
function mttAbsorbance(viability: number): number {
	const signal = OD560_BLANK + (OD560_MAX - OD560_BLANK) * viability;
	const noise = (Math.random() - 0.5) * 2 * OD560_NOISE;
	return Math.max(0.01, signal + noise);
}

// ============================================
/**
 * Walk the plate, compute viability for each well based on its drug
 * concentration and metformin presence, then write OD560 to well.absorbance.
 * Called when the user clicks "Read plate" in the plate reader overlay.
 */
function runMttReadout(): void {
	for (let i = 0; i < gameState.wellPlate.length; i++) {
		const w = gameState.wellPlate[i];
		if (!w.hasCells) {
			w.absorbance = OD560_BLANK + (Math.random() * 0.02);
			continue;
		}
		const v = computeWellViability(w.drugConcentrationUm, w.metforminPresent === true);
		w.absorbance = mttAbsorbance(v);
	}
	gameState.plateReadComplete = true;
}
