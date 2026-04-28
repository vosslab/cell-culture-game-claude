// ============================================
// bench_scene.ts - Bench (outside-the-hood) scene rendering
// ============================================

// Pre-register step ids this scene owns so validateTriggerCoverage passes
// at page load time. See hood_scene.ts for the policy rationale.
registeredTriggers.add('centrifuge');
registeredTriggers.add('prewarm_media');
registeredTriggers.add('plate_read');
// The bench is a peer of the hood scene. It holds equipment the student
// uses between hood steps: incubator, microscope, water bath, vortex,
// centrifuge, cell counter, plate reader. The bench wires into the shared layout
// engine via parts/bench_config.ts.
// ============================================

// ============================================
// getBenchItemSvgHtml - bench-only equivalent of getItemSvgHtml() in
// hood_scene.ts.
function getBenchItemSvgHtml(itemId: string): string {
	switch (itemId) {
		case 'microscope': return getMicroscopeSvg();
		case 'incubator': return getIncubatorSvg();
		case 'plate_reader': return getPlateReaderSvg();
		case 'centrifuge': return getCentrifugeSvg();
		case 'water_bath': return getWaterBathSvg();
		case 'vortex': return getVortexSvg();
		case 'cell_counter': return getCellCounterSvg();
		default: return '';
	}
}

// ============================================
// Click handler for bench items. Microscope/incubator open their
// modal overlays; the remaining instruments advance their matching
// protocol step when the active step calls for them.
function onBenchItemClick(itemId: string): void {
	if (itemId === 'microscope') {
		// Serological pipette loaded with sample: use this click to load
		// the hemocytometer with trypan-blue-stained cells, then open the
		// microscope overlay. Mirrors the legacy hood handler which is
		// now dead because microscope no longer lives on the hood.
		if (gameState.selectedTool === 'serological_pipette_with_sample') {
			gameState.selectedTool = null;
			gameState.hemocytometerLoaded = true;
			showNotification(
				'Sample mixed with trypan blue and loaded onto hemocytometer.',
				'success',
			);
		}
		// switchScene already calls renderGame -- calling it again here
		// would start a second concurrent animation for modal scenes.
		switchScene('microscope');
		return;
	}
	if (itemId === 'incubator') {
		// Flask held + trypsin added + not yet incubated: run trypsin
		// incubation (UI sub-state, not a protocol step). After the
		// animation we return to hood for media neutralization.
		if (gameState.selectedTool === 'flask'
			&& gameState.trypsinAdded && !gameState.trypsinIncubated) {
			gameState.selectedTool = null;
			renderTrypsinIncubation();
			return;
		}
		// Well plate held: run the main incubator animation which
		// dispatches the matching incubate_* protocol step and returns
		// to hood. Do NOT call renderGame() after switchScene -- the
		// switchScene call already does, and a second call would start
		// a second concurrent runIncubationOverlay setInterval, causing
		// onComplete to fire twice. The second fire fell into the
		// fallback branch (since activeStepId had already advanced)
		// and pushed the next incubate_* id into outOfOrderAttempts.
		if (gameState.selectedTool === 'well_plate') {
			gameState.selectedTool = null;
			switchScene('incubator');
			return;
		}
		switchScene('incubator');
		return;
	}
	if (itemId === 'plate_reader') {
		const currentStep = getCurrentStep();
		if (currentStep && (currentStep.id === 'plate_read' || currentStep.id === 'results')) {
			switchScene('plate_reader');
			return;
		}
		showNotification('The plate reader is ready for the readout step.');
		return;
	}
	// Centrifuge: trigger the centrifuge step when clicked
	if (itemId === 'centrifuge') {
		const currentStep = getCurrentStep();
		// TODO: replace activeStepId peek with trigger-spec lookup
		if (currentStep && currentStep.id === 'centrifuge') {
			triggerStep('centrifuge');
			// Centrifuge pellets the cells; supernatant is discarded.
			// Zero the flask volume so the subsequent resuspend flow
			// (serological + media_bottle + flask) can start from an
			// "empty" container without tripping startAddingMedia's
			// "flask must be aspirated first" guard.
			gameState.flaskMediaMl = 0;
			gameState.flaskMediaAge = 'old';
		}
		showNotification('Cells centrifuged.');
		return;
	}
	// Water bath: trigger prewarm_media when clicked
	if (itemId === 'water_bath') {
		const currentStep = getCurrentStep();
		// TODO: replace activeStepId peek with trigger-spec lookup
		if (currentStep && currentStep.id === 'prewarm_media') {
			triggerStep('prewarm_media');
		}
		showNotification('Media warmed.');
		return;
	}
	// Cell counter: counting UI lives in the microscope overlay
	// (manual hemocytometer + quadrant counts). Routing here lets
	// the visibly-highlighted cell_counter target on the bench
	// actually advance count_cells. Mirror the microscope branch's
	// sample-load side effect so hemocytometerLoaded flips and the
	// downstream serological + flask click in the hood routes to
	// "load cells for plate transfer" instead of looping back to
	// "load sample for counting". switchScene already renders; do
	// not call renderGame() after it.
	if (itemId === 'cell_counter') {
		if (gameState.selectedTool === 'serological_pipette_with_sample') {
			gameState.selectedTool = null;
			gameState.hemocytometerLoaded = true;
			showNotification(
				'Sample mixed with trypan blue and loaded onto hemocytometer.',
				'success',
			);
		}
		switchScene('microscope');
		return;
	}
	showNotification(getBenchItemLabel(itemId));
}

// ============================================
function renderBenchScene(): void {
	const benchScene = document.getElementById('bench-scene');
	if (!benchScene) return;

	// Compute layout from bench config. Empty items list during Patch 3
	// is fine: the engine returns [] and the render loop simply paints
	// the background + scene-switch button.
	const viewportW = benchScene.clientWidth || 800;
	const viewportH = benchScene.clientHeight || 600;
	const currentStepData = getCurrentStep();
	const activeStepId = currentStepData ? currentStepData.id : null;
	const resolvedItems = resolveSceneItemsWithDepth(BENCH_SCENE_ITEMS, activeStepId);
	const layout = computeSceneLayout(
		resolvedItems, ASSET_SPECS, BENCH_LAYOUT_RULES,
		viewportW, viewportH
	);

	const depthById: Record<string, string> = {};
	for (let ri = 0; ri < resolvedItems.length; ri++) {
		const r = resolvedItems[ri];
		depthById[r.id] = r.depth || 'mid';
	}

	// Only highlight bench items when the active step actually lives
	// on the bench. For hood/microscope/incubator/plate_reader steps,
	// clear the bench's highlights so stale targets from a previous
	// bench step (e.g. count_cells's cell_counter) do not linger on
	// the hidden bench div. Symmetric with the hood_scene.ts fix.
	let activeTargets: string[] = [];
	if (currentStepData && currentStepData.scene === 'bench'
		&& currentStepData.targetItems) {
		activeTargets = currentStepData.targetItems;
	}

	let itemsHtml = '';
	let labelsHtml = '';

	for (let i = 0; i < layout.length; i++) {
		const item = layout[i];
		const isSelected = gameState.selectedTool === item.id;
		const isTarget = activeTargets.indexOf(item.id) >= 0;
		const activeClass = isTarget && !isSelected ? ' is-active' : '';
		const selectedClass = isSelected ? ' is-selected' : '';
		const depthClass = ' depth-' + (depthById[item.id] || 'mid');
		const svgHtml = getBenchItemSvgHtml(item.id);

		itemsHtml += '<div class="hood-item' + activeClass + selectedClass + depthClass + '"';
		itemsHtml += ' data-item-id="' + item.id + '"';
		itemsHtml += ' tabindex="0" role="button"';
		itemsHtml += ' aria-label="' + item.tooltip + '"';
		itemsHtml += ' aria-pressed="' + (isSelected ? 'true' : 'false') + '"';
		itemsHtml += ' data-x="' + item.x.toFixed(1) + '"';
		itemsHtml += ' data-y="' + item.y.toFixed(1) + '"';
		itemsHtml += ' title="' + item.tooltip + '"';
		itemsHtml += ' style="left:' + item.x.toFixed(1) + '%;';
		itemsHtml += 'top:' + item.y.toFixed(1) + '%;';
		itemsHtml += 'width:' + item.width.toFixed(1) + '%;';
		itemsHtml += 'height:' + item.height.toFixed(1) + '%;">';
		itemsHtml += svgHtml;
		itemsHtml += '</div>';

		const multiClass = item.labelMultiline ? ' multiline' : '';
		labelsHtml += '<div class="hood-item-label' + multiClass + '"';
		labelsHtml += ' style="left:' + item.labelX.toFixed(1) + '%;';
		labelsHtml += 'top:' + item.labelY.toFixed(1) + '%;';
		labelsHtml += 'width:' + item.labelWidth.toFixed(1) + '%;">';
		for (let li = 0; li < item.labelLines.length; li++) {
			if (li > 0) labelsHtml += '<br>';
			labelsHtml += item.labelLines[li];
		}
		labelsHtml += '</div>';
	}

	// Bench background: back-wall on top, work surface below. The two
	// rows of equipment (mid_bench + front_bench) both sit on the bench
	// surface; the split was pulled higher so both rows fit naturally on
	// the wood rather than the back row hovering on the wall and the
	// front row parked near the floor.
	let html = '';
	html += '<div id="bench-bg" style="position:absolute;top:0;left:0;';
	html += 'width:100%;height:100%;pointer-events:none;">';
	html += '<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"';
	html += ' style="width:100%;height:100%;">';
	// Back wall (upper ~25%)
	html += '<rect x="0" y="0" width="800" height="160" fill="#e8d9bf"/>';
	// Bench surface (lower ~75%)
	html += '<rect x="0" y="160" width="800" height="440" fill="#c9a97a"/>';
	// Surface edge highlight
	html += '<rect x="0" y="158" width="800" height="4" fill="#8a6b3d"/>';
	// Soft shelf line on back wall
	html += '<line x1="40" y1="80" x2="760" y2="80" stroke="#c2ae8a" stroke-width="2"/>';
	html += '</svg>';
	html += '</div>';

	html += '<div id="bench-items-layer">';
	html += itemsHtml;
	html += '</div>';
	html += '<div id="bench-labels-layer">';
	html += labelsHtml;
	html += '</div>';

	// Scene-switch button back to hood
	html += '<button class="scene-nav-btn" id="bench-to-hood-btn">&larr; To Hood</button>';

	benchScene.style.position = 'relative';
	benchScene.innerHTML = html;

	// Wire the scene-switch nav
	const toHoodBtn = document.getElementById('bench-to-hood-btn');
	if (toHoodBtn) {
		toHoodBtn.addEventListener('click', () => {
			switchScene('hood');
			renderGame();
		});
	}

	// Wire click handlers for every bench item
	const benchItems = benchScene.querySelectorAll('.hood-item');
	benchItems.forEach((el) => {
		const itemEl = el as HTMLElement;
		const itemId = itemEl.getAttribute('data-item-id');
		if (!itemId) return;
		itemEl.addEventListener('click', () => {
			onBenchItemClick(itemId);
		});
		itemEl.addEventListener('mouseenter', () => {
			itemEl.style.filter = 'brightness(1.1)';
			itemEl.style.transform = 'scale(1.05)';
		});
		itemEl.addEventListener('mouseleave', () => {
			itemEl.style.filter = '';
			itemEl.style.transform = '';
		});
	});
}
