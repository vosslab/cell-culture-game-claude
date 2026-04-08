// ============================================
// microscope_scene.ts - Microscope (viability + counting) and Plate Reader
// ============================================

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

	// Check which microscope step we are on
	const viabilityDone = gameState.completedSteps.includes('microscope_check');

	let html = '<button class="modal-close" aria-label="Close">&times;</button>';

	if (!viabilityDone) {
		// Step 1: Viability check with trypan blue
		html += '<h2>Microscope - Viability Check</h2>';
		html += '<div class="microscope-view">';
		html += '<svg id="microscope-svg" viewBox="0 0 400 300" width="400" height="300"></svg>';
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
		html += '<div class="microscope-view" style="position:relative;">';
		html += '<svg id="microscope-svg" viewBox="0 0 400 300" width="400" height="300"></svg>';
		// Overlay clickable quadrant buttons on top of the 4 corner squares
		html += '<div id="quadrant-buttons" style="position:absolute;top:0;left:0;width:100%;height:100%;">';
		html += renderQuadrantButtons();
		html += '</div>';
		html += '</div>';
		html += '<div style="padding:12px;background:#f0f2f5;border-radius:8px;margin-bottom:12px;">';
		html += '<p style="margin:0 0 6px 0;font-size:14px;color:#212121;">Click each corner square to count cells in that quadrant.</p>';
		html += '<p style="margin:0;font-size:12px;color:#757575;">Select all 4 quadrants, then submit. The average is multiplied by 10,000 to get cells/mL.</p>';
		html += '</div>';
		html += '<div style="display:flex;align-items:center;gap:12px;">';
		html += '<span id="quadrant-status" style="font-size:13px;color:#757575;">0 of 4 quadrants selected</span>';
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
				completeStep('microscope_check');
				// Stay in microscope for counting
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

	// Close button
	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			overlay.classList.remove('active');
			switchScene('hood');
		});
	}
}

// ============================================
function drawHemocytometerGrid(svg: SVGElement): void {
	const ns = 'http://www.w3.org/2000/svg';
	const w = 400;
	const h = 300;

	// Background
	const bg = document.createElementNS(ns, 'rect');
	bg.setAttribute('width', String(w));
	bg.setAttribute('height', String(h));
	bg.setAttribute('fill', '#fafafa');
	svg.appendChild(bg);

	// Highlight 4 corner squares
	const corners = [
		{ x: 0, y: 0 }, { x: 300, y: 0 },
		{ x: 0, y: 225 }, { x: 300, y: 225 },
	];
	corners.forEach((c) => {
		const rect = document.createElementNS(ns, 'rect');
		rect.setAttribute('x', String(c.x));
		rect.setAttribute('y', String(c.y));
		rect.setAttribute('width', '100');
		rect.setAttribute('height', '75');
		rect.setAttribute('fill', '#fff9e6');
		rect.setAttribute('fill-opacity', '0.5');
		rect.setAttribute('stroke', '#e6c200');
		rect.setAttribute('stroke-width', '1.5');
		rect.setAttribute('stroke-dasharray', '4,2');
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
		hLine.setAttribute('y1', String(i * 75));
		hLine.setAttribute('x2', String(w));
		hLine.setAttribute('y2', String(i * 75));
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
		hLine.setAttribute('y1', String(i * 18.75));
		hLine.setAttribute('x2', String(w));
		hLine.setAttribute('y2', String(i * 18.75));
		hLine.setAttribute('stroke', '#ddd');
		hLine.setAttribute('stroke-width', '0.5');
		svg.appendChild(hLine);
	}

	const label = document.createElementNS(ns, 'text');
	label.setAttribute('x', '200');
	label.setAttribute('y', '295');
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
		circle.setAttribute('cy', String(pos.y * 300));
		circle.setAttribute('r', String(pos.radius * 300));
		if (pos.alive) {
			circle.setAttribute('fill', 'rgba(200,200,200,0.6)');
		} else {
			circle.setAttribute('fill', 'rgba(50,100,200,0.7)');
		}
		circle.setAttribute('stroke', '#333');
		circle.setAttribute('stroke-width', '0.5');
		svg.appendChild(circle);
	});
}

// Track which quadrants are selected (indices 0-3 for TL, TR, BL, BR)
let selectedQuadrants: boolean[] = [false, false, false, false];

// ============================================
// Quadrant corner positions matching the SVG grid corners
// Each quadrant covers a 100x75 region of the 400x300 SVG
const QUADRANT_CORNERS = [
	{ x: 0, y: 0, label: 'Top-Left (A1)' },
	{ x: 300, y: 0, label: 'Top-Right (A4)' },
	{ x: 0, y: 225, label: 'Bottom-Left (D1)' },
	{ x: 300, y: 225, label: 'Bottom-Right (D4)' },
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
		const topPct = (c.y / 300) * 100;
		const widthPct = (100 / 400) * 100;
		const heightPct = (75 / 300) * 100;
		html += '<div class="quadrant-btn" data-quadrant="' + i + '" ';
		html += 'title="' + c.label + '" ';
		html += 'style="position:absolute;';
		html += 'left:' + leftPct + '%;top:' + topPct + '%;';
		html += 'width:' + widthPct + '%;height:' + heightPct + '%;';
		html += 'cursor:pointer;border:2px solid transparent;border-radius:2px;';
		html += 'transition:all 0.2s ease;z-index:10;">';
		html += '</div>';
	}
	return html;
}

// ============================================
function setupQuadrantListeners(): void {
	selectedQuadrants = [false, false, false, false];
	const buttons = document.querySelectorAll('.quadrant-btn');
	buttons.forEach((btn) => {
		const el = btn as HTMLElement;
		const idx = parseInt(el.getAttribute('data-quadrant') || '0');

		el.addEventListener('click', () => {
			// Toggle selection
			selectedQuadrants[idx] = !selectedQuadrants[idx];
			if (selectedQuadrants[idx]) {
				el.style.border = '3px solid #4caf50';
				el.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
			} else {
				el.style.border = '2px solid transparent';
				el.style.backgroundColor = 'transparent';
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
		statusEl.textContent = count + ' of 4 quadrants selected';
	}
	// Enable submit only when all 4 are selected
	const submitBtn = document.getElementById('submit-cell-count') as HTMLButtonElement;
	if (submitBtn) {
		submitBtn.disabled = count < 4;
	}
}

// ============================================
function submitQuadrantCount(): void {
	// Count how many are selected (should be 4)
	let selectedCount = 0;
	for (let i = 0; i < 4; i++) {
		if (selectedQuadrants[i]) selectedCount++;
	}
	if (selectedCount < 4) {
		showNotification('Please select all 4 corner quadrants.', 'warning');
		return;
	}

	// The cell count is derived from the cells visible on the grid
	// Real hemocytometer: the grid has 4x4 = 16 large squares, player counts 4 corner squares
	// Formula: cells/mL = (total in 4 squares / 4) * 10,000
	// Since our visible cells represent a scaled sample, count ALL live cells
	// and scale by (4 squares / 16 total squares) to simulate counting corners only
	const cellState = getCellState();
	let totalLiveCells = 0;
	cellState.positions.forEach((pos) => {
		if (pos.alive) totalLiveCells++;
	});

	// 4 corner squares out of 16 total = 25% of the grid area
	// Average per corner square, then multiply by 10,000
	const cellsInFourSquares = Math.round(totalLiveCells * 0.25);
	const avgPerSquare = cellsInFourSquares / 4;
	const estimatedCount = Math.round(avgPerSquare * 10000);
	gameState.cellCount = estimatedCount;

	const actual = gameState.actualCellCount;
	const errorPercent = Math.abs(estimatedCount - actual) / actual * 100;

	let feedback = 'Count: ~' + estimatedCount.toLocaleString() + ' cells/mL. ';
	if (errorPercent <= 10) {
		feedback += 'Excellent -- very close to actual!';
	} else if (errorPercent <= 25) {
		feedback += 'Good count, within acceptable range.';
	} else {
		feedback += 'Actual was ~' + actual.toLocaleString() + ' cells/mL.';
	}

	showNotification(feedback, errorPercent <= 25 ? 'success' : 'info');
	completeStep('count_cells');

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
	generatePlateReaderResults();

	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	let html = '<button class="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>Plate Reader Results (MTT Assay - 570 nm)</h2>';
	html += '<div class="microscope-view" style="flex-direction:column;min-height:auto;padding:16px;">';

	// Results table
	html += '<table style="border-collapse:collapse;width:100%;font-size:13px;">';
	html += '<tr><th style="padding:6px;border:1px solid #ddd;background:#f5f5f5;"></th>';
	for (let col = 0; col < PLATE_COLS; col++) {
		html += '<th style="padding:6px;border:1px solid #ddd;background:#f5f5f5;">' + DRUG_CONCENTRATION_LABELS[col] + ' uM</th>';
	}
	html += '</tr>';

	const rowLabels = ['A', 'B', 'C', 'D'];
	for (let row = 0; row < PLATE_ROWS; row++) {
		html += '<tr>';
		html += '<td style="padding:6px;border:1px solid #ddd;background:#f5f5f5;font-weight:600;">' + rowLabels[row] + '</td>';
		for (let col = 0; col < PLATE_COLS; col++) {
			const well = getWell(row, col);
			const intensity = well.absorbance;
			const bgR = Math.round(255 - intensity * 100);
			const bgG = Math.round(255 - intensity * 40);
			const bgB = Math.round(255 - intensity * 120);
			html += '<td style="padding:6px;border:1px solid #ddd;text-align:center;background:rgb(' + bgR + ',' + bgG + ',' + bgB + ');">';
			html += well.absorbance.toFixed(3);
			html += '</td>';
		}
		html += '</tr>';
	}
	html += '</table>';

	// Column averages
	html += '<div style="margin-top:16px;">';
	html += '<h3 style="font-size:14px;margin:0 0 8px 0;">Column Averages</h3>';
	html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
	for (let col = 0; col < PLATE_COLS; col++) {
		let sum = 0;
		for (let row = 0; row < PLATE_ROWS; row++) {
			sum += getWell(row, col).absorbance;
		}
		const avg = sum / PLATE_ROWS;
		html += '<div style="text-align:center;padding:8px 12px;background:#f0f2f5;border-radius:6px;min-width:60px;">';
		html += '<div style="font-size:11px;color:#757575;">' + DRUG_CONCENTRATION_LABELS[col] + ' uM</div>';
		html += '<div style="font-size:16px;font-weight:600;">' + avg.toFixed(3) + '</div>';
		html += '</div>';
	}
	html += '</div></div>';
	html += '</div>';

	html += '<div style="text-align:center;margin-top:16px;">';
	html += '<button id="complete-plate-read" class="btn-primary" style="padding:10px 24px;">Complete Experiment</button>';
	html += '</div>';

	modal.innerHTML = html;

	const completeBtn = document.getElementById('complete-plate-read');
	if (completeBtn) {
		completeBtn.addEventListener('click', () => {
			gameState.plateReadComplete = true;
			completeStep('plate_read');
			overlay.classList.remove('active');
		});
	}

	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			overlay.classList.remove('active');
			switchScene('hood');
		});
	}
}

// ============================================
function generatePlateReaderResults(): void {
	const controlAbsorbance = 1.2 + Math.random() * 0.3;

	gameState.wellPlate.forEach(well => {
		if (!well.hasCells) {
			well.absorbance = 0.05 + Math.random() * 0.02;
			return;
		}
		const drugConc = well.drugConcentrationUm;
		const ic50 = 2;
		const hillSlope = 1.5;
		const survivalFraction = 1 / (1 + Math.pow(drugConc / ic50, hillSlope));
		const baseAbsorbance = controlAbsorbance * survivalFraction;
		const noise = (Math.random() - 0.5) * 0.08;
		well.absorbance = Math.max(0.05, baseAbsorbance + noise);
	});
}
