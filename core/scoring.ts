// ============================================
// core/scoring.ts - Pure scoring logic for the cell culture game
// ============================================
// Ports the weighted 4-category scoring from parts/scoring.ts into a
// DOM-free, typed module.  All data comes through GameState; no globals.

import type { GameState, ScoreResult, ScoreCategory } from "./types";
import { clampValue } from "./util";

// ============================================
// Score weight and threshold constants
// ============================================

const SCORE_WEIGHTS = {
	order: 30,
	cleanliness: 25,
	wastedMedia: 20,
	timing: 25,
} as const;

const STAR_THRESHOLDS = {
	threeStar: 80,
	twoStar: 50,
} as const;

// Timing constants (minutes)
const IDEAL_MINUTES = 3;
const MAX_MINUTES = 10;

// Error/waste ceiling used to scale ratios to [0, 1]
const MAX_CLEANLINESS_ERRORS = 5;
const MAX_WASTE_ML = 5;

// Media waste threshold below which feedback stays positive
const WASTE_FEEDBACK_THRESHOLD_ML = 1;

// ============================================
// Category scorers - each returns a ScoreCategory
// ============================================

//============================================
function scoreOrder(stepsInOrder: number, totalSteps: number): ScoreCategory {
	// Ratio of correctly-ordered steps to total steps
	const orderRatio = totalSteps > 0 ? stepsInOrder / totalSteps : 0;
	const points = Math.round(orderRatio * SCORE_WEIGHTS.order);

	let feedback = "Steps completed in perfect order.";
	if (orderRatio < 1) {
		const outOfOrder = totalSteps - stepsInOrder;
		feedback = outOfOrder + " step(s) out of order. Follow the protocol sequence.";
	}

	return { points, maxPoints: SCORE_WEIGHTS.order, feedback };
}

//============================================
function scoreCleanliness(cleanlinessErrors: number): ScoreCategory {
	// Linear penalty: each error costs 1/MAX_CLEANLINESS_ERRORS of the weight
	const cleanRatio = Math.max(0, 1 - cleanlinessErrors / MAX_CLEANLINESS_ERRORS);
	const points = Math.round(cleanRatio * SCORE_WEIGHTS.cleanliness);

	let feedback = "Excellent sterile technique!";
	if (cleanlinessErrors > 0) {
		feedback = cleanlinessErrors
			+ " contamination risk(s) detected. Be more careful with sterile technique.";
	}

	return { points, maxPoints: SCORE_WEIGHTS.cleanliness, feedback };
}

//============================================
function scoreMediaWaste(mediaWastedMl: number): ScoreCategory {
	// Linear penalty: each mL costs 1/MAX_WASTE_ML of the weight
	const wasteRatio = Math.max(0, 1 - mediaWastedMl / MAX_WASTE_ML);
	const points = Math.round(wasteRatio * SCORE_WEIGHTS.wastedMedia);

	let feedback = "Minimal media waste. Good pipetting accuracy!";
	if (mediaWastedMl > WASTE_FEEDBACK_THRESHOLD_ML) {
		feedback = mediaWastedMl.toFixed(1)
			+ " mL of media wasted. Practice precise pipetting.";
	}

	return { points, maxPoints: SCORE_WEIGHTS.wastedMedia, feedback };
}

//============================================
function scoreTiming(startTime: number, endTime: number | null): ScoreCategory {
	// Elapsed time in minutes; fall back to current time when game is still running
	const elapsedMs = (endTime ?? Date.now()) - startTime;
	const elapsedMin = elapsedMs / 60000;

	// Full marks up to idealMin, then linear decay to zero at maxMin
	let timingRatio = 1;
	if (elapsedMin > IDEAL_MINUTES) {
		timingRatio = Math.max(0, 1 - (elapsedMin - IDEAL_MINUTES) / (MAX_MINUTES - IDEAL_MINUTES));
	}
	const points = Math.round(timingRatio * SCORE_WEIGHTS.timing);

	let feedback = "Great pacing! Efficient work.";
	if (elapsedMin > IDEAL_MINUTES) {
		feedback = "Completed in " + elapsedMin.toFixed(1)
			+ " minutes. With practice you will get faster.";
	}

	return { points, maxPoints: SCORE_WEIGHTS.timing, feedback };
}

// ============================================
// Public entry point
// ============================================

//============================================
export function computeScore(state: GameState, totalSteps: number): ScoreResult {
	// Score each category independently
	const order = scoreOrder(state.protocol.stepsInOrder, totalSteps);
	const cleanliness = scoreCleanliness(state.lab.sterility.cleanlinessErrors);
	const wastedMedia = scoreMediaWaste(state.lab.mediaWastedMl);
	const timing = scoreTiming(state.startTime, state.endTime);

	// Sum category points
	const totalPoints = order.points + cleanliness.points + wastedMedia.points + timing.points;

	// Star rating: 3 stars >= 80, 2 stars >= 50, minimum 1 star
	const maxScore = SCORE_WEIGHTS.order + SCORE_WEIGHTS.cleanliness
		+ SCORE_WEIGHTS.wastedMedia + SCORE_WEIGHTS.timing;
	const clampedTotal = clampValue(totalPoints, 0, maxScore);

	let stars = 1;
	if (clampedTotal >= STAR_THRESHOLDS.threeStar) {
		stars = 3;
	} else if (clampedTotal >= STAR_THRESHOLDS.twoStar) {
		stars = 2;
	}

	return {
		stars,
		totalPoints: clampedTotal,
		categories: { order, cleanliness, wastedMedia, timing },
	};
}

// ============================================
// M6 replacement: negative-deduction star scoring
// ============================================
// Replaces the weighted-category approach with a simpler 5-star system.
// Start at 5 stars and lose one per penalty condition.
// The old computeScore() is preserved for backward compatibility.

//============================================
export function computeStars(state: GameState): number {
	// Start at 5 stars (maximum)
	let stars = 5;

	// Lose a star for waste events
	if (state.lab.mediaWastedMl > 0) {
		stars -= 1;
	}

	// Lose a star for too many warnings (>2)
	if (state.protocol.warnings.length > 2) {
		stars -= 1;
	}

	// Lose a star for high contamination risk (>12%)
	if (state.lab.sterility.contaminationRisk > 12) {
		stars -= 1;
	}

	// Lose a star for poor cell health (<84%)
	if (state.lab.cellViability < 0.84) {
		stars -= 1;
	}

	// Clamp to [1, 5]
	return clampValue(stars, 1, 5);
}
