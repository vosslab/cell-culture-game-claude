// ============================================
// drug_treatment.ts - Serial dilution choice overlay and drug addition
// ============================================

// Three dilution series options with concentration arrays
const DILUTION_OPTIONS = [
	{
		label: 'Half-log dilution (10x to vehicle)',
		doses: [0, 0.1, 0.5, 1, 5, 10],
		correct: true,
		description: 'Spans 3 orders of magnitude for a full dose-response curve.',
	},
	{
		label: 'Binary dilution (2-fold serial)',
		doses: [0, 0.5, 1, 2, 4, 8],
		correct: false,
		description: 'Only 16-fold range -- too narrow to capture the full dose-response.',
	},
	{
		label: 'Shallow gradient (uniform spacing)',
		doses: [0, 2, 4, 6, 8, 10],
		correct: false,
		description: 'Linear spacing misses the low-dose region where the curve is most informative.',
	},
];

// ============================================
function startDrugAddition(): void {
	// Show the dilution choice overlay
	const overlay = document.getElementById('microscope-overlay');
	if (!overlay) return;

	overlay.classList.add('active');
	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	let html = '<button class="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>Choose Dilution Series</h2>';
	html += '<div style="padding:0 8px 16px 8px;">';
	html += '<p style="font-size:14px;color:#212121;margin:0 0 16px 0;">';
	html += 'Select the dilution series for your drug treatment across 6 columns (column 1 = vehicle control):</p>';

	// Render 3 option buttons
	for (let i = 0; i < DILUTION_OPTIONS.length; i++) {
		const opt = DILUTION_OPTIONS[i];
		// All options styled the same so the student must think about the answer
		const bgColor = '#f5f5f5';
		const borderColor = '#e0e0e0';
		html += '<button class="dilution-choice" data-dilution-index="' + i + '" ';
		html += 'style="display:block;width:100%;text-align:left;padding:14px 16px;margin-bottom:10px;';
		html += 'background:' + bgColor + ';border:2px solid ' + borderColor + ';border-radius:8px;';
		html += 'cursor:pointer;transition:all 0.2s ease;font-size:14px;">';
		html += '<div style="font-weight:600;margin-bottom:4px;">' + opt.label + '</div>';
		html += '<div style="font-size:12px;color:#757575;">Concentrations (&micro;M): ' + opt.doses.join(', ') + '</div>';
		html += '</button>';
	}

	html += '</div>';
	modal.innerHTML = html;

	// Set up click handlers for each option
	const buttons = modal.querySelectorAll('.dilution-choice');
	buttons.forEach((btn) => {
		const el = btn as HTMLElement;
		const idx = parseInt(el.getAttribute('data-dilution-index') || '0');

		el.addEventListener('click', () => {
			selectDilutionSeries(idx);
		});

		// Hover effect
		el.addEventListener('mouseenter', () => {
			el.style.transform = 'translateX(4px)';
			el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
		});
		el.addEventListener('mouseleave', () => {
			el.style.transform = '';
			el.style.boxShadow = '';
		});
	});

	// Close button
	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			overlay.classList.remove('active');
		});
	}
}

// ============================================
function selectDilutionSeries(index: number): void {
	const option = DILUTION_OPTIONS[index];
	const overlay = document.getElementById('microscope-overlay');

	if (!option.correct) {
		// Wrong choice: warn and explain, but still apply it
		registerWarning('Suboptimal dilution: ' + option.description);
	}

	// Apply the selected concentrations to the plate
	gameState.wellPlate.forEach(well => {
		well.drugConcentrationUm = option.doses[well.col];
	});
	gameState.drugsAdded = true;

	if (option.correct) {
		showNotification('Half-log dilution applied -- good choice for a full dose-response!', 'success');
	}

	completeStep('add_drugs');

	// Close overlay and return to hood
	if (overlay) overlay.classList.remove('active');
	renderHoodScene();
	renderProtocolPanel();
	renderScoreDisplay();
}
