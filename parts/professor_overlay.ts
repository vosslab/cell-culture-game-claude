// ============================================
// professor_overlay.ts - Persistent professor coach card
// ============================================
// Renders the angry_professor SVG as a fixed-position overlay on every scene.
// Non-clickable (pointer-events: none). Includes a dialogue chip showing the
// current step's "why" text and a mood indicator that updates on events.

function createProfessorOverlay(): void {
	const container = document.createElement('div');
	container.id = 'professor-overlay-container';
	container.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 100;
	`;

	// Professor card wrapper (top-left, OQ-2 default)
	const card = document.createElement('div');
	card.id = 'professor-card';
	card.style.cssText = `
		position: absolute;
		top: 12px;
		left: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		pointer-events: none;
	`;

	// SVG container (width will be set by renderProfessorOverlay)
	const svgWrapper = document.createElement('div');
	svgWrapper.id = 'professor-svg-wrapper';
	svgWrapper.style.cssText = `
		width: 100px;
		height: auto;
		flex-shrink: 0;
	`;

	// Dialogue chip (always visible, shows current step why text)
	const dialogueChip = document.createElement('div');
	dialogueChip.id = 'professor-dialogue-chip';
	dialogueChip.style.cssText = `
		background: #f5f5f5;
		border: 1px solid #999;
		border-radius: 4px;
		padding: 6px 8px;
		font-size: 11px;
		line-height: 1.3;
		max-width: 120px;
		word-wrap: break-word;
		white-space: normal;
		color: #333;
		font-family: Arial, sans-serif;
		text-align: center;
	`;

	card.appendChild(svgWrapper);
	card.appendChild(dialogueChip);
	container.appendChild(card);

	document.body.appendChild(container);
}

function renderProfessorOverlay(): void {
	const svgWrapper = document.getElementById('professor-svg-wrapper');
	const dialogueChip = document.getElementById('professor-dialogue-chip');

	if (!svgWrapper || !dialogueChip) return;

	// Determine width based on viewport
	const vw = window.innerWidth;
	let professorWidth = 96; // default for >=1280
	if (vw < 1280) {
		professorWidth = 68; // narrower viewports
	} else if (vw >= 1440) {
		professorWidth = 110; // larger viewports can use more
	}

	// Set SVG wrapper width
	svgWrapper.style.width = professorWidth + 'px';
	svgWrapper.innerHTML = getAngryProfessorSvg();

	// Get current step's why text
	const currentStep = getCurrentStep();
	const whyText = currentStep ? currentStep.why : 'Protocol ready';
	dialogueChip.textContent = whyText;

	// Apply mood styling
	const mood = gameState.professorMood;
	dialogueChip.style.borderColor = '#999';
	dialogueChip.style.background = '#f5f5f5';

	if (mood === 'pleased') {
		dialogueChip.style.borderColor = '#4caf50';
		dialogueChip.style.background = '#e8f5e9';
	} else if (mood === 'annoyed') {
		dialogueChip.style.borderColor = '#f44336';
		dialogueChip.style.background = '#ffebee';
	}

	// Auto-fade annoyed/pleased back to neutral after 2 seconds
	const now = Date.now();
	const elapsed = now - gameState.professorMoodSetAt;
	if (mood !== 'neutral' && elapsed > 2000) {
		gameState.professorMood = 'neutral';
		gameState.professorMoodSetAt = now;
		// Re-render to apply neutral styling
		renderProfessorOverlay();
	}
}

// ============================================
// Called from error/warning paths to set mood
function setProfessorMood(mood: 'neutral' | 'pleased' | 'annoyed'): void {
	gameState.professorMood = mood;
	gameState.professorMoodSetAt = Date.now();
	renderProfessorOverlay();
}
