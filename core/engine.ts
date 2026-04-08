// ============================================
// core/engine.ts - Pure game engine with zero DOM dependencies
// ============================================
// All state transitions are pure functions: (state, action) -> newState.
// No document, window, or HTMLElement references anywhere in this file.

import type {
	Action,
	FlagId,
	GameConfig,
	GameState,
	LabState,
	ProtocolState,
	SceneId,
	Step,
	StepId,
	SterilityState,
	UIState,
	VesselState,
	WarningEntry,
	WellData,
} from "./types";
import { clampValue } from "./util";

// ============================================
// Game configuration constant
// ============================================

export const GAME_CONFIG: GameConfig = {
	plateRows: 4,
	plateCols: 6,
	drugConcentrationsUm: [0, 0.1, 0.5, 1, 5, 10],
	drugConcentrationLabels: ["0 (ctrl)", "0.1", "0.5", "1", "5", "10"],
	flaskMaxVolumeMl: 20,
	flaskStartingMediaMl: 12,
	freshMediaTargetMl: 15,
	wellVolumeUl: 500,
	drugStockConcentrationUm: 100,
	initialCellCount: 500000,
	initialViability: 0.95,
	initialConfluency: 0.6,
	targetStars: 5,
	scoreWeights: { order: 30, cleanliness: 25, wastedMedia: 20, timing: 25 },
	starThresholds: { threeStar: 80, twoStar: 50 },
};

// ============================================
// Helper: create an empty well plate
// ============================================

export function createWellPlate(rows: number, cols: number): WellData[] {
	const wells: WellData[] = [];
	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			wells.push({
				row: row,
				col: col,
				hasCells: false,
				drugConcentrationUm: 0,
				absorbance: 0,
				viability: 0,
			});
		}
	}
	return wells;
}

// ============================================
// Create the initial game state
// ============================================

export function createInitialGameState(): GameState {
	// Flask starts with old media at the configured starting volume
	const flaskVessel: VesselState = {
		mediaMl: GAME_CONFIG.flaskStartingMediaMl,
		mediaAge: "old",
		cellCount: GAME_CONFIG.initialCellCount,
		confluency: GAME_CONFIG.initialConfluency,
		drugConcentration: 0,
	};

	const sterility: SterilityState = {
		hoodSurfaceSterile: false,
		contaminationRisk: 0,
		cleanlinessErrors: 0,
	};

	const lab: LabState = {
		sterility: sterility,
		vessels: {
			"tc.flask": flaskVessel,
		},
		wellPlate: createWellPlate(GAME_CONFIG.plateRows, GAME_CONFIG.plateCols),
		cellsTransferred: false,
		drugsAdded: false,
		incubated: false,
		plateReadComplete: false,
		mediaWarmed: false,
		actualCellCount: GAME_CONFIG.initialCellCount,
		cellViability: GAME_CONFIG.initialViability,
		mediaWastedMl: 0,
	};

	const protocol: ProtocolState = {
		activeStepId: "spray_hood",
		completedSteps: [],
		stepsInOrder: 0,
		stepsOutOfOrder: 0,
		warnings: [],
		flags: {},
	};

	const ui: UIState = {
		activeScene: "hood",
		selectedToolId: null,
		isDragging: false,
		dragItemId: null,
		openModal: null,
		pipetteVolumeMl: 0,
	};

	return {
		protocol: protocol,
		lab: lab,
		ui: ui,
		startTime: Date.now(),
		endTime: null,
	};
}

// ============================================
// Get the current protocol step
// ============================================

export function getCurrentStep(state: GameState, steps: Step[]): Step | null {
	const activeId = state.protocol.activeStepId;
	const found = steps.find((s) => s.id === activeId);
	// Return null when no matching step exists (protocol complete)
	return found ?? null;
}

// ============================================
// Validate an action against the current protocol state
// ============================================

export function validateAction(
	state: GameState,
	action: Action,
	steps: Step[],
): { valid: boolean; warning?: WarningEntry } {
	const currentStep = getCurrentStep(state, steps);

	// No current step means protocol is complete
	if (!currentStep) {
		const warning: WarningEntry = {
			id: "out_of_order",
			message: "Protocol is already complete.",
			severity: "warning",
		};
		return { valid: false, warning: warning };
	}

	// Check if the action type is in the current step's allowedActions
	const isAllowed = currentStep.allowedActions.indexOf(action.type) >= 0;
	if (!isAllowed) {
		const warning: WarningEntry = {
			id: "out_of_order",
			message: "Current step expects: " + currentStep.title + ".",
			severity: "warning",
		};
		return { valid: false, warning: warning };
	}

	// Prerequisite checks for specific actions
	if (action.type === "aspirate") {
		// Must have old media to aspirate
		const flask = state.lab.vessels["tc.flask"];
		if (!flask || flask.mediaMl <= 0) {
			const warning: WarningEntry = {
				id: "insufficient_media",
				message: "No media in the flask to aspirate.",
				severity: "error",
			};
			return { valid: false, warning: warning };
		}
	}

	if (action.type === "dispense") {
		// Must have aspirated old media first
		const flask = state.lab.vessels["tc.flask"];
		if (flask && flask.mediaAge === "old" && flask.mediaMl > 2) {
			const warning: WarningEntry = {
				id: "out_of_order",
				message: "Aspirate old media from the flask before adding fresh media.",
				severity: "warning",
			};
			return { valid: false, warning: warning };
		}
	}

	if (action.type === "transfer") {
		// Must have fresh media in flask before transferring cells
		const flask = state.lab.vessels["tc.flask"];
		if (!flask || flask.mediaAge !== "fresh") {
			const warning: WarningEntry = {
				id: "out_of_order",
				message: "Add fresh media to the flask before transferring cells.",
				severity: "warning",
			};
			return { valid: false, warning: warning };
		}
	}

	if (action.type === "add_drug") {
		// Must have transferred cells first
		if (!state.lab.cellsTransferred) {
			const warning: WarningEntry = {
				id: "out_of_order",
				message: "Transfer cells to the plate before adding drugs.",
				severity: "warning",
			};
			return { valid: false, warning: warning };
		}
	}

	if (action.type === "incubate") {
		// Must have cells and drugs in plate
		if (!state.lab.cellsTransferred || !state.lab.drugsAdded) {
			const warning: WarningEntry = {
				id: "out_of_order",
				message: "Transfer cells and add drugs before incubating.",
				severity: "warning",
			};
			return { valid: false, warning: warning };
		}
	}

	if (action.type === "sterilize") {
		// Sterilize is always valid when it is the allowed action
		// No additional prerequisites
	}

	return { valid: true };
}

// ============================================
// Advance to the next protocol step
// ============================================

export function advanceStep(
	state: GameState,
	stepId: StepId,
	steps: Step[],
): GameState {
	const protocol = state.protocol;

	// Skip if already completed
	if (protocol.completedSteps.indexOf(stepId) >= 0) {
		return state;
	}

	// Determine if this step is in order
	const currentStep = getCurrentStep(state, steps);
	const isInOrder = currentStep !== null && currentStep.id === stepId;

	// Build new completed steps list
	const newCompleted = protocol.completedSteps.concat([stepId]);

	// Track ordering
	const newInOrder = isInOrder
		? protocol.stepsInOrder + 1
		: protocol.stepsInOrder;
	const newOutOfOrder = isInOrder
		? protocol.stepsOutOfOrder
		: protocol.stepsOutOfOrder + 1;

	// Map step IDs to their corresponding flag IDs
	const stepFlagMap: Record<string, FlagId> = {
		"spray_hood": "hoodSterilized",
		"aspirate_old_media": "mediaAspirated",
		"add_fresh_media": "freshMediaAdded",
		"microscope_check": "microscopeChecked",
		"count_cells": "cellsCounted",
		"calculate_dilution": "dilutionCalculated",
		"transfer_to_plate": "transferredToPlate",
		"add_drugs": "drugsAdded",
		"incubate": "incubated",
		"plate_read": "plateRead",
	};

	// Set the flag for the completed step
	const newFlags = { ...protocol.flags };
	const flagId = stepFlagMap[stepId];
	if (flagId) {
		newFlags[flagId] = true;
	}

	// Advance activeStepId to the next uncompleted step
	let nextActiveStepId = protocol.activeStepId;
	// Walk through steps in order, find the first one not in newCompleted
	let foundNext = false;
	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		if (step && newCompleted.indexOf(step.id) < 0) {
			nextActiveStepId = step.id;
			foundNext = true;
			break;
		}
	}

	// Determine scene and endTime based on protocol completion
	let newScene: SceneId = state.ui.activeScene;
	let newEndTime = state.endTime;

	if (!foundNext) {
		// All steps complete; protocol is finished
		nextActiveStepId = protocol.activeStepId;
		newScene = "results";
		newEndTime = Date.now();
	}

	const newProtocol: ProtocolState = {
		activeStepId: nextActiveStepId,
		completedSteps: newCompleted,
		stepsInOrder: newInOrder,
		stepsOutOfOrder: newOutOfOrder,
		warnings: protocol.warnings,
		flags: newFlags,
	};

	const newUi: UIState = {
		...state.ui,
		activeScene: newScene,
	};

	return {
		...state,
		protocol: newProtocol,
		ui: newUi,
		endTime: newEndTime,
	};
}

// ============================================
// Dispatch an action and produce a new game state
// ============================================

export function dispatchAction(
	state: GameState,
	action: Action,
	steps: Step[],
): GameState {
	switch (action.type) {
		case "sterilize":
			return handleSterilize(state, steps);
		case "aspirate":
			return handleAspirate(state, action, steps);
		case "dispense":
			return handleDispense(state, action, steps);
		case "transfer":
			return handleTransfer(state, steps);
		case "add_drug":
			return handleAddDrug(state, action, steps);
		case "incubate":
			return handleIncubate(state, steps);
		case "observe":
			return handleObserve(state, action, steps);
		case "count_cells":
			return handleCountCells(state, action, steps);
		case "calculate_dilution":
			return handleCalculateDilution(state, steps);
	}
}

// ============================================
// Action handlers (all return new state, never mutate)
// ============================================

function handleSterilize(state: GameState, steps: Step[]): GameState {
	// Mark the hood surface as sterile
	const newSterility: SterilityState = {
		...state.lab.sterility,
		hoodSurfaceSterile: true,
	};
	const newLab: LabState = {
		...state.lab,
		sterility: newSterility,
	};
	const newState: GameState = {
		...state,
		lab: newLab,
	};
	// Advance to complete spray_hood step
	return advanceStep(newState, "spray_hood", steps);
}

// ============================================

function handleAspirate(
	state: GameState,
	action: Action & { type: "aspirate" },
	steps: Step[],
): GameState {
	// Check sterility -- aspirating without spraying is a cleanliness error
	let newSterility = { ...state.lab.sterility };
	if (!state.lab.sterility.hoodSurfaceSterile) {
		newSterility = {
			...newSterility,
			contaminationRisk: clampValue(newSterility.contaminationRisk + 0.2, 0, 1),
			cleanlinessErrors: newSterility.cleanlinessErrors + 1,
		};
	}

	// Decrease flask media volume by the aspirated amount
	const flask = state.lab.vessels["tc.flask"];
	const currentMedia = flask ? flask.mediaMl : 0;
	const aspiratedMl = clampValue(action.volumeMl, 0, currentMedia);
	const newMediaMl = clampValue(currentMedia - aspiratedMl, 0, GAME_CONFIG.flaskMaxVolumeMl);

	// Track wasted media
	const newWasted = state.lab.mediaWastedMl + aspiratedMl;

	const newFlask: VesselState = {
		mediaMl: newMediaMl,
		mediaAge: newMediaMl > 0 ? "old" : "none",
		cellCount: flask ? flask.cellCount : null,
		confluency: flask ? flask.confluency : 0,
		drugConcentration: flask ? flask.drugConcentration : 0,
	};

	const newVessels = { ...state.lab.vessels, "tc.flask": newFlask };
	const newLab: LabState = {
		...state.lab,
		sterility: newSterility,
		vessels: newVessels,
		mediaWastedMl: newWasted,
	};

	const newState: GameState = {
		...state,
		lab: newLab,
	};

	return advanceStep(newState, "aspirate_old_media", steps);
}

// ============================================

function handleDispense(
	state: GameState,
	action: Action & { type: "dispense" },
	steps: Step[],
): GameState {
	// Add fresh media to the flask
	const flask = state.lab.vessels["tc.flask"];
	const currentMedia = flask ? flask.mediaMl : 0;
	const newMediaMl = clampValue(
		currentMedia + action.volumeMl,
		0,
		GAME_CONFIG.flaskMaxVolumeMl,
	);

	const newFlask: VesselState = {
		mediaMl: newMediaMl,
		mediaAge: "fresh",
		cellCount: flask ? flask.cellCount : null,
		confluency: flask ? flask.confluency : 0,
		drugConcentration: flask ? flask.drugConcentration : 0,
	};

	const newVessels = { ...state.lab.vessels, "tc.flask": newFlask };
	const newLab: LabState = {
		...state.lab,
		vessels: newVessels,
		mediaWarmed: true,
	};

	const newState: GameState = {
		...state,
		lab: newLab,
	};

	return advanceStep(newState, "add_fresh_media", steps);
}

// ============================================

function handleTransfer(state: GameState, steps: Step[]): GameState {
	// Transfer cells from flask to all wells in the plate
	const newWells: WellData[] = state.lab.wellPlate.map((well) => ({
		...well,
		hasCells: true,
		// Each well starts with the same base viability as the flask
		viability: state.lab.cellViability,
	}));

	const newLab: LabState = {
		...state.lab,
		wellPlate: newWells,
		cellsTransferred: true,
	};

	const newState: GameState = {
		...state,
		lab: newLab,
	};

	return advanceStep(newState, "transfer_to_plate", steps);
}

// ============================================

function handleAddDrug(
	state: GameState,
	action: Action & { type: "add_drug" },
	steps: Step[],
): GameState {
	// Apply drug concentrations to wells column-by-column
	// Each column gets the concentration from GAME_CONFIG.drugConcentrationsUm
	const concentrations = GAME_CONFIG.drugConcentrationsUm;
	const cols = GAME_CONFIG.plateCols;

	const newWells: WellData[] = state.lab.wellPlate.map((well) => {
		// Use the dilutionIndex from the action to decide application,
		// or apply all columns based on the standard layout
		const colIndex = clampValue(well.col, 0, cols - 1);
		const concentration = colIndex < concentrations.length
			? concentrations[colIndex] ?? 0
			: 0;
		return {
			...well,
			drugConcentrationUm: concentration,
		};
	});

	const newLab: LabState = {
		...state.lab,
		wellPlate: newWells,
		drugsAdded: true,
	};

	const newState: GameState = {
		...state,
		lab: newLab,
	};

	return advanceStep(newState, "add_drugs", steps);
}

// ============================================

function handleIncubate(state: GameState, steps: Step[]): GameState {
	// Simulate incubation: apply growth and drug effects to each well
	const newWells: WellData[] = state.lab.wellPlate.map((well) => {
		if (!well.hasCells) {
			return well;
		}

		// Drug effect: higher concentration reduces viability
		// Control wells (0 uM) have no drug effect
		const drugEffect = computeDrugEffect(well.drugConcentrationUm);
		const newViability = clampValue(well.viability * drugEffect, 0, 1);

		// Absorbance correlates with viable cell count (MTT/MTS-style assay)
		// Higher viability means more metabolic activity and higher absorbance
		const baseAbsorbance = 2.0;
		const newAbsorbance = clampValue(baseAbsorbance * newViability, 0, 4);

		return {
			...well,
			viability: newViability,
			absorbance: newAbsorbance,
		};
	});

	const newLab: LabState = {
		...state.lab,
		wellPlate: newWells,
		incubated: true,
	};

	const newState: GameState = {
		...state,
		lab: newLab,
	};

	return advanceStep(newState, "incubate", steps);
}

// ============================================

function handleObserve(
	state: GameState,
	action: Action & { type: "observe" },
	steps: Step[],
): GameState {
	// Observation completes either microscope_check or plate_read
	if (action.mode === "microscope") {
		return advanceStep(state, "microscope_check", steps);
	}
	// mode === "reader"
	const newLab: LabState = {
		...state.lab,
		plateReadComplete: true,
	};
	const newState: GameState = {
		...state,
		lab: newLab,
	};
	return advanceStep(newState, "plate_read", steps);
}

// ============================================

function handleCountCells(
	state: GameState,
	action: Action & { type: "count_cells" },
	steps: Step[],
): GameState {
	// Simulate hemocytometer counting
	// quadrantsSelected affects precision; typical protocol uses 4 quadrants
	const quadrants = clampValue(action.quadrantsSelected, 1, 4);
	// Simulated count with some noise based on quadrant count
	// More quadrants = more accurate count
	const noiseFactor = 1.0 - (0.05 * (4 - quadrants));
	const estimatedCount = Math.round(state.lab.actualCellCount * noiseFactor);

	// Store the counted result in the flask vessel
	const flask = state.lab.vessels["tc.flask"];
	const newFlask: VesselState = {
		mediaMl: flask ? flask.mediaMl : 0,
		mediaAge: flask ? flask.mediaAge : "none",
		cellCount: estimatedCount,
		confluency: flask ? flask.confluency : 0,
		drugConcentration: flask ? flask.drugConcentration : 0,
	};

	const newVessels = { ...state.lab.vessels, "tc.flask": newFlask };
	const newLab: LabState = {
		...state.lab,
		vessels: newVessels,
	};

	const newState: GameState = {
		...state,
		lab: newLab,
	};

	return advanceStep(newState, "count_cells", steps);
}

// ============================================

function handleCalculateDilution(
	state: GameState,
	steps: Step[],
): GameState {
	// Dilution calculation step is a checkpoint; the actual math is done by
	// the UI layer. The engine just marks it complete.
	return advanceStep(state, "calculate_dilution", steps);
}

// ============================================
// Helper: compute the fractional drug effect on viability
// ============================================

function computeDrugEffect(concentrationUm: number): number {
	// No drug means no effect
	if (concentrationUm <= 0) {
		return 1.0;
	}
	// Sigmoidal dose-response (Hill equation approximation)
	// IC50 roughly at 1 uM, Hill coefficient = 1.5
	const ic50 = 1.0;
	const hillCoefficient = 1.5;
	const ratio = Math.pow(concentrationUm / ic50, hillCoefficient);
	// Fraction surviving = 1 / (1 + ratio)
	const survival = 1.0 / (1.0 + ratio);
	return clampValue(survival, 0, 1);
}
