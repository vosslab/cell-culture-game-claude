// ============================================
// content/tc_scenes.ts - Scene layout definitions for the tissue culture game
// ============================================
// Each scene defines a viewBox and the placement of assets within it.
// Hood placements mirror the positions from parts/constants.ts HOOD_ITEMS.

import type { SceneDefinition } from "../core/types";

// ============================================
// Hood scene - biosafety cabinet with all lab items
// viewBox matches the SVG background in svg_assets.ts (800x600)
// ============================================

const HOOD_SCENE: SceneDefinition = {
	id: "hood",
	viewBox: { width: 800, height: 600 },
	placements: [
		// Vessels and reagent containers
		{ assetId: "flask", x: 30, y: 22, width: 16, height: 28, zIndex: 10 },
		{ assetId: "well_plate", x: 10, y: 52, width: 35, height: 18, zIndex: 10 },
		{ assetId: "media_bottle", x: 8, y: 15, width: 12, height: 26, zIndex: 10 },
		// Pipettes sit above other items (higher zIndex for drag layering)
		{ assetId: "aspirating_pipette", x: 72, y: 10, width: 5, height: 32, zIndex: 20 },
		{ assetId: "serological_pipette", x: 64, y: 10, width: 4, height: 32, zIndex: 20 },
		// Waste, drugs, and other equipment
		{ assetId: "waste_container", x: 82, y: 42, width: 12, height: 18, zIndex: 10 },
		{ assetId: "drug_vials", x: 52, y: 25, width: 14, height: 18, zIndex: 10 },
		{ assetId: "multichannel_pipette", x: 78, y: 28, width: 10, height: 22, zIndex: 20 },
		{ assetId: "ethanol_bottle", x: 88, y: 10, width: 8, height: 18, zIndex: 10 },
		{ assetId: "microscope", x: 82, y: 52, width: 12, height: 22, zIndex: 10 },
	],
};

// ============================================
// Microscope scene - hemocytometer grid for cell counting
// ============================================

const MICROSCOPE_SCENE: SceneDefinition = {
	id: "microscope",
	viewBox: { width: 400, height: 300 },
	placements: [
		{ assetId: "hemocytometer_grid", x: 10, y: 10, width: 80, height: 80, zIndex: 10 },
	],
};

// ============================================
// Incubator scene - chamber for plate incubation
// ============================================

const INCUBATOR_SCENE: SceneDefinition = {
	id: "incubator",
	viewBox: { width: 400, height: 300 },
	placements: [
		{ assetId: "incubator_chamber", x: 10, y: 10, width: 80, height: 80, zIndex: 10 },
	],
};

// ============================================
// Plate reader scene - instrument display for absorbance readings
// ============================================

const PLATE_READER_SCENE: SceneDefinition = {
	id: "plate_reader",
	viewBox: { width: 400, height: 300 },
	placements: [
		{ assetId: "plate_reader_display", x: 10, y: 10, width: 80, height: 80, zIndex: 10 },
	],
};

// ============================================
// Exported array of all scene definitions
// ============================================

export const TC_SCENES: SceneDefinition[] = [
	HOOD_SCENE,
	MICROSCOPE_SCENE,
	INCUBATOR_SCENE,
	PLATE_READER_SCENE,
];
