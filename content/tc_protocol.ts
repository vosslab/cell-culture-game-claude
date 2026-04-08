// ============================================
// content/tc_protocol.ts - Tissue culture protocol definition (10 steps)
// ============================================

import type {
	Protocol,
	InstructionStep,
	CheckpointStep,
	Step,
} from "../core/types";

// ============================================
// Helper constructors for the two step kinds
// ============================================

function instruction(
	fields: Omit<InstructionStep, "kind">
): InstructionStep {
	return { kind: "instruction", ...fields };
}

// ============================================
function checkpoint(
	fields: Omit<CheckpointStep, "kind">
): CheckpointStep {
	return { kind: "checkpoint", ...fields };
}

// ============================================
// TC_PROTOCOL - the canonical 10-step tissue culture workflow
// ============================================

export const TC_PROTOCOL: Protocol = {
	id: "tc_drug_response",
	title: "Cell Culture Drug Response Assay",
	steps: [
		// 1. Spray hood with 70% ethanol
		instruction({
			id: "spray_hood",
			sceneId: "hood",
			title: "Spray hood with 70% ethanol",
			allowedActions: ["sterilize"],
			requiredTargets: [
				{ objectId: "tc.ethanol", role: "reagent" },
				{ objectId: "tc.flask", role: "target" },
			],
			nextStepId: "aspirate_old_media",
		}),

		// 2. Aspirate old media from flask
		instruction({
			id: "aspirate_old_media",
			sceneId: "hood",
			title: "Aspirate old media from flask",
			allowedActions: ["aspirate"],
			requiredTargets: [
				{ objectId: "tc.aspirating_pipette", role: "tool" },
				{ objectId: "tc.flask", role: "source" },
			],
			nextStepId: "add_fresh_media",
		}),

		// 3. Add fresh media to flask
		instruction({
			id: "add_fresh_media",
			sceneId: "hood",
			title: "Add fresh media to flask",
			allowedActions: ["dispense"],
			requiredTargets: [
				{ objectId: "tc.serological_pipette", role: "tool" },
				{ objectId: "tc.media_bottle", role: "reagent" },
				{ objectId: "tc.flask", role: "target" },
			],
			nextStepId: "microscope_check",
		}),

		// 4. Check cell viability under microscope
		checkpoint({
			id: "microscope_check",
			sceneId: "microscope",
			title: "Check cell viability under microscope",
			rubricId: "viability_check",
			allowedActions: ["observe"],
			requiredTargets: [],
			nextStepId: "count_cells",
		}),

		// 5. Count cells on hemocytometer
		checkpoint({
			id: "count_cells",
			sceneId: "microscope",
			title: "Count cells on hemocytometer",
			rubricId: "hemocytometer_count",
			allowedActions: ["count_cells"],
			requiredTargets: [],
			nextStepId: "calculate_dilution",
		}),

		// 6. Calculate dilution for plating
		checkpoint({
			id: "calculate_dilution",
			sceneId: "microscope",
			title: "Calculate dilution for plating",
			rubricId: "dilution_calc",
			allowedActions: ["calculate_dilution"],
			requiredTargets: [],
			nextStepId: "transfer_to_plate",
		}),

		// 7. Transfer cells to 24-well plate
		instruction({
			id: "transfer_to_plate",
			sceneId: "hood",
			title: "Transfer cells to 24-well plate",
			allowedActions: ["transfer"],
			requiredTargets: [
				{ objectId: "tc.serological_pipette", role: "tool" },
				{ objectId: "tc.flask", role: "source" },
				{ objectId: "tc.well_plate", role: "target" },
			],
			nextStepId: "add_drugs",
		}),

		// 8. Add drug dilutions to plate
		instruction({
			id: "add_drugs",
			sceneId: "hood",
			title: "Add drug dilutions to plate",
			allowedActions: ["add_drug"],
			requiredTargets: [
				{ objectId: "tc.multichannel_pipette", role: "tool" },
				{ objectId: "tc.well_plate", role: "target" },
			],
			nextStepId: "incubate",
		}),

		// 9. Place plate in incubator
		instruction({
			id: "incubate",
			sceneId: "incubator",
			title: "Place plate in incubator",
			allowedActions: ["incubate"],
			requiredTargets: [],
			nextStepId: "plate_read",
		}),

		// 10. Read plate on plate reader
		checkpoint({
			id: "plate_read",
			sceneId: "plate_reader",
			title: "Read plate on plate reader",
			rubricId: "plate_reader_results",
			allowedActions: ["observe"],
			requiredTargets: [],
			nextStepId: null,
		}),
	] satisfies Step[],
};
