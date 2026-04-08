// ============================================
// ui/sidebar.ts - Sidebar rendering: protocol panel, score, results, warnings, volume
// ============================================
// These functions read GameState and render to DOM elements.
// This IS the UI layer, so direct DOM access is expected.

import type { GameState, ScoreResult, Step, WarningEntry } from "../core/types";
import { GAME_CONFIG } from "../core/engine";

// ============================================
// renderProtocolPanel() - Render the protocol checklist in the sidebar
// ============================================
export function renderProtocolPanel(state: GameState, steps: Step[]): void {
	const checklist = document.getElementById("protocol-checklist") as HTMLUListElement;
	if (!checklist) return;

	// Clear previous entries before rebuilding
	checklist.innerHTML = "";

	steps.forEach((step, index) => {
		const isCompleted = state.protocol.completedSteps.indexOf(step.id) >= 0;
		const isCurrent = state.protocol.activeStepId === step.id;

		// Build the list item for this protocol step
		const li = document.createElement("li");
		li.className = "protocol-step";
		if (isCurrent) {
			li.classList.add("current");
		}

		// Disabled checkbox shows completion state without allowing user toggling
		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = "step-" + step.id;
		checkbox.checked = isCompleted;
		checkbox.disabled = true;

		// Label text includes the 1-based step number and the step title
		const label = document.createElement("label");
		label.htmlFor = "step-" + step.id;
		label.textContent = (index + 1) + ". " + step.title;

		li.appendChild(checkbox);
		li.appendChild(label);
		checklist.appendChild(li);
	});
}

// ============================================
// renderScoreDisplay() - Show current progress at top of protocol panel
// ============================================
export function renderScoreDisplay(state: GameState, steps: Step[]): void {
	const scoreDisplay = document.getElementById("score-display") as HTMLDivElement;
	if (!scoreDisplay) return;

	const completedCount = state.protocol.completedSteps.length;
	const totalCount = steps.length;
	// Calculate progress as a percentage for the fill bar width
	const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

	scoreDisplay.innerHTML =
		'<div class="score-label">Protocol Progress</div>'
		+ '<div class="score-value">' + completedCount + "/" + totalCount + "</div>"
		+ '<div class="progress-bar" style="margin-top: 12px;">'
		+ '<div class="progress-fill" style="width: ' + progressPercent + '%"></div>'
		+ "</div>";
}

// ============================================
// renderResultsScreen() - End-of-game results overlay
// ============================================
export function renderResultsScreen(scoreResult: ScoreResult): void {
	const resultsScreen = document.getElementById("results-screen") as HTMLDivElement;
	if (!resultsScreen) return;

	// Build star display: filled star for earned, empty star for unearned
	let starsHtml = "";
	for (let i = 1; i <= 3; i++) {
		if (i <= scoreResult.stars) {
			// Filled star (&#9733;) in gold
			starsHtml += "<span style='color: #ffc107; font-size: 36px; margin: 0 4px;'>&#9733;</span>";
		} else {
			// Empty star (&#9734;) in light gray
			starsHtml += "<span style='color: #ddd; font-size: 36px; margin: 0 4px;'>&#9734;</span>";
		}
	}

	// Build per-category feedback breakdown
	const categoryFeedback = buildCategoryFeedback(scoreResult);

	// Determine encouraging message based on star count
	let message = "Great job!";
	if (scoreResult.stars >= 3) {
		message = "Outstanding work! You executed the protocol with precision and care.";
	} else if (scoreResult.stars >= 2) {
		message = "Good effort! You followed the protocol well. Keep practicing for even better results.";
	} else {
		message = "Nice try! Review the protocol steps and try again to improve your technique.";
	}

	// Locate the inner content container
	const resultsContent = resultsScreen.querySelector(".results-content") as HTMLDivElement;
	if (!resultsContent) return;

	// Assemble the results HTML
	let html = "";
	html += '<div style="text-align: center; margin-bottom: 20px;">';
	html += starsHtml;
	html += "</div>";
	html += '<div style="font-size: 48px; font-weight: 700; color: #4caf50; margin-bottom: 20px;">';
	html += String(scoreResult.totalPoints);
	html += "</div>";
	html += '<div style="padding: 16px; background-color: #f0f2f5; border-radius: 8px;'
		+ ' font-size: 14px; color: #212121; line-height: 1.6;">';
	html += message;
	html += "</div>";
	html += categoryFeedback;
	html += '<button id="play-again-btn" class="btn-primary" style="margin-top: 20px;">Play Again</button>';

	resultsContent.innerHTML = html;

	// Attach the Play Again click handler
	const playAgainBtn = document.getElementById("play-again-btn") as HTMLButtonElement;
	if (playAgainBtn) {
		playAgainBtn.addEventListener("click", () => {
			// Reload the page for a clean restart
			window.location.reload();
		});
	}

	// Show the results screen overlay
	resultsScreen.classList.add("active");
}

// ============================================
// buildCategoryFeedback() - Build HTML for the four scoring categories
// ============================================
function buildCategoryFeedback(scoreResult: ScoreResult): string {
	const categories = scoreResult.categories;

	// Each row: label, points/max, and feedback text
	let html = '<div style="margin-top: 20px; border-top: 1px solid #eceff1; padding-top: 16px;">';
	html += '<div style="text-align: left; font-size: 13px;">';

	// Order and Sequence
	html += buildCategoryRow(
		"Order &amp; Sequence",
		categories.order.points,
		categories.order.maxPoints,
		categories.order.feedback,
	);

	// Cleanliness
	html += buildCategoryRow(
		"Cleanliness",
		categories.cleanliness.points,
		categories.cleanliness.maxPoints,
		categories.cleanliness.feedback,
	);

	// Media Usage
	html += buildCategoryRow(
		"Media Usage",
		categories.wastedMedia.points,
		categories.wastedMedia.maxPoints,
		categories.wastedMedia.feedback,
	);

	// Timing (last row, no bottom margin)
	html += "<div>";
	html += '<div style="font-weight: 600; color: #212121;">Timing</div>';
	html += '<div style="color: #757575;">';
	html += categories.timing.points + "/" + categories.timing.maxPoints + " points";
	html += "</div>";
	html += '<div style="color: #78909c; font-size: 12px; margin-top: 4px;">';
	html += categories.timing.feedback;
	html += "</div>";
	html += "</div>";

	html += "</div>";
	html += "</div>";
	return html;
}

// ============================================
// buildCategoryRow() - Single category row with bottom margin
// ============================================
function buildCategoryRow(
	label: string,
	points: number,
	maxPoints: number,
	feedback: string,
): string {
	let html = '<div style="margin-bottom: 12px;">';
	html += '<div style="font-weight: 600; color: #212121;">' + label + "</div>";
	html += '<div style="color: #757575;">' + points + "/" + maxPoints + " points</div>";
	html += '<div style="color: #78909c; font-size: 12px; margin-top: 4px;">' + feedback + "</div>";
	html += "</div>";
	return html;
}

// ============================================
// renderWarningBanner() - Show the latest warning in the protocol panel
// ============================================
export function renderWarningBanner(warnings: WarningEntry[]): void {
	const warningEl = document.getElementById("warning-banner");
	if (!warningEl) return;

	// Hide when there are no warnings
	if (warnings.length === 0) {
		warningEl.style.display = "none";
		return;
	}

	// Show the latest warning, plus a count indicator if multiple
	const latestWarning = warnings[warnings.length - 1];
	if (!latestWarning) return;

	let displayText = latestWarning.message;
	if (warnings.length > 1) {
		displayText += " (" + warnings.length + " warnings total)";
	}
	warningEl.textContent = displayText;
	warningEl.style.display = "block";
}

// ============================================
// showVolumeIndicator() - Display volume during pipetting with color-coding
// ============================================
export function showVolumeIndicator(volumeMl: number, targetMl: number): void {
	const volumeIndicator = document.getElementById("volume-indicator") as HTMLDivElement;
	if (!volumeIndicator) return;

	volumeIndicator.style.display = "block";

	// Color coding based on how close the volume is to the target
	// Green = within 5% tolerance, yellow = within 10%, red = far off
	const tolerance = targetMl * 0.1;
	let fillColor = "#ef5350"; // red (far off)

	if (Math.abs(volumeMl - targetMl) <= tolerance * 0.5) {
		// Within 5% of target -- green
		fillColor = "#4caf50";
	} else if (Math.abs(volumeMl - targetMl) <= tolerance) {
		// Within 10% of target -- yellow/orange
		fillColor = "#ff9800";
	}

	// Calculate fill width as a percentage of target, clamped to [0, 100]
	const fillPercent = targetMl > 0 ? (volumeMl / targetMl) * 100 : 0;
	const boundedPercent = Math.min(Math.max(fillPercent, 0), 100);

	// Update the fill bar color and width
	const volumeFill = volumeIndicator.querySelector(".volume-fill") as HTMLDivElement;
	if (volumeFill) {
		volumeFill.style.backgroundColor = fillColor;
		volumeFill.style.width = boundedPercent + "%";
	}

	// Update the numeric readout text
	const volumeText = volumeIndicator.querySelector(".volume-text") as HTMLDivElement;
	if (volumeText) {
		volumeText.textContent = volumeMl.toFixed(1) + " / " + targetMl.toFixed(1) + " mL";
	}
}

// ============================================
// hideVolumeIndicator() - Hide the volume indicator
// ============================================
export function hideVolumeIndicator(): void {
	const volumeIndicator = document.getElementById("volume-indicator") as HTMLDivElement;
	if (volumeIndicator) {
		volumeIndicator.style.display = "none";
	}
}

// ============================================
// renderMeters() - Render 3 live gauge meters in the protocol panel sidebar:
// Cell Health, Confluency, and Contamination Risk
// ============================================
export function renderMeters(state: GameState): void {
	const metersPanel = document.getElementById("meters-panel");
	if (!metersPanel) return;

	// Derive values from game state
	const healthPct = Math.round(state.lab.cellViability * 100);
	const flask = state.lab.vessels["tc.flask"];
	const confluencyPct = Math.round(
		(flask ? flask.confluency : GAME_CONFIG.initialConfluency) * 100
	);
	// Contamination risk from sterility state (0-100)
	const contaminationPct = Math.round(state.lab.sterility.contaminationRisk);

	// Determine bar color for cell health (green >=80, yellow 60-79, red <60)
	let healthColor = "#4caf50";
	if (healthPct < 60) {
		healthColor = "#ef5350";
	} else if (healthPct < 80) {
		healthColor = "#ff9800";
	}

	// Determine bar color for confluency (green >=70, yellow 50-69, red <50)
	let confluencyColor = "#4caf50";
	if (confluencyPct < 50) {
		confluencyColor = "#ef5350";
	} else if (confluencyPct < 70) {
		confluencyColor = "#ff9800";
	}

	// Determine bar color for contamination (inverted: green <=10, yellow 11-25, red >25)
	let contaminationColor = "#4caf50";
	if (contaminationPct > 25) {
		contaminationColor = "#ef5350";
	} else if (contaminationPct > 10) {
		contaminationColor = "#ff9800";
	}

	// Build the meters HTML using string concatenation
	let html = "";
	html += '<div class="meters-panel">';

	// Cell Health meter
	html += '<div class="meter-item">';
	html += '<div class="meter-label">Cell Health</div>';
	html += '<div class="meter-bar">';
	html += '<div class="meter-fill" style="width: ' + healthPct + "%;";
	html += " background-color: " + healthColor + ';"></div>';
	html += "</div>";
	html += '<div class="meter-value">' + healthPct + "%</div>";
	html += "</div>";

	// Confluency meter
	html += '<div class="meter-item">';
	html += '<div class="meter-label">Confluency</div>';
	html += '<div class="meter-bar">';
	html += '<div class="meter-fill" style="width: ' + confluencyPct + "%;";
	html += " background-color: " + confluencyColor + ';"></div>';
	html += "</div>";
	html += '<div class="meter-value">' + confluencyPct + "%</div>";
	html += "</div>";

	// Contamination Risk meter
	html += '<div class="meter-item">';
	html += '<div class="meter-label">Contamination Risk</div>';
	html += '<div class="meter-bar">';
	html += '<div class="meter-fill" style="width: ' + contaminationPct + "%;";
	html += " background-color: " + contaminationColor + ';"></div>';
	html += "</div>";
	html += '<div class="meter-value">' + contaminationPct + "%</div>";
	html += "</div>";

	html += "</div>";
	metersPanel.innerHTML = html;
}
