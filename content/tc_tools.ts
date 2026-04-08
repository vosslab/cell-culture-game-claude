// ============================================
// content/tc_tools.ts - Tool registry for tissue culture protocol
// ============================================

import type { ToolDefinition } from "../core/types";

// ============================================
// TC_TOOLS - available pipette tools and their valid drop targets
// ============================================

export const TC_TOOLS: ToolDefinition[] = [
	{
		id: "tc.aspirating_pipette",
		label: "Aspirating Pipette",
		iconAssetId: "",
		validTargets: ["tc.flask", "tc.waste_container"],
	},
	{
		id: "tc.serological_pipette",
		label: "Serological Pipette",
		iconAssetId: "",
		validTargets: ["tc.flask", "tc.media_bottle", "tc.well_plate"],
	},
	{
		id: "tc.multichannel_pipette",
		label: "Multichannel Pipette",
		iconAssetId: "",
		validTargets: ["tc.well_plate"],
	},
];
