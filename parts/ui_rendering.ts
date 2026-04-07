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
		if (isCurrent) {
			li.classList.add('current');
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

	// Show the latest warning with a count if multiple
	const latestWarning = gameState.warnings[gameState.warnings.length - 1];
	let displayText = latestWarning;
	if (gameState.warnings.length > 1) {
		displayText += ' (' + gameState.warnings.length + ' warnings total)';
	}
	warningEl.textContent = displayText;
	warningEl.style.display = 'block';
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
					<div style="font-weight: 600; color: #212121;">Order & Sequence</div>
					<div style="color: #757575;">${scoreResult.categories.order.points}/${scoreResult.categories.order.maxPoints} points</div>
					<div style="color: #78909c; font-size: 12px; margin-top: 4px;">${scoreResult.categories.order.feedback}</div>
				</div>
				<div style="margin-bottom: 12px;">
					<div style="font-weight: 600; color: #212121;">Cleanliness</div>
					<div style="color: #757575;">${scoreResult.categories.cleanliness.points}/${scoreResult.categories.cleanliness.maxPoints} points</div>
					<div style="color: #78909c; font-size: 12px; margin-top: 4px;">${scoreResult.categories.cleanliness.feedback}</div>
				</div>
				<div style="margin-bottom: 12px;">
					<div style="font-weight: 600; color: #212121;">Media Usage</div>
					<div style="color: #757575;">${scoreResult.categories.wastedMedia.points}/${scoreResult.categories.wastedMedia.maxPoints} points</div>
					<div style="color: #78909c; font-size: 12px; margin-top: 4px;">${scoreResult.categories.wastedMedia.feedback}</div>
				</div>
				<div>
					<div style="font-weight: 600; color: #212121;">Timing</div>
					<div style="color: #757575;">${scoreResult.categories.timing.points}/${scoreResult.categories.timing.maxPoints} points</div>
					<div style="color: #78909c; font-size: 12px; margin-top: 4px;">${scoreResult.categories.timing.feedback}</div>
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
// showVolumeIndicator(volumeMl: number, targetMl: number): void
// Display volume during pipetting with color-coding
// ============================================
const showVolumeIndicator = (volumeMl: number, targetMl: number): void => {
	const volumeIndicator = document.getElementById('volume-indicator') as HTMLDivElement;
	if (!volumeIndicator) return;

	volumeIndicator.style.display = 'block';

	const tolerance = targetMl * 0.1; // 10% tolerance
	let fillColor = '#ef5350'; // red (far off)

	if (Math.abs(volumeMl - targetMl) <= tolerance * 0.5) {
		fillColor = '#4caf50'; // green (within tolerance)
	} else if (Math.abs(volumeMl - targetMl) <= tolerance) {
		fillColor = '#ff9800'; // yellow (close)
	}

	const fillPercent = targetMl > 0 ? (volumeMl / targetMl) * 100 : 0;
	const boundedPercent = Math.min(Math.max(fillPercent, 0), 100);

	const volumeFill = volumeIndicator.querySelector('.volume-fill') as HTMLDivElement;
	if (volumeFill) {
		volumeFill.style.backgroundColor = fillColor;
		volumeFill.style.width = `${boundedPercent}%`;
	}

	const volumeText = volumeIndicator.querySelector('.volume-text') as HTMLDivElement;
	if (volumeText) {
		volumeText.textContent = `${volumeMl.toFixed(1)} / ${targetMl.toFixed(1)} mL`;
	}
};

// ============================================
// hideVolumeIndicator(): void
// Hide the volume indicator
// ============================================
const hideVolumeIndicator = (): void => {
	const volumeIndicator = document.getElementById('volume-indicator') as HTMLDivElement;
	if (volumeIndicator) {
		volumeIndicator.style.display = 'none';
	}
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
