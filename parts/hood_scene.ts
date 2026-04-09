// ============================================
// hood_scene.ts - Main hood view rendering and interaction
// ============================================

//============================================
// Compute the top Y position (percentage) for a hood item based on its alignY anchor
function getItemTopY(itemId: string, config: HoodItemConfig, heightPct: number): number {
	const align = config.alignY || 'bottom';
	switch (align) {
		case 'top':
			return config.groundY;
		case 'center':
			return config.groundY - heightPct / 2;
		case 'tip': {
			// tip offset allows fine-tuning when the visual tip is not at the SVG bottom
			const offset = (TIP_OFFSET as Record<string, number>)[itemId] || 0;
			return config.groundY - heightPct + offset;
		}
		case 'bottom':
		default:
			return config.groundY - heightPct;
	}
}

//============================================
// Extract aspect ratio (height/width) from an SVG string's viewBox attribute
function getSvgAspectRatio(svgHtml: string): number {
	// match viewBox="minX minY width height"
	const match = svgHtml.match(/viewBox="([^"]+)"/);
	if (!match) return 1.0;
	const parts = match[1].split(/\s+/);
	if (parts.length < 4) return 1.0;
	const vbWidth = parseFloat(parts[2]);
	const vbHeight = parseFloat(parts[3]);
	if (vbWidth <= 0) return 1.0;
	return vbHeight / vbWidth;
}

//============================================
// Map item IDs to their SVG generator functions
function getItemSvgHtml(itemId: string): string {
	switch (itemId) {
		case 'flask':
			const mediaLevel = gameState.flaskMediaMl / FLASK_MAX_VOLUME_ML;
			const mediaColor = gameState.flaskMediaAge === 'old' ? '#e6a840' : '#f0a0b0';
			return getFlaskSvg(mediaLevel, mediaColor);
		case 'well_plate': return getWellPlateSvg(gameState.wellPlate);
		case 'media_bottle': return getMediaBottleSvg();
		case 'trypsin_bottle': return getTrypsinBottleSvg();
		case 'aspirating_pipette': return getAspiratingPipetteSvg();
		case 'serological_pipette': return getSeroPipetteSvg();
		case 'waste_container': return getWasteContainerSvg();
		case 'drug_vials': return getDrugVialsSvg();
		case 'multichannel_pipette': return getMultichannelPipetteSvg();
		case 'ethanol_bottle': return getEthanolBottleSvg();
		case 'microscope': return getMicroscopeSvg();
		case 'incubator': return getIncubatorSvg();
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

	// Compute scene aspect ratio for height calculation
	// Hood scene uses the full panel area; ratio converts width% to height%
	const sceneEl = document.getElementById('hood-scene');
	const sceneW = sceneEl ? sceneEl.clientWidth : 800;
	const sceneH = sceneEl ? sceneEl.clientHeight : 600;

	// Place each hood item
	const entries = Object.entries(HOOD_ITEMS);
	for (let i = 0; i < entries.length; i++) {
		const itemId = entries[i][0];
		const config = entries[i][1];
		const isSelected = gameState.selectedTool === itemId;
		const isTarget = activeTargets.indexOf(itemId) >= 0;
		const borderStyle = isSelected ? '4px solid #2196f3' : '2px solid transparent';
		const boxShadow = isSelected ? '0 0 12px rgba(33, 150, 243, 0.5)' : 'none';
		const opacity = '1';
		// Add is-active class for step-aware target highlighting
		const activeClass = isTarget && !isSelected ? ' is-active' : '';

		// Compute height from SVG aspect ratio so the div matches the artwork
		const svgHtml = getItemSvgHtml(itemId);
		const svgAspect = getSvgAspectRatio(svgHtml);
		// Convert: widthPx = config.width% * sceneW, heightPx = widthPx * svgAspect
		// height% = heightPx / sceneH * 100
		const heightPct = config.width * (sceneW / sceneH) * svgAspect;

		// Compute top position based on alignY semantic anchor
		const topPct = getItemTopY(itemId, config, heightPct);

		html += '<div class="hood-item' + activeClass + '" data-item-id="' + itemId + '" ';
		html += 'style="position:absolute;';
		html += 'left:' + config.x + '%;top:' + topPct.toFixed(1) + '%;';
		html += 'width:' + config.width + '%;height:' + heightPct.toFixed(1) + '%;';
		html += 'cursor:pointer;border:' + borderStyle + ';border-radius:4px;';
		html += 'box-shadow:' + boxShadow + ';';
		html += 'opacity:' + opacity + ';transition:all 0.2s ease;" ';
		html += 'draggable="true" ';
		html += 'title="' + config.label + '">';
		html += svgHtml;
		html += '<div class="hood-item-label">' + config.label + '</div>';
		html += '</div>';
	}

	// Toolbar with context-sensitive next-action hint
	const currentStep = getCurrentStep();
	let hintText = 'Protocol complete!';
	if (currentStep) {
		// Use getAvailableActions() for specific next-action guidance
		const actions = getAvailableActions();
		if (actions.length > 0) {
			hintText = actions[0];
		} else {
			hintText = 'Current step: ' + currentStep.label;
		}
	}
	if (gameState.selectedTool) {
		const toolConfig = HOOD_ITEMS[gameState.selectedTool];
		const toolLabel = toolConfig ? toolConfig.label : gameState.selectedTool;
		// Provide context-aware next action when holding a tool
		if (gameState.selectedTool === 'serological_pipette') {
			if (gameState.trypsinAdded && !gameState.trypsinNeutralized) {
				hintText = 'Holding: ' + toolLabel + ' -- Click the media bottle to neutralize trypsin';
			} else if (!gameState.trypsinAdded && gameState.flaskMediaMl < 1) {
				hintText = 'Holding: ' + toolLabel + ' -- Click the trypsin bottle';
			} else if (gameState.flaskMediaAge === 'old' || gameState.flaskMediaMl < 1) {
				hintText = 'Holding: ' + toolLabel + ' -- Click the trypsin or media bottle';
			} else {
				hintText = 'Holding: ' + toolLabel + ' -- Click the flask';
			}
		} else if (gameState.selectedTool === 'serological_pipette_with_trypsin') {
			hintText = 'Trypsin loaded -- Click the flask to add';
		} else if (gameState.selectedTool === 'serological_pipette_with_sample') {
			hintText = 'Cell sample loaded -- Click the microscope to load hemocytometer';
		} else if (gameState.selectedTool === 'serological_pipette_with_media') {
			hintText = 'Media loaded -- Click the flask to add';
		} else if (gameState.selectedTool === 'serological_pipette_with_cells') {
			hintText = 'Cells loaded -- Click the 24-well plate';
		} else if (gameState.selectedTool === 'multichannel_pipette') {
			hintText = 'Holding: ' + toolLabel + ' -- Click the drug vials';
		} else if (gameState.selectedTool === 'multichannel_pipette_with_drug') {
			hintText = 'Drugs loaded -- Click the 24-well plate';
		} else if (gameState.selectedTool === 'aspirating_pipette') {
			hintText = 'Holding: ' + toolLabel + ' -- Click the flask to aspirate';
		} else if (gameState.selectedTool === 'well_plate') {
			hintText = 'Holding plate -- Click the incubator to place it inside';
		} else if (gameState.selectedTool === 'flask' && gameState.trypsinAdded && !gameState.trypsinIncubated) {
			hintText = 'Holding flask -- Click the incubator for trypsin incubation';
		} else {
			hintText = 'Holding: ' + toolLabel + ' -- Click a target to use';
		}
	}

	html += '<div id="hood-toolbar" style="position:absolute;top:8px;left:50%;transform:translateX(-50%);';
	html += 'background:rgba(255,255,255,0.92);padding:10px 24px;border-radius:20px;';
	html += 'font-size:16px;font-weight:500;color:#212121;';
	html += 'white-space:nowrap;z-index:100;display:flex;align-items:center;gap:12px;">';
	html += '<span>' + hintText + '</span>';
	// Show put-down button when a tool is selected
	if (gameState.selectedTool) {
		html += '<button id="put-down-btn" style="padding:4px 12px;background:#ef5350;color:#fff;';
		html += 'border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;">';
		html += 'Put down (Esc)</button>';
	}
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

		// Microscope click: go to microscope if hemocytometer loaded
		if (itemId === 'microscope' && gameState.hemocytometerLoaded
			&& !gameState.completedSteps.includes('count_cells')) {
			switchScene('microscope');
			return;
		}

		// Microscope click but hemocytometer not loaded yet
		if (itemId === 'microscope' && !gameState.hemocytometerLoaded) {
			if (!gameState.trypsinNeutralized) {
				showNotification('Complete trypsinization and media neutralization first.', 'warning');
			} else {
				showNotification('Load a cell sample onto the hemocytometer first.', 'warning');
			}
			return;
		}

		// Well plate click when ready for incubator: pick it up
		if (itemId === 'well_plate' && gameState.cellsTransferred && gameState.drugsAdded
			&& !gameState.incubated) {
			gameState.selectedTool = 'well_plate';
			showNotification('Holding plate. Click the incubator to place it inside.');
			renderHoodScene();
			return;
		}

		// Flask click when trypsin added but not incubated: pick up for incubation
		if (itemId === 'flask' && gameState.trypsinAdded && !gameState.trypsinIncubated) {
			gameState.selectedTool = 'flask';
			showNotification('Holding flask. Click the incubator to incubate with trypsin.');
			renderHoodScene();
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

	// Flask held -> incubator: trypsin incubation
	if (tool === 'flask' && itemId === 'incubator'
		&& gameState.trypsinAdded && !gameState.trypsinIncubated) {
		gameState.selectedTool = null;
		renderTrypsinIncubation();
		return;
	}

	// Well plate held -> incubator: plate incubation
	if (tool === 'well_plate' && itemId === 'incubator') {
		gameState.selectedTool = null;
		renderIncubatorScene();
		return;
	}

	// Serological pipette -> trypsin_bottle: load trypsin
	if (tool === 'serological_pipette' && itemId === 'trypsin_bottle') {
		gameState.selectedTool = 'serological_pipette_with_trypsin';
		showNotification('Loaded trypsin-EDTA. Click the flask to add.');
		renderHoodScene();
		return;
	}

	// Loaded serological pipette (trypsin) -> flask: add trypsin to detach cells
	if (tool === 'serological_pipette_with_trypsin' && itemId === 'flask') {
		gameState.selectedTool = null;
		gameState.trypsinAdded = true;
		completeStep('add_trypsin');
		showNotification('Trypsin added to flask. Incubate 3-5 min at 37C.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Serological pipette -> media_bottle: load media (and mark as warmed)
	if (tool === 'serological_pipette' && itemId === 'media_bottle') {
		gameState.mediaWarmed = true;
		gameState.selectedTool = 'serological_pipette_with_media';
		showNotification('Media warmed to 37\u00B0C and loaded into pipette. Click the flask.');
		renderHoodScene();
		return;
	}

	// Loaded serological pipette -> flask: add fresh media (neutralize trypsin)
	if (tool === 'serological_pipette_with_media' && itemId === 'flask') {
		gameState.selectedTool = null;
		// Mark trypsin as neutralized when media is added
		if (gameState.trypsinIncubated && !gameState.trypsinNeutralized) {
			gameState.trypsinNeutralized = true;
		}
		startAddingMedia();
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Serological pipette -> flask (with fresh media): load sample for hemocytometer or plate
	if (tool === 'serological_pipette' && itemId === 'flask' && gameState.flaskMediaAge === 'fresh') {
		if (!gameState.hemocytometerLoaded) {
			// First: load sample for hemocytometer
			gameState.selectedTool = 'serological_pipette_with_sample';
			showNotification('Cell sample loaded. Click the microscope to load the hemocytometer.');
			renderHoodScene();
			return;
		}
		// After counting: load cells for plate transfer
		gameState.selectedTool = 'serological_pipette_with_cells';
		showNotification('Loaded cell suspension. Click the 24-well plate to transfer.');
		renderHoodScene();
		return;
	}

	// Loaded sample -> microscope: load hemocytometer with trypan blue mix
	if (tool === 'serological_pipette_with_sample' && itemId === 'microscope') {
		gameState.selectedTool = null;
		gameState.hemocytometerLoaded = true;
		completeStep('load_hemocytometer');
		showNotification('Sample mixed with trypan blue and loaded onto hemocytometer.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
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

	// Wire the put-down button
	const putDownBtn = document.getElementById('put-down-btn');
	if (putDownBtn) {
		putDownBtn.addEventListener('click', () => {
			gameState.selectedTool = null;
			showNotification('Tool deselected.');
			renderHoodScene();
		});
	}

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
