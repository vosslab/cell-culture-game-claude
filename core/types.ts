// ============================================
// core/types.ts - Typed domain model for the cell culture game engine
// ============================================
// Design principle: make invalid states unrepresentable.
// Use discriminated unions, category-split IDs, and semantic actions.
// This file has zero DOM dependencies.

// ============================================
// ID categories - split by role so the engine never needs type guards
// All namespaced with "tc." for tissue culture; future protocols use "wb.", "pcr.", etc.
// ============================================

export type VesselId =
	| "tc.flask"
	| "tc.well_plate"
	| "tc.media_bottle"
	| "tc.waste_container";

export type ToolId =
	| "tc.aspirating_pipette"
	| "tc.serological_pipette"
	| "tc.multichannel_pipette";

export type ReagentId =
	| "tc.ethanol"
	| "tc.trypan_blue"
	| "tc.drug_stock"
	| "tc.fresh_media";

// SVG file references - not constrained to a union
export type AssetId = string;

export type SceneId =
	| "hood"
	| "microscope"
	| "incubator"
	| "plate_reader"
	| "results";

export type StepId =
	| "spray_hood"
	| "aspirate_old_media"
	| "add_fresh_media"
	| "microscope_check"
	| "count_cells"
	| "calculate_dilution"
	| "transfer_to_plate"
	| "add_drugs"
	| "incubate"
	| "plate_read";

export type FlagId =
	| "hoodSterilized"
	| "mediaAspirated"
	| "freshMediaAdded"
	| "microscopeChecked"
	| "cellsCounted"
	| "dilutionCalculated"
	| "transferredToPlate"
	| "drugsAdded"
	| "incubated"
	| "plateRead";

export type WarningId =
	| "out_of_order"
	| "sterility_breach"
	| "cold_media"
	| "excess_media"
	| "insufficient_media"
	| "incorrect_dilution"
	| "suboptimal_drug_series"
	| "invalid_combination";

// ============================================
// Target references - discriminated union for action targets
// Plain IDs get tight fast (flask media vs specific well vs pipette-held liquid)
// ============================================

export type TargetRef =
	| { kind: "vessel"; id: VesselId }
	| { kind: "tool"; id: ToolId }
	| { kind: "well"; plateId: VesselId; wellId: string }
	| { kind: "reagent"; id: ReagentId };

// ============================================
// Semantic lab actions - the engine reasons about lab operations, not UI gestures
// The UI maps clicks and drags into these actions
// ============================================

export type Action =
	| { type: "sterilize"; target: TargetRef; reagent: TargetRef }
	| { type: "aspirate"; source: TargetRef; volumeMl: number }
	| { type: "dispense"; target: TargetRef; volumeMl: number }
	| { type: "transfer"; source: TargetRef; target: TargetRef }
	| { type: "add_drug"; target: TargetRef; dilutionIndex: number }
	| { type: "incubate"; durationMin: number }
	| { type: "observe"; target: TargetRef; mode: "microscope" | "reader" }
	| { type: "count_cells"; quadrantsSelected: number }
	| { type: "calculate_dilution"; volumeUl: number };

// ============================================
// Required targets with roles for protocol step definitions
// ============================================

export type TargetRole = "source" | "target" | "tool" | "reagent";

export interface RequiredTarget {
	objectId: VesselId | ToolId | ReagentId;
	role: TargetRole;
}

// ============================================
// Protocol step definitions - discriminated union
// A checkpoint step cannot pretend to be an instruction step
// ============================================

export interface StepBase {
	id: StepId;
	sceneId: SceneId;
	title: string;
	allowedActions: Action["type"][];
	requiredTargets: RequiredTarget[];
	nextStepId: StepId | null;
}

export interface InstructionStep extends StepBase {
	kind: "instruction";
}

export interface CheckpointStep extends StepBase {
	kind: "checkpoint";
	rubricId: string;
}

export type Step = InstructionStep | CheckpointStep;

export interface Protocol {
	id: string;
	title: string;
	steps: Step[];
}

// ============================================
// Typed warnings - not raw strings
// ============================================

export type WarningSeverity = "info" | "warning" | "error";

export interface WarningEntry {
	id: WarningId;
	message: string;
	severity: WarningSeverity;
}

// ============================================
// Three-way state split: protocol, lab, UI
// ============================================

// --- Protocol state: what step is active, what is unlocked ---

export interface ProtocolState {
	activeStepId: StepId;
	completedSteps: StepId[];
	stepsInOrder: number;
	stepsOutOfOrder: number;
	warnings: WarningEntry[];
	flags: Partial<Record<FlagId, boolean>>;
}

// --- Lab state: what is physically true in the simulation ---

export interface VesselState {
	mediaMl: number;
	mediaAge: "old" | "fresh" | "none";
	cellCount: number | null;
	confluency: number;
	drugConcentration: number;
}

export interface WellData {
	row: number;
	col: number;
	hasCells: boolean;
	drugConcentrationUm: number;
	absorbance: number;
	viability: number;
}

export interface SterilityState {
	hoodSurfaceSterile: boolean;
	contaminationRisk: number;
	cleanlinessErrors: number;
}

export interface LabState {
	sterility: SterilityState;
	vessels: Record<string, VesselState>;
	wellPlate: WellData[];
	cellsTransferred: boolean;
	drugsAdded: boolean;
	incubated: boolean;
	plateReadComplete: boolean;
	mediaWarmed: boolean;
	actualCellCount: number;
	cellViability: number;
	mediaWastedMl: number;
}

// --- UI state: purely presentational ---

export interface UIState {
	activeScene: SceneId;
	selectedToolId: ToolId | null;
	isDragging: boolean;
	dragItemId: string | null;
	openModal: string | null;
	pipetteVolumeMl: number;
}

// --- Combined game state ---

export interface GameState {
	protocol: ProtocolState;
	lab: LabState;
	ui: UIState;
	startTime: number;
	endTime: number | null;
}

// ============================================
// Scoring types
// ============================================

export interface ScoreCategory {
	points: number;
	maxPoints: number;
	feedback: string;
}

export interface ScoreResult {
	stars: number;
	totalPoints: number;
	categories: {
		order: ScoreCategory;
		cleanliness: ScoreCategory;
		wastedMedia: ScoreCategory;
		timing: ScoreCategory;
	};
}

// ============================================
// Scene layout types - modular artwork with variable aspect ratios
// ============================================

export interface AssetSpec {
	id: AssetId;
	viewBox: { width: number; height: number };
	preserveAspectRatio?: string;
	anchors?: Record<string, { x: number; y: number }>;
}

export interface ScenePlacement {
	assetId: AssetId;
	x: number;
	y: number;
	width: number;
	height: number;
	zIndex: number;
}

export interface SceneDefinition {
	id: SceneId;
	viewBox: { width: number; height: number };
	placements: ScenePlacement[];
}

// ============================================
// Tool definition for registries
// ============================================

export interface ToolDefinition {
	id: ToolId;
	label: string;
	iconAssetId: AssetId;
	validTargets: Array<VesselId | ReagentId>;
}

// ============================================
// Game configuration constants
// ============================================

export interface GameConfig {
	plateRows: number;
	plateCols: number;
	drugConcentrationsUm: number[];
	drugConcentrationLabels: string[];
	flaskMaxVolumeMl: number;
	flaskStartingMediaMl: number;
	freshMediaTargetMl: number;
	wellVolumeUl: number;
	drugStockConcentrationUm: number;
	initialCellCount: number;
	initialViability: number;
	initialConfluency: number;
	targetStars: number;
	scoreWeights: {
		order: number;
		cleanliness: number;
		wastedMedia: number;
		timing: number;
	};
	starThresholds: {
		threeStar: number;
		twoStar: number;
	};
}
