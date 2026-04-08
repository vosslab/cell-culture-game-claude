// ============================================
// core/cell_model.ts - Pure cell population model (zero DOM dependencies)
// ============================================

import type { LabState, WellData } from "./types";
import { clampValue } from "./util";

// ============================================
// Interfaces
// ============================================

export interface CellPosition {
	x: number;
	y: number;
	alive: boolean;
	radius: number;
}

export interface CellState {
	totalCells: number;
	liveCells: number;
	deadCells: number;
	viability: number;
	confluency: number;
	positions: CellPosition[];
}

// ============================================
// Constants
// ============================================

// IC50 in micromolar - matches plate reader model in microscope_scene
const IC50_UM = 2;
// Hill slope for sigmoidal dose-response curve
const HILL_SLOPE = 1.5;
// Maximum kill fraction for simple drug effect model
const MAX_KILL = 0.4;
// Minimum viability floor so cells never reach zero
const MIN_VIABILITY = 0.1;
// Cell growth multiplier per incubation cycle (30% increase over 24h)
const GROWTH_RATE = 1.3;
// Control well absorbance baseline
const CONTROL_ABSORBANCE_BASE = 1.2;
// Control well absorbance random range added to base
const CONTROL_ABSORBANCE_RANGE = 0.3;
// Absorbance noise half-width
const ABSORBANCE_NOISE = 0.08;
// Minimum absorbance floor for any well
const MIN_ABSORBANCE = 0.05;
// Empty well absorbance noise range added to minimum
const EMPTY_WELL_NOISE = 0.02;

// ============================================
export function getCellState(
	actualCellCount: number,
	cellViability: number,
	initialConfluency: number,
): CellState {
	// Generate visible cell positions for hemocytometer view
	const positions = generateCellPositions(actualCellCount, cellViability);

	// Compute live and dead counts from total and viability
	const liveCells = Math.round(actualCellCount * cellViability);
	const deadCells = Math.round(actualCellCount * (1 - cellViability));

	return {
		totalCells: actualCellCount,
		liveCells: liveCells,
		deadCells: deadCells,
		viability: cellViability,
		confluency: initialConfluency,
		positions: positions,
	};
}

// ============================================
export function generateCellPositions(
	totalCells: number,
	viability: number,
): CellPosition[] {
	// Show a representative sample of 40-60 cells, not all 500k
	const visibleCellCount = 40 + Math.floor(Math.random() * 20);
	const positions: CellPosition[] = [];

	// Suppress unused-parameter warning; totalCells drives the model
	// but visible count is fixed for display purposes
	void totalCells;

	for (let i = 0; i < visibleCellCount; i++) {
		// Distribute across the hemocytometer grid area (0.05 to 0.95 range)
		const x = 0.05 + Math.random() * 0.9;
		const y = 0.05 + Math.random() * 0.9;

		// 20% chance of clumping - offset position slightly toward a neighbor
		const isClumped = Math.random() < 0.2;
		const clumpOffset = isClumped ? (Math.random() - 0.5) * 0.03 : 0;

		// Cell size varies slightly around a base radius
		const baseRadius = 0.012 + Math.random() * 0.006;

		// Determine alive or dead based on viability ratio
		const alive = Math.random() < viability;

		// Clamp positions so cells stay within visible bounds
		const clampedX = clampValue(x + clumpOffset, 0.02, 0.98);
		const clampedY = clampValue(y + clumpOffset, 0.02, 0.98);

		positions.push({
			x: clampedX,
			y: clampedY,
			alive: alive,
			radius: baseRadius,
		});
	}

	return positions;
}

// ============================================
export function applyDrugEffect(
	viability: number,
	concentrationUm: number,
): number {
	// No effect at zero concentration
	if (concentrationUm <= 0) {
		return viability;
	}

	// IC50-style response curve: kill fraction scales with concentration
	const killFraction = MAX_KILL * (concentrationUm / (concentrationUm + IC50_UM));

	// Reduce viability but never below the minimum floor
	const newViability = clampValue(viability - killFraction, MIN_VIABILITY, 1.0);
	return newViability;
}

// ============================================
export function applyIncubation(labState: LabState): LabState {
	// Create a shallow copy so we do not mutate the input
	const newState: LabState = {
		...labState,
		// Deep-copy the well plate so per-well mutations are isolated
		wellPlate: labState.wellPlate.map(well => ({ ...well })),
	};

	// Cell growth: 30% increase over one incubation cycle
	newState.actualCellCount = Math.round(labState.actualCellCount * GROWTH_RATE);

	// Apply drug effects independently per well based on each well's concentration
	if (newState.drugsAdded) {
		newState.wellPlate.forEach(well => {
			if (well.hasCells && well.drugConcentrationUm > 0) {
				// Each well gets its own viability based on its drug concentration
				well.viability = applyDrugEffect(labState.cellViability, well.drugConcentrationUm);
			}
		});
	}

	return newState;
}

// ============================================
export function generatePlateReaderResults(wellPlate: WellData[]): WellData[] {
	// Baseline absorbance for untreated control wells
	const controlAbsorbance = CONTROL_ABSORBANCE_BASE + Math.random() * CONTROL_ABSORBANCE_RANGE;

	// Map each well to a new object with absorbance filled in
	const results = wellPlate.map(well => {
		const newWell = { ...well };

		// Empty wells get background-level absorbance only
		if (!newWell.hasCells) {
			newWell.absorbance = MIN_ABSORBANCE + Math.random() * EMPTY_WELL_NOISE;
			return newWell;
		}

		// Sigmoidal dose-response: survival = 1 / (1 + (conc/ic50)^hill)
		const drugConc = newWell.drugConcentrationUm;
		const survivalFraction = 1 / (1 + Math.pow(drugConc / IC50_UM, HILL_SLOPE));

		// Absorbance proportional to surviving fraction, plus noise
		const baseAbsorbance = controlAbsorbance * survivalFraction;
		const noise = (Math.random() - 0.5) * ABSORBANCE_NOISE;
		newWell.absorbance = Math.max(MIN_ABSORBANCE, baseAbsorbance + noise);

		return newWell;
	});

	return results;
}
