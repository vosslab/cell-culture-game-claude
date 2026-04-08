// ============================================
// content/validate.ts - Manual runtime validation for protocol content
// ============================================
// No Zod dependency. Returns arrays of error strings (empty = valid).
// Validates structural correctness only, not biological realism or pedagogy.

import type { Protocol, ToolDefinition, Step, TargetRole } from "../core/types";

// ============================================
// Allowed values for role validation
// ============================================

const VALID_ROLES: ReadonlySet<TargetRole> = new Set(["source", "target", "tool", "reagent"]);

// ============================================
// Protocol validation
// ============================================

export function validateProtocol(protocol: Protocol, _tools: ToolDefinition[]): string[] {
	const errors: string[] = [];

	// 1. Protocol must have at least one step
	if (protocol.steps.length === 0) {
		errors.push("Protocol must have at least one step");
		// No further checks possible without steps
		return errors;
	}

	// Build a set of all step IDs for reference lookups
	const stepIds = new Set<string>();

	// 2. No duplicate step IDs
	for (const step of protocol.steps) {
		if (stepIds.has(step.id)) {
			errors.push(`Duplicate step ID: "${step.id}"`);
		}
		stepIds.add(step.id);
	}

	for (const step of protocol.steps) {
		// 3. Every step must have id, sceneId, title, kind
		validateRequiredStepFields(step, errors);

		// 6. Every step must have at least one allowedAction
		if (step.allowedActions.length === 0) {
			errors.push(`Step "${step.id}" must have at least one allowedAction`);
		}

		// 7. Every requiredTarget must have a valid role
		for (const target of step.requiredTargets) {
			if (!VALID_ROLES.has(target.role)) {
				errors.push(
					`Step "${step.id}" has requiredTarget with invalid role: "${target.role}"`
				);
			}
		}
	}

	// 4. Every nextStepId must reference an existing step ID (or be null)
	for (const step of protocol.steps) {
		if (step.nextStepId !== null && !stepIds.has(step.nextStepId)) {
			errors.push(
				`Step "${step.id}" references non-existent nextStepId: "${step.nextStepId}"`
			);
		}
	}

	// 5. No circular nextStepId chains (visited-set walk from each step)
	detectCircularChains(protocol.steps, errors);

	return errors;
}

// ============================================
// Required field check for a single step
// ============================================

function validateRequiredStepFields(step: Step, errors: string[]): void {
	// Cast to Record for runtime checks - the type system guarantees shape at
	// compile time, but content loaded from JSON may violate it at runtime
	const raw = step as unknown as Record<string, unknown>;
	if (!raw["id"]) {
		errors.push("Step is missing an id");
	}
	if (!raw["sceneId"]) {
		errors.push(`Step "${step.id}" is missing sceneId`);
	}
	if (!raw["title"]) {
		errors.push(`Step "${step.id}" is missing title`);
	}
	if (!raw["kind"]) {
		errors.push(`Step "${step.id}" is missing kind`);
	}
}

// ============================================
// Circular chain detection via visited-set walk
// ============================================

function detectCircularChains(steps: Step[], errors: string[]): void {
	// Build a map from stepId to its nextStepId for fast lookup
	const nextMap = new Map<string, string | null>();
	for (const step of steps) {
		nextMap.set(step.id, step.nextStepId);
	}

	// Walk from each step, tracking visited nodes
	for (const step of steps) {
		const visited = new Set<string>();
		let currentId: string | null | undefined = step.id;

		while (currentId !== null && currentId !== undefined) {
			if (visited.has(currentId)) {
				errors.push(`Circular nextStepId chain detected involving step "${step.id}"`);
				break;
			}
			visited.add(currentId);
			currentId = nextMap.get(currentId) ?? null;
		}
	}
}

// ============================================
// Tool validation
// ============================================

export function validateTools(tools: ToolDefinition[]): string[] {
	const errors: string[] = [];
	const toolIds = new Set<string>();

	for (const tool of tools) {
		// 1. No duplicate tool IDs
		if (toolIds.has(tool.id)) {
			errors.push(`Duplicate tool ID: "${tool.id}"`);
		}
		toolIds.add(tool.id);

		// 2. Every tool must have id, label
		if (!tool.id) {
			errors.push("Tool is missing an id");
		}
		if (!tool.label) {
			errors.push(`Tool "${tool.id}" is missing label`);
		}

		// 3. validTargets must not be empty
		if (tool.validTargets.length === 0) {
			errors.push(`Tool "${tool.id}" must have at least one validTarget`);
		}
	}

	return errors;
}
