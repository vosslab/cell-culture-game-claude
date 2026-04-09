// ============================================
// cell_model.ts - Cell population model
// ============================================

// ============================================
function getCellState(): CellState {
	// Generate cell positions for the hemocytometer view
	const positions = generateCellPositions(
		gameState.actualCellCount,
		gameState.cellViability
	);

	return {
		totalCells: gameState.actualCellCount,
		liveCells: Math.round(gameState.actualCellCount * gameState.cellViability),
		deadCells: Math.round(gameState.actualCellCount * (1 - gameState.cellViability)),
		viability: gameState.cellViability,
		confluency: INITIAL_CONFLUENCY,
		positions: positions,
	};
}

// ============================================
function generateCellPositions(totalCells: number, viability: number): CellPosition[] {
	// Simulate a 1:10 dilution with trypan blue before loading hemocytometer.
	// Real formula: cells/mL = (avg per square) x dilution_factor x 10,000
	// With 1:10 dilution and 500k cells/mL:
	//   undiluted per corner = 500k / 10,000 = 50
	//   diluted per corner = 50 / 10 = 5
	//   total visible on grid = 5 * 16 = 80
	// This gives a countable ~5-8 cells per corner quadrant.
	const DILUTION_FACTOR = 10;
	const targetVisible = Math.round(totalCells / (625 * DILUTION_FACTOR));
	const variation = Math.floor(targetVisible * 0.15 * (Math.random() - 0.5));
	const visibleCellCount = Math.max(20, targetVisible + variation);
	const positions: CellPosition[] = [];

	for (let i = 0; i < visibleCellCount; i++) {
		// Distribute across the hemocytometer grid area
		const x = 0.05 + Math.random() * 0.9;
		const y = 0.05 + Math.random() * 0.9;
		// Some cells clump together
		const isClumped = Math.random() < 0.2;
		const clumpOffset = isClumped ? (Math.random() - 0.5) * 0.03 : 0;
		// Determine if alive or dead based on viability
		const alive = Math.random() < viability;
		// Cell radius; dead cells slightly bigger (swollen from trypan blue)
		const baseRadius = alive
			? 0.018 + Math.random() * 0.007
			: 0.022 + Math.random() * 0.008;

		positions.push({
			x: Math.max(0.02, Math.min(0.98, x + clumpOffset)),
			y: Math.max(0.02, Math.min(0.98, y + clumpOffset)),
			alive: alive,
			radius: baseRadius,
		});
	}

	return positions;
}

// ============================================
function applyDrugEffect(concentrationUm: number): void {
	// Simple drug response model
	// Drug reduces viability based on concentration
	if (concentrationUm > 0) {
		// IC50-style response curve (simplified)
		const ic50 = 5; // micromolar
		const maxKill = 0.4; // max fraction killed
		const killFraction = maxKill * (concentrationUm / (concentrationUm + ic50));
		gameState.cellViability = Math.max(0.1, gameState.cellViability - killFraction);
	}
}

// ============================================
function applyIncubation(): void {
	// Cells grow during incubation (24h simulated)
	const growthRate = 1.3; // 30% increase over 24h
	gameState.actualCellCount = Math.round(gameState.actualCellCount * growthRate);

	// If drugs were added, apply effect using the max concentration from the plate
	if (gameState.drugsAdded) {
		let maxConc = 0;
		gameState.wellPlate.forEach(well => {
			if (well.drugConcentrationUm > maxConc) {
				maxConc = well.drugConcentrationUm;
			}
		});
		applyDrugEffect(maxConc);
	}
}

