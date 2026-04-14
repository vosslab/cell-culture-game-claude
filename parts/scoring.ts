// ============================================
// scoring.ts - Protocol fidelity scoring
// ============================================

// ============================================
function calculateScore(): ScoreResult {
	// Category 1: dilution_accuracy (max 25)
	const dilutionPoints = Math.max(0, 25 - (gameState.dilutionErrors * 5));
	const dilutionFeedback = gameState.dilutionErrors === 0
		? 'Dilution prep (Part 4): Perfect. Carboplatin volume ratios were accurate.'
		: 'Dilution prep (Part 4): ' + gameState.dilutionErrors + ' errors. Check your carboplatin volume ratios.';

	// Category 2: plate_map (max 20)
	const plateMapPoints = Math.max(0, 20 - (gameState.plateMapErrors * 5));
	const plateMapFeedback = gameState.plateMapErrors === 0
		? 'Plate map (Part 5): Perfect. All wells correctly assigned.'
		: 'Plate map (Part 5): ' + gameState.plateMapErrors + ' wells misassigned. Verify rows A-H and cols 1-12.';

	// Category 3: timing (max 15)
	const timingPoints = gameState.incubationTimingOk ? 15 : 8;
	const timingFeedback = gameState.incubationTimingOk
		? 'Incubations hit the target times.'
		: 'Incubation timing off.';

	// Category 4: mtt_technique (max 20)
	const mttPoints = Math.max(0, 20 - (gameState.mttTechniqueErrors * 5));
	const mttFeedback = gameState.mttTechniqueErrors === 0
		? 'MTT steps (Part 6): Perfect. MTT volume and DMSO solubilization were correct.'
		: 'MTT steps (Part 6): ' + gameState.mttTechniqueErrors + ' errors. Check MTT volume and DMSO solubilization.';

	// Category 5: absorbance_plausibility (max 20)
	// Walk gameState.wellPlate, compute mean absorbance per row for cols 0..5
	// Check monotonic decreasing from row A (0) to row H (7)
	// Subtract 3 per non-monotonic pair. A tolerance absorbs MTT read
	// noise: mttAbsorbance adds +/- OD560_NOISE (0.03) per well, so the
	// mean of 6 wells has std ~0.012. Real dose-response curves have
	// near-flat regions at low doses (rows A..C are all within ~0.01
	// absorbance units of each other given CARB_IC50_UM = 5 uM), so
	// penalizing noise-level flips on those pairs would punish a
	// correct run. Only flag flips whose MAGNITUDE exceeds the
	// noise-tolerance threshold.
	// With noise std ~0.012 per row mean, a 2-sigma tolerance is 0.024.
	// 0.05 gives ~4-sigma safety so honest runs reliably score 100.
	// Real biological dose-response differences between adjacent rows
	// at low doses (A..D, with CARB_IC50_UM = 5 uM) are themselves
	// below this threshold, so a flip there is not distinguishable
	// from noise and should not be penalized.
	const NOISE_TOLERANCE = 0.05;
	let absorbancePoints = 20;
	const rowMeans: number[] = [];
	for (let row = 0; row < 8; row++) {
		let sum = 0;
		for (let col = 0; col < 6; col++) {
			const w = gameState.wellPlate[row * PLATE_COLS + col];
			sum = sum + w.absorbance;
		}
		const mean = sum / 6;
		rowMeans.push(mean);
	}
	for (let row = 0; row < 7; row++) {
		// row should be >= row+1 (monotonic decreasing). Only deduct if
		// the flip exceeds the tolerance.
		const diff = rowMeans[row + 1] - rowMeans[row];
		if (diff > NOISE_TOLERANCE) {
			absorbancePoints = absorbancePoints - 3;
		}
	}
	absorbancePoints = Math.max(0, absorbancePoints);
	const absorbanceFeedback = absorbancePoints >= 19
		? 'Dose response looks plausible.'
		: 'Dose response is not monotonic - check dilution.';

	// Total points
	const totalPoints = dilutionPoints + plateMapPoints + timingPoints + mttPoints + absorbancePoints;

	// Star rating
	let stars = 1;
	if (totalPoints >= 80) {
		stars = 3;
	} else if (totalPoints >= 50) {
		stars = 2;
	}

	return {
		stars: stars,
		totalPoints: totalPoints,
		categories: {
			dilutionAccuracy: { points: dilutionPoints, maxPoints: 25, feedback: dilutionFeedback },
			plateMap: { points: plateMapPoints, maxPoints: 20, feedback: plateMapFeedback },
			timing: { points: timingPoints, maxPoints: 15, feedback: timingFeedback },
			mttTechnique: { points: mttPoints, maxPoints: 20, feedback: mttFeedback },
			absorbancePlausibility: { points: absorbancePoints, maxPoints: 20, feedback: absorbanceFeedback },
		},
	};
}
