// ============================================
// init.ts - Bootstrap and main render dispatcher
// ============================================

// ============================================
// validateProtocolSteps() - Check protocol integrity at startup
// ============================================
function validateProtocolSteps(): string[] {
	const errors: string[] = [];
	if (PROTOCOL_STEPS.length === 0) {
		errors.push('Protocol must have at least one step.');
		return errors;
	}
	const seenIds: string[] = [];
	for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
		const step = PROTOCOL_STEPS[i];
		const prefix = 'Step ' + i + ': ';
		if (!step.id) errors.push(prefix + 'missing id');
		if (!step.label) errors.push(prefix + 'missing label');
		if (!step.scene) errors.push(prefix + 'missing scene');
		if (!step.requiredAction) errors.push(prefix + 'missing requiredAction');
		if (seenIds.indexOf(step.id) >= 0) {
			errors.push(prefix + 'duplicate id "' + step.id + '"');
		}
		seenIds.push(step.id);
	}
	return errors;
}

// Override the stub renderGame with the real implementation
renderGame = function(): void {
	// Hood and bench are peer persistent scenes; exactly one is visible at a
	// time. Modal overlays (microscope, incubator, plate_reader, results)
	// sit on top of whichever persistent scene is showing.
	const hoodEl = document.getElementById('hood-scene');
	const benchEl = document.getElementById('bench-scene');
	const showBench = gameState.activeScene === 'bench';
	if (hoodEl) hoodEl.style.display = showBench ? 'none' : 'flex';
	if (benchEl) benchEl.style.display = showBench ? 'flex' : 'none';

	switch (gameState.activeScene) {
		case 'hood':
			renderHoodScene();
			break;
		case 'bench':
			renderBenchScene();
			break;
		case 'incubator':
			renderIncubatorScene();
			break;
		case 'microscope':
			renderMicroscopeScene();
			break;
		case 'plate_reader':
			renderPlateReaderScene();
			break;
		case 'results':
			const scoreResult = calculateScore();
			renderResultsScreen(scoreResult);
			break;
	}

	// Always update the sidebar
	renderProtocolPanel();
	renderScoreDisplay();
	renderMeters();
};

// ============================================
document.addEventListener('DOMContentLoaded', () => {
	// Validate protocol definitions before starting
	const protocolErrors = validateProtocolSteps();
	if (protocolErrors.length > 0) {
		throw new Error('Protocol validation failed:\n' + protocolErrors.join('\n'));
	}
	gameState = createInitialGameState();

	// Check if welcome overlay should be shown (skip for repeat visitors)
	const welcomeOverlay = document.getElementById('welcome-overlay');
	const hasSeenWelcome = localStorage.getItem('cellCultureGameWelcomeSeen');

	if (welcomeOverlay && !hasSeenWelcome) {
		// Show welcome overlay, wait for Start click
		const startBtn = document.getElementById('welcome-start-btn');
		if (startBtn) {
			startBtn.addEventListener('click', () => {
				welcomeOverlay.classList.remove('active');
				localStorage.setItem('cellCultureGameWelcomeSeen', 'true');
				renderGame();
			});
		}
	} else {
		// Hide welcome overlay and start immediately
		if (welcomeOverlay) {
			welcomeOverlay.classList.remove('active');
		}
		renderGame();
	}
});
