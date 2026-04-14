// ============================================
// drug_treatment.ts - Step-aware drug and dilution prep modal
// ============================================
// One modal, one protocol step at a time. startDrugAddition() opens
// #microscope-overlay and renders the screen for whatever step is
// active (carb_intermediate .. add_metformin). Each screen has a
// single advance interaction that fires triggerStep(activeStepId)
// for exactly that one step. After the trigger, the modal rerenders:
// if the new active step is still modal-owned it shows the next
// screen; otherwise it closes and returns to the hood.
//
// This replaces the old cascade where selectDilutionSeries() fired
// four or six triggers in a single click. That collapse was the
// source of the walkthrough's (auto) labels and prevented the
// explicit-transition state machine from tracking dilution mistakes
// per step.

// Dilution-series options for the carb_low_range screen. The low-range
// working stocks for rows B-F are where the "pick a dilution scheme"
// decision actually matters (intermediate -> 5 working stocks spanning
// three orders of magnitude). carb_intermediate, carb_high_range, and
// metformin_stock all have fixed recipes, so they are not options.
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

// Per-step screen content. Keyed by protocol step id. Each entry
// describes the modal body for that one step. The dispatcher reads
// the active step id from gameState and looks up the matching entry.
type DrugModalScreen = {
	title: string;
	recipe: string;
	buttonLabel: string;
	successMessage: string;
};

const DRUG_MODAL_SCREENS: Record<string, DrugModalScreen> = {
	carb_intermediate: {
		title: 'Carboplatin 200 uM Intermediate Stock',
		recipe: 'Mix 20 &micro;L 10 mM carboplatin with 980 &micro;L sterile water. '
			+ 'This 200 &micro;M intermediate is the source for the low-range working stocks.',
		buttonLabel: 'Prepare intermediate stock',
		successMessage: 'Carboplatin intermediate prepared (200 uM).',
	},
	carb_high_range: {
		title: 'Carboplatin High-Range Working Stocks',
		recipe: 'From the 10 mM carboplatin stock, make 2 high-range working stocks: '
			+ '<br>5 &micro;M stock: 10 &micro;L stock + 990 &micro;L media.'
			+ '<br>25 &micro;M stock: 50 &micro;L stock + 950 &micro;L media.'
			+ '<br>These give the 5 &micro;M and 25 &micro;M final concentrations for rows G and H.',
		buttonLabel: 'Prepare high-range stocks',
		successMessage: 'Carboplatin high-range working stocks prepared.',
	},
	metformin_stock: {
		title: 'Metformin 10 mM Working Stock',
		recipe: 'Mix 10 &micro;L 1 M metformin with 990 &micro;L sterile water. '
			+ 'Fresh metformin working stock is prepared on the day of treatment.',
		buttonLabel: 'Prepare metformin stock',
		successMessage: 'Metformin working stock prepared (10 mM).',
	},
	add_carboplatin: {
		title: 'Add Carboplatin to Plate',
		recipe: 'Add 5 &micro;L carboplatin working stock per well across rows B-H. '
			+ 'Row A stays drug-free as a vehicle control. The 8-point dose series '
			+ 'lets you compute an IC50 curve.',
		buttonLabel: 'Add carboplatin (rows B-H)',
		successMessage: 'Carboplatin added to rows B-H.',
	},
	add_metformin: {
		title: 'Add Metformin to Columns 7-12',
		recipe: 'Add 5 &micro;L metformin working stock to columns 7-12 only. '
			+ 'Columns 1-6 stay carboplatin-only. Metformin sensitizes cells so '
			+ 'the +metformin curve shifts left.',
		buttonLabel: 'Add metformin (cols 7-12)',
		successMessage: 'Metformin added to columns 7-12.',
	},
};

// ============================================
// Pre-register every step id that this module may advance. One
// registration per step because each step now has its own advance
// handler; validateTriggerCoverage runs at the `load` event before
// any user click and needs these visible at module load time.
registeredTriggers.add('carb_intermediate');
registeredTriggers.add('carb_low_range');
registeredTriggers.add('carb_high_range');
registeredTriggers.add('metformin_stock');
registeredTriggers.add('add_carboplatin');
registeredTriggers.add('add_metformin');

// Steps owned by this modal, in nextId order. Used by rerender to
// decide whether to stay open or close.
const MODAL_OWNED_STEPS: string[] = [
	'carb_intermediate',
	'carb_low_range',
	'carb_high_range',
	'metformin_stock',
	'add_carboplatin',
	'add_metformin',
];

// ============================================
// Public entry point. Called from the hood click chain
// (multichannel_pipette + drug_vials + well_plate). Renders the
// modal screen for whatever step is currently active.
function startDrugAddition(): void {
	const overlay = document.getElementById('microscope-overlay');
	if (!overlay) return;
	overlay.classList.add('active');
	renderDrugModalStep();
}

// ============================================
// Render whichever screen matches the active step. If the active
// step is not one of the six modal-owned steps, close the overlay.
function renderDrugModalStep(): void {
	const overlay = document.getElementById('microscope-overlay');
	if (!overlay) return;

	const active = gameState.activeStepId;
	if (!active || MODAL_OWNED_STEPS.indexOf(active) < 0) {
		// The active step has moved off the modal-owned block (for
		// example metformin_stock -> prewarm_media, or add_metformin
		// -> incubate_48h). Close the modal and return to the hood.
		overlay.classList.remove('active');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	// carb_low_range has its own rendering path: the three-option
	// dilution-series choice. All other modal-owned steps share the
	// single-button layout.
	if (active === 'carb_low_range') {
		renderDilutionChoiceScreen(modal);
	} else {
		renderSingleButtonScreen(modal, active);
	}

	// Close button always attached (student may abort mid-modal).
	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			overlay.classList.remove('active');
		});
	}
}

// ============================================
// Single-button screen used by every modal-owned step except
// carb_low_range. Reads the recipe text from DRUG_MODAL_SCREENS,
// renders one primary advance button, and wires the button to
// advanceDrugModalStep().
function renderSingleButtonScreen(modal: HTMLElement, stepId: string): void {
	const screen = DRUG_MODAL_SCREENS[stepId];
	if (!screen) return;

	let html = '<button class="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>' + screen.title + '</h2>';
	html += '<div style="padding:0 8px 16px 8px;">';
	html += '<p style="font-size:14px;color:#212121;margin:0 0 20px 0;line-height:1.5;">';
	html += screen.recipe;
	html += '</p>';
	html += '<button class="drug-modal-advance btn-primary" ';
	html += 'style="padding:12px 24px;font-size:15px;font-weight:600;">';
	html += screen.buttonLabel;
	html += '</button>';
	html += '</div>';
	modal.innerHTML = html;

	const advanceBtn = modal.querySelector('.drug-modal-advance') as HTMLElement;
	if (advanceBtn) {
		advanceBtn.addEventListener('click', () => {
			showNotification(screen.successMessage, 'success');
			advanceDrugModalStep(stepId);
		});
	}
}

// ============================================
// carb_low_range screen: three dilution-series options. The
// correct answer (half-log) still advances the step; wrong answers
// also advance but register a warning that lands in scoring
// feedback later.
function renderDilutionChoiceScreen(modal: HTMLElement): void {
	let html = '<button class="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>Choose Low-Range Dilution Series</h2>';
	html += '<div style="padding:0 8px 16px 8px;">';
	html += '<p style="font-size:14px;color:#212121;margin:0 0 16px 0;">';
	html += 'Pick the dilution scheme that walks from the 200 &micro;M intermediate '
		+ 'to the low-range working stocks for rows B-F of the plate:</p>';

	for (let i = 0; i < DILUTION_OPTIONS.length; i++) {
		const opt = DILUTION_OPTIONS[i];
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

	const buttons = modal.querySelectorAll('.dilution-choice');
	buttons.forEach((btn) => {
		const el = btn as HTMLElement;
		const idx = parseInt(el.getAttribute('data-dilution-index') || '0');
		el.addEventListener('click', () => {
			selectLowRangeDilution(idx);
		});
		el.addEventListener('mouseenter', () => {
			el.style.transform = 'translateX(4px)';
			el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
		});
		el.addEventListener('mouseleave', () => {
			el.style.transform = '';
			el.style.boxShadow = '';
		});
	});
}

// ============================================
function selectLowRangeDilution(index: number): void {
	const option = DILUTION_OPTIONS[index];
	if (option.correct) {
		showNotification(
			'Half-log dilution applied -- good choice for a full dose-response!',
			'success',
		);
	} else {
		registerWarning('Suboptimal dilution: ' + option.description);
		gameState.dilutionErrors = (gameState.dilutionErrors || 0) + 1;
	}
	advanceDrugModalStep('carb_low_range');
}

// ============================================
// Fire the trigger for exactly one step, apply any per-step side
// effects, then rerender the modal so it either shows the next
// screen or closes.
function advanceDrugModalStep(stepId: string): void {
	if (stepId === 'add_carboplatin') {
		// Apply the per-row dose map (carb conc by row A..H, metformin
		// on cols 7..12). This is the moment the plate receives its
		// real dose response; scoring and MTT readout depend on it.
		applyPlateDoseMap();
		gameState.drugsAdded = true;
	}
	triggerStep(stepId);
	renderDrugModalStep();
}
