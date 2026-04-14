// ============================================
// feed_cells.ts - Aspiration and media addition logic
// ============================================

// Pre-register step ids this file owns so validateTriggerCoverage passes
// at page load time. See hood_scene.ts for the policy rationale.
registeredTriggers.add('aspirate_old_media');
registeredTriggers.add('neutralize_trypsin');

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

	// Show transfer HUD with stop button for aspiration
	showTransferHud(gameState.flaskMediaMl, gameState.flaskMediaMl, 'Aspirating...', () => {
		if (aspirationInterval !== null) {
			clearInterval(aspirationInterval as number);
			aspirationInterval = null;
			completeAspiration();
		}
	});

	// Start aspirating animation
	const startVolume = gameState.flaskMediaMl;
	const aspirationDuration = 2000; // 2 seconds in milliseconds
	const startTime = Date.now();

	aspirationInterval = setInterval(() => {
		const elapsed = Date.now() - startTime;
		const progress = Math.min(elapsed / aspirationDuration, 1);

		// Gradually decrease media volume
		gameState.flaskMediaMl = startVolume * (1 - progress);

		// Update transfer HUD -- show remaining volume draining toward 0
		showTransferHud(startVolume - gameState.flaskMediaMl, startVolume, 'Aspirating...', () => {
			if (aspirationInterval !== null) {
				clearInterval(aspirationInterval as number);
				aspirationInterval = null;
				completeAspiration();
			}
		});

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

	// Track aspirated volume for feedback
	const aspiratedMl = FLASK_STARTING_MEDIA_ML - gameState.flaskMediaMl;

	// Set media to 0
	gameState.flaskMediaMl = 0;

	// Complete the step
	triggerStep('aspirate_old_media');

	// Hide transfer HUD
	hideTransferHud();

	// Volume feedback
	showNotification(
		'Aspirated ' + aspiratedMl.toFixed(1) + ' mL of old media.',
		'success',
	);

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

	// Check if media was warmed first (protocol realism)
	if (!gameState.mediaWarmed) {
		registerWarning('Cold media can shock cells! Warm media to 37\u00B0C before adding.');
		// Still allow the player to continue, but record the error
		recordCleanlinessError('Used cold media -- always warm to 37\u00B0C before adding to cells.');
	}

	// Reset stop flag
	stopMediaAddition = false;

	// Show notification
	showNotification('Adding fresh media. Click Stop when target is reached.');

	// Callback to stop media addition from the HUD stop button
	const stopCallback = () => {
		stopMediaAddition = true;
	};

	// Show transfer HUD with stop button
	showTransferHud(0, FRESH_MEDIA_TARGET_ML, 'Adding media...', stopCallback);

	// Start filling animation over 2 seconds
	const additionDuration = 2000;
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

		// Update transfer HUD
		showTransferHud(gameState.flaskMediaMl, FRESH_MEDIA_TARGET_ML, 'Adding media...', stopCallback);

		// When complete, finish adding media
		if (progress >= 1) {
			clearInterval(mediaAdditionInterval as number);
			mediaAdditionInterval = null;
			stopAddingMedia();
		}
	}, 50);
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

	// Complete the neutralize_trypsin step (media addition neutralizes trypsin)
	triggerStep('neutralize_trypsin');

	// Hide transfer HUD
	hideTransferHud();

	// Show notification about accuracy
	const difference = (finalVolume - FRESH_MEDIA_TARGET_ML).toFixed(2);
	const differenceAbs = Math.abs(parseFloat(difference));
	let accuracyMessage = '';

	if (differenceAbs <= 0.5) {
		accuracyMessage = 'Excellent! Very close to target.';
	} else if (differenceAbs <= 1.0) {
		accuracyMessage = 'Good. Within acceptable range.';
	} else if (finalVolume < FRESH_MEDIA_TARGET_ML - 1.0) {
		// Too little media: explain pH and waste buildup risk
		accuracyMessage = 'Too little media -- nutrients will deplete faster, causing pH drop and waste buildup.';
	} else if (finalVolume > FRESH_MEDIA_TARGET_ML + 1.0) {
		// Too much media: explain gas diffusion issues
		accuracyMessage = 'Too much media -- excess volume impairs gas exchange and wastes reagents.';
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
