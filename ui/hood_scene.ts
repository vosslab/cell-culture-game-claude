// ============================================
// ui/hood_scene.ts - Hood scene rendering and interaction for the new architecture
// ============================================
// Reads typed GameState and dispatches semantic Actions through a callback.
// No direct mutation of game state -- all changes go through dispatch().

import type {
	Action,
	GameState,
	SceneId,
	Step,
	ToolId,
} from "../core/types";
import { getCurrentStep } from "../core/engine";
import { TC_SCENES } from "../content/tc_scenes";

// Legacy SVG functions still in global scope from the old build
declare function getItemSvgHtml(itemId: string): string;
declare function getHoodBackgroundSvg(): string;

// ============================================
// Intermediate tool state: the UI tracks multi-click pipette loading locally
// These are not in GameState because they are transient UI gestures,
// not semantic lab operations the engine needs to know about.
// ============================================

type PipetteLoad =
	| null
	| "media"
	| "cells"
	| "drug";

let pipetteLoad: PipetteLoad = null;

// ============================================
// Map legacy unqualified asset IDs to typed ToolId for dispatch
// ============================================

const ASSET_TO_TOOL: Record<string, ToolId> = {
	"aspirating_pipette": "tc.aspirating_pipette",
	"serological_pipette": "tc.serological_pipette",
	"multichannel_pipette": "tc.multichannel_pipette",
};

// ============================================
// Labels for hood items (mirrors parts/constants.ts HOOD_ITEMS)
// ============================================

const ITEM_LABELS: Record<string, string> = {
	"flask": "T-75 Flask",
	"well_plate": "24-Well Plate",
	"media_bottle": "DMEM Media",
	"aspirating_pipette": "Aspirating Pipette",
	"serological_pipette": "Serological Pipette",
	"waste_container": "Waste",
	"drug_vials": "Drug Dilutions",
	"multichannel_pipette": "Multichannel Pipette",
	"ethanol_bottle": "70% Ethanol",
	"microscope": "Microscope",
};

// ============================================
// Keyboard listener reference for cleanup
// ============================================

let escapeListener: ((e: KeyboardEvent) => void) | null = null;

// ============================================
// Build the list of active target asset IDs from the current protocol step
// ============================================

function getActiveTargetAssetIds(state: GameState, steps: Step[]): string[] {
	const currentStepData = getCurrentStep(state, steps);
	if (!currentStepData) {
		return [];
	}
	// Map requiredTarget objectIds back to unqualified asset IDs for the scene
	const targets: string[] = [];
	const requiredTargets = currentStepData.requiredTargets;
	for (let i = 0; i < requiredTargets.length; i++) {
		const target = requiredTargets[i];
		if (!target) {
			continue;
		}
		// Strip the "tc." prefix to get the asset ID used in the scene
		const assetId = target.objectId.replace("tc.", "");
		targets.push(assetId);
	}
	return targets;
}

// ============================================
// Get the hood scene definition from TC_SCENES
// ============================================

function getHoodSceneDef(): typeof TC_SCENES[0] | null {
	for (let i = 0; i < TC_SCENES.length; i++) {
		const scene = TC_SCENES[i];
		if (scene && scene.id === "hood") {
			return scene;
		}
	}
	return null;
}

// ============================================
// Build the hint text for the toolbar
// ============================================

function buildHintText(
	state: GameState,
	steps: Step[],
): string {
	// If a tool is selected, show what is held
	const selectedToolId = state.ui.selectedToolId;
	if (selectedToolId) {
		// Derive a human label from the tool ID
		const toolAsset = selectedToolId.replace("tc.", "");
		const toolLabel = ITEM_LABELS[toolAsset] || toolAsset;
		let suffix = " -- Click a target to use";
		if (pipetteLoad === "media") {
			suffix = " (loaded with media) -- Click the flask";
		} else if (pipetteLoad === "cells") {
			suffix = " (loaded with cells) -- Click the 24-well plate";
		} else if (pipetteLoad === "drug") {
			suffix = " (loaded with drugs) -- Click the 24-well plate";
		}
		return "Holding: " + toolLabel + suffix;
	}

	// Otherwise show the current protocol step
	const currentStep = getCurrentStep(state, steps);
	if (currentStep) {
		return "Current step: " + currentStep.title;
	}
	return "Protocol complete!";
}

// ============================================
// renderHoodScene() - Main entry point
// ============================================

export function renderHoodScene(
	state: GameState,
	steps: Step[],
	dispatch: (action: Action) => void,
	onSceneChange: (scene: SceneId) => void,
): void {
	const hoodScene = document.getElementById("hood-scene");
	if (!hoodScene) {
		return;
	}

	// Get hood scene layout from TC_SCENES
	const sceneDef = getHoodSceneDef();
	if (!sceneDef) {
		return;
	}

	// Determine which items should glow for the current step
	const activeTargets = getActiveTargetAssetIds(state, steps);
	const selectedToolId = state.ui.selectedToolId;

	let html = "";

	// Hood background SVG
	html += '<div id="hood-bg" style="position:absolute;top:0;left:0;'
		+ 'width:100%;height:100%;">';
	html += getHoodBackgroundSvg();
	html += "</div>";

	// Place each hood item from TC_SCENES placements
	const placements = sceneDef.placements;
	for (let i = 0; i < placements.length; i++) {
		const placement = placements[i];
		if (!placement) {
			continue;
		}
		const assetId = placement.assetId;

		// Check if this item is currently selected as a tool
		const qualifiedToolId = ASSET_TO_TOOL[assetId];
		const isSelected = selectedToolId !== null
			&& qualifiedToolId !== undefined
			&& qualifiedToolId === selectedToolId;

		// Check if this item is a valid target for the current protocol step
		const isTarget = activeTargets.indexOf(assetId) >= 0;

		// Styling based on selection and target state
		const borderStyle = isSelected
			? "3px solid #4caf50"
			: "2px solid transparent";
		const opacity = isSelected ? "0.7" : "1";
		const activeClass = isTarget && !isSelected ? " is-active" : "";
		const label = ITEM_LABELS[assetId] || assetId;

		html += '<div class="hood-item' + activeClass + '" '
			+ 'data-item-id="' + assetId + '" '
			+ 'tabindex="0" '
			+ 'role="button" '
			+ 'aria-label="' + label + '" '
			+ 'style="position:absolute;'
			+ "left:" + placement.x + "%;top:" + placement.y + "%;"
			+ "width:" + placement.width + "%;height:" + placement.height + "%;"
			+ "z-index:" + placement.zIndex + ";"
			+ "cursor:pointer;border:" + borderStyle + ";border-radius:4px;"
			+ "opacity:" + opacity + ";transition:all 0.2s ease;\" "
			+ 'draggable="true" '
			+ 'title="' + label + '">';
		html += getItemSvgHtml(assetId);
		html += "</div>";
	}

	// Toolbar at top showing current step hint and held tool
	const hintText = buildHintText(state, steps);
	html += '<div id="hood-toolbar" style="position:absolute;top:8px;left:50%;'
		+ "transform:translateX(-50%);"
		+ "background:rgba(255,255,255,0.92);padding:10px 24px;border-radius:20px;"
		+ "font-size:16px;font-weight:500;color:#212121;"
		+ 'box-shadow:0 2px 8px rgba(0,0,0,0.15);white-space:nowrap;z-index:100;">';
	html += hintText;
	html += "</div>";

	hoodScene.style.position = "relative";
	hoodScene.innerHTML = html;

	// Wire up event listeners
	setupHoodEventListeners(state, steps, dispatch, onSceneChange);
}

// ============================================
// onItemClick() - Handle a click (or keyboard activation) on a hood item
// ============================================

function onItemClick(
	itemId: string,
	state: GameState,
	steps: Step[],
	dispatch: (action: Action) => void,
	onSceneChange: (scene: SceneId) => void,
): void {
	const selectedToolId = state.ui.selectedToolId;

	// ----------------------------------------------------------
	// No tool selected: pick up an item or perform immediate actions
	// ----------------------------------------------------------
	if (!selectedToolId) {
		// Ethanol bottle: immediate sterilize action
		if (itemId === "ethanol_bottle") {
			dispatch({
				type: "sterilize",
				target: { kind: "vessel", id: "tc.flask" },
				reagent: { kind: "reagent", id: "tc.ethanol" },
			});
			pipetteLoad = null;
			return;
		}

		// Microscope: switch to microscope scene when flask has fresh media
		if (itemId === "microscope") {
			const flask = state.lab.vessels["tc.flask"];
			if (flask && flask.mediaAge === "fresh") {
				onSceneChange("microscope");
				return;
			}
			// Not ready yet -- do nothing meaningful; the UI layer can show a hint
			return;
		}

		// Well plate: switch to incubator when cells transferred and drugs added
		if (itemId === "well_plate") {
			if (state.lab.cellsTransferred && state.lab.drugsAdded) {
				onSceneChange("incubator");
				return;
			}
		}

		// For tools (pipettes), "pick up" by setting UI selected tool
		// The caller must re-render after dispatch, but we need a way to
		// tell the system a tool was picked up. Since picking up a tool
		// is purely UI, we model it as an intermediate state.
		// We directly dispatch nothing -- the parent orchestrator handles
		// selectedToolId in UIState. We use a synthetic approach:
		// set the tool on the state copy that will be used on next render.
		const qualifiedToolId = ASSET_TO_TOOL[itemId];
		if (qualifiedToolId) {
			// Picking up a pipette is a UI-only state change.
			// We rely on the parent to update state.ui.selectedToolId.
			// For now, directly mutate the UI sub-state (will be replaced
			// when a full UI action system is added).
			state.ui.selectedToolId = qualifiedToolId;
			pipetteLoad = null;
			return;
		}

		// Non-tool, non-special items: do nothing on bare click
		return;
	}

	// ----------------------------------------------------------
	// A tool is selected: use it on the clicked target
	// ----------------------------------------------------------
	const toolAsset = selectedToolId.replace("tc.", "");

	// Aspirating pipette + flask: aspirate old media
	if (toolAsset === "aspirating_pipette" && itemId === "flask") {
		const flask = state.lab.vessels["tc.flask"];
		const volumeMl = flask ? flask.mediaMl : 0;
		dispatch({
			type: "aspirate",
			source: { kind: "vessel", id: "tc.flask" },
			volumeMl: volumeMl,
		});
		state.ui.selectedToolId = null;
		pipetteLoad = null;
		return;
	}

	// Serological pipette + media_bottle: load media (intermediate state)
	if (toolAsset === "serological_pipette"
		&& pipetteLoad === null
		&& itemId === "media_bottle") {
		pipetteLoad = "media";
		// Stay holding the pipette -- re-render will show updated hint
		return;
	}

	// Serological pipette loaded with media + flask: dispense fresh media
	if (toolAsset === "serological_pipette"
		&& pipetteLoad === "media"
		&& itemId === "flask") {
		dispatch({
			type: "dispense",
			target: { kind: "vessel", id: "tc.flask" },
			volumeMl: 15,
		});
		state.ui.selectedToolId = null;
		pipetteLoad = null;
		return;
	}

	// Serological pipette (no load) + flask (with fresh media): load cells
	if (toolAsset === "serological_pipette"
		&& pipetteLoad === null
		&& itemId === "flask") {
		const flask = state.lab.vessels["tc.flask"];
		if (flask && flask.mediaAge === "fresh") {
			pipetteLoad = "cells";
			// Stay holding the pipette
			return;
		}
		// Flask does not have fresh media -- invalid combination falls through
	}

	// Serological pipette loaded with cells + well_plate: transfer cells
	if (toolAsset === "serological_pipette"
		&& pipetteLoad === "cells"
		&& itemId === "well_plate") {
		dispatch({
			type: "transfer",
			source: { kind: "vessel", id: "tc.flask" },
			target: { kind: "vessel", id: "tc.well_plate" },
		});
		state.ui.selectedToolId = null;
		pipetteLoad = null;
		return;
	}

	// Multichannel pipette + drug_vials: load drug dilutions
	if (toolAsset === "multichannel_pipette"
		&& pipetteLoad === null
		&& itemId === "drug_vials") {
		// Must have transferred cells first
		if (!state.lab.cellsTransferred) {
			// Invalid -- deselect and fall through
			state.ui.selectedToolId = null;
			pipetteLoad = null;
			return;
		}
		pipetteLoad = "drug";
		// Stay holding the pipette
		return;
	}

	// Multichannel pipette loaded with drugs + well_plate: trigger drug overlay
	if (toolAsset === "multichannel_pipette"
		&& pipetteLoad === "drug"
		&& itemId === "well_plate") {
		state.ui.selectedToolId = null;
		pipetteLoad = null;
		// Dispatch add_drug with dilutionIndex 0 to let the engine handle it.
		// The parent orchestrator may show an overlay for dilution choice
		// before actually dispatching. Signal via onSceneChange or
		// dispatch the add_drug action directly.
		dispatch({
			type: "add_drug",
			target: { kind: "vessel", id: "tc.well_plate" },
			dilutionIndex: 0,
		});
		return;
	}

	// ----------------------------------------------------------
	// Invalid combination: deselect the tool
	// ----------------------------------------------------------
	state.ui.selectedToolId = null;
	pipetteLoad = null;
}

// ============================================
// setupHoodEventListeners() - Wire click, hover, drag, keyboard, and context menu
// ============================================

function setupHoodEventListeners(
	state: GameState,
	steps: Step[],
	dispatch: (action: Action) => void,
	onSceneChange: (scene: SceneId) => void,
): void {
	const items = document.querySelectorAll(".hood-item");
	for (let idx = 0; idx < items.length; idx++) {
		const el = items[idx] as HTMLElement;
		const itemId = el.getAttribute("data-item-id");
		if (!itemId) {
			continue;
		}

		// Click handler
		el.addEventListener("click", () => {
			onItemClick(itemId, state, steps, dispatch, onSceneChange);
			// Re-render after any state change
			renderHoodScene(state, steps, dispatch, onSceneChange);
		});

		// Keyboard activation (Enter and Space for role="button")
		el.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onItemClick(itemId, state, steps, dispatch, onSceneChange);
				renderHoodScene(state, steps, dispatch, onSceneChange);
			}
		});

		// Hover effects
		el.addEventListener("mouseenter", () => {
			el.style.filter = "brightness(1.1)";
			el.style.transform = "scale(1.05)";
		});
		el.addEventListener("mouseleave", () => {
			el.style.filter = "";
			el.style.transform = "";
		});

		// Drag-and-drop: start dragging a tool
		el.addEventListener("dragstart", (e: DragEvent) => {
			if (e.dataTransfer) {
				e.dataTransfer.setData("text/plain", itemId);
				e.dataTransfer.effectAllowed = "move";
			}
			el.style.opacity = "0.5";
		});
		el.addEventListener("dragend", () => {
			el.style.opacity = "";
		});

		// Drop target: accept a dropped tool
		el.addEventListener("dragover", (e: DragEvent) => {
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = "move";
			}
			el.classList.add("drag-hover");
		});
		el.addEventListener("dragleave", () => {
			el.classList.remove("drag-hover");
		});
		el.addEventListener("drop", (e: DragEvent) => {
			e.preventDefault();
			el.classList.remove("drag-hover");
			const draggedToolId = e.dataTransfer
				? e.dataTransfer.getData("text/plain")
				: "";
			if (draggedToolId && draggedToolId !== itemId) {
				// Simulate picking up the dragged tool then using it on the target
				const qualifiedToolId = ASSET_TO_TOOL[draggedToolId];
				if (qualifiedToolId) {
					state.ui.selectedToolId = qualifiedToolId;
					pipetteLoad = null;
				}
				onItemClick(itemId, state, steps, dispatch, onSceneChange);
				renderHoodScene(state, steps, dispatch, onSceneChange);
			}
		});
	}

	// Right-click on hood scene to deselect tool
	const hoodScene = document.getElementById("hood-scene");
	if (hoodScene) {
		hoodScene.addEventListener("contextmenu", (e: MouseEvent) => {
			e.preventDefault();
			if (state.ui.selectedToolId) {
				state.ui.selectedToolId = null;
				pipetteLoad = null;
				renderHoodScene(state, steps, dispatch, onSceneChange);
			}
		});
	}

	// Remove previous Escape listener to avoid stacking
	if (escapeListener) {
		document.removeEventListener("keydown", escapeListener);
	}

	// Escape key to deselect tool
	escapeListener = (e: KeyboardEvent) => {
		if (e.key === "Escape" && state.ui.selectedToolId) {
			state.ui.selectedToolId = null;
			pipetteLoad = null;
			renderHoodScene(state, steps, dispatch, onSceneChange);
		}
	};
	document.addEventListener("keydown", escapeListener);
}

// ============================================
// resetPipetteLoad() - Allow external callers to clear the intermediate state
// ============================================

export function resetPipetteLoad(): void {
	pipetteLoad = null;
}

// ============================================
// getPipetteLoad() - Allow external callers to inspect intermediate state
// ============================================

export function getPipetteLoad(): PipetteLoad {
	return pipetteLoad;
}
