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
	// Generate positions for visible cells in the hemocytometer grid
	// We show a representative sample (not all 500k cells)
	const visibleCellCount = 40 + Math.floor(Math.random() * 20);
	const positions: CellPosition[] = [];

	for (let i = 0; i < visibleCellCount; i++) {
		// Distribute across the hemocytometer grid area
		const x = 0.05 + Math.random() * 0.9;
		const y = 0.05 + Math.random() * 0.9;
		// Some cells clump together
		const isClumped = Math.random() < 0.2;
		const clumpOffset = isClumped ? (Math.random() - 0.5) * 0.03 : 0;
		// Cell size varies slightly
		const baseRadius = 0.012 + Math.random() * 0.006;
		// Determine if alive or dead based on viability
		const alive = Math.random() < viability;

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

