// ============================================
// incubator_scene.ts - Incubator transition with time-skip
// ============================================

// Module-scope lock: true while an incubation animation is running.
// Prevents a second overlay animation from starting if renderGame() is
// called during the first one. Without this guard, completeStep() ->
// renderGame() -> renderIncubatorScene() -> runIncubationOverlay()
// stacked a second setInterval, and the second onComplete ran after
// activeStepId had advanced, falling into the fallback scan and
// pushing the next incubate_* id into outOfOrderAttempts.
let incubationInProgress: boolean = false;

// ============================================
// Generic incubation timer that drives the overlay progress bar
// ============================================
function runIncubationOverlay(
	simulatedMinutes: number,
	animationMs: number,
	label: string,
	onComplete: () => void,
): void {
	if (incubationInProgress) return;
	const overlay = document.getElementById('incubator-screen');
	if (!overlay) return;
	incubationInProgress = true;

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
				// Keep the lock held across onComplete so any nested
				// renderGame -> renderIncubatorScene call (triggered by
				// completeStep's re-render while activeScene is still
				// 'incubator') does NOT start a second animation. The
				// lock is released only after onComplete returns.
				try {
					onComplete();
				} finally {
					incubationInProgress = false;
				}
			}, 1000);
		}
	}, 50);
}

// ============================================
// Trypsin incubation: 5 min simulated over 3 seconds
// ============================================
function renderTrypsinIncubation(): void {
	runIncubationOverlay(5, 3000, 'Trypsin Incubation', () => {
		// UI-internal flag tracking trypsin digestion progress, not a protocol step
		gameState.trypsinIncubated = true;
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
		// Dispatch which incubation step fires based on the active protocol step.
		// TODO: replace activeStepId peek with trigger-spec lookup (see
		// docs/plans/partitioned-hugging-blum.md Section 7)
		const active = gameState.activeStepId;
		if (active && isIncubationStep(active)) {
			triggerStep(active);
		} else {
			// Incubator was clicked at an unexpected time; record as out-of-order
			// by firing the most likely intended step. Pick the first unfinished
			// incubate_* step in order.
			const candidates = getIncubationSteps().map((step: ProtocolStep) => step.id);
			for (const cand of candidates) {
				if (!gameState.completedSteps.includes(cand)) {
					triggerStep(cand);
					break;
				}
			}
		}
		// After an incubation animation, route back to hood. The next
		// protocol step after every incubate_* step lives on the hood
		// (carb_intermediate after day1, add_mtt after 48h, decant_mtt
		// after mtt). Routing to plate_reader was wrong and left a modal
		// overlay blocking every subsequent click.
		switchScene('hood');
	});
}

// ============================================
// Pre-register all incubator-dispatched step ids so validateTriggerCoverage
// passes at load time. registeredTriggers.add(id) is called by triggerStep,
// but these handlers only fire on click; register them here without
// calling completeStep.
registeredTriggers.add('incubate_day1');
registeredTriggers.add('incubate_48h');
registeredTriggers.add('incubate_mtt');
