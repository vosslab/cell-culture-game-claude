// ============================================
// hood_scene.ts - Main hood view rendering and interaction
// ============================================

// Map item IDs to their SVG generator functions
function getItemSvgHtml(itemId: string): string {
	switch (itemId) {
		case 'flask':
			const mediaLevel = gameState.flaskMediaMl / FLASK_MAX_VOLUME_ML;
			const mediaColor = gameState.flaskMediaAge === 'old' ? '#e6a840' : '#f0a0b0';
			return getFlaskSvg(mediaLevel, mediaColor);
		case 'well_plate': return getWellPlateSvg(gameState.wellPlate);
		case 'media_bottle': return getMediaBottleSvg();
		case 'aspirating_pipette': return getAspiratingPipetteSvg();
		case 'serological_pipette': return getSeroPipetteSvg();
		case 'waste_container': return getWasteContainerSvg();
		case 'drug_vials': return getDrugVialsSvg();
		case 'multichannel_pipette': return getMultichannelPipetteSvg();
		case 'ethanol_bottle': return getEthanolBottleSvg();
		case 'microscope': return getMicroscopeSvg();
		default: return '';
	}
}

// ============================================
function renderHoodScene(): void {
	const hoodScene = document.getElementById('hood-scene');
	if (!hoodScene) return;

	let html = '';

	// Hood background SVG
	html += '<div id="hood-bg" style="position:absolute;top:0;left:0;width:100%;height:100%;">';
	html += getHoodBackgroundSvg();
	html += '</div>';

	// Determine which items should glow for the current step
	const currentStepData = getCurrentStep();
	const activeTargets: string[] = currentStepData && currentStepData.targetItems
		? currentStepData.targetItems : [];

	// Place each hood item
	const entries = Object.entries(HOOD_ITEMS);
	for (let i = 0; i < entries.length; i++) {
		const itemId = entries[i][0];
		const config = entries[i][1];
		const isSelected = gameState.selectedTool === itemId;
		const isTarget = activeTargets.indexOf(itemId) >= 0;
		const borderStyle = isSelected ? '3px solid #4caf50' : '2px solid transparent';
		const opacity = isSelected ? '0.7' : '1';
		// Add is-active class for step-aware target highlighting
		const activeClass = isTarget && !isSelected ? ' is-active' : '';

		html += '<div class="hood-item' + activeClass + '" data-item-id="' + itemId + '" ';
		html += 'style="position:absolute;';
		html += 'left:' + config.x + '%;top:' + config.y + '%;';
		html += 'width:' + config.width + '%;height:' + config.height + '%;';
		html += 'cursor:pointer;border:' + borderStyle + ';border-radius:4px;';
		html += 'opacity:' + opacity + ';transition:all 0.2s ease;" ';
		html += 'draggable="true" ';
		html += 'title="' + config.label + '">';
		html += getItemSvgHtml(itemId);
		html += '</div>';
	}

	// Toolbar at bottom
	const currentStep = getCurrentStep();
	let hintText = 'Protocol complete!';
	if (currentStep) {
		hintText = 'Current step: ' + currentStep.label;
	}
	if (gameState.selectedTool) {
		const toolConfig = HOOD_ITEMS[gameState.selectedTool];
		const toolLabel = toolConfig ? toolConfig.label : gameState.selectedTool;
		hintText = 'Holding: ' + toolLabel + ' -- Click a target to use';
	}

	html += '<div id="hood-toolbar" style="position:absolute;top:8px;left:50%;transform:translateX(-50%);';
	html += 'background:rgba(255,255,255,0.92);padding:10px 24px;border-radius:20px;';
	html += 'font-size:16px;font-weight:500;color:#212121;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
	html += 'white-space:nowrap;z-index:100;">';
	html += hintText;
	html += '</div>';

	hoodScene.style.position = 'relative';
	hoodScene.innerHTML = html;

	setupHoodEventListeners();
}

// ============================================
function onItemClick(itemId: string): void {
	// If no tool selected, pick up this item
	if (!gameState.selectedTool) {
		// Ethanol bottle sprays immediately
		if (itemId === 'ethanol_bottle') {
			gameState.hoodSprayed = true;
			completeStep('spray_hood');
			showNotification('Sprayed hood with 70% ethanol.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}

		// Microscope click: go to microscope for viability/counting
		if (itemId === 'microscope' && gameState.flaskMediaAge === 'fresh'
			&& !gameState.completedSteps.includes('count_cells')) {
			switchScene('microscope');
			return;
		}

		// Microscope click but not ready yet
		if (itemId === 'microscope' && gameState.flaskMediaAge !== 'fresh') {
			showNotification('Add fresh media to the flask first.', 'warning');
			return;
		}

		// Well plate click when ready for incubator
		if (itemId === 'well_plate' && gameState.cellsTransferred && gameState.drugsAdded) {
			switchScene('incubator');
			return;
		}

		gameState.selectedTool = itemId;
		showNotification('Picked up ' + HOOD_ITEMS[itemId].label);
		renderHoodScene();
		return;
	}

	const tool = gameState.selectedTool;

	// Aspirating pipette -> flask: aspirate old media
	if (tool === 'aspirating_pipette' && itemId === 'flask') {
		// Check if hood was sprayed first (aseptic technique)
		if (!gameState.hoodSprayed) {
			registerWarning('Always sanitize the hood before working! Spray with 70% ethanol first.');
			recordCleanlinessError('Started work without sanitizing the hood.');
		}
		gameState.selectedTool = null;
		startAspiration();
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Serological pipette -> media_bottle: load media (and mark as warmed)
	if (tool === 'serological_pipette' && itemId === 'media_bottle') {
		gameState.mediaWarmed = true;
		gameState.selectedTool = 'serological_pipette_with_media';
		showNotification('Media warmed to 37&deg;C and loaded into pipette. Click the flask.');
		renderHoodScene();
		return;
	}

	// Loaded serological pipette -> flask: add fresh media
	if (tool === 'serological_pipette_with_media' && itemId === 'flask') {
		gameState.selectedTool = null;
		startAddingMedia();
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Serological pipette -> flask (with fresh media): load cells for transfer
	if (tool === 'serological_pipette' && itemId === 'flask' && gameState.flaskMediaAge === 'fresh') {
		gameState.selectedTool = 'serological_pipette_with_cells';
		showNotification('Loaded cell suspension. Click the 24-well plate to transfer.');
		renderHoodScene();
		return;
	}

	// Loaded serological pipette (cells) -> well_plate: transfer cells to all wells
	if (tool === 'serological_pipette_with_cells' && itemId === 'well_plate') {
		gameState.selectedTool = null;
		// Fill all wells with cells
		gameState.wellPlate.forEach(well => {
			well.hasCells = true;
		});
		gameState.cellsTransferred = true;
		completeStep('transfer_to_plate');
		showNotification('Cells transferred to all 24 wells.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Multichannel pipette -> drug_vials: load drug dilutions
	if (tool === 'multichannel_pipette' && itemId === 'drug_vials') {
		if (!gameState.cellsTransferred) {
			showNotification('Transfer cells to the plate first.', 'warning');
			gameState.selectedTool = null;
			renderHoodScene();
			return;
		}
		gameState.selectedTool = 'multichannel_pipette_with_drug';
		showNotification('Loaded drug dilutions. Click the 24-well plate to add drugs.');
		renderHoodScene();
		return;
	}

	// Loaded multichannel pipette -> well_plate: show dilution choice dialog
	if (tool === 'multichannel_pipette_with_drug' && itemId === 'well_plate') {
		gameState.selectedTool = null;
		startDrugAddition();
		return;
	}

	// Invalid combination -- register a warning with educational guidance
	const stepHint = getCurrentStep();
	let warningMsg = 'That combination does not work.';
	if (stepHint) {
		warningMsg += ' Current step: ' + stepHint.label;
	}
	registerWarning(warningMsg);
	gameState.selectedTool = null;
	renderHoodScene();
}

// ============================================
function setupHoodEventListeners(): void {
	const items = document.querySelectorAll('.hood-item');
	items.forEach((item) => {
		const el = item as HTMLElement;
		const itemId = el.getAttribute('data-item-id');
		if (!itemId) return;

		el.addEventListener('click', () => {
			onItemClick(itemId);
		});

		el.addEventListener('mouseenter', () => {
			el.style.filter = 'brightness(1.1)';
			el.style.transform = 'scale(1.05)';
		});
		el.addEventListener('mouseleave', () => {
			el.style.filter = '';
			el.style.transform = '';
		});

		// Drag-and-drop: start dragging a tool
		el.addEventListener('dragstart', (e) => {
			if (e.dataTransfer) {
				e.dataTransfer.setData('text/plain', itemId);
				e.dataTransfer.effectAllowed = 'move';
			}
			el.style.opacity = '0.5';
		});
		el.addEventListener('dragend', () => {
			el.style.opacity = '';
		});

		// Drop target: accept a dropped tool
		el.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'move';
			}
			el.classList.add('drag-hover');
		});
		el.addEventListener('dragleave', () => {
			el.classList.remove('drag-hover');
		});
		el.addEventListener('drop', (e) => {
			e.preventDefault();
			el.classList.remove('drag-hover');
			const draggedToolId = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
			if (draggedToolId && draggedToolId !== itemId) {
				// Simulate picking up the dragged tool then using it on this target
				gameState.selectedTool = draggedToolId;
				onItemClick(itemId);
			}
		});
	});

	const hoodScene = document.getElementById('hood-scene');
	if (hoodScene) {
		hoodScene.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			if (gameState.selectedTool) {
				gameState.selectedTool = null;
				showNotification('Tool deselected.');
				renderHoodScene();
			}
		});
	}

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && gameState.selectedTool) {
			gameState.selectedTool = null;
			showNotification('Tool deselected.');
			renderHoodScene();
		}
	});
}

// ============================================
function getAvailableActions(): string[] {
	const actions: string[] = [];
	const step = getCurrentStep();
	if (!step) return actions;

	switch (step.id) {
		case 'spray_hood':
			actions.push('Click the ethanol bottle to spray the hood');
			break;
		case 'aspirate_old_media':
			actions.push('Pick up the aspirating pipette, then click the flask');
			break;
		case 'add_fresh_media':
			actions.push('Pick up the serological pipette, click the media bottle, then click the flask');
			break;
		case 'microscope_check':
			actions.push('Click the flask to check cell viability under the microscope');
			break;
		case 'count_cells':
			actions.push('Click the flask to count cells on the hemocytometer');
			break;
		case 'transfer_to_plate':
			actions.push('Pick up the serological pipette, click the flask, then click the 24-well plate');
			break;
		case 'add_drugs':
			actions.push('Pick up the multichannel pipette, click the drug vials, then click the 24-well plate');
			break;
		case 'incubate':
			actions.push('Click the 24-well plate to move it to the incubator');
			break;
		case 'plate_read':
			actions.push('Read the plate on the plate reader');
			break;
	}
	return actions;
}
