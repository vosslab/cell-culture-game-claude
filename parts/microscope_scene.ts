// ============================================
// microscope_scene.ts - Microscope (viability + counting) and Plate Reader
// ============================================

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
		html += '<p style="margin:0;font-size:13px;color:#757575;">Estimated viability: <strong>' + Math.round(cellState.viability * 100) + '%</strong></p>';
		html += '</div>';
		html += '<button id="confirm-viability" class="btn-primary" style="padding:10px 24px;">Confirm Viability and Proceed to Counting</button>';
	} else {
		// Step 2: Cell counting on hemocytometer
		html += '<h2>Hemocytometer - Cell Count</h2>';
		html += '<div class="microscope-view">';
		html += '<svg id="microscope-svg" viewBox="0 0 400 300" width="400" height="300"></svg>';
		html += '</div>';
		html += '<div class="cell-count-section">';
		html += '<label for="cell-count-input">Enter your cell count (cells/mL):</label>';
		html += '<p style="margin:4px 0;font-size:12px;color:#757575;">Count cells in the 4 highlighted corner squares, average, then multiply by 10,000</p>';
		html += '<input id="cell-count-input" type="number" placeholder="e.g. 500000" min="0">';
		html += '<button id="submit-cell-count">Submit Count</button>';
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
		const submitBtn = document.getElementById('submit-cell-count');
		if (submitBtn) {
			submitBtn.addEventListener('click', submitCellCount);
		}
		const input = document.getElementById('cell-count-input') as HTMLInputElement;
		if (input) {
			input.focus();
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') submitCellCount();
			});
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

// ============================================
function submitCellCount(): void {
	const input = document.getElementById('cell-count-input') as HTMLInputElement;
	if (!input) return;

	const count = parseInt(input.value);
	if (isNaN(count) || count < 0) {
		showNotification('Please enter a valid positive number.', 'warning');
		return;
	}

	gameState.cellCount = count;

	const actual = gameState.actualCellCount;
	const errorPercent = Math.abs(count - actual) / actual * 100;

	let feedback = '';
	if (errorPercent <= 10) {
		feedback = 'Excellent count! Very close to actual.';
	} else if (errorPercent <= 25) {
		feedback = 'Good count. Within acceptable range.';
	} else {
		feedback = 'Count is off. Actual was ~' + actual.toLocaleString() + ' cells/mL.';
	}

	showNotification(feedback, errorPercent <= 25 ? 'success' : 'info');
	completeStep('count_cells');

	// Close microscope, return to hood for plating
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
