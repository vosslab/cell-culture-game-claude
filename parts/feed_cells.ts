// ============================================
// feed_cells.ts - Aspiration and media addition logic
// ============================================

// Animation interval tracking
let aspirationInterval: number | null = null;
let mediaAdditionInterval: number | null = null;
let stopMediaAddition: boolean = false;

// ============================================
// startAspiration(): void
// Begin aspirating old media from flask
// ============================================
function startAspiration(): void {
	// Check that flask has old media
	if (gameState.flaskMediaAge !== 'old') {
		showNotification('Flask does not have old media to aspirate.', 'warning');
		return;
	}

	// Show notification
	showNotification('Aspirating old media...');

	// Show volume indicator
	showVolumeIndicator(gameState.flaskMediaMl, gameState.flaskMediaMl);

	// Start aspirating animation
	const startVolume = gameState.flaskMediaMl;
	const aspirationDuration = 2000; // 2 seconds in milliseconds
	const startTime = Date.now();

	aspirationInterval = setInterval(() => {
		const elapsed = Date.now() - startTime;
		const progress = Math.min(elapsed / aspirationDuration, 1);

		// Gradually decrease media volume
		gameState.flaskMediaMl = startVolume * (1 - progress);

		// Update volume indicator
		showVolumeIndicator(gameState.flaskMediaMl, startVolume);

		// When complete, finish aspiration
		if (progress >= 1) {
			clearInterval(aspirationInterval as number);
			aspirationInterval = null;
			completeAspiration();
		}
	}, 50); // Update every 50ms for smooth animation
}

// ============================================
// completeAspiration(): void
// Finish aspiration and track waste
// ============================================
function completeAspiration(): void {
	// Track any remaining media as waste before zeroing
	if (gameState.flaskMediaMl > 0) {
		gameState.mediaWastedMl += gameState.flaskMediaMl;
	}

	// Set media to 0
	gameState.flaskMediaMl = 0;

	// Complete the step
	completeStep('aspirate_old_media');

	// Hide volume indicator
	hideVolumeIndicator();

	// Trigger re-render
	renderGame();
}

// ============================================
// startAddingMedia(): void
// Begin adding fresh media to flask
// ============================================
function startAddingMedia(): void {
	// Check flask has been aspirated
	if (gameState.flaskMediaMl > 0.5) {
		showNotification('Flask must be aspirated first.', 'warning');
		return;
	}

	// Reset stop flag
	stopMediaAddition = false;

	// Show notification
	showNotification('Adding fresh media. Click to stop when target is reached.');

	// Show volume indicator with target
	showVolumeIndicator(0, FRESH_MEDIA_TARGET_ML);

	// Start filling animation over 2 seconds
	const additionDuration = 2000; // 2 seconds
	const startTime = Date.now();
	const startVolume = gameState.flaskMediaMl;

	mediaAdditionInterval = setInterval(() => {
		// Check if player clicked stop
		if (stopMediaAddition) {
			clearInterval(mediaAdditionInterval as number);
			mediaAdditionInterval = null;
			stopAddingMedia();
			return;
		}

		const elapsed = Date.now() - startTime;
		const progress = Math.min(elapsed / additionDuration, 1);

		// Gradually increase media volume to target
		gameState.flaskMediaMl = startVolume + (FRESH_MEDIA_TARGET_ML - startVolume) * progress;

		// Update volume indicator
		showVolumeIndicator(gameState.flaskMediaMl, FRESH_MEDIA_TARGET_ML);

		// When complete, finish adding media
		if (progress >= 1) {
			clearInterval(mediaAdditionInterval as number);
			mediaAdditionInterval = null;
			stopAddingMedia();
		}
	}, 50); // Update every 50ms for smooth animation
}

// ============================================
// stopAddingMedia(): void
// Player stops adding media (clicks button or animation completes)
// ============================================
function stopAddingMedia(): void {
	// Record final volume
	const finalVolume = gameState.flaskMediaMl;

	// Calculate waste: absolute difference from target
	const waste = Math.abs(finalVolume - FRESH_MEDIA_TARGET_ML);
	gameState.mediaWastedMl += waste;

	// Set media age to fresh
	gameState.flaskMediaAge = 'fresh';

	// Complete the step
	completeStep('add_fresh_media');

	// Hide volume indicator
	hideVolumeIndicator();

	// Show notification about accuracy
	const difference = (finalVolume - FRESH_MEDIA_TARGET_ML).toFixed(2);
	const differenceAbs = Math.abs(parseFloat(difference));
	let accuracyMessage = '';

	if (differenceAbs <= 0.5) {
		accuracyMessage = 'Excellent! Very close to target.';
	} else if (differenceAbs <= 1.0) {
		accuracyMessage = 'Good. Within acceptable range.';
	} else if (differenceAbs <= 2.0) {
		accuracyMessage = 'Close, but could be more accurate.';
	} else {
		accuracyMessage = 'Off target. Practice for better precision.';
	}

	showNotification(`Added ${finalVolume.toFixed(1)} mL. ${accuracyMessage}`);

	// Trigger re-render
	renderGame();
}

// ============================================
// Event handler: Set flag when player clicks to stop media addition
// ============================================
function onStopMediaAddition(): void {
	stopMediaAddition = true;
}
