// ============================================
// bench_scene.ts - Bench (outside-the-hood) scene rendering
// ============================================
// The bench is a peer of the hood scene. It holds equipment the student
// uses between hood steps: incubator, microscope, water bath, vortex,
// centrifuge, cell counter. Patch 3 wires the bench into the shared
// layout engine via parts/bench_config.ts (BENCH_SCENE_ITEMS is empty
// until M3 Patch 8).
// ============================================

// ============================================
// getBenchItemSvgHtml - bench-only equivalent of getItemSvgHtml() in
// hood_scene.ts. Bench items land in M3, so this switch is empty for
// Patch 3 and falls back to the hood lookup for items that (in future)
// may live on either scene (microscope, incubator after they migrate
// from the hood).
function getBenchItemSvgHtml(itemId: string): string {
	switch (itemId) {
		case 'microscope': return getMicroscopeSvg();
		case 'incubator': return getIncubatorSvg();
		case 'centrifuge': return getCentrifugeSvg();
		case 'water_bath': return getWaterBathSvg();
		case 'vortex': return getVortexSvg();
		case 'cell_counter': return getCellCounterSvg();
		default: return '';
	}
}

// ============================================
// Click handler for bench items. M3 ships minimal behavior:
// microscope/incubator open their existing modal overlays, and the
// four bench-only instruments log to the console (full interaction in
// M4).
function onBenchItemClick(itemId: string): void {
	if (itemId === 'microscope') {
		switchScene('microscope');
		renderGame();
		return;
	}
	if (itemId === 'incubator') {
		switchScene('incubator');
		renderGame();
		return;
	}
	console.log('Clicked ' + itemId);
	showNotification(getBenchItemLabel(itemId) + ' (interaction lands in M4)');
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

	const activeTargets: string[] =
		currentStepData && currentStepData.targetItems
		? currentStepData.targetItems : [];

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

	// Bench background: simple back-wall + work-surface split.
	let html = '';
	html += '<div id="bench-bg" style="position:absolute;top:0;left:0;';
	html += 'width:100%;height:100%;pointer-events:none;">';
	html += '<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"';
	html += ' style="width:100%;height:100%;">';
	// Back wall
	html += '<rect x="0" y="0" width="800" height="380" fill="#e8d9bf"/>';
	// Bench surface
	html += '<rect x="0" y="380" width="800" height="220" fill="#c9a97a"/>';
	// Surface edge highlight
	html += '<rect x="0" y="378" width="800" height="4" fill="#8a6b3d"/>';
	// Soft shelf line on back wall
	html += '<line x1="40" y1="150" x2="760" y2="150" stroke="#c2ae8a" stroke-width="2"/>';
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
