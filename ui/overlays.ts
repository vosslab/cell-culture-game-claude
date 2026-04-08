// ============================================
// ui/overlays.ts - Overlay modals for microscope, dilution, incubator, drugs, plate reader
// ============================================
// Each overlay receives typed GameState, dispatches semantic Actions through a
// callback, and reports scene changes. No direct mutation of game state.

import type {
	Action,
	GameState,
	SceneId,
} from "../core/types";
import { GAME_CONFIG } from "../core/engine";
import { getCellState, generatePlateReaderResults } from "../core/cell_model";
import type { CellState } from "../core/cell_model";
import { showNotification } from "./notifications";

// ============================================
// SVG namespace constant used by all drawing helpers
// ============================================

const SVG_NS = "http://www.w3.org/2000/svg";

// ============================================
// Shared constants
// ============================================

// SVG hemocytometer grid dimensions
const GRID_WIDTH = 400;
const GRID_HEIGHT = 300;

// Hemocytometer corner quadrant positions (top-left x,y and labels)
const QUADRANT_CORNERS = [
	{ x: 0, y: 0, label: "Top-Left (A1)" },
	{ x: 300, y: 0, label: "Top-Right (A4)" },
	{ x: 0, y: 225, label: "Bottom-Left (D1)" },
	{ x: 300, y: 225, label: "Bottom-Right (D4)" },
];

// Quadrant square dimensions within the SVG
const QUADRANT_WIDTH = 100;
const QUADRANT_HEIGHT = 75;

// Incubation animation duration in milliseconds (simulates 24h)
const INCUBATION_DURATION_MS = 4000;
// Incubation animation tick interval in milliseconds
const INCUBATION_TICK_MS = 50;
// Simulated incubation hours
const INCUBATION_HOURS = 24;
// Incubation duration dispatched to engine in minutes
const INCUBATION_DURATION_MIN = 1440;
// Delay after incubation completes before transitioning
const INCUBATION_TRANSITION_DELAY_MS = 1500;

// Correct volume for dilution calculator (uL)
const CORRECT_DILUTION_VOLUME_UL = 42;

// Target cells per well
const TARGET_CELLS_PER_WELL = 50000;
// Target volume per well in uL
const TARGET_VOLUME_PER_WELL_UL = 500;

// Dilution series options for drug selection
const DILUTION_OPTIONS = [
	{
		label: "Half-log dilution (10x to vehicle)",
		doses: [0, 0.1, 0.5, 1, 5, 10],
		correct: true,
		description: "Spans 3 orders of magnitude for a full dose-response curve.",
	},
	{
		label: "Binary dilution (2-fold serial)",
		doses: [0, 0.5, 1, 2, 4, 8],
		correct: false,
		description: "Only 16-fold range -- too narrow to capture the full dose-response.",
	},
	{
		label: "Shallow gradient (uniform spacing)",
		doses: [0, 2, 4, 6, 8, 10],
		correct: false,
		description: "Linear spacing misses the low-dose region where the curve is most informative.",
	},
];

// Row labels for the plate reader table
const PLATE_ROW_LABELS = ["A", "B", "C", "D"];

// Dilution volume choices for the calculator overlay
const DILUTION_VOLUME_CHOICES_UL = [25, 42, 75];

// ============================================
// Module-level state for quadrant selection
// ============================================

let selectedQuadrants: boolean[] = [false, false, false, false];

// ============================================
// Helper: add keyboard accessibility to an element
// ============================================

function addKeyboardActivation(el: HTMLElement, handler: () => void): void {
	el.setAttribute("tabindex", "0");
	el.addEventListener("keydown", (e: KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handler();
		}
	});
}

// ============================================
// Helper: create and configure a close button with keyboard support
// ============================================

function createCloseButton(onClose: () => void): string {
	// Returns the HTML; listener must be attached after innerHTML assignment
	return '<button class="modal-close" tabindex="0" aria-label="Close">&times;</button>';
}

// ============================================
// Helper: attach close button listener
// ============================================

function attachCloseButton(
	modal: HTMLElement,
	overlay: HTMLElement,
	onClose: () => void,
): void {
	const closeBtn = modal.querySelector(".modal-close") as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener("click", onClose);
		addKeyboardActivation(closeBtn, onClose);
	}
}

// ============================================
// Helper: get or create a generic overlay container
// ============================================

function getOverlayAndModal(overlayId: string): { overlay: HTMLElement; modal: HTMLElement } | null {
	const overlay = document.getElementById(overlayId);
	if (!overlay) return null;

	overlay.classList.add("active");

	const modal = overlay.querySelector(".modal-content") as HTMLElement;
	if (!modal) return null;

	return { overlay: overlay, modal: modal };
}

// ============================================
// SVG Drawing: hemocytometer grid
// ============================================

function drawHemocytometerGrid(svg: SVGElement): void {
	// Background rectangle
	const bg = document.createElementNS(SVG_NS, "rect");
	bg.setAttribute("width", String(GRID_WIDTH));
	bg.setAttribute("height", String(GRID_HEIGHT));
	bg.setAttribute("fill", "#fafafa");
	svg.appendChild(bg);

	// Highlight the 4 corner quadrant squares
	for (let i = 0; i < QUADRANT_CORNERS.length; i++) {
		const c = QUADRANT_CORNERS[i];
		if (!c) continue;
		const rect = document.createElementNS(SVG_NS, "rect");
		rect.setAttribute("x", String(c.x));
		rect.setAttribute("y", String(c.y));
		rect.setAttribute("width", String(QUADRANT_WIDTH));
		rect.setAttribute("height", String(QUADRANT_HEIGHT));
		rect.setAttribute("fill", "#fff9e6");
		rect.setAttribute("fill-opacity", "0.5");
		rect.setAttribute("stroke", "#e6c200");
		rect.setAttribute("stroke-width", "1.5");
		rect.setAttribute("stroke-dasharray", "4,2");
		svg.appendChild(rect);
	}

	// Major grid lines (4x4 grid)
	for (let i = 0; i <= 4; i++) {
		// Vertical major line
		const vLine = document.createElementNS(SVG_NS, "line");
		vLine.setAttribute("x1", String(i * 100));
		vLine.setAttribute("y1", "0");
		vLine.setAttribute("x2", String(i * 100));
		vLine.setAttribute("y2", String(GRID_HEIGHT));
		vLine.setAttribute("stroke", "#999");
		vLine.setAttribute("stroke-width", i === 0 || i === 4 ? "2" : "1");
		svg.appendChild(vLine);

		// Horizontal major line
		const hLine = document.createElementNS(SVG_NS, "line");
		hLine.setAttribute("x1", "0");
		hLine.setAttribute("y1", String(i * 75));
		hLine.setAttribute("x2", String(GRID_WIDTH));
		hLine.setAttribute("y2", String(i * 75));
		hLine.setAttribute("stroke", "#999");
		hLine.setAttribute("stroke-width", i === 0 || i === 4 ? "2" : "1");
		svg.appendChild(hLine);
	}

	// Minor vertical grid lines (subdivide each major column into 4)
	for (let i = 0; i < 16; i++) {
		if (i % 4 === 0) continue;
		const vLine = document.createElementNS(SVG_NS, "line");
		vLine.setAttribute("x1", String(i * 25));
		vLine.setAttribute("y1", "0");
		vLine.setAttribute("x2", String(i * 25));
		vLine.setAttribute("y2", String(GRID_HEIGHT));
		vLine.setAttribute("stroke", "#ddd");
		vLine.setAttribute("stroke-width", "0.5");
		svg.appendChild(vLine);
	}

	// Minor horizontal grid lines
	for (let i = 0; i < 16; i++) {
		if (i % 4 === 0) continue;
		const hLine = document.createElementNS(SVG_NS, "line");
		hLine.setAttribute("x1", "0");
		hLine.setAttribute("y1", String(i * 18.75));
		hLine.setAttribute("x2", String(GRID_WIDTH));
		hLine.setAttribute("y2", String(i * 18.75));
		hLine.setAttribute("stroke", "#ddd");
		hLine.setAttribute("stroke-width", "0.5");
		svg.appendChild(hLine);
	}

	// Instruction label at bottom center
	const label = document.createElementNS(SVG_NS, "text");
	label.setAttribute("x", "200");
	label.setAttribute("y", "295");
	label.setAttribute("text-anchor", "middle");
	label.setAttribute("font-size", "10");
	label.setAttribute("fill", "#999");
	label.textContent = "Count cells in highlighted corner squares";
	svg.appendChild(label);
}

// ============================================
// SVG Drawing: cells on the hemocytometer grid
// ============================================

function drawCellsOnGrid(svg: SVGElement, cellState: CellState): void {
	const positions = cellState.positions;
	for (let i = 0; i < positions.length; i++) {
		const pos = positions[i];
		if (!pos) continue;

		const circle = document.createElementNS(SVG_NS, "circle");
		circle.setAttribute("cx", String(pos.x * GRID_WIDTH));
		circle.setAttribute("cy", String(pos.y * GRID_HEIGHT));
		circle.setAttribute("r", String(pos.radius * GRID_HEIGHT));

		// Live cells appear gray, dead cells stain blue (trypan blue exclusion)
		if (pos.alive) {
			circle.setAttribute("fill", "rgba(200,200,200,0.6)");
		} else {
			circle.setAttribute("fill", "rgba(50,100,200,0.7)");
		}
		circle.setAttribute("stroke", "#333");
		circle.setAttribute("stroke-width", "0.5");
		svg.appendChild(circle);
	}
}

// ============================================
// Build the clickable quadrant overlay buttons (HTML positioned over SVG)
// ============================================

function buildQuadrantButtonsHtml(): string {
	let html = "";
	for (let i = 0; i < 4; i++) {
		const c = QUADRANT_CORNERS[i];
		if (!c) continue;

		// Convert SVG coordinates to percentage positions within the container
		const leftPct = (c.x / GRID_WIDTH) * 100;
		const topPct = (c.y / GRID_HEIGHT) * 100;
		const widthPct = (QUADRANT_WIDTH / GRID_WIDTH) * 100;
		const heightPct = (QUADRANT_HEIGHT / GRID_HEIGHT) * 100;

		html += '<div class="quadrant-btn" data-quadrant="' + i + '" ';
		html += 'tabindex="0" role="button" ';
		html += 'aria-label="Count quadrant ' + c.label + '" ';
		html += 'title="' + c.label + '" ';
		html += 'style="position:absolute;';
		html += "left:" + leftPct + "%;top:" + topPct + "%;";
		html += "width:" + widthPct + "%;height:" + heightPct + "%;";
		html += 'cursor:pointer;border:2px solid transparent;border-radius:2px;';
		html += 'transition:all 0.2s ease;z-index:10;">';
		html += "</div>";
	}
	return html;
}

// ============================================
// Set up quadrant toggle listeners with keyboard and hover support
// ============================================

function setupQuadrantListeners(onStatusChange: () => void): void {
	// Reset selection state for a fresh counting session
	selectedQuadrants = [false, false, false, false];

	const buttons = document.querySelectorAll(".quadrant-btn");
	for (let b = 0; b < buttons.length; b++) {
		const el = buttons[b] as HTMLElement;
		const idx = parseInt(el.getAttribute("data-quadrant") || "0");

		// Click toggle handler
		const toggleQuadrant = (): void => {
			selectedQuadrants[idx] = !selectedQuadrants[idx];
			if (selectedQuadrants[idx]) {
				el.style.border = "3px solid #4caf50";
				el.style.backgroundColor = "rgba(76, 175, 80, 0.15)";
			} else {
				el.style.border = "2px solid transparent";
				el.style.backgroundColor = "transparent";
			}
			onStatusChange();
		};

		el.addEventListener("click", toggleQuadrant);

		// Keyboard activation for the quadrant button
		addKeyboardActivation(el, toggleQuadrant);

		// Hover feedback for unselected quadrants
		el.addEventListener("mouseenter", () => {
			if (!selectedQuadrants[idx]) {
				el.style.backgroundColor = "rgba(76, 175, 80, 0.08)";
			}
		});
		el.addEventListener("mouseleave", () => {
			if (!selectedQuadrants[idx]) {
				el.style.backgroundColor = "transparent";
			}
		});
	}
}

// ============================================
// Count how many quadrants are currently selected
// ============================================

function countSelectedQuadrants(): number {
	let count = 0;
	for (let i = 0; i < 4; i++) {
		if (selectedQuadrants[i]) count++;
	}
	return count;
}

// ============================================
// Helper: descriptive health band message based on viability and confluency
// ============================================

function getHealthBandMessage(viability: number, confluency: number): string {
	// Health bands
	let healthDesc = "stable";
	if (viability >= 0.88) healthDesc = "thriving";
	else if (viability < 0.70) healthDesc = "stressed";

	// Confluency bands
	let confDesc = "moderate";
	if (confluency >= 0.75) confDesc = "dense";
	else if (confluency <= 0.55) confDesc = "light";

	// Compose message
	if (healthDesc === "thriving") {
		return "Cells look bright, spread well, and are ready for counting. "
			+ "Confluency appears " + confDesc + ".";
	} else if (healthDesc === "stressed") {
		return "Cells look stressed -- some appear rounded or detached. "
			+ "Review the order of operations. Confluency appears " + confDesc + ".";
	}
	return "Cells look calm and attached. Confluency appears " + confDesc + ".";
}

// ============================================
// 1. MICROSCOPE OVERLAY
// ============================================
// Two phases: viability check first, then hemocytometer counting.
// Viability: show cells (live=gray, dead=blue), display viability %, "Confirm and Proceed" button.
// Counting: SVG hemocytometer grid with 4 clickable corner quadrants, must select all 4, then submit.
// ============================================

export function renderMicroscopeOverlay(
	state: GameState,
	dispatch: (action: Action) => void,
	onSceneChange: (scene: SceneId) => void,
): void {
	const container = getOverlayAndModal("microscope-overlay");
	if (!container) return;
	const overlay = container.overlay;
	const modal = container.modal;

	// Derive cell state from the lab state
	const cellState = getCellState(
		state.lab.actualCellCount,
		state.lab.cellViability,
		state.lab.vessels["tc.flask"]
			? state.lab.vessels["tc.flask"].confluency
			: GAME_CONFIG.initialConfluency,
	);

	// Determine which microscope phase we are in
	const viabilityDone = state.protocol.completedSteps.indexOf("microscope_check") >= 0;

	let html = createCloseButton(() => {});

	if (!viabilityDone) {
		// Phase 1: Viability check with trypan blue staining
		html += "<h2>Microscope - Viability Check</h2>";
		html += '<div class="microscope-view">';
		html += '<svg id="microscope-svg" viewBox="0 0 ' + GRID_WIDTH + " " + GRID_HEIGHT + '" ';
		html += 'width="' + GRID_WIDTH + '" height="' + GRID_HEIGHT + '"></svg>';
		html += "</div>";
		html += '<div style="padding:16px;background:#f0f2f5;border-radius:8px;margin-bottom:16px;">';
		html += '<p style="margin:0 0 8px 0;font-size:14px;color:#212121;">';
		html += "Observe the cells stained with trypan blue.</p>";
		html += '<p style="margin:0 0 8px 0;font-size:13px;color:#757575;">';
		html += "Live cells appear clear/gray. Dead cells stain blue.</p>";
		html += '<p style="margin:0 0 8px 0;font-size:13px;color:#757575;">';
		html += "Estimated viability: <strong>";
		html += Math.round(cellState.viability * 100) + "%</strong></p>";
		// Descriptive health band feedback
		const confluency = state.lab.vessels["tc.flask"]
			? state.lab.vessels["tc.flask"].confluency
			: GAME_CONFIG.initialConfluency;
		html += '<p style="margin:0;font-size:13px;color:#555555;font-style:italic;">';
		html += getHealthBandMessage(cellState.viability, confluency);
		html += "</p>";
		html += "</div>";
		html += '<button id="confirm-viability" class="btn-primary" tabindex="0" ';
		html += 'style="padding:10px 24px;">Confirm Viability and Proceed to Counting</button>';
	} else {
		// Phase 2: Interactive hemocytometer cell counting
		html += "<h2>Hemocytometer - Cell Count</h2>";
		html += '<div class="microscope-view" style="position:relative;">';
		html += '<svg id="microscope-svg" viewBox="0 0 ' + GRID_WIDTH + " " + GRID_HEIGHT + '" ';
		html += 'width="' + GRID_WIDTH + '" height="' + GRID_HEIGHT + '"></svg>';
		// Overlay clickable quadrant buttons on top of the SVG
		html += '<div id="quadrant-buttons" style="position:absolute;top:0;left:0;width:100%;height:100%;">';
		html += buildQuadrantButtonsHtml();
		html += "</div>";
		html += "</div>";
		html += '<div style="padding:12px;background:#f0f2f5;border-radius:8px;margin-bottom:12px;">';
		html += '<p style="margin:0 0 6px 0;font-size:14px;color:#212121;">';
		html += "Click each corner square to count cells in that quadrant.</p>";
		html += '<p style="margin:0;font-size:12px;color:#757575;">';
		html += "Select all 4 quadrants, then submit. The average is multiplied by 10,000 to get cells/mL.</p>";
		html += "</div>";
		html += '<div style="display:flex;align-items:center;gap:12px;">';
		html += '<span id="quadrant-status" style="font-size:13px;color:#757575;">';
		html += "0 of 4 quadrants selected</span>";
		html += '<button id="submit-cell-count" class="btn-primary" tabindex="0" ';
		html += 'style="padding:10px 24px;" disabled>Submit Count</button>';
		html += "</div>";
	}

	modal.innerHTML = html;

	// Draw cells on the SVG canvas
	const svg = document.getElementById("microscope-svg") as unknown as SVGElement;
	if (svg) {
		svg.innerHTML = "";
		drawHemocytometerGrid(svg);
		drawCellsOnGrid(svg, cellState);
	}

	// Wire up event listeners based on the current phase
	if (!viabilityDone) {
		// Phase 1: viability confirmation
		const confirmBtn = document.getElementById("confirm-viability");
		if (confirmBtn) {
			const onConfirm = (): void => {
				// Dispatch observe action to mark viability check complete
				dispatch({
					type: "observe",
					target: { kind: "vessel", id: "tc.flask" },
					mode: "microscope",
				});
				// Re-render to advance to counting phase
				renderMicroscopeOverlay(state, dispatch, onSceneChange);
			};
			confirmBtn.addEventListener("click", onConfirm);
			addKeyboardActivation(confirmBtn, onConfirm);
		}
	} else {
		// Phase 2: quadrant selection and cell count submission
		const updateStatus = (): void => {
			const count = countSelectedQuadrants();
			const statusEl = document.getElementById("quadrant-status");
			if (statusEl) {
				statusEl.textContent = count + " of 4 quadrants selected";
			}
			// Enable submit only when all 4 quadrants are selected
			const submitBtn = document.getElementById("submit-cell-count") as HTMLButtonElement;
			if (submitBtn) {
				submitBtn.disabled = count < 4;
			}
		};

		setupQuadrantListeners(updateStatus);

		const submitBtn = document.getElementById("submit-cell-count");
		if (submitBtn) {
			const onSubmit = (): void => {
				const selectedCount = countSelectedQuadrants();
				if (selectedCount < 4) {
					showNotification("Please select all 4 corner quadrants.", "warning");
					return;
				}

				// Dispatch count_cells action with all 4 quadrants selected
				dispatch({ type: "count_cells", quadrantsSelected: 4 });

				// Provide feedback based on count accuracy
				const flask = state.lab.vessels["tc.flask"];
				const estimatedCount = flask && flask.cellCount !== null
					? flask.cellCount
					: state.lab.actualCellCount;
				showNotification(
					"Count: ~" + estimatedCount.toLocaleString() + " cells/mL.",
					"success",
				);

				// Close the overlay and transition to hood
				overlay.classList.remove("active");
				onSceneChange("hood");
			};
			submitBtn.addEventListener("click", onSubmit);
			addKeyboardActivation(submitBtn, onSubmit);
		}
	}

	// Close button handler
	const closeOverlay = (): void => {
		overlay.classList.remove("active");
		onSceneChange("hood");
	};
	attachCloseButton(modal, overlay, closeOverlay);
}

// ============================================
// 2. DILUTION CALCULATOR OVERLAY
// ============================================
// Show the cell count and target, present 3 volume choices.
// Wrong choice shows a warning toast but still proceeds.
// ============================================

export function renderDilutionCalculatorOverlay(
	state: GameState,
	dispatch: (action: Action) => void,
	onSceneChange: (scene: SceneId) => void,
): void {
	const container = getOverlayAndModal("microscope-overlay");
	if (!container) return;
	const overlay = container.overlay;
	const modal = container.modal;

	// Get the cell count from the flask vessel state
	const flask = state.lab.vessels["tc.flask"];
	const cellCount = flask && flask.cellCount !== null
		? flask.cellCount
		: state.lab.actualCellCount;

	let html = createCloseButton(() => {});
	html += "<h2>Dilution Calculator</h2>";
	html += '<div style="padding:16px;background:#f0f2f5;border-radius:8px;margin-bottom:16px;">';
	html += '<p style="margin:0 0 8px 0;font-size:14px;color:#212121;">';
	html += "Cell count: ~<strong>" + cellCount.toLocaleString() + " cells/mL</strong>.</p>";
	html += '<p style="margin:0;font-size:14px;color:#212121;">';
	html += "Target: <strong>" + TARGET_CELLS_PER_WELL.toLocaleString();
	html += " cells per well</strong> in <strong>" + TARGET_VOLUME_PER_WELL_UL + " &micro;L</strong>.</p>";
	html += "</div>";
	html += '<p style="font-size:14px;color:#212121;margin:0 0 16px 0;">';
	html += "How much cell suspension do you need per well?</p>";

	// Render the 3 volume choice buttons
	for (let i = 0; i < DILUTION_VOLUME_CHOICES_UL.length; i++) {
		const vol = DILUTION_VOLUME_CHOICES_UL[i];
		if (vol === undefined) continue;
		html += '<button class="dilution-volume-choice" data-volume="' + vol + '" ';
		html += 'tabindex="0" ';
		html += 'style="display:block;width:100%;text-align:left;padding:14px 16px;margin-bottom:10px;';
		html += "background:#f5f5f5;border:2px solid #e0e0e0;border-radius:8px;";
		html += 'cursor:pointer;transition:all 0.2s ease;font-size:14px;">';
		html += '<div style="font-weight:600;">' + vol + " &micro;L per well</div>";
		html += "</button>";
	}

	modal.innerHTML = html;

	// Attach click and keyboard handlers to each volume choice
	const buttons = modal.querySelectorAll(".dilution-volume-choice");
	for (let b = 0; b < buttons.length; b++) {
		const el = buttons[b] as HTMLElement;
		const vol = parseInt(el.getAttribute("data-volume") || "0");

		const onChoice = (): void => {
			// Check if the chosen volume is correct
			if (vol !== CORRECT_DILUTION_VOLUME_UL) {
				showNotification(
					"Incorrect volume (" + vol + " uL). The correct answer is "
					+ CORRECT_DILUTION_VOLUME_UL + " uL, but proceeding anyway.",
					"warning",
				);
			} else {
				showNotification("Correct! " + vol + " uL per well.", "success");
			}

			// Dispatch the dilution calculation action
			dispatch({ type: "calculate_dilution", volumeUl: vol });

			// Close overlay and return to hood
			overlay.classList.remove("active");
			onSceneChange("hood");
		};

		el.addEventListener("click", onChoice);
		addKeyboardActivation(el, onChoice);

		// Hover effect
		el.addEventListener("mouseenter", () => {
			el.style.transform = "translateX(4px)";
			el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
		});
		el.addEventListener("mouseleave", () => {
			el.style.transform = "";
			el.style.boxShadow = "";
		});
	}

	// Close button handler
	const closeOverlay = (): void => {
		overlay.classList.remove("active");
		onSceneChange("hood");
	};
	attachCloseButton(modal, overlay, closeOverlay);
}

// ============================================
// 3. INCUBATOR OVERLAY
// ============================================
// Progress bar animation: 4 seconds simulating 24 hours.
// When complete: dispatch incubate action and transition to plate_reader.
// ============================================

export function renderIncubatorOverlay(
	state: GameState,
	dispatch: (action: Action) => void,
	onSceneChange: (scene: SceneId) => void,
): void {
	const overlay = document.getElementById("incubator-screen");
	if (!overlay) return;

	overlay.classList.add("active");

	// Start the incubation progress animation
	const progressFill = overlay.querySelector(".progress-fill") as HTMLElement;
	const timerText = document.getElementById("timer-text");
	if (!progressFill || !timerText) return;

	const startTime = Date.now();

	const interval = setInterval(() => {
		const elapsed = Date.now() - startTime;
		const progress = Math.min(elapsed / INCUBATION_DURATION_MS, 1);
		const hoursRemaining = Math.round(INCUBATION_HOURS * (1 - progress));

		// Update the progress bar width and timer text
		progressFill.style.width = (progress * 100) + "%";
		timerText.textContent = "Time remaining: " + hoursRemaining + "h";

		if (progress >= 1) {
			clearInterval(interval);

			// Dispatch the incubate action to update game state
			dispatch({ type: "incubate", durationMin: INCUBATION_DURATION_MIN });

			// Show completion message
			timerText.textContent = "Incubation complete! Checking cells...";

			// Brief pause then transition to plate reader
			setTimeout(() => {
				overlay.classList.remove("active");
				onSceneChange("plate_reader");
			}, INCUBATION_TRANSITION_DELAY_MS);
		}
	}, INCUBATION_TICK_MS);
}

// ============================================
// 4. DRUG SELECTION OVERLAY
// ============================================
// Present 3 dilution series options (half-log correct, binary wrong, shallow wrong).
// On selection: dispatch add_drug and return to hood.
// ============================================

export function renderDrugSelectionOverlay(
	state: GameState,
	dispatch: (action: Action) => void,
	onSceneChange: (scene: SceneId) => void,
): void {
	const container = getOverlayAndModal("microscope-overlay");
	if (!container) return;
	const overlay = container.overlay;
	const modal = container.modal;

	let html = createCloseButton(() => {});
	html += "<h2>Choose Dilution Series</h2>";
	html += '<div style="padding:0 8px 16px 8px;">';
	html += '<p style="font-size:14px;color:#212121;margin:0 0 16px 0;">';
	html += "Select the dilution series for your drug treatment across 6 columns ";
	html += "(column 1 = vehicle control):</p>";

	// Render the 3 dilution series option buttons
	for (let i = 0; i < DILUTION_OPTIONS.length; i++) {
		const opt = DILUTION_OPTIONS[i];
		if (!opt) continue;
		// All options styled the same so the student must think about the answer
		html += '<button class="dilution-choice" data-dilution-index="' + i + '" ';
		html += 'tabindex="0" ';
		html += 'style="display:block;width:100%;text-align:left;padding:14px 16px;margin-bottom:10px;';
		html += "background:#f5f5f5;border:2px solid #e0e0e0;border-radius:8px;";
		html += 'cursor:pointer;transition:all 0.2s ease;font-size:14px;">';
		html += '<div style="font-weight:600;margin-bottom:4px;">' + opt.label + "</div>";
		html += '<div style="font-size:12px;color:#757575;">Concentrations (&micro;M): ';
		html += opt.doses.join(", ") + "</div>";
		html += "</button>";
	}

	html += "</div>";
	modal.innerHTML = html;

	// Attach click and keyboard handlers to each dilution option
	const buttons = modal.querySelectorAll(".dilution-choice");
	for (let b = 0; b < buttons.length; b++) {
		const el = buttons[b] as HTMLElement;
		const idx = parseInt(el.getAttribute("data-dilution-index") || "0");

		const onSelect = (): void => {
			const option = DILUTION_OPTIONS[idx];
			if (!option) return;

			// Show feedback based on correctness
			if (!option.correct) {
				showNotification("Suboptimal dilution: " + option.description, "warning");
			} else {
				showNotification(
					"Half-log dilution applied -- good choice for a full dose-response!",
					"success",
				);
			}

			// Dispatch the add_drug action with the selected dilution index
			dispatch({
				type: "add_drug",
				target: { kind: "vessel", id: "tc.well_plate" },
				dilutionIndex: idx,
			});

			// Close overlay and return to hood
			overlay.classList.remove("active");
			onSceneChange("hood");
		};

		el.addEventListener("click", onSelect);
		addKeyboardActivation(el, onSelect);

		// Hover effect
		el.addEventListener("mouseenter", () => {
			el.style.transform = "translateX(4px)";
			el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
		});
		el.addEventListener("mouseleave", () => {
			el.style.transform = "";
			el.style.boxShadow = "";
		});
	}

	// Close button handler
	const closeOverlay = (): void => {
		overlay.classList.remove("active");
	};
	attachCloseButton(modal, overlay, closeOverlay);
}

// ============================================
// 5. PLATE READER OVERLAY
// ============================================
// Table of absorbance values (4 rows x 6 cols), column averages,
// "Complete Experiment" button.
// ============================================

export function renderPlateReaderOverlay(
	state: GameState,
	dispatch: (action: Action) => void,
	onSceneChange: (scene: SceneId) => void,
): void {
	const container = getOverlayAndModal("microscope-overlay");
	if (!container) return;
	const overlay = container.overlay;
	const modal = container.modal;

	// Generate plate reader absorbance results (returns new well data)
	const wellResults = generatePlateReaderResults(state.lab.wellPlate);

	const plateRows = GAME_CONFIG.plateRows;
	const plateCols = GAME_CONFIG.plateCols;
	const concentrationLabels = GAME_CONFIG.drugConcentrationLabels;

	let html = createCloseButton(() => {});
	html += "<h2>Plate Reader Results (MTT Assay - 570 nm)</h2>";
	html += '<div class="microscope-view" style="flex-direction:column;min-height:auto;padding:16px;">';

	// Build the absorbance results table
	html += '<table style="border-collapse:collapse;width:100%;font-size:13px;">';

	// Header row with concentration labels
	html += "<tr>";
	html += '<th style="padding:6px;border:1px solid #ddd;background:#f5f5f5;"></th>';
	for (let col = 0; col < plateCols; col++) {
		const label = concentrationLabels[col] || String(col);
		html += '<th style="padding:6px;border:1px solid #ddd;background:#f5f5f5;">';
		html += label + " uM</th>";
	}
	html += "</tr>";

	// Data rows with color-coded absorbance values
	for (let row = 0; row < plateRows; row++) {
		html += "<tr>";
		const rowLabel = PLATE_ROW_LABELS[row] || String(row);
		html += '<td style="padding:6px;border:1px solid #ddd;background:#f5f5f5;font-weight:600;">';
		html += rowLabel + "</td>";
		for (let col = 0; col < plateCols; col++) {
			// Look up the well data from the generated results
			const wellIndex = row * plateCols + col;
			const well = wellResults[wellIndex];
			const absorbance = well ? well.absorbance : 0;

			// Color-code the cell background based on absorbance intensity
			const bgR = Math.round(255 - absorbance * 100);
			const bgG = Math.round(255 - absorbance * 40);
			const bgB = Math.round(255 - absorbance * 120);
			html += '<td style="padding:6px;border:1px solid #ddd;text-align:center;';
			html += "background:rgb(" + bgR + "," + bgG + "," + bgB + ');">';
			html += absorbance.toFixed(3);
			html += "</td>";
		}
		html += "</tr>";
	}
	html += "</table>";

	// Column averages section
	html += '<div style="margin-top:16px;">';
	html += '<h3 style="font-size:14px;margin:0 0 8px 0;">Column Averages</h3>';
	html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
	for (let col = 0; col < plateCols; col++) {
		// Compute the average absorbance for this column
		let sum = 0;
		for (let row = 0; row < plateRows; row++) {
			const wellIndex = row * plateCols + col;
			const well = wellResults[wellIndex];
			sum += well ? well.absorbance : 0;
		}
		const avg = plateRows > 0 ? sum / plateRows : 0;
		const label = concentrationLabels[col] || String(col);

		html += '<div style="text-align:center;padding:8px 12px;background:#f0f2f5;';
		html += 'border-radius:6px;min-width:60px;">';
		html += '<div style="font-size:11px;color:#757575;">' + label + " uM</div>";
		html += '<div style="font-size:16px;font-weight:600;">' + avg.toFixed(3) + "</div>";
		html += "</div>";
	}
	html += "</div></div>";
	html += "</div>";

	// Complete Experiment button
	html += '<div style="text-align:center;margin-top:16px;">';
	html += '<button id="complete-plate-read" class="btn-primary" tabindex="0" ';
	html += 'style="padding:10px 24px;">Complete Experiment</button>';
	html += "</div>";

	modal.innerHTML = html;

	// Wire up the Complete Experiment button
	const completeBtn = document.getElementById("complete-plate-read");
	if (completeBtn) {
		const onComplete = (): void => {
			// Dispatch observe action to mark plate read complete
			dispatch({
				type: "observe",
				target: { kind: "vessel", id: "tc.well_plate" },
				mode: "reader",
			});
			overlay.classList.remove("active");
		};
		completeBtn.addEventListener("click", onComplete);
		addKeyboardActivation(completeBtn, onComplete);
	}

	// Close button handler
	const closeOverlay = (): void => {
		overlay.classList.remove("active");
		onSceneChange("hood");
	};
	attachCloseButton(modal, overlay, closeOverlay);
}
