// ============================================
// hood_scene.ts - Main hood view rendering and interaction
// ============================================

//============================================
// Bridge functions for M1.5.C: map legacy selectedTool tokens to synthetic heldLiquid
//============================================
function deriveHeldLiquid(selectedTool: string | null): { tool: string | null; liquid: string | null; volumeMl: number; colorKey: string | null } {
	if (!selectedTool) return { tool: null, liquid: null, volumeMl: 0, colorKey: null };
	const map: Record<string, { liquid: string; volumeMl: number; colorKey: string }> = {
		'serological_pipette_with_pbs':     { liquid: 'pbs',     volumeMl: 4,  colorKey: 'pbs' },
		'serological_pipette_with_trypsin': { liquid: 'trypsin', volumeMl: 3,  colorKey: 'trypsin' },
		'serological_pipette_with_media':   { liquid: 'media',   volumeMl: 9,  colorKey: 'media' },
		'serological_pipette_with_sample':  { liquid: 'cells',   volumeMl: 1,  colorKey: 'cells' },
		'serological_pipette_with_cells':   { liquid: 'cells',   volumeMl: 12, colorKey: 'cells' },
	};
	const hit = map[selectedTool];
	if (hit) return { tool: 'serological_pipette', liquid: hit.liquid, volumeMl: hit.volumeMl, colorKey: hit.colorKey };
	return { tool: selectedTool, liquid: null, volumeMl: 0, colorKey: null };
}

function canonicalTool(selectedTool: string | null): string | null {
	if (!selectedTool) return null;
	const i = selectedTool.indexOf('_with_');
	return i >= 0 ? selectedTool.substring(0, i) : selectedTool;
}

//============================================
// Return the id of the first pipette-kind target item for a step, or
// null if the step has no pipette target. Used by the toolbar hint to
// tell the student which tool to pick up first when they are not yet
// holding anything. Searches HOOD_SCENE_ITEMS for each target id; if
// the student is standing in the hood and the step targets a pipette,
// that pipette is "what to pick up".
function getStartingToolForStep(step: ProtocolStep): string | null {
	if (!step.targetItems) return null;
	for (const itemId of step.targetItems) {
		const item = HOOD_SCENE_ITEMS.find(i => i.id === itemId);
		if (item && item.kind === 'pipette') {
			return item.id;
		}
	}
	return null;
}

//============================================
// Return the id of the reagent source the student should click next
// when holding an unloaded pipette. The "source" is the container to
// draw from -- a bottle or rack for most steps, falling back to the
// flask for draw-from-flask steps (aspirate old media, seed plate).
// Used by the toolbar hint to tell the student "click the X" after
// they pick up a pipette but before they have loaded anything into
// it. Scene code derives this from the current step's targetItems so
// the hint and the green is-active highlights share one truth.
function getReagentSourceForStep(step: ProtocolStep): string | null {
	if (!step.targetItems) return null;
	// Preferred: a bottle or rack in the targets (reagent container)
	for (const itemId of step.targetItems) {
		const item = HOOD_SCENE_ITEMS.find(i => i.id === itemId);
		if (item && (item.kind === 'bottle' || item.kind === 'rack')) {
			return item.id;
		}
	}
	// Fallback: first non-pipette, non-plate target (usually the flask
	// for aspirate_old_media and seed_plate)
	for (const itemId of step.targetItems) {
		const item = HOOD_SCENE_ITEMS.find(i => i.id === itemId);
		if (item && item.kind !== 'pipette' && item.kind !== 'plate') {
			return item.id;
		}
	}
	return null;
}

// Pre-register every step id this scene owns. validateTriggerCoverage()
// runs on the load event -- before any click handlers have fired -- and
// verifies that each PROTOCOL_STEPS id is in registeredTriggers. Each
// scene file must list its step ids here so coverage passes at load time.
// The actual state-machine advance still happens inside triggerStep at
// click time; these lines only announce that a live wiring path exists.
registeredTriggers.add('spray_hood');
registeredTriggers.add('pbs_wash');
registeredTriggers.add('add_trypsin');
registeredTriggers.add('seed_plate');
registeredTriggers.add('media_adjust');
registeredTriggers.add('add_mtt');
registeredTriggers.add('decant_mtt');
registeredTriggers.add('add_dmso');

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
		case 'sterile_water': return getSterileWaterSvg();
		case 'pbs_bottle': return getPbsBottleSvg();
		case 'conical_15ml_rack': return getConical15mlRackSvg();
		case 'dilution_tube_rack': return getDilutionTubeRackSvg();
		case 'mtt_vial': return getMttVialSvg();
		case 'dmso_bottle': return getDmsoBottleSvg();
		case 'carboplatin_stock': return getCarboplatinStockSvg();
		case 'metformin_stock': return getMetforminStockSvg();
		case 'micropipette_rack': return getMicropipetteRackSvg();
		case 'biohazard_decant': return getBiohazardDecanSvg();
		default: return '';
	}
}

// ============================================
function renderHoodScene(): void {
	const hoodScene = document.getElementById('hood-scene');
	if (!hoodScene) return;

	// Compute layout from semantic config (no DOM measurements)
	const viewportW = hoodScene.clientWidth || 800;
	const viewportH = hoodScene.clientHeight || 600;
	const layout = computeSceneLayout(
		HOOD_SCENE_ITEMS, ASSET_SPECS, HOOD_LAYOUT_RULES,
		viewportW, viewportH
	);

	// Determine active targets for current protocol step. Only highlight
	// hood items when the active step actually lives on the hood; for
	// bench/microscope/incubator/plate_reader steps we clear the hood's
	// highlights so stale targets from the previous hood step do not
	// linger on the (hidden) hood div. Without this, advancing through
	// a non-hood step left the hood visually pointing at an item that
	// was no longer the current target.
	const currentStepData = getCurrentStep();
	let activeTargets: string[] = [];
	if (currentStepData && currentStepData.scene === 'hood'
		&& currentStepData.targetItems) {
		activeTargets = currentStepData.targetItems;
	}
	const nextPulseTarget = activeTargets.length > 0 ? activeTargets[0] : null;

	// Build items and labels in one pass into separate layer strings
	let itemsHtml = '';
	let labelsHtml = '';

	for (let i = 0; i < layout.length; i++) {
		const item = layout[i];
		const isSelected = gameState.selectedTool === item.id;
		const isTarget = activeTargets.indexOf(item.id) >= 0;
		const activeClass = isTarget && !isSelected ? ' is-active' : '';
		const pulseClass = item.id === nextPulseTarget && isTarget && !isSelected ? ' is-next-target' : '';
		const selectedClass = isSelected ? ' is-selected' : '';
		const svgHtml = getItemSvgHtml(item.id);

		// Item div: coordinates inline, classes handle visual states
		itemsHtml += '<div class="hood-item' + activeClass + pulseClass + selectedClass + '"';
		itemsHtml += ' data-item-id="' + item.id + '"';
		itemsHtml += ' tabindex="0" role="button"';
		itemsHtml += ' aria-label="' + item.tooltip + '"';
		itemsHtml += ' aria-pressed="' + (isSelected ? 'true' : 'false') + '"';
		itemsHtml += ' data-x="' + item.x.toFixed(1) + '"';
		itemsHtml += ' data-y="' + item.y.toFixed(1) + '"';
		itemsHtml += ' draggable="true"';
		itemsHtml += ' title="' + item.tooltip + '"';
		itemsHtml += ' style="left:' + item.x.toFixed(1) + '%;';
		itemsHtml += 'top:' + item.y.toFixed(1) + '%;';
		itemsHtml += 'width:' + item.width.toFixed(1) + '%;';
		itemsHtml += 'height:' + item.height.toFixed(1) + '%;">';
		itemsHtml += svgHtml;
		itemsHtml += '</div>';

		// Label div: positioned by layout engine
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

	// Assemble with layer structure
	let html = '';
	html += '<div id="hood-bg" style="position:absolute;top:0;left:0;';
	html += 'width:100%;height:100%;">';
	html += getHoodBackgroundSvg();
	html += '</div>';
	html += '<div id="hood-items-layer">';
	html += itemsHtml;
	html += '</div>';
	html += '<div id="hood-labels-layer">';
	html += labelsHtml;
	html += '</div>';

	// Toolbar with context-sensitive next-action hint
	const currentStep = getCurrentStep();
	let hintText = 'Protocol complete!';
	if (currentStep) {
		// Use getAvailableActions() for specific next-action guidance
		const actions = getAvailableActions();
		if (actions.length > 0) {
			hintText = actions[0];
		} else {
			// Base hint is the step's action text. If the step requires a
			// tool (pipette) and the student is not yet holding one, append
			// a "pick up the X" suggestion so the hint tells them where to
			// start. Without this the banner said things like "Wash the
			// flask with 4 mL PBS" with no indication that they must pick
			// up the serological pipette first.
			hintText = currentStep.action;
			if (!gameState.selectedTool) {
				const startTool = getStartingToolForStep(currentStep);
				if (startTool) {
					const startLabel = getHoodItemLabel(startTool);
					hintText = 'Pick up the ' + startLabel + ' -- ' + currentStep.action;
				}
			}
		}
	}
	if (gameState.selectedTool) {
		const toolLabel = getHoodItemLabel(gameState.selectedTool);
		// Provide context-aware next action when holding a tool
		if (gameState.selectedTool === 'serological_pipette') {
			// Held an unloaded serological pipette: the next click is
			// the reagent source for the current protocol step. Derived
			// from step.targetItems via getReagentSourceForStep so the
			// hint, the green is-active highlights, and the actual
			// protocol state share one truth. Prior versions peeked at
			// gameState.trypsinAdded/flaskMediaMl/flaskMediaAge and
			// could show a misleading hint -- the new source-of-truth
			// is the current step.
			if (currentStep) {
				const source = getReagentSourceForStep(currentStep);
				if (source) {
					const sourceLabel = getHoodItemLabel(source);
					hintText = 'Holding: ' + toolLabel + ' -- Click the ' + sourceLabel;
				} else {
					hintText = 'Holding: ' + toolLabel + ' -- ' + currentStep.action;
				}
			} else {
				hintText = 'Holding: ' + toolLabel;
			}
		} else if (gameState.selectedTool === 'serological_pipette_with_trypsin') {
			hintText = 'Trypsin loaded -- Click the flask to add';
		} else if (gameState.selectedTool === 'serological_pipette_with_pbs') {
			hintText = 'PBS loaded -- Click the flask to rinse';
		} else if (gameState.selectedTool === 'serological_pipette_with_sample') {
			hintText = 'Cell sample loaded -- Click the microscope to load hemocytometer';
		} else if (gameState.selectedTool === 'serological_pipette_with_media') {
			hintText = 'Media loaded -- Click the flask to add';
		} else if (gameState.selectedTool === 'serological_pipette_with_cells') {
			hintText = 'Cells loaded -- Click the 24-well plate';
		} else if (gameState.selectedTool === 'multichannel_pipette') {
			// Unloaded multichannel pipette: derive next click from the
			// current step's reagent source. The prior hardcoded "Click
			// the drug vials" only made sense under the legacy 12-step
			// protocol and is wrong for seed_plate, media_adjust,
			// add_carboplatin, add_metformin, add_mtt, add_dmso.
			if (currentStep) {
				const source = getReagentSourceForStep(currentStep);
				if (source) {
					const sourceLabel = getHoodItemLabel(source);
					hintText = 'Holding: ' + toolLabel + ' -- Click the ' + sourceLabel;
				} else {
					hintText = 'Holding: ' + toolLabel + ' -- ' + currentStep.action;
				}
			} else {
				hintText = 'Holding: ' + toolLabel;
			}
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

	// "Current step" banner. Opaque white background, solid green left
	// accent matching the target outline, bold large text. Pairs color
	// with size and weight so the cue is not color-only, per
	// docs/ACCESSIBILITY_REVIEW.md. No drop shadows -- uses a solid green
	// border on all sides for edge definition instead.
	html += '<div id="hood-toolbar" style="position:absolute;top:8px;left:50%;transform:translateX(-50%);';
	html += 'background:#ffffff;padding:12px 28px 12px 22px;border-radius:10px;';
	html += 'border:2px solid #2e7d32;border-left-width:6px;';
	html += 'font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:0.2px;';
	html += 'white-space:nowrap;z-index:100;display:flex;align-items:center;gap:14px;">';
	html += '<span style="font-size:12px;font-weight:700;text-transform:uppercase;';
	html += 'letter-spacing:1.2px;color:#2e7d32;">Next</span>';
	html += '<span>' + hintText + '</span>';
	// Show put-down button when a tool is selected
	if (gameState.selectedTool) {
		html += '<button id="put-down-btn" style="padding:4px 12px;background:#ef5350;color:#fff;';
		html += 'border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;">';
		html += 'Put down (Esc)</button>';
	}
	html += '</div>';

	// Scene-switch button to bench. Mirrors the "To Hood" button in
	// bench_scene.ts so the student can walk between the two persistent
	// scenes without a keyboard shortcut.
	html += '<button class="scene-nav-btn" id="hood-to-bench-btn" ';
	html += 'style="right:16px;left:auto;">To Bench &rarr;</button>';

	hoodScene.style.position = 'relative';
	hoodScene.innerHTML = html;

	setupHoodEventListeners();

	const toBenchBtn = document.getElementById('hood-to-bench-btn');
	if (toBenchBtn) {
		toBenchBtn.addEventListener('click', () => {
			switchScene('bench');
			renderGame();
		});
	}
}

// ============================================
function onItemClick(itemId: string): void {
	// M1.5.C: Route clicks through interaction_resolver for steps with allowedInteractions
	const activeStep = getCurrentStep();
	if (activeStep && activeStep.allowedInteractions) {
		const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
		const cleanTool = canonicalTool(gameState.selectedTool);
		const result = resolveInteraction({
			selectedTool: cleanTool,
			clickedItem: itemId,
			activeStep: activeStep,
			heldLiquid: heldLiquid,
		});
		if (result.kind === 'load') {
			// Set legacy _with_X token from result so existing downstream code keeps working.
			const legacyToken = result.resultLiquid === 'pbs'     ? 'serological_pipette_with_pbs'
						  : result.resultLiquid === 'trypsin' ? 'serological_pipette_with_trypsin'
						  : result.resultLiquid === 'media'   ? 'serological_pipette_with_media'
						  : result.resultLiquid === 'cells'   ? 'serological_pipette_with_cells'
						  : null;
			if (legacyToken) {
				gameState.selectedTool = legacyToken;
				let notification = 'Loaded ' + result.resultLiquid + '.';
				if (result.resultLiquid === 'pbs') notification = 'PBS loaded into pipette. Click the flask to rinse.';
				if (result.resultLiquid === 'trypsin') notification = 'Loaded trypsin-EDTA. Click the flask to add.';
				if (result.resultLiquid === 'media') notification = 'Media warmed to 37 degrees C and loaded into pipette. Click the flask.';
				if (result.resultLiquid === 'cells') notification = 'Loaded cell suspension. Click the 24-well plate to transfer.';
				showNotification(notification);
				renderGame();
				return;
			}
			// Unknown liquid; fall through to legacy.
		} else if (result.kind === 'discharge') {
			// For discharge, dispatch based on the event name to call
			// the appropriate handler logic.
			if (activeStep && activeStep.id && result.event) {
				if (result.event === 'spray_ethanol') {
					gameState.hoodSprayed = true;
					triggerStep(activeStep.id);
					showNotification('Sprayed hood with 70% ethanol.', 'success');
					gameState.selectedTool = null;
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.event === 'aspirate') {
					gameState.selectedTool = null;
					startAspiration();
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.event === 'pbs_wash') {
					gameState.selectedTool = null;
					gameState.flaskMediaAge = 'fresh';
					triggerStep(activeStep.id);
					showNotification('Flask rinsed with PBS.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.event === 'pipette_trypsin') {
					gameState.selectedTool = null;
					gameState.trypsinAdded = true;
					triggerStep(activeStep.id);
					showNotification('Trypsin added to flask. Incubate 3-5 min at 37C.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.event === 'pipette_media') {
					gameState.selectedTool = null;
					if (gameState.trypsinIncubated && !gameState.trypsinNeutralized) {
						gameState.trypsinNeutralized = true;
					}
					startAddingMedia();
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.event === 'pipette_to_plate') {
					gameState.selectedTool = null;
					gameState.wellPlate.forEach(well => {
						well.hasCells = true;
					});
					gameState.cellsTransferred = true;
					triggerStep(activeStep.id);
					showNotification('Cells transferred to all 24 wells.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.event === 'centrifuge') {
					gameState.flaskMediaMl = 0;
					gameState.flaskMediaAge = 'old';
					triggerStep(activeStep.id);
					showNotification('Cells centrifuged.', 'success');
					return;
				}
				if (result.event === 'prewarm') {
					triggerStep(activeStep.id);
					showNotification('Media warmed.', 'success');
					return;
				}
				if (result.event === 'media_adjust') {
					gameState.selectedTool = null;
					triggerStep(activeStep.id);
					showNotification('Media adjusted for all wells.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.event === 'resuspend') {
					gameState.selectedTool = null;
					startAddingMedia();
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
			}
			// Fallback: reset tool and re-render
			gameState.selectedTool = canonicalTool(gameState.selectedTool);
			renderGame();
			return;
		} else if (result.kind === 'error') {
			showNotification(result.hint);
			return;
		}
		// result.kind === 'no-op': fall through to the existing legacy if-ladder.
	}

	// If no tool selected, pick up this item
	if (!gameState.selectedTool) {
		// Ethanol bottle sprays immediately
		if (itemId === 'ethanol_bottle') {
			gameState.hoodSprayed = true;
			triggerStep('spray_hood');
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
		showNotification('Picked up ' + getHoodItemLabel(itemId));
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

	// Dead code removed: well_plate + incubator was the hood-era path
	// for plate incubation, but incubator now lives on the bench. The
	// bench_scene.ts handler owns this flow.

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
		triggerStep('add_trypsin');
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

	// Serological pipette -> pbs_bottle: load PBS (mirrors trypsin/media flow
	// so all reagent-loading steps use the same pipette pattern)
	if (tool === 'serological_pipette' && itemId === 'pbs_bottle') {
		gameState.selectedTool = 'serological_pipette_with_pbs';
		showNotification('PBS loaded into pipette. Click the flask to rinse.');
		renderHoodScene();
		return;
	}

	// Loaded serological pipette (PBS) -> flask: rinse the flask
	if (tool === 'serological_pipette_with_pbs' && itemId === 'flask') {
		gameState.selectedTool = null;
		gameState.flaskMediaAge = 'fresh';
		triggerStep('pbs_wash');
		showNotification('Flask rinsed with PBS.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Legacy direct PBS-bottle -> flask path. Kept for students who grab
	// the bottle without the pipette. Same completion behavior.
	if (tool === 'pbs_bottle' && itemId === 'flask' && gameState.flaskMediaAge === 'old') {
		gameState.selectedTool = null;
		gameState.flaskMediaAge = 'fresh';
		triggerStep('pbs_wash');
		showNotification('Flask rinsed with PBS.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Serological pipette -> flask (with fresh media): load sample for hemocytometer or plate.
	// The branch is gated on whether count_cells has completed, NOT on
	// the legacy `hemocytometerLoaded` flag. Using completedSteps makes
	// the state machine the single source of truth: once count_cells is
	// in completedSteps, every subsequent serological+flask click loads
	// cells for plate transfer, regardless of whether the student ever
	// walked the hood's "load sample" sub-flow (they might have clicked
	// the bench cell_counter or microscope directly).
	if (tool === 'serological_pipette' && itemId === 'flask' && gameState.flaskMediaAge === 'fresh') {
		const countDone = gameState.completedSteps.indexOf('count_cells') >= 0;
		if (!countDone) {
			// Pre-count: load sample for hemocytometer.
			gameState.selectedTool = 'serological_pipette_with_sample';
			showNotification('Cell sample loaded. Click the microscope to load the hemocytometer.');
			renderHoodScene();
			return;
		}
		// Post-count: load cells for plate transfer.
		gameState.selectedTool = 'serological_pipette_with_cells';
		showNotification('Loaded cell suspension. Click the 24-well plate to transfer.');
		renderHoodScene();
		return;
	}

	// Loaded sample -> microscope: load hemocytometer with trypan blue mix
	if (tool === 'serological_pipette_with_sample' && itemId === 'microscope') {
		gameState.selectedTool = null;
		gameState.hemocytometerLoaded = true;
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
		triggerStep('seed_plate');
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

	// Multichannel pipette + media_bottle -> well_plate: adjust media for treatment
	if (tool === 'multichannel_pipette' && itemId === 'media_bottle') {
		if (gameState.activeStepId === 'media_adjust') {
			gameState.selectedTool = 'multichannel_pipette_with_media';
			showNotification('Media loaded. Click the 24-well plate to adjust media.');
			renderHoodScene();
			return;
		}
	}

	// Multichannel pipette (with media) -> well_plate: adjust media
	if (tool === 'multichannel_pipette_with_media' && itemId === 'well_plate') {
		if (gameState.activeStepId === 'media_adjust') {
			gameState.selectedTool = null;
			triggerStep('media_adjust');
			showNotification('Media adjusted for all wells.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}
	}

	// Multichannel pipette + mtt_vial -> well_plate: add MTT
	if (tool === 'multichannel_pipette' && itemId === 'mtt_vial') {
		if (gameState.activeStepId === 'add_mtt') {
			gameState.selectedTool = 'multichannel_pipette_with_mtt';
			showNotification('MTT loaded. Click the 24-well plate to add.');
			renderHoodScene();
			return;
		}
	}

	// Multichannel pipette (with MTT) -> well_plate: add MTT
	if (tool === 'multichannel_pipette_with_mtt' && itemId === 'well_plate') {
		if (gameState.activeStepId === 'add_mtt') {
			gameState.selectedTool = null;
			triggerStep('add_mtt');
			showNotification('MTT added to all wells.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}
	}

	// Well plate -> biohazard_decant: decant MTT
	if (tool === 'well_plate' && itemId === 'biohazard_decant') {
		if (gameState.activeStepId === 'decant_mtt') {
			gameState.selectedTool = null;
			triggerStep('decant_mtt');
			showNotification('MTT decanted into biohazard container.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}
	}

	// Multichannel pipette + dmso_bottle -> well_plate: add DMSO
	if (tool === 'multichannel_pipette' && itemId === 'dmso_bottle') {
		if (gameState.activeStepId === 'add_dmso') {
			gameState.selectedTool = 'multichannel_pipette_with_dmso';
			showNotification('DMSO loaded. Click the 24-well plate to add.');
			renderHoodScene();
			return;
		}
	}

	// Multichannel pipette (with DMSO) -> well_plate: add DMSO
	if (tool === 'multichannel_pipette_with_dmso' && itemId === 'well_plate') {
		if (gameState.activeStepId === 'add_dmso') {
			gameState.selectedTool = null;
			triggerStep('add_dmso');
			showNotification('DMSO added to all wells.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}
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
		case 'carb_intermediate':
			actions.push('Pick up the multichannel pipette, click the drug vials, click the 24-well plate, then click Prepare intermediate stock');
			break;
		case 'carb_low_range':
			actions.push('Click the Half-log dilution option in the carboplatin modal');
			break;
		case 'carb_high_range':
			actions.push('Click Prepare high-range stocks in the carboplatin modal');
			break;
		case 'metformin_stock':
			actions.push('Click Prepare metformin stock in the metformin modal');
			break;
		case 'add_carboplatin':
			actions.push('Pick up the multichannel pipette, click the drug vials, click the 24-well plate, then click Add carboplatin');
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
