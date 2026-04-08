// ============================================
// main.ts - Composition root
// ============================================
// Wires content, engine, and UI together.
// Loads validated protocol, creates initial state, dispatches actions, rerenders.

import { createInitialGameState, GAME_CONFIG } from "./core/engine";
import type { GameState, Action, Step } from "./core/types";

// Re-export engine and types so the legacy UI modules can access them
// during the transition period (M3-M4). These exports will be removed
// once UI is fully migrated to ui/ in M5.
export { createInitialGameState, GAME_CONFIG } from "./core/engine";
export { computeScore } from "./core/scoring";
export {
	getCellState,
	generateCellPositions,
	applyDrugEffect,
	applyIncubation,
	generatePlateReaderResults,
} from "./core/cell_model";
export type {
	GameState,
	Action,
	Step,
	StepId,
	SceneId,
	VesselId,
	ToolId,
	ReagentId,
	TargetRef,
	WarningEntry,
	ScoreResult,
	WellData,
	GameConfig,
} from "./core/types";
export { clampValue } from "./core/util";
