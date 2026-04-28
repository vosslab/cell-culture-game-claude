// ============================================
// protocol_ui.ts - Protocol UI rendering (day ribbon, breadcrumb, step card)
// ============================================

// ============================================
// Helper: Escape HTML special characters
// ============================================
function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	};
	return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

// ============================================
// Helper: Get day label from dayId
// ============================================
function getDayLabel(dayId: string): string {
	if (dayId === 'day1') return 'Day 1';
	if (dayId === 'day2') return 'Day 2';
	if (dayId === 'day4') return 'Day 4';
	return 'Day 1';
}

// ============================================
// Helper: Get part display name from partId
// ============================================
function getPartDisplayName(partId: string): string {
	const partNames: Record<string, string> = {
		'part1_split': 'Part 1 Split',
		'part2_count': 'Part 2 Count',
		'part3_seed': 'Part 3 Seed',
		'part4_dilute': 'Part 4 Dilute',
		'part5_treat': 'Part 5 Treat',
		'part6_mtt': 'Part 6 MTT',
		'part7_read': 'Part 7 Read',
	};
	return partNames[partId] || 'Unknown Part';
}

// ============================================
// Helper: Extract day from gameState.day
// ============================================
function getCurrentDayId(): string {
	const day = gameState.day || 'day1_seed';
	if (day === 'day1_seed' || day === 'day1_wait') return 'day1';
	if (day === 'day2_treat' || day === 'day2_wait') return 'day2';
	if (day === 'day4_readout') return 'day4';
	return 'day1';
}

function getStepBubbleText(step: ProtocolStep): string {
	const action = step.action;
	if (action.indexOf('Make ') === 0) {
		return 'Prepare ' + action.slice(5);
	}
	if (action.indexOf('Add ') === 0) {
		return action;
	}
	if (action.indexOf('Place ') === 0) {
		return action;
	}
	return action;
}

// ============================================
// renderProtocolUI(): string
// Returns HTML for day ribbon + breadcrumb + current-step card + upcoming steps
// ============================================
function renderProtocolUI(): string {
	const currentStep = getCurrentStep();
	if (!currentStep) {
		return '';
	}

	const currentDayId = getCurrentDayId();

	// Day ribbon with all three days
	const dayRibbon = renderDayRibbon(currentDayId);

	// Breadcrumb: "Day 2 > Part 5 Treat > Step 3 of 5"
	const dayLabel = getDayLabel(currentStep.dayId);
	const partName = getPartDisplayName(currentStep.partId);
	const stepsInPart = PROTOCOL_STEPS.filter(
		(s) => s.partId === currentStep.partId
	).length;
	const breadcrumb = `<div class="protocol-breadcrumb">${escapeHtml(dayLabel)} &gt; ${escapeHtml(partName)} &gt; Step ${currentStep.stepIndex} of ${stepsInPart}</div>`;

	// Current step card
	const stepCard = renderStepCard(currentStep);

	// Upcoming steps (next 1-2)
	const upcoming = renderUpcomingSteps(currentStep.id);
	const stepBubble = `
		<div class="protocol-step-bubble">
			<div class="protocol-step-bubble-image" aria-hidden="true">${SVG_ANGRY_PROFESSOR}</div>
			<div class="protocol-step-bubble-copy">
				<div class="protocol-step-bubble-label">Next step</div>
				<div class="protocol-step-bubble-text">${escapeHtml(getStepBubbleText(currentStep))}</div>
				<div class="protocol-step-bubble-subtext">${escapeHtml(currentStep.why)}</div>
			</div>
		</div>
	`;

	return stepBubble + dayRibbon + breadcrumb + stepCard + upcoming;
}

// ============================================
// renderDayRibbon(currentDayId: string): string
// ============================================
function renderDayRibbon(currentDayId: string): string {
	const days = ['day1', 'day2', 'day4'];
	const labels = ['Day 1', 'Day 2', 'Day 4'];

	let html = '<div class="protocol-day-ribbon">';
	for (let i = 0; i < days.length; i++) {
		const dayId = days[i];
		const label = labels[i];
		const isActive = dayId === currentDayId;
		const activeClass = isActive ? 'active' : '';
		html += `<span class="day-pill ${activeClass}">${escapeHtml(label)}</span>`;
	}
	html += '</div>';
	return html;
}

// ============================================
// renderStepCard(step: ProtocolStep): string
// Current step card with action, why, and required items
// ============================================
function renderStepCard(step: ProtocolStep): string {
	// Escape action and why text
	const action = escapeHtml(step.action);
	const why = escapeHtml(step.why);

	// Required items: show up to 4, collapse excess to "+N more"
	const requiredItems = step.requiredItems || [];
	const maxItems = 4;
	let itemsHtml = '';

	for (let i = 0; i < Math.min(requiredItems.length, maxItems); i++) {
		const itemId = escapeHtml(requiredItems[i]);
		itemsHtml += `<span class="item-chip">${itemId}</span>`;
	}

	if (requiredItems.length > maxItems) {
		const extra = requiredItems.length - maxItems;
		itemsHtml += `<span class="item-chip more">+${extra} more</span>`;
	}

	const itemsSection =
		requiredItems.length > 0
			? `<div class="step-items">${itemsHtml}</div>`
			: '';

	return `
		<div class="protocol-step-card">
			<div class="step-action">${action}</div>
			<div class="step-why">${why}</div>
			${itemsSection}
		</div>
	`;
}

// ============================================
// renderUpcomingSteps(currentStepId: string): string
// Show next 1-2 upcoming steps at reduced opacity.
// Walks the nextId chain instead of array position.
// ============================================
function renderUpcomingSteps(currentStepId: string): string {
	const maxUpcoming = 2;
	let html = '<div class="protocol-upcoming">';

	// Walk the nextId chain to find upcoming steps
	let upcomingCount = 0;
	let nextId: string | null = null;
	const currentStep = PROTOCOL_STEPS.find(s => s.id === currentStepId);
	if (currentStep && typeof currentStep.nextId === 'string') {
		nextId = currentStep.nextId;
	}

	while (nextId !== null && upcomingCount < maxUpcoming) {
		const nextStep = PROTOCOL_STEPS.find(s => s.id === nextId);
		if (!nextStep) break;
		const actionText = escapeHtml(nextStep.action);
		html += `<div class="upcoming-step">Next: ${actionText}</div>`;
		// Advance to the step after nextStep
		if (typeof nextStep.nextId === 'string') {
			nextId = nextStep.nextId;
		} else {
			nextId = null;
		}
		upcomingCount++;
	}

	html += '</div>';
	return html;
}

// ============================================
// showPartIntro(partId: string): void
// One-shot modal showing part intro; checks gameState.seenPartIntros
// ============================================
function showPartIntro(partId: string): void {
	// Defensive read: seenPartIntros may not exist on older gameState
	const seenIntros = gameState.seenPartIntros || [];

	// Only show if not yet seen
	if (seenIntros.indexOf(partId) >= 0) {
		return;
	}

	// Mark as seen
	if (!gameState.seenPartIntros) {
		gameState.seenPartIntros = [];
	}
	gameState.seenPartIntros.push(partId);

	// Build intro text (simple description based on partId)
	const partName = getPartDisplayName(partId);
	const introTexts: Record<string, string> = {
		'part1_split': 'Part 1 Split: Prepare cells by aspirating old media, washing, adding trypsin, and neutralizing with fresh media.',
		'part2_count': 'Part 2 Count: Spin down cells in centrifuge, resuspend in media, and count on the cell counter.',
		'part3_seed': 'Part 3 Seed: Seed cells into the 96-well plate at 2e4 cells per well and incubate overnight.',
		'part4_dilute': 'Part 4 Dilute: Prepare Carboplatin and Metformin working stocks for the dose-response assay.',
		'part5_treat': 'Part 5 Treat: Add drugs to the plate in an 8-point dose series and incubate 48 hours.',
		'part6_mtt': 'Part 6 MTT: Add MTT reagent, incubate, decant, and dissolve formazan in DMSO.',
		'part7_read': 'Part 7 Read: Read the plate at 560 nm and review the dose-response curves.',
	};

	const introText = introTexts[partId] || `Beginning ${partName}`;

	// Create modal overlay
	const modal = document.createElement('div');
	modal.className = 'protocol-part-intro-modal';
	modal.innerHTML = `
		<h3>${escapeHtml(partName)}</h3>
		<p>${escapeHtml(introText)}</p>
		<button class="btn-primary" id="intro-ok-btn">OK</button>
	`;

	document.body.appendChild(modal);

	// Close on button click
	const okBtn = modal.querySelector('#intro-ok-btn');
	if (okBtn) {
		okBtn.addEventListener('click', () => {
			modal.remove();
		});
	}

	// Close on Esc key
	const closeModal = () => {
		if (modal.parentElement) {
			modal.remove();
		}
	};
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeModal();
		}
	}, { once: true });
}

// ============================================
// showStepTransition(completedAction: string, nextAction: string): void
// Brief inline confirmation that a step completed and next is starting
// ============================================
function showStepTransition(completedAction: string, nextAction: string): void {
	// For simplicity, use existing showNotification helper
	// This displays a brief toast message like: "Aspirate old media. Next: Wash the flask."
	const message = escapeHtml(completedAction) + '. Next: ' + escapeHtml(nextAction);
	showNotification(message, 'info');
}
