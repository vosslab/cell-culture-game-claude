// ============================================
// interaction_resolver.ts - Data-driven click dispatcher
// ============================================
// Reads the active step's allowedInteractions block (from protocol.yaml)
// and turns a (selectedTool, clickedItem) pair into a structured action.
// Pure function. No side effects.
//
// Returns { kind: 'no-op' } when:
//   - no active step
//   - active step has no allowedInteractions block (legacy path)
//   - no interaction matches the click
// M1.5.C scene handlers fall through to legacy if-ladders on no-op.

type InteractionResult =
	| { kind: 'no-op' }
	| { kind: 'load'; resultActor: string; resultLiquid: string; volumeMl: number; colorKey: string }
	| { kind: 'discharge'; event: string; target: string; consumesVolumeMl: number }
	| { kind: 'error'; hint: string };

// ============================================
// resolveInteraction - Pure dispatcher function
// ============================================
// Given selectedTool, clickedItem, activeStep, and optional heldLiquid state,
// attempt to match an allowedInteraction and return a structured result.
//
// Matching algorithm:
// - For interactions with both source and target (pass-through):
//   Match when actor matches selectedTool AND the step has an event handler
//   AND clickedItem matches either source or target.
//   Result: discharge action targeting the target.
//
// - For interactions with only source (draw/load):
//   Match when actor matches selectedTool AND clickedItem matches source
//   AND result.heldLiquid is defined.
//   Result: load action with the heldLiquid properties.
//
// - For interactions with only target (discharge/apply):
//   Case 1 (tool-mediated discharge): actor matches selectedTool AND
//     clickedItem matches target. If liquid is set, heldLiquid.liquid must match.
//     Result: discharge action.
//   Case 2 (direct actor click): no selectedTool AND actor matches clickedItem
//     AND target is defined.
//     Result: discharge action (no volume consumed for direct clicks).
//
function resolveInteraction(args: {
	selectedTool: string | null;
	clickedItem: string;
	activeStep: ProtocolStep | null;
	heldLiquid?: { tool: string | null; liquid: string | null; volumeMl: number; colorKey: string | null };
}): InteractionResult {
	// Guard: no active step means no allowedInteractions to check
	if (!args.activeStep) {
		return { kind: 'no-op' };
	}

	// Guard: no allowedInteractions block (legacy path)
	if (!args.activeStep.allowedInteractions || args.activeStep.allowedInteractions.length === 0) {
		return { kind: 'no-op' };
	}

	// Walk through each allowed interaction, attempt to match
	for (let i = 0; i < args.activeStep.allowedInteractions.length; i++) {
		const interaction = args.activeStep.allowedInteractions[i];

		// Case 1: interaction has both source and target (pass-through)
		// Example: aspirate_old_media has actor=aspirating_pipette, source=flask, target=waste_container
		if (interaction.source && interaction.target) {
			// Match: actor matches selectedTool AND event is defined AND
			// clickedItem matches source OR target
			if (
				interaction.actor === args.selectedTool &&
				interaction.event &&
				(args.clickedItem === interaction.source || args.clickedItem === interaction.target)
			) {
				return {
					kind: 'discharge',
					event: interaction.event,
					target: interaction.target,
					consumesVolumeMl: interaction.consumesVolumeMl ?? 0,
				};
			}
		}
		// Case 2: interaction has only source (draw/load)
		// Example: pbs_wash first interaction - load PBS into pipette
		else if (interaction.source && !interaction.target) {
			// Match: actor matches selectedTool AND clickedItem matches source
			// AND result.heldLiquid is defined (this is a load action)
			if (
				interaction.actor === args.selectedTool &&
				args.clickedItem === interaction.source &&
				interaction.result &&
				interaction.result.heldLiquid
			) {
				const r = interaction.result.heldLiquid;
				return {
					kind: 'load',
					resultActor: r.tool,
					resultLiquid: r.liquid,
					volumeMl: r.volumeMl,
					colorKey: r.colorKey,
				};
			}
		}
		// Case 3: interaction has only target (discharge/apply)
		// Example: pbs_wash second interaction - discharge PBS into flask
		// Example: spray_hood - spray ethanol on hood
		else if (!interaction.source && interaction.target) {
			// Subcase 3a: Tool-mediated discharge
			// Match: actor matches selectedTool AND clickedItem matches target
			// If liquid is set, heldLiquid.liquid must match
			if (interaction.actor === args.selectedTool && args.clickedItem === interaction.target) {
				// If liquid requirement is set, enforce it
				if (interaction.liquid) {
					if (!args.heldLiquid || args.heldLiquid.liquid !== interaction.liquid) {
						// Liquid requirement not met; skip this interaction
						continue;
					}
				}
				return {
					kind: 'discharge',
					event: interaction.event ?? '',
					target: interaction.target,
					consumesVolumeMl: interaction.consumesVolumeMl ?? 0,
				};
			}

			// Subcase 3b: Direct actor click (no selectedTool required)
			// Example: spray_hood actor=ethanol_bottle target=hood_surface
			// Student clicks the ethanol_bottle directly (no tool selected)
			if (!args.selectedTool && interaction.actor === args.clickedItem && interaction.target) {
				// The student clicked the actor itself; treat as self-discharge to target
				return {
					kind: 'discharge',
					event: interaction.event ?? '',
					target: interaction.target,
					consumesVolumeMl: 0,
				};
			}
		}
	}

	// No interaction matched; return no-op so legacy code path continues
	return { kind: 'no-op' };
}
