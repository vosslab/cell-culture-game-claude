// ============================================
// incubator_scene.ts - Incubator transition with time-skip
// ============================================

// ============================================
function renderIncubatorScene(): void {
	const overlay = document.getElementById('incubator-screen');
	if (!overlay) return;

	// Show the overlay
	overlay.classList.add('active');

	// Start incubation timer animation
	startIncubationTimer();
}

// ============================================
function startIncubationTimer(): void {
	const progressFill = document.querySelector('#incubator-screen .progress-fill') as HTMLElement;
	const timerText = document.getElementById('timer-text');
	if (!progressFill || !timerText) return;

	// Simulate 24h incubation over 4 seconds
	const duration = 4000;
	const startTime = Date.now();

	const interval = setInterval(() => {
		const elapsed = Date.now() - startTime;
		const progress = Math.min(elapsed / duration, 1);
		const hoursRemaining = Math.round(24 * (1 - progress));

		progressFill.style.width = (progress * 100) + '%';
		timerText.textContent = 'Time remaining: ' + hoursRemaining + 'h';

		if (progress >= 1) {
			clearInterval(interval);
			completeIncubation();
		}
	}, 50);
}

// ============================================
function completeIncubation(): void {
	// Apply cell growth and drug effects
	applyIncubation();
	gameState.incubated = true;

	// Complete the step
	completeStep('incubate');

	// Brief pause then transition to microscope
	const timerText = document.getElementById('timer-text');
	if (timerText) {
		timerText.textContent = 'Incubation complete! Checking cells...';
	}

	setTimeout(() => {
		// Hide incubator overlay
		const overlay = document.getElementById('incubator-screen');
		if (overlay) overlay.classList.remove('active');

		// Switch to plate reader
		switchScene('plate_reader');
	}, 1500);
}
