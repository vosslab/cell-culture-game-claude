// ============================================
// incubator_scene.ts - Incubator transition with time-skip
// ============================================

// ============================================
// Generic incubation timer that drives the overlay progress bar
// ============================================
function runIncubationOverlay(
	simulatedMinutes: number,
	animationMs: number,
	label: string,
	onComplete: () => void,
): void {
	const overlay = document.getElementById('incubator-screen');
	if (!overlay) return;

	// Update the heading text
	const heading = overlay.querySelector('h2');
	if (heading) heading.textContent = label;

	// Update the status label
	const statusP = overlay.querySelector('.incubation-timer p');
	if (statusP) statusP.textContent = label + '...';

	// Inject incubator SVG into the view area
	const incubatorView = overlay.querySelector('.incubator-view');
	if (incubatorView) {
		incubatorView.innerHTML = getIncubatorSvg();
	}

	overlay.classList.add('active');

	const progressFill = document.querySelector('#incubator-screen .progress-fill') as HTMLElement;
	const timerText = document.getElementById('timer-text');
	if (!progressFill || !timerText) return;

	// Reset progress bar
	progressFill.style.width = '0%';

	const startTime = Date.now();
	// Format time remaining based on scale
	const useHours = simulatedMinutes >= 60;

	const interval = setInterval(() => {
		const elapsed = Date.now() - startTime;
		const progress = Math.min(elapsed / animationMs, 1);
		const remaining = simulatedMinutes * (1 - progress);

		progressFill.style.width = (progress * 100) + '%';
		if (useHours) {
			timerText.textContent = 'Time remaining: ' + Math.round(remaining / 60) + 'h';
		} else {
			timerText.textContent = 'Time remaining: ' + Math.ceil(remaining) + ' min';
		}

		if (progress >= 1) {
			clearInterval(interval);
			timerText.textContent = 'Complete!';
			setTimeout(() => {
				overlay.classList.remove('active');
				onComplete();
			}, 1000);
		}
	}, 50);
}

// ============================================
// Trypsin incubation: 5 min simulated over 3 seconds
// ============================================
function renderTrypsinIncubation(): void {
	runIncubationOverlay(5, 3000, 'Trypsin Incubation', () => {
		gameState.trypsinIncubated = true;
		completeStep('incubate_trypsin');
		showNotification('Cells detached! Neutralize trypsin with fresh media.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
	});
}

// ============================================
// Plate incubation: 24h simulated over 4 seconds
// ============================================
function renderIncubatorScene(): void {
	runIncubationOverlay(1440, 4000, 'Incubator', () => {
		applyIncubation();
		gameState.incubated = true;
		completeStep('incubate');
		switchScene('plate_reader');
	});
}
