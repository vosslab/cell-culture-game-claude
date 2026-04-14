// ============================================
// microscope_scene.ts - Microscope (viability + counting) and Plate Reader
// ============================================

// Pre-register step ids this scene owns so validateTriggerCoverage passes
// at page load time. See hood_scene.ts for the policy rationale.
registeredTriggers.add('count_cells');
registeredTriggers.add('plate_read');

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
// MICROSCOPE VIEW - Cell viability check and hemocytometer counting
// ============================================
function renderMicroscopeScene(): void {
	const overlay = document.getElementById('microscope-overlay');
	if (!overlay) return;

	overlay.classList.add('active');

	const cellState = getCellState();
	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	// Check which microscope screen we are on. microscope_check is no
	// longer a protocol step; the viability-check substep is tracked by
	// a UI-internal flag on gameState so the confirm button advances
	// past the viability screen instead of looping forever.
	const viabilityDone = gameState.microscopeViabilityChecked === true;

	let html = '<button class="modal-close" aria-label="Close">&times;</button>';

	if (!viabilityDone) {
		// Step 1: Viability check with trypan blue
		html += '<h2>Microscope - Viability Check</h2>';
		html += '<div class="microscope-view">';
		html += '<svg id="microscope-svg" viewBox="0 0 400 430" width="400" height="430"></svg>';
		html += '</div>';
		html += '<div style="padding:16px;background:#f0f2f5;border-radius:8px;margin-bottom:16px;">';
		html += '<p style="margin:0 0 8px 0;font-size:14px;color:#212121;">Observe the cells stained with trypan blue.</p>';
		html += '<p style="margin:0 0 8px 0;font-size:13px;color:#757575;">Live cells appear clear/gray. Dead cells stain blue.</p>';
		html += '<p style="margin:0 0 8px 0;font-size:13px;color:#757575;">Estimated viability: <strong>' + Math.round(cellState.viability * 100) + '%</strong></p>';
		// Descriptive health band feedback
		html += '<p style="margin:0;font-size:13px;color:#555555;font-style:italic;">';
		html += getHealthBandMessage(cellState.viability, cellState.confluency);
		html += '</p>';
		html += '</div>';
		html += '<button id="confirm-viability" class="btn-primary" style="padding:10px 24px;">Confirm Viability and Proceed to Counting</button>';
	} else {
		// Step 2: Cell counting via interactive quadrant selection
		html += '<h2>Hemocytometer - Cell Count</h2>';
		html += '<div class="microscope-view">';
		// Tight wrapper so buttons align exactly with SVG
		html += '<div id="svg-wrapper" style="position:relative;display:inline-block;width:400px;height:430px;">';
		html += '<svg id="microscope-svg" viewBox="0 0 400 430" style="display:block;width:100%;height:100%;"></svg>';
		// Button container covers only the 400x400 grid, not the 30px label below
		const gridPct = (400 / 430 * 100).toFixed(1);
		html += '<div id="quadrant-buttons" style="position:absolute;top:0;left:0;width:100%;height:' + gridPct + '%;">';
		html += renderQuadrantButtons();
		html += '</div>';
		html += '</div>';
		html += '</div>';
		html += '<div style="padding:12px;background:#f0f2f5;border-radius:8px;margin-bottom:12px;">';
		html += '<p style="margin:0 0 6px 0;font-size:14px;color:#212121;">Click each corner square and enter your live cell count for that quadrant.</p>';
		html += '<p style="margin:0;font-size:12px;color:#757575;">Count all 4 corners, then submit. Formula: (avg per square) &times; dilution (10) &times; 10,000 = cells/mL.</p>';
		html += '</div>';
		html += '<div style="display:flex;align-items:center;gap:12px;">';
		html += '<span id="quadrant-status" style="font-size:13px;color:#757575;">0 of 4 quadrants counted</span>';
		html += '<button id="submit-cell-count" class="btn-primary" style="padding:10px 24px;" disabled>Submit Count</button>';
		html += '</div>';
	}

	modal.innerHTML = html;

	// Draw cells on the SVG
	const svg = document.getElementById('microscope-svg') as unknown as SVGElement;
	if (svg) {
		svg.innerHTML = '';
		drawHemocytometerGrid(svg);
		drawCellsOnGrid(cellState);
	}

	// Set up event listeners
	if (!viabilityDone) {
		const confirmBtn = document.getElementById('confirm-viability');
		if (confirmBtn) {
			confirmBtn.addEventListener('click', () => {
				// Mark viability check as done and re-render so the
				// counting screen appears. Without this flag the scene
				// rendered the viability screen forever.
				gameState.microscopeViabilityChecked = true;
				renderMicroscopeScene();
			});
		}
	} else {
		setupQuadrantListeners();
		const submitBtn = document.getElementById('submit-cell-count');
		if (submitBtn) {
			submitBtn.addEventListener('click', submitQuadrantCount);
		}
	}

	// Close button with confirmation if step is incomplete
	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			const viabilityDone = gameState.microscopeViabilityChecked === true;
			const countDone = gameState.completedSteps.includes('count_cells');
			// Warn if closing with incomplete microscope work
			if (!viabilityDone || !countDone) {
				const confirmed = confirm('Cell counting is not finished. Are you sure you want to leave?');
				if (!confirmed) return;
			}
			overlay.classList.remove('active');
			switchScene('hood');
		});
	}
}

// ============================================
function drawHemocytometerGrid(svg: SVGElement): void {
	const ns = 'http://www.w3.org/2000/svg';
	const w = 400;
	const h = 400;

	// Background
	const bg = document.createElementNS(ns, 'rect');
	bg.setAttribute('width', String(w));
	bg.setAttribute('height', String(h));
	bg.setAttribute('fill', '#fafafa');
	svg.appendChild(bg);

	// Highlight 4 corner squares
	const corners = [
		{ x: 0, y: 0 }, { x: 300, y: 0 },
		{ x: 0, y: 300 }, { x: 300, y: 300 },
	];
	corners.forEach((c) => {
		const rect = document.createElementNS(ns, 'rect');
		rect.setAttribute('x', String(c.x));
		rect.setAttribute('y', String(c.y));
		rect.setAttribute('width', '100');
		rect.setAttribute('height', '100');
		rect.setAttribute('fill', '#e8f5e9');
		rect.setAttribute('fill-opacity', '0.4');
		rect.setAttribute('stroke', '#4caf50');
		rect.setAttribute('stroke-width', '2');
		rect.setAttribute('rx', '3');
		svg.appendChild(rect);
	});

	// Major grid lines (4x4)
	for (let i = 0; i <= 4; i++) {
		const vLine = document.createElementNS(ns, 'line');
		vLine.setAttribute('x1', String(i * 100));
		vLine.setAttribute('y1', '0');
		vLine.setAttribute('x2', String(i * 100));
		vLine.setAttribute('y2', String(h));
		vLine.setAttribute('stroke', '#999');
		vLine.setAttribute('stroke-width', i === 0 || i === 4 ? '2' : '1');
		svg.appendChild(vLine);

		const hLine = document.createElementNS(ns, 'line');
		hLine.setAttribute('x1', '0');
		hLine.setAttribute('y1', String(i * 100));
		hLine.setAttribute('x2', String(w));
		hLine.setAttribute('y2', String(i * 100));
		hLine.setAttribute('stroke', '#999');
		hLine.setAttribute('stroke-width', i === 0 || i === 4 ? '2' : '1');
		svg.appendChild(hLine);
	}

	// Minor grid lines
	for (let i = 0; i < 16; i++) {
		if (i % 4 === 0) continue;
		const vLine = document.createElementNS(ns, 'line');
		vLine.setAttribute('x1', String(i * 25));
		vLine.setAttribute('y1', '0');
		vLine.setAttribute('x2', String(i * 25));
		vLine.setAttribute('y2', String(h));
		vLine.setAttribute('stroke', '#ddd');
		vLine.setAttribute('stroke-width', '0.5');
		svg.appendChild(vLine);
	}
	for (let i = 0; i < 16; i++) {
		if (i % 4 === 0) continue;
		const hLine = document.createElementNS(ns, 'line');
		hLine.setAttribute('x1', '0');
		hLine.setAttribute('y1', String(i * 25));
		hLine.setAttribute('x2', String(w));
		hLine.setAttribute('y2', String(i * 25));
		hLine.setAttribute('stroke', '#ddd');
		hLine.setAttribute('stroke-width', '0.5');
		svg.appendChild(hLine);
	}

	const label = document.createElementNS(ns, 'text');
	label.setAttribute('x', '200');
	label.setAttribute('y', '418');
	label.setAttribute('text-anchor', 'middle');
	label.setAttribute('font-size', '10');
	label.setAttribute('fill', '#999');
	label.textContent = 'Count cells in highlighted corner squares';
	svg.appendChild(label);
}

// ============================================
function drawCellsOnGrid(cellState: CellState): void {
	const ns = 'http://www.w3.org/2000/svg';
	const svg = document.getElementById('microscope-svg') as unknown as SVGElement;
	if (!svg) return;

	cellState.positions.forEach((pos) => {
		const circle = document.createElementNS(ns, 'circle');
		circle.setAttribute('cx', String(pos.x * 400));
		circle.setAttribute('cy', String(pos.y * 400));
		circle.setAttribute('r', String(pos.radius * 400));
		// Live cells appear clear/light, dead cells stain dark blue (trypan blue)
		if (pos.alive) {
			circle.setAttribute('fill', 'rgba(220,220,210,0.7)');
			circle.setAttribute('stroke', '#888');
			circle.setAttribute('stroke-width', '0.8');
		} else {
			circle.setAttribute('fill', 'rgba(30,70,180,0.8)');
			circle.setAttribute('stroke', '#1a3a80');
			circle.setAttribute('stroke-width', '1.0');
		}
		svg.appendChild(circle);
	});
}

// Track which quadrants are selected (indices 0-3 for TL, TR, BL, BR)
let selectedQuadrants: boolean[] = [false, false, false, false];
// User-entered cell counts per quadrant (null means not yet counted)
let quadrantCounts: (number | null)[] = [null, null, null, null];

// ============================================
// Quadrant corner positions matching the SVG grid corners
// Each quadrant covers a 100x100 region of the 400x400 SVG
const QUADRANT_CORNERS = [
	{ x: 0, y: 0, label: 'Top-Left (A1)' },
	{ x: 300, y: 0, label: 'Top-Right (A4)' },
	{ x: 0, y: 300, label: 'Bottom-Left (D1)' },
	{ x: 300, y: 300, label: 'Bottom-Right (D4)' },
];

// ============================================
function renderQuadrantButtons(): string {
	// Position clickable divs over the 4 corner squares of the hemocytometer
	// SVG is 400x300, each corner square is 100x75
	let html = '';
	for (let i = 0; i < 4; i++) {
		const c = QUADRANT_CORNERS[i];
		// Convert SVG coordinates to percentages
		const leftPct = (c.x / 400) * 100;
		const topPct = (c.y / 400) * 100;
		const widthPct = (100 / 400) * 100;
		const heightPct = (100 / 400) * 100;
		html += '<div class="quadrant-btn" data-quadrant="' + i + '" ';
		html += 'title="' + c.label + '" ';
		html += 'style="position:absolute;';
		html += 'left:' + leftPct + '%;top:' + topPct + '%;';
		html += 'width:' + widthPct + '%;height:' + heightPct + '%;';
		html += 'cursor:pointer;border:2px solid transparent;border-radius:3px;';
		html += 'transition:all 0.2s ease;z-index:10;';
		html += 'display:flex;align-items:center;justify-content:center;">';
		html += '<span class="quadrant-count-badge" data-badge="' + i + '" ';
		html += "style='display:none;background:rgba(255,255,255,0.9);";
		html += "border-radius:4px;padding:2px 8px;font-size:14px;font-weight:600;";
		html += "color:#2e7d32;pointer-events:none;'></span>";
		html += '</div>';
	}
	return html;
}

// ============================================
function setupQuadrantListeners(): void {
	selectedQuadrants = [false, false, false, false];
	quadrantCounts = [null, null, null, null];
	const buttons = document.querySelectorAll('.quadrant-btn');
	buttons.forEach((btn) => {
		const el = btn as HTMLElement;
		const idx = parseInt(el.getAttribute('data-quadrant') || '0');
		const corner = QUADRANT_CORNERS[idx];

		el.addEventListener('click', () => {
			// Prompt user for their live cell count in this quadrant
			const existing = quadrantCounts[idx];
			const defaultVal = existing !== null ? String(existing) : '';
			const input = prompt(
				'How many LIVE cells do you count in ' + corner.label + '?',
				defaultVal,
			);
			if (input === null) return;
			const parsed = parseInt(input, 10);
			if (isNaN(parsed) || parsed < 0) {
				showNotification('Enter a non-negative whole number.', 'warning');
				return;
			}
			quadrantCounts[idx] = parsed;
			selectedQuadrants[idx] = true;
			el.style.border = '3px solid #4caf50';
			el.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
			// Show count badge
			const badge = el.querySelector('.quadrant-count-badge') as HTMLElement;
			if (badge) {
				badge.style.display = 'block';
				badge.textContent = String(parsed);
			}
			updateQuadrantStatus();
		});

		// Hover feedback
		el.addEventListener('mouseenter', () => {
			if (!selectedQuadrants[idx]) {
				el.style.backgroundColor = 'rgba(76, 175, 80, 0.08)';
			}
		});
		el.addEventListener('mouseleave', () => {
			if (!selectedQuadrants[idx]) {
				el.style.backgroundColor = 'transparent';
			}
		});
	});
}

// ============================================
function updateQuadrantStatus(): void {
	let count = 0;
	for (let i = 0; i < 4; i++) {
		if (selectedQuadrants[i]) count++;
	}
	const statusEl = document.getElementById('quadrant-status');
	if (statusEl) {
		statusEl.textContent = count + ' of 4 quadrants counted';
	}
	// Enable submit only when all 4 are selected
	const submitBtn = document.getElementById('submit-cell-count') as HTMLButtonElement;
	if (submitBtn) {
		submitBtn.disabled = count < 4;
	}
}

// ============================================
function submitQuadrantCount(): void {
	// Count how many quadrants have been counted
	let selectedCount = 0;
	for (let i = 0; i < 4; i++) {
		if (selectedQuadrants[i]) selectedCount++;
	}
	if (selectedCount < 4) {
		showNotification('Please count cells in all 4 corner quadrants.', 'warning');
		return;
	}

	// Calculate cells/mL from user-entered counts
	// Formula: (avg per square) x dilution_factor(10) x 10,000
	let totalUserCount = 0;
	for (let i = 0; i < 4; i++) {
		totalUserCount += quadrantCounts[i] as number;
	}
	const avgPerSquare = totalUserCount / 4;
	const estimatedCount = Math.round(avgPerSquare * 10 * 10000);
	gameState.cellCount = estimatedCount;

	// Compare against actual for feedback
	const actual = gameState.actualCellCount;
	const errorPercent = Math.abs(estimatedCount - actual) / actual * 100;

	let feedback = 'Your count: ~' + estimatedCount.toLocaleString() + ' cells/mL. ';
	if (errorPercent <= 10) {
		feedback += 'Excellent -- very close to actual!';
	} else if (errorPercent <= 25) {
		feedback += 'Good count, within acceptable range.';
	} else {
		feedback += 'Actual was ~' + actual.toLocaleString() + ' cells/mL.';
	}

	showNotification(feedback, errorPercent <= 25 ? 'success' : 'info');
	triggerStep('count_cells');

	// Close microscope, return to hood
	const overlay = document.getElementById('microscope-overlay');
	if (overlay) overlay.classList.remove('active');
	switchScene('hood');
}

// ============================================
// PLATE READER VIEW
// ============================================
function renderPlateReaderScene(): void {
	const overlay = document.getElementById('microscope-overlay');
	if (!overlay) return;

	overlay.classList.add('active');
	runMttReadout();

	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	let html = '<button class="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>Plate Reader Results (MTT Assay - 560 nm)</h2>';
	html += '<div class="microscope-view" style="flex-direction:column;min-height:auto;padding:16px;overflow-y:auto;">';

	// Split header with column group labels
	html += '<div style="margin-bottom:12px;">';
	html += '<div style="display:flex;font-size:12px;font-weight:600;color:#333;margin-bottom:4px;">';
	html += '<div style="flex:0 0 40px;"></div>';
	html += '<div style="flex:1;text-align:center;padding:4px;">Carboplatin only (1-6)</div>';
	html += '<div style="flex:1;text-align:center;padding:4px;">+ Metformin 5 mM (7-12)</div>';
	html += '</div>';

	// 8x12 well plate grid with headers
	html += '<table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:16px;">';

	// Sub-header row: column numbers 1-12
	html += '<tr>';
	html += '<td style="padding:4px;text-align:center;font-weight:600;width:40px;"></td>';
	for (let col = 0; col < PLATE_96_COLS; col++) {
		html += '<td style="padding:4px;text-align:center;font-weight:600;border-bottom:1px solid #ccc;">' + COL_LABELS[col] + '</td>';
	}
	html += '</tr>';

	// Data rows: A-H, with colors based on absorbance (viability)
	for (let row = 0; row < PLATE_96_ROWS; row++) {
		html += '<tr>';
		html += '<td style="padding:4px;text-align:center;font-weight:600;width:40px;background:#f5f5f5;">' + ROW_LABELS[row] + '</td>';
		for (let col = 0; col < PLATE_96_COLS; col++) {
			const well = getWell(row, col);
			const absorbance = well.absorbance;
			// Color scale: lighter = higher viability/absorbance
			const viability = Math.max(0, Math.min(1, absorbance / 1.2));
			const bgR = Math.round(255 - viability * 80);
			const bgG = Math.round(255 - viability * 30);
			const bgB = Math.round(255 - viability * 100);
			html += '<td style="padding:4px;text-align:center;border:1px solid #ddd;background:rgb(' + bgR + ',' + bgG + ',' + bgB + ');">';
			html += absorbance.toFixed(3);
			html += '</td>';
		}
		html += '</tr>';
	}
	html += '</table>';
	html += '</div>';

	// Row means: left columns (1-6) vs right columns (7-12)
	html += '<div style="margin-bottom:16px;">';
	html += '<h3 style="font-size:13px;font-weight:600;margin:0 0 8px 0;">Row Means</h3>';
	html += '<table style="border-collapse:collapse;font-size:12px;width:400px;">';
	html += '<tr>';
	html += '<td style="padding:6px;border:1px solid #ddd;font-weight:600;width:30px;">Row</td>';
	html += '<td style="padding:6px;border:1px solid #ddd;font-weight:600;">Carb-only mean (1-6)</td>';
	html += '<td style="padding:6px;border:1px solid #ddd;font-weight:600;">+Metformin mean (7-12)</td>';
	html += '</tr>';

	for (let row = 0; row < PLATE_96_ROWS; row++) {
		// Carboplatin only: columns 0-5
		let carbSum = 0;
		for (let col = 0; col < 6; col++) {
			carbSum += getWell(row, col).absorbance;
		}
		const carbMean = carbSum / 6;

		// Metformin: columns 6-11
		let metSum = 0;
		for (let col = 6; col < 12; col++) {
			metSum += getWell(row, col).absorbance;
		}
		const metMean = metSum / 6;

		html += '<tr>';
		html += '<td style="padding:6px;border:1px solid #ddd;font-weight:600;background:#f5f5f5;">' + ROW_LABELS[row] + '</td>';
		html += '<td style="padding:6px;border:1px solid #ddd;text-align:center;">' + carbMean.toFixed(3) + '</td>';
		html += '<td style="padding:6px;border:1px solid #ddd;text-align:center;">' + metMean.toFixed(3) + '</td>';
		html += '</tr>';
	}
	html += '</table>';
	html += '</div>';

	html += '<div style="text-align:center;margin-top:16px;">';
	html += '<button id="complete-plate-read" class="btn-primary" style="padding:10px 24px;">Complete Experiment</button>';
	html += '</div>';

	modal.innerHTML = html;

	const completeBtn = document.getElementById('complete-plate-read');
	if (completeBtn) {
		completeBtn.addEventListener('click', () => {
			triggerStep('plate_read');
			// Note: "results" is fired separately by the close button so
			// the student has an explicit "I reviewed the results"
			// gesture. See the close-button handler below.
		});
	}

	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			// Closing the plate-reader overlay while the "results" step
			// is active should fire triggerStep('results'). Previously
			// this handler only switched scenes and left the protocol
			// stuck at the final step.
			if (gameState.activeStepId === 'results') {
				triggerStep('results');
			}
			overlay.classList.remove('active');
			switchScene('hood');
		});
	}
}

