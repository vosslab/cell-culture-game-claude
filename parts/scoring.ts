// ============================================
// scoring.ts - Accuracy scoring with star rating
// ============================================

// ============================================
function calculateScore(): ScoreResult {
	const totalSteps = PROTOCOL_STEPS.length;

	// Order scoring: how many steps were done in correct order
	const orderRatio = totalSteps > 0 ? gameState.stepsInCorrectOrder / totalSteps : 0;
	const orderPoints = Math.round(orderRatio * SCORE_WEIGHTS.order);
	let orderFeedback = 'Steps completed in perfect order.';
	if (orderRatio < 1) {
		orderFeedback = gameState.stepsOutOfOrder + ' step(s) out of order. Follow the protocol sequence.';
	}

	// Cleanliness scoring: based on number of errors
	const maxErrors = 5; // scale
	const cleanRatio = Math.max(0, 1 - (gameState.cleanlinessErrors / maxErrors));
	const cleanPoints = Math.round(cleanRatio * SCORE_WEIGHTS.cleanliness);
	let cleanFeedback = 'Excellent sterile technique!';
	if (gameState.cleanlinessErrors > 0) {
		cleanFeedback = gameState.cleanlinessErrors + ' contamination risk(s) detected. Be more careful with sterile technique.';
	}

	// Media waste scoring
	const maxWaste = 5; // mL threshold for zero points
	const wasteRatio = Math.max(0, 1 - (gameState.mediaWastedMl / maxWaste));
	const wastePoints = Math.round(wasteRatio * SCORE_WEIGHTS.wastedMedia);
	let wasteFeedback = 'Minimal media waste. Good pipetting accuracy!';
	if (gameState.mediaWastedMl > 1) {
		wasteFeedback = gameState.mediaWastedMl.toFixed(1) + ' mL of media wasted. Practice precise pipetting.';
	}

	// Timing scoring: based on total time
	const elapsedMs = (gameState.endTime || Date.now()) - gameState.startTime;
	const elapsedMin = elapsedMs / 60000;
	const idealMin = 3; // ideal completion time
	const maxMin = 10; // max time for any points
	let timingRatio = 1;
	if (elapsedMin > idealMin) {
		timingRatio = Math.max(0, 1 - ((elapsedMin - idealMin) / (maxMin - idealMin)));
	}
	const timingPoints = Math.round(timingRatio * SCORE_WEIGHTS.timing);
	let timingFeedback = 'Great pacing! Efficient work.';
	if (elapsedMin > idealMin) {
		timingFeedback = 'Completed in ' + elapsedMin.toFixed(1) + ' minutes. With practice you will get faster.';
	}

	// Total
	const totalPoints = orderPoints + cleanPoints + wastePoints + timingPoints;

	// Star rating (never below 1)
	let stars = 1;
	if (totalPoints >= STAR_THRESHOLDS.threeStar) {
		stars = 3;
	} else if (totalPoints >= STAR_THRESHOLDS.twoStar) {
		stars = 2;
	}

	return {
		stars: stars,
		totalPoints: totalPoints,
		categories: {
			order: { points: orderPoints, maxPoints: SCORE_WEIGHTS.order, feedback: orderFeedback },
			cleanliness: { points: cleanPoints, maxPoints: SCORE_WEIGHTS.cleanliness, feedback: cleanFeedback },
			wastedMedia: { points: wastePoints, maxPoints: SCORE_WEIGHTS.wastedMedia, feedback: wasteFeedback },
			timing: { points: timingPoints, maxPoints: SCORE_WEIGHTS.timing, feedback: timingFeedback },
		},
	};
}
