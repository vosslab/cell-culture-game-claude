// ============================================
// step_dispatch.ts - Derive scene-dispatch metadata from PROTOCOL_STEPS
// ============================================
// So scene handlers don't hardcode step-id lists. Exposes helpers to:
// - Find all modal-driven or incubation steps
// - Filter by scene, owner, or trigger status
// - Lookup step details by id

function findStepById(id: string): ProtocolStep | null {
	for (const step of PROTOCOL_STEPS) {
		if (step.id === id) {
			return step;
		}
	}
	return null;
}

function getModalOwnedSteps(owner?: string): ProtocolStep[] {
	const result: ProtocolStep[] = [];
	for (const step of PROTOCOL_STEPS) {
		if (step.modal) {
			if (!owner || step.modal.owner === owner) {
				result.push(step);
			}
		}
	}
	return result;
}

function getIncubationSteps(): ProtocolStep[] {
	const result: ProtocolStep[] = [];
	for (const step of PROTOCOL_STEPS) {
		if (step.isIncubation === true) {
			result.push(step);
		}
	}
	return result;
}

function getStepsForScene(scene: string): ProtocolStep[] {
	const result: ProtocolStep[] = [];
	for (const step of PROTOCOL_STEPS) {
		if (step.scene === scene) {
			result.push(step);
		}
	}
	return result;
}

function getStepIdsRequiringTrigger(): string[] {
	const result: string[] = [];
	for (const step of PROTOCOL_STEPS) {
		if (step.trigger) {
			result.push(step.id);
		}
	}
	return result;
}

function isModalOwnedStep(stepId: string): boolean {
	const step = findStepById(stepId);
	return step !== null && step.modal !== undefined;
}

function isIncubationStep(stepId: string): boolean {
	const step = findStepById(stepId);
	return step !== null && step.isIncubation === true;
}

function getModalOwnerForStep(stepId: string): string | null {
	const step = findStepById(stepId);
	if (step && step.modal) {
		return step.modal.owner;
	}
	return null;
}
