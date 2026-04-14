// ============================================
// ui_rendering.ts - UI rendering functions
// ============================================

// ============================================
// renderProtocolPanel() - Render the protocol checklist in the sidebar
// ============================================
const renderProtocolPanel = (): void => {
	const checklist = document.getElementById('protocol-checklist') as HTMLUListElement;
	if (!checklist) return;

	checklist.innerHTML = '';

	PROTOCOL_STEPS.forEach((step, index) => {
		const isCompleted = gameState.completedSteps.includes(step.id);
		const isCurrent = gameState.currentStep === index;

		const li = document.createElement('li');
		li.className = 'protocol-step';
		if (isCompleted) {
			li.classList.add('completed');
		} else if (isCurrent) {
			li.classList.add('current');
		} else {
			li.classList.add('future');
		}

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.id = `step-${step.id}`;
		checkbox.checked = isCompleted;
		checkbox.disabled = true;

		const label = document.createElement('label');
		label.htmlFor = `step-${step.id}`;
		label.textContent = `${index + 1}. ${step.label}`;

		li.appendChild(checkbox);
		li.appendChild(label);
		checklist.appendChild(li);
	});
};

// ============================================
// renderScoreDisplay() - Show current progress at top of protocol panel
// ============================================
const renderScoreDisplay = (): void => {
	const scoreDisplay = document.getElementById('score-display') as HTMLDivElement;
	if (!scoreDisplay) return;

	const completedCount = gameState.completedSteps.length;
	const totalCount = PROTOCOL_STEPS.length;
	const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

	scoreDisplay.innerHTML = `
		<div class="score-label">Protocol Progress</div>
		<div class="score-value">${completedCount}/${totalCount}</div>
		<div class="progress-bar" style="margin-top: 12px;">
			<div class="progress-fill" style="width: ${progressPercent}%"></div>
		</div>
	`;
};

// ============================================
// showNotification(message: string, type?: string): void
// Toast notification system - REPLACES the forward declaration in game_state.ts
// ============================================
showNotification = function(message: string, type: string = 'info'): void {
	const notificationArea = document.getElementById('notification-area') as HTMLDivElement;
	if (!notificationArea) return;

	const notification = document.createElement('div');
	notification.className = `notification ${type}`;
	notification.textContent = message;

	notificationArea.appendChild(notification);

	// Keep at most 3 visible notifications; remove oldest if over limit
	const existing = notificationArea.querySelectorAll('.notification:not(.fade-out)');
	if (existing.length > 3) {
		const oldest = existing[0] as HTMLElement;
		oldest.classList.add('fade-out');
		setTimeout(() => { oldest.remove(); }, 300);
	}

	// Auto-fade after 3 seconds
	setTimeout(() => {
		notification.classList.add('fade-out');
		setTimeout(() => {
			notification.remove();
		}, 300);
	}, 3000);
};

// ============================================
// renderWarningBanner(): void
// Show the latest warning in the protocol panel - REPLACES forward declaration
// ============================================
renderWarningBanner = function(): void {
	const warningEl = document.getElementById('warning-banner');
	if (!warningEl) return;

	if (gameState.warnings.length === 0) {
		warningEl.style.display = 'none';
		return;
	}

	// Show all warnings in a scrollable list (newest first)
	let html = '';
	// Show up to 5 most recent warnings, with expand option
	const maxVisible = 5;
	const warnings = gameState.warnings.slice().reverse();
	const visibleWarnings = warnings.slice(0, maxVisible);

	for (let i = 0; i < visibleWarnings.length; i++) {
		html += '<div class="warning-item">' + visibleWarnings[i] + '</div>';
	}
	if (warnings.length > maxVisible) {
		html += '<div class="warning-item" style="font-style:italic;opacity:0.7;">';
		html += '...and ' + (warnings.length - maxVisible) + ' more warnings</div>';
	}

	warningEl.innerHTML = html;
	warningEl.style.display = 'block';
};

// ============================================
// buildWarningListHtml(): string
// Build HTML for warning list, reusable in results screen
// ============================================
const buildWarningListHtml = (): string => {
	if (gameState.warnings.length === 0) {
		return '';
	}
	let html = '<div style="margin-top:16px;border-top:1px solid #eceff1;padding-top:16px;">';
	html += '<div style="font-weight:600;color:#212121;margin-bottom:8px;">Warnings & Errors</div>';
	html += '<div style="max-height:150px;overflow-y:auto;font-size:13px;">';
	for (let i = 0; i < gameState.warnings.length; i++) {
		html += '<div style="padding:6px 0;color:#e65100;border-bottom:1px solid #fff3e0;">';
		html += (i + 1) + '. ' + gameState.warnings[i];
		html += '</div>';
	}
	html += '</div></div>';
	return html;
};

// ============================================
// renderResultsScreen(scoreResult: ScoreResult): void
// End-of-game results overlay
// ============================================
const renderResultsScreen = (scoreResult: ScoreResult): void => {
	const resultsScreen = document.getElementById('results-screen') as HTMLDivElement;
	if (!resultsScreen) return;

	// Build star display
	let starsHtml = '';
	for (let i = 1; i <= 3; i++) {
		if (i <= scoreResult.stars) {
			starsHtml += '<span style="color: #ffc107; font-size: 36px; margin: 0 4px;">&#9733;</span>';
		} else {
			starsHtml += '<span style="color: #ddd; font-size: 36px; margin: 0 4px;">&#9734;</span>';
		}
	}

	// Build category feedback HTML
	const categoryFeedback = `
		<div style="margin-top: 20px; border-top: 1px solid #eceff1; padding-top: 16px;">
			<div style="text-align: left; font-size: 13px;">
				<div style="margin-bottom: 12px;">
					<div style="font-weight: 600; color: #212121;">Dilution Accuracy</div>
					<div style="color: #757575;">${scoreResult.categories.dilutionAccuracy.points}/${scoreResult.categories.dilutionAccuracy.maxPoints} points</div>
					<div style="color: #78909c; font-size: 12px; margin-top: 4px;">${scoreResult.categories.dilutionAccuracy.feedback}</div>
				</div>
				<div style="margin-bottom: 12px;">
					<div style="font-weight: 600; color: #212121;">Plate Map</div>
					<div style="color: #757575;">${scoreResult.categories.plateMap.points}/${scoreResult.categories.plateMap.maxPoints} points</div>
					<div style="color: #78909c; font-size: 12px; margin-top: 4px;">${scoreResult.categories.plateMap.feedback}</div>
				</div>
				<div style="margin-bottom: 12px;">
					<div style="font-weight: 600; color: #212121;">Timing</div>
					<div style="color: #757575;">${scoreResult.categories.timing.points}/${scoreResult.categories.timing.maxPoints} points</div>
					<div style="color: #78909c; font-size: 12px; margin-top: 4px;">${scoreResult.categories.timing.feedback}</div>
				</div>
				<div style="margin-bottom: 12px;">
					<div style="font-weight: 600; color: #212121;">MTT Technique</div>
					<div style="color: #757575;">${scoreResult.categories.mttTechnique.points}/${scoreResult.categories.mttTechnique.maxPoints} points</div>
					<div style="color: #78909c; font-size: 12px; margin-top: 4px;">${scoreResult.categories.mttTechnique.feedback}</div>
				</div>
				<div>
					<div style="font-weight: 600; color: #212121;">Absorbance Plausibility</div>
					<div style="color: #757575;">${scoreResult.categories.absorbancePlausibility.points}/${scoreResult.categories.absorbancePlausibility.maxPoints} points</div>
					<div style="color: #78909c; font-size: 12px; margin-top: 4px;">${scoreResult.categories.absorbancePlausibility.feedback}</div>
				</div>
			</div>
		</div>
	`;

	// Determine encouraging message based on score
	let message = 'Great job!';
	if (scoreResult.stars >= 3) {
		message = 'Outstanding work! You executed the protocol with precision and care.';
	} else if (scoreResult.stars >= 2) {
		message = 'Good effort! You followed the protocol well. Keep practicing for even better results.';
	} else {
		message = 'Nice try! Review the protocol steps and try again to improve your technique.';
	}

	const resultsContent = resultsScreen.querySelector('.results-content') as HTMLDivElement;
	if (!resultsContent) return;

	resultsContent.innerHTML = `
		<div style="text-align: center; margin-bottom: 20px;">
			${starsHtml}
		</div>
		<div style="font-size: 48px; font-weight: 700; color: #4caf50; margin-bottom: 20px;">
			${scoreResult.totalPoints}
		</div>
		<div style="padding: 16px; background-color: #f0f2f5; border-radius: 8px; font-size: 14px; color: #212121; line-height: 1.6;">
			${message}
		</div>
		${categoryFeedback}
		${buildWarningListHtml()}
		<button id="play-again-btn" class="btn-primary" style="margin-top: 20px;">Play Again</button>
	`;

	// Add event listener to Play Again button
	const playAgainBtn = document.getElementById('play-again-btn') as HTMLButtonElement;
	if (playAgainBtn) {
		playAgainBtn.addEventListener('click', () => {
			resetGame();
		});
	}

	// Show the results screen
	resultsScreen.classList.add('active');
};

// ============================================
// showTransferHud(volumeMl, targetMl, operationLabel, onStop): void
// Unified transfer HUD with progress bar, volume text, and stop button
// ============================================
const showTransferHud = (volumeMl: number, targetMl: number, operationLabel: string, onStop: (() => void) | null): void => {
	let hud = document.getElementById('transfer-hud') as HTMLDivElement;
	const hoodScene = document.getElementById('hood-scene');
	if (!hoodScene) return;

	// Create HUD element if it does not exist yet
	if (!hud) {
		hud = document.createElement('div');
		hud.id = 'transfer-hud';
		hud.className = 'transfer-hud';
		hoodScene.appendChild(hud);
	}

	hud.style.display = 'block';

	// Determine fill color based on proximity to target
	const tolerance = targetMl * 0.1;
	let fillColor = '#ef5350';
	if (Math.abs(volumeMl - targetMl) <= tolerance * 0.5) {
		fillColor = '#4caf50';
	} else if (Math.abs(volumeMl - targetMl) <= tolerance) {
		fillColor = '#ff9800';
	}

	// Compute fill percentage (max at target, can exceed for overfill)
	const maxDisplay = targetMl * 1.2;
	const fillPercent = maxDisplay > 0 ? (volumeMl / maxDisplay) * 100 : 0;
	const boundedPercent = Math.min(Math.max(fillPercent, 0), 100);
	// Target marker position
	const targetPercent = maxDisplay > 0 ? (targetMl / maxDisplay) * 100 : 0;

	// Build HUD inner HTML
	let html = '';
	html += '<div class="transfer-hud-label">' + operationLabel + '</div>';
	html += '<div class="transfer-hud-bar">';
	html += '<div class="transfer-hud-fill" style="width:' + boundedPercent + '%;background-color:' + fillColor + ';"></div>';
	html += '<div class="transfer-hud-target" style="left:' + targetPercent + '%;"></div>';
	html += '</div>';
	html += '<div class="transfer-hud-text">' + volumeMl.toFixed(1) + ' / ' + targetMl.toFixed(1) + ' mL</div>';
	if (onStop) {
		html += '<button class="transfer-hud-stop" id="transfer-hud-stop-btn">Stop</button>';
	}
	hud.innerHTML = html;

	// Wire stop button
	if (onStop) {
		const stopBtn = document.getElementById('transfer-hud-stop-btn');
		if (stopBtn) {
			stopBtn.addEventListener('click', onStop);
		}
	}
};

// ============================================
// Backwards-compatible wrappers for showVolumeIndicator / hideVolumeIndicator
// ============================================
const showVolumeIndicator = (volumeMl: number, targetMl: number): void => {
	// Delegates to showTransferHud with a generic label and no stop button
	showTransferHud(volumeMl, targetMl, 'Volume', null);
};

// ============================================
// hideTransferHud(): void
// Hide the transfer HUD
// ============================================
const hideTransferHud = (): void => {
	const hud = document.getElementById('transfer-hud');
	if (hud) {
		hud.style.display = 'none';
	}
};

const hideVolumeIndicator = (): void => {
	hideTransferHud();
};

// ============================================
// renderMeters(): void
// Render 3 live gauge meters in the protocol panel sidebar:
// Cell Health, Confluency, and Contamination Risk
// ============================================
const renderMeters = (): void => {
	const metersPanel = document.getElementById('meters-panel');
	if (!metersPanel) return;

	// Derive values from global gameState
	const healthPct = Math.round(gameState.cellViability * 100);
	const confluencyPct = Math.round(INITIAL_CONFLUENCY * 100);
	// Contamination risk: escalates with cleanliness errors, clamped to 0-100
	const contaminationPct = Math.min(gameState.cleanlinessErrors * 15, 100);

	// Determine bar color for cell health (green >=80, yellow 60-79, red <60)
	let healthColor = '#4caf50';
	if (healthPct < 60) {
		healthColor = '#ef5350';
	} else if (healthPct < 80) {
		healthColor = '#ff9800';
	}

	// Determine bar color for confluency (green >=70, yellow 50-69, red <50)
	let confluencyColor = '#4caf50';
	if (confluencyPct < 50) {
		confluencyColor = '#ef5350';
	} else if (confluencyPct < 70) {
		confluencyColor = '#ff9800';
	}

	// Determine bar color for contamination (inverted: green <=10, yellow 11-25, red >25)
	let contaminationColor = '#4caf50';
	if (contaminationPct > 25) {
		contaminationColor = '#ef5350';
	} else if (contaminationPct > 10) {
		contaminationColor = '#ff9800';
	}

	// Build the meters HTML using string concatenation
	let html = '';
	html += '<div class="meters-panel">';

	// Cell Health meter
	html += '<div class="meter-item">';
	html += '<div class="meter-label">Cell Health</div>';
	html += '<div class="meter-bar">';
	html += '<div class="meter-fill" style="width: ' + healthPct + '%;';
	html += ' background-color: ' + healthColor + ';"></div>';
	html += '</div>';
	html += '<div class="meter-value">' + healthPct + '%</div>';
	html += '</div>';

	// Confluency meter
	html += '<div class="meter-item">';
	html += '<div class="meter-label">Confluency</div>';
	html += '<div class="meter-bar">';
	html += '<div class="meter-fill" style="width: ' + confluencyPct + '%;';
	html += ' background-color: ' + confluencyColor + ';"></div>';
	html += '</div>';
	html += '<div class="meter-value">' + confluencyPct + '%</div>';
	html += '</div>';

	// Contamination Risk meter
	html += '<div class="meter-item">';
	html += '<div class="meter-label">Contamination Risk</div>';
	html += '<div class="meter-bar">';
	html += '<div class="meter-fill" style="width: ' + contaminationPct + '%;';
	html += ' background-color: ' + contaminationColor + ';"></div>';
	html += '</div>';
	html += '<div class="meter-value">' + contaminationPct + '%</div>';
	html += '</div>';

	html += '</div>';
	metersPanel.innerHTML = html;
};

// ============================================
// renderToolbar(): string
// Return HTML for a toolbar showing available tools
// ============================================
const renderToolbar = (): string => {
	const currentStep = getCurrentStep();
	if (!currentStep) {
		return '';
	}

	// Determine which tools are available based on current scene and step
	let tools: Array<{ id: string; label: string; icon: string }> = [];

	if (gameState.activeScene === 'hood') {
		if (currentStep.requiredAction === 'spray_ethanol') {
			tools = [
				{ id: 'ethanol_bottle', label: 'Ethanol', icon: '[E]' }
			];
		} else if (currentStep.requiredAction === 'aspirate') {
			tools = [
				{ id: 'aspirating_pipette', label: 'Aspirate', icon: '[A]' }
			];
		} else if (currentStep.requiredAction === 'pipette_media') {
			tools = [
				{ id: 'serological_pipette', label: 'Pipette', icon: '[P]' },
				{ id: 'pipette_aid', label: 'Aid', icon: '[+]' }
			];
		} else if (currentStep.requiredAction === 'pipette_drug') {
			tools = [
				{ id: 'micropipette', label: 'Micropipette', icon: '[M]' }
			];
		}
	} else if (gameState.activeScene === 'incubator') {
		tools = [
			{ id: 'incubator', label: 'Incubator', icon: '[*]' }
		];
	} else if (gameState.activeScene === 'microscope') {
		tools = [
			{ id: 'microscope', label: 'Microscope', icon: '[O]' }
		];
	}

	// Build toolbar HTML
	let html = '<div style="display: flex; gap: 8px; margin-bottom: 16px;">';

	tools.forEach(tool => {
		const isSelected = gameState.selectedTool === tool.id;
		const bgColor = isSelected ? '#4caf50' : '#f0f2f5';
		const textColor = isSelected ? '#ffffff' : '#212121';

		html += `
			<button
				data-tool-id="${tool.id}"
				style="
					padding: 8px 12px;
					background-color: ${bgColor};
					color: ${textColor};
					border: 1px solid #eceff1;
					border-radius: 6px;
					font-size: 12px;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.2s ease;
					display: flex;
					align-items: center;
					gap: 4px;
				"
			>
				${tool.icon} ${tool.label}
			</button>
		`;
	});

	html += '</div>';
	return html;
};
