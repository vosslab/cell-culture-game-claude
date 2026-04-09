// ============================================
// asset_specs.ts - Per-asset visual metrics for the layout engine
// ============================================
// defaultWidth = baseline width in scene %
// labelWidth = estimated label rendering width in %
// anchorYOffset = tip adjustment for pipettes (% points)
// aspectRatio is derived from SVG viewBox at runtime, not hardcoded here

const ASSET_SPECS: Record<string, AssetSpec> = {
	flask:                { defaultWidth: 12, labelWidth: 6,  },
	well_plate:           { defaultWidth: 14, labelWidth: 8,  },
	media_bottle:         { defaultWidth: 8,  labelWidth: 5,  },
	trypsin_bottle:       { defaultWidth: 7,  labelWidth: 5,  },
	ethanol_bottle:       { defaultWidth: 5,  labelWidth: 5,  },
	serological_pipette:  { defaultWidth: 3,  labelWidth: 6,  anchorYOffset: 0 },
	aspirating_pipette:   { defaultWidth: 3,  labelWidth: 6,  anchorYOffset: 0 },
	multichannel_pipette: { defaultWidth: 5,  labelWidth: 6,  anchorYOffset: 0 },
	drug_vials:           { defaultWidth: 14, labelWidth: 8,  },
	waste_container:      { defaultWidth: 7,  labelWidth: 5,  },
	microscope:           { defaultWidth: 8,  labelWidth: 7,  },
	incubator:            { defaultWidth: 10, labelWidth: 6,  },
};
