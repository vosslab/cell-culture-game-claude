// ============================================
// init.ts - Bootstrap and main render dispatcher
// ============================================

// ============================================
// showValidationError(title, detail) - Single error surface
//
// All validation failures route through this helper.
// - Console: full stack, bold red header
// - DOM: blocking red banner at top of body, non-dismissable
// - window flag: sets __protocolValidation for walkthrough to read
// - Throws to halt execution
// ============================================
function showValidationError(title: string, detail: string): never {
	console.error(`[PROTOCOL VALIDATION] ${title}\n${detail}`);
	const banner = document.createElement('div');
	banner.id = 'protocol-validation-error';
	banner.setAttribute('role', 'alert');
	banner.style.cssText = 'position:fixed;top:0;left:0;right:0;'
		+ 'background:#b71c1c;color:#fff;padding:16px 24px;'
		+ 'font-family:monospace;font-size:14px;z-index:99999;'
		+ 'white-space:pre-wrap;';
	banner.textContent = `PROTOCOL VALIDATION FAILED\n${title}\n\n${detail}`;
	document.body.prepend(banner);
	(window as any).__protocolValidation = { ok: false, title, detail };
	throw new Error(`${title}: ${detail}`);
}

// ============================================
// validateProtocolGraph() - Structural checks on protocol definition
//
// Run at page load, before first render. Checks:
// 1. Unique ids
// 2. Reachable chain via nextId (treating functions as opaque/reachable)
// 3. Exactly one terminator (step with nextId === null)
// 4. All string nextId values reference real ids
// ============================================
function validateProtocolGraph(): void {
	// Check 1: Unique ids
	const seenIds = new Set<string>();
	for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
		const id = PROTOCOL_STEPS[i].id;
		if (seenIds.has(id)) {
			showValidationError('duplicate step id', `Step ${i}: id '${id}' already seen`);
		}
		seenIds.add(id);
	}

	// Check 2 & 4: Reachable chain and valid nextId references
	const visited = new Set<string>();
	let current = PROTOCOL_STEPS[0].id;
	let iterations = 0;
	const maxIterations = PROTOCOL_STEPS.length + 10; // Prevent infinite loops
	while (current !== null && iterations < maxIterations) {
		iterations++;
		if (visited.has(current)) {
			showValidationError('cycle in nextId chain', `Step '${current}' creates a cycle`);
		}
		visited.add(current);
		const step = PROTOCOL_STEPS.find(s => s.id === current);
		if (!step) {
			showValidationError('dangling nextId', `Step with id '${current}' not in PROTOCOL_STEPS`);
		}
		const next = step!.nextId;
		// If nextId is a function, we assume all branches are reachable in this pass.
		// No step uses it yet, but the field is reserved for future branching.
		if (typeof next === 'function') {
			// Assume reachable; cannot verify static structure
			break;
		}
		current = next;
	}
	if (iterations >= maxIterations) {
		showValidationError('infinite nextId loop', 'Could not reach null terminator');
	}

	// Check 3: Exactly one terminator
	let terminators = 0;
	for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
		if (PROTOCOL_STEPS[i].nextId === null) {
			terminators++;
		}
	}
	if (terminators !== 1) {
		showValidationError('wrong number of terminators', `Expected 1, found ${terminators}`);
	}

	// Check that all visited steps match PROTOCOL_STEPS length
	if (visited.size !== PROTOCOL_STEPS.length) {
		const missing = [];
		for (const step of PROTOCOL_STEPS) {
			if (!visited.has(step.id)) {
				missing.push(step.id);
			}
		}
		showValidationError('unreachable step', `Cannot reach via nextId chain: ${missing.join(', ')}`);
	}
}

// ============================================
// validateTriggerCoverage() - Runtime trigger coverage check
//
// Run after all scene render functions have executed (via load event).
// Asserts every step in PROTOCOL_STEPS is in registeredTriggers.
// Reads from the runtime registration set populated by triggerStep() calls.
// ============================================
function validateTriggerCoverage(): void {
	const missing = [];
	for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
		const stepId = PROTOCOL_STEPS[i].id;
		if (!(window as any).__registeredTriggers.has(stepId)) {
			missing.push(stepId);
		}
	}
	if (missing.length > 0) {
		showValidationError('dead step (no trigger wired)', `No scene calls triggerStep() for: ${missing.join(', ')}`);
	}
	(window as any).__protocolValidation = { ok: true };
}

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
	const proto = document.getElementById('protocol-ui-panel');
	if (proto) proto.innerHTML = renderProtocolUI();
	renderProtocolPanel();
	renderScoreDisplay();
	renderMeters();
};

// ============================================
document.addEventListener('DOMContentLoaded', () => {
	// Validate protocol graph structure FIRST, before any other work
	validateProtocolGraph();

	// Validate protocol schema SECOND (existing check)
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

// ============================================
// Register trigger coverage check to run after page load.
// This fires after all scene render functions have executed and
// their click handlers registered via triggerStep() calls.
// ============================================
window.addEventListener('load', validateTriggerCoverage);
