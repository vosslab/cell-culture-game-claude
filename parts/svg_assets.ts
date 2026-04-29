// ============================================
// svg_assets.ts - SVG templates for all game assets
// ============================================

// Base SVG constants injected by build_game.sh from assets/equipment/
declare const SVG_T75_FLASK: string;
declare const SVG_MEDIA_BOTTLE: string;
declare const SVG_SERO_PIPETTE: string;
declare const SVG_WELL_PLATE_24: string;
declare const SVG_ASPIRATING_PIPETTE: string;
declare const SVG_WASTE_CONTAINER: string;
declare const SVG_ETHANOL_SPRAY: string;
declare const SVG_DRUG_VIAL_RACK: string;
declare const SVG_MULTICHANNEL_PIPETTE: string;
declare const SVG_MICROSCOPE: string;
declare const SVG_INCUBATOR: string;
declare const SVG_PLATE_READER: string;
declare const SVG_CONICAL_15ML_RACK: string;
declare const SVG_DILUTION_TUBE_RACK: string;
declare const SVG_BIOHAZARD_DECANT: string;
declare const SVG_MICROPIPETTE_RACK: string;
declare const SVG_CENTRIFUGE: string;
declare const SVG_WATER_BATH: string;
declare const SVG_VORTEX: string;
declare const SVG_CELL_COUNTER: string;
declare const SVG_ANGRY_PROFESSOR: string;
declare const SVG_TIP_BOX: string;
declare const SVG_GLOVE_BOX: string;
declare const SVG_WASTE_TRAY: string;

// Legacy: cell-culture2.svg artwork (fallback, will be removed)
declare const CELL_CULTURE_PLATE_SVG: string;

/**
 * Gets the hood background SVG - the tissue culture hood/biosafety cabinet interior
 */
function getHoodBackgroundSvg(): string {
	return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
		<!-- Define gradients -->
		<defs>
			<linearGradient id="stainlessSteelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:#e8e8e8;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#c0c0c0;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#a0a0a0;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color:#b0d4ff;stop-opacity:0.4" />
				<stop offset="100%" style="stop-color:#7cb3ff;stop-opacity:0.3" />
			</linearGradient>
			<linearGradient id="padGrad" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color:#4a90e2;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#2563d4;stop-opacity:1" />
			</linearGradient>
		</defs>

		<!-- Side walls (dark gray) -->
		<polygon points="0,100 50,50 750,50 800,100 800,550 750,600 50,600 0,550" fill="#888888" />

		<!-- Back wall (stainless steel) -->
		<polygon points="50,50 750,50 750,350 50,350" fill="url(#stainlessSteelGrad)" />

		<!-- Glass sash at top (semi-transparent) -->
		<polygon points="60,60 740,60 740,200 60,200" fill="url(#glassGrad)" stroke="#999" stroke-width="2" />

		<!-- Subtle horizontal line on glass (reflection effect) -->
		<line x1="60" y1="90" x2="740" y2="90" stroke="#ffffff" stroke-width="1" opacity="0.6" />

		<!-- Lower back wall continues -->
		<polygon points="50,350 750,350 750,550 50,550" fill="#999999" />

		<!-- Work surface (white/light gray trapezoid for perspective) -->
		<polygon points="40,550 60,580 740,580 760,550" fill="#f5f5f5" stroke="#ddd" stroke-width="1" />

		<!-- Blue absorbent pad on work surface -->
		<rect x="70" y="560" width="660" height="18" fill="url(#padGrad)" rx="2" />

		<!-- pad detail line -->
		<line x1="70" y1="578" x2="730" y2="578" stroke="#ccc" stroke-width="0.5" />

		<!-- Side walls (3D effect) -->
		<polygon points="0,100 50,50 50,550 0,550" fill="#666666" />
		<polygon points="750,50 800,100 800,550 750,550" fill="#777777" />

		<!-- Bottom edge line -->
		<line x1="40" y1="550" x2="760" y2="550" stroke="#ccc" stroke-width="1" />
	</svg>`;
}

/**
 * Gets the T-75 tissue culture flask SVG (Hybrid C: base + overlays)
 * @param mediaLevel - fill level from 0 to 1
 * @param mediaColor - color of media: 'old' (yellow-orange) or 'fresh' (pink-orange)
 *
 * OQ-5 decided 2026-04-29: Using t75_flask_v5.svg (Servier culture-flask-filled-lid).
 * Features: professional Servier bioicon with 3D perspective, multiple color regions, detailed cap.
 * SVG anchors for liquid, label, and overlay regions added.
 */
function getFlaskSvg(mediaLevel: number, mediaColor: string): string {
	// map old color convention to typed ColorRole
	const colorRole: ColorRole = mediaColor === '#e6a840' ? "waste" : "media";
	// determine label text based on media state
	let labelText = "";
	if (mediaLevel > 0 && colorRole === "waste") {
		labelText = "Old Media";
	} else if (mediaLevel > 0 && colorRole === "media") {
		labelText = "DMEM";
	}
	// build overlays
	const overlays: string[] = [
		createLiquidOverlay("t75_flask", mediaLevel, colorRole, SVG_T75_FLASK),
		createDynamicLabel("t75_flask", labelText, SVG_T75_FLASK),
	];
	return composeSvg(SVG_T75_FLASK, "t75_flask", overlays);
}

/**
 * Gets the DMEM media bottle SVG (Hybrid C: base + overlays)
 */
function getMediaBottleSvg(): string {
	// media bottle always appears full with DMEM label
	const overlays: string[] = [
		createLiquidOverlay("media_bottle", 0.75, "media", SVG_MEDIA_BOTTLE),
		createDynamicLabel("media_bottle", "DMEM", SVG_MEDIA_BOTTLE),
	];
	return composeSvg(SVG_MEDIA_BOTTLE, "media_bottle", overlays);
}

/**
 * Gets the serological pipette SVG with optional liquid fill overlay
 * @param volumeMl - volume of liquid in milliliters (default 0 = empty)
 * @param color - hex color code for liquid (default null = no overlay)
 */
function getSeroPipetteSvg(volumeMl: number = 0, color: string | null = null): string {
	if (volumeMl <= 0 || !color) {
		return SVG_SERO_PIPETTE;
	}
	const overlays: string[] = [
		createPipetteLiquidOverlay("sero_pipette", volumeMl, 10, color, SVG_SERO_PIPETTE),
	];
	return composeSvg(SVG_SERO_PIPETTE, "sero_pipette", overlays);
}

// getPipetteAidSvg removed: function was unused (not in HOOD_ITEMS)

/**
 * Gets the aspirating pipette (Pasteur-style) SVG (Hybrid C: base only, static)
 */
function getAspiratingPipetteSvg(): string {
	return SVG_ASPIRATING_PIPETTE;
}


/**
 * Gets the waste container SVG (Hybrid C: base + waste liquid overlay)
 */
function getWasteContainerSvg(): string {
	// waste container shows low fill level of waste liquid
	const overlays: string[] = [
		createLiquidOverlay("waste_container", 0.3, "waste", SVG_WASTE_CONTAINER),
		createDynamicLabel("waste_container", "Waste", SVG_WASTE_CONTAINER),
	];
	return composeSvg(SVG_WASTE_CONTAINER, "waste_container", overlays);
}

// ============================================
/**
 * Gets the trypsin-EDTA bottle SVG (reuses media bottle base with different label/color)
 */
function getTrypsinBottleSvg(): string {
	const overlays: string[] = [
		createLiquidOverlay("media_bottle", 0.6, "buffer", SVG_MEDIA_BOTTLE),
		createDynamicLabel("media_bottle", "Trypsin", SVG_MEDIA_BOTTLE),
	];
	return composeSvg(SVG_MEDIA_BOTTLE, "trypsin_bottle", overlays);
}

// ============================================
/**
 * Gets the ethanol spray bottle SVG (Hybrid C: base + ethanol liquid overlay)
 */
function getEthanolBottleSvg(): string {
	// ethanol spray always appears mostly full
	const overlays: string[] = [
		createLiquidOverlay("ethanol_spray", 0.7, "ethanol", SVG_ETHANOL_SPRAY),
		createDynamicLabel("ethanol_spray", "70% EtOH", SVG_ETHANOL_SPRAY),
	];
	return composeSvg(SVG_ETHANOL_SPRAY, "ethanol_spray", overlays);
}

// ============================================
/**
 * Gets the 24-well plate SVG (Hybrid C: base + per-well color overlays)
 */
function getWellPlateSvg(wells: WellData[]): string {
	// Render 8x12 well plate grid
	// viewBox="0 0 320 240" with 10 px per well + padding for labels
	const wellSize = 10;
	const spacingX = 12;
	const spacingY = 12;
	const marginLeft = 25;
	const marginTop = 20;

	let svgContent = '<svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg">';
	svgContent += '<defs>';
	svgContent += '<linearGradient id="well_gradient_carb" x1="0%" y1="0%" x2="100%" y2="100%">';
	svgContent += '<stop offset="0%" style="stop-color:#f5e6c8;stop-opacity:1" />';
	svgContent += '<stop offset="100%" style="stop-color:#8a4fa0;stop-opacity:1" />';
	svgContent += '</linearGradient>';
	svgContent += '</defs>';

	// White background
	svgContent += '<rect width="320" height="240" fill="white" />';

	// Row labels (A-H) on the left
	for (let row = 0; row < PLATE_96_ROWS; row++) {
		const y = marginTop + row * spacingY + wellSize / 2;
		svgContent += '<text x="8" y="' + (y + 2) + '" font-family="Arial,sans-serif"'
			+ ' font-size="7" fill="#333333" text-anchor="middle">' + ROW_LABELS[row] + '</text>';
	}

	// Column labels (1-12) on top
	for (let col = 0; col < PLATE_96_COLS; col++) {
		const x = marginLeft + col * spacingX + wellSize / 2;
		svgContent += '<text x="' + x + '" y="12" font-family="Arial,sans-serif"'
			+ ' font-size="6" fill="#333333" text-anchor="middle">' + COL_LABELS[col] + '</text>';
	}

	// Draw wells as small squares with color coding
	for (let row = 0; row < PLATE_96_ROWS; row++) {
		for (let col = 0; col < PLATE_96_COLS; col++) {
			const x = marginLeft + col * spacingY;
			const y = marginTop + row * spacingY;
			const well = wells[row * PLATE_96_COLS + col];

			let fill = '#eaeaea'; // default empty grey

			if (well.hasCells) {
				if (well.absorbance > 0) {
					// Gradient from tan (blank ~0.05) to purple (high ~1.2)
					// Map absorbance to 0-1 range for gradient interpolation
					const absorbanceMin = 0.05;
					const absorbanceMax = 1.2;
					const normalizedAbs = Math.max(0, Math.min(1, (well.absorbance - absorbanceMin) / (absorbanceMax - absorbanceMin)));
					// Interpolate between tan (#f5e6c8) and purple (#8a4fa0)
					const tanR = 245, tanG = 230, tanB = 200;
					const purpleR = 138, purpleG = 79, purpleB = 160;
					const r = Math.round(tanR + normalizedAbs * (purpleR - tanR));
					const g = Math.round(tanG + normalizedAbs * (purpleG - tanG));
					const b = Math.round(tanB + normalizedAbs * (purpleB - tanB));
					fill = 'rgb(' + r + ',' + g + ',' + b + ')';
				} else {
					// Cells present but not yet read; use tan
					fill = '#f5e6c8';
				}
			}

			svgContent += '<rect x="' + x + '" y="' + y + '" width="' + wellSize + '" height="' + wellSize + '"'
				+ ' fill="' + fill + '" stroke="#ccc" stroke-width="0.5" />';
		}
	}

	svgContent += '</svg>';
	return svgContent;
}

// ============================================
/**
 * Gets the drug vials rack SVG (Hybrid C: base + per-vial color overlays)
 */
function getDrugVialsSvg(): string {
	// vial positions match base SVG: cx = 12 + i*18 for i=0..5
	let overlayContent = '';
	for (let i = 0; i < 6; i++) {
		const cx = 12 + i * 18;
		const intensity = i / 5;
		const r = Math.round(220 - intensity * 80);
		const g = Math.round(220 - intensity * 100);
		const b = Math.round(240 - intensity * 20);
		const fillColor = 'rgb(' + r + ',' + g + ',' + b + ')';
		// vial body (extends above rack top edge at y=15)
		overlayContent += '<rect x="' + (cx - 5) + '" y="5" width="10" height="45" rx="2"'
			+ ' fill="' + fillColor + '" stroke="#999999" stroke-width="0.5"/>';
		// vial cap
		overlayContent += '<rect x="' + (cx - 5) + '" y="2" width="10" height="5" rx="1"'
			+ ' fill="#888888"/>';
		// concentration label below rack
		overlayContent += '<text x="' + cx + '" y="57" font-family="Arial,sans-serif"'
			+ ' font-size="5" fill="#666666" text-anchor="middle">' + DRUG_CONCENTRATION_LABELS[i] + '</text>';
	}
	// stock concentration header
	overlayContent += '<text x="60" y="12" font-family="Arial,sans-serif"'
		+ ' font-size="5" fill="#555555" text-anchor="middle">(' + DRUG_STOCK_CONCENTRATION_UM + ' uM)</text>';
	return composeSvg(SVG_DRUG_VIAL_RACK, "drug_vial_rack", [overlayContent]);
}

// ============================================
/**
 * Gets the multichannel pipette SVG (Hybrid C: base only, static)
 */
function getMultichannelPipetteSvg(): string {
	return SVG_MULTICHANNEL_PIPETTE;
}

// ============================================
/**
 * Gets the microscope SVG (Hybrid C: base only, static)
 */
function getMicroscopeSvg(): string {
	return SVG_MICROSCOPE;
}

// ============================================
/**
 * Gets the incubator SVG (Hybrid C: base only, static)
 */
function getIncubatorSvg(): string {
	return SVG_INCUBATOR;
}

function getPlateReaderSvg(): string {
	return SVG_PLATE_READER;
}

// ============================================
/**
 * Gets the sterile water bottle SVG (reuses media bottle base with different label/color)
 */
function getSterileWaterSvg(): string {
	const overlays: string[] = [
		createLiquidOverlay("media_bottle", 0.75, "buffer", SVG_MEDIA_BOTTLE),
		createDynamicLabel("media_bottle", "H2O", SVG_MEDIA_BOTTLE),
	];
	return composeSvg(SVG_MEDIA_BOTTLE, "sterile_water", overlays);
}

// ============================================
/**
 * Gets the PBS bottle SVG (reuses media bottle base with different label/color)
 */
function getPbsBottleSvg(): string {
	const overlays: string[] = [
		createLiquidOverlay("media_bottle", 0.75, "buffer", SVG_MEDIA_BOTTLE),
		createDynamicLabel("media_bottle", "1x PBS", SVG_MEDIA_BOTTLE),
	];
	return composeSvg(SVG_MEDIA_BOTTLE, "pbs_bottle", overlays);
}

// ============================================
/**
 * Gets the 15 mL conical tube rack SVG (hand-drawn, static)
 */
function getConical15mlRackSvg(): string {
	return SVG_CONICAL_15ML_RACK;
}

// ============================================
/**
 * Gets the 1.5 mL dilution tube rack SVG (hand-drawn, static)
 */
function getDilutionTubeRackSvg(): string {
	return SVG_DILUTION_TUBE_RACK;
}

// ============================================
/**
 * Gets the MTT vial SVG (reuses media bottle base with different label/color)
 */
function getMttVialSvg(): string {
	const overlays: string[] = [
		createLiquidOverlay("media_bottle", 0.60, "drug", SVG_MEDIA_BOTTLE),
		createDynamicLabel("media_bottle", "MTT", SVG_MEDIA_BOTTLE),
	];
	return composeSvg(SVG_MEDIA_BOTTLE, "mtt_vial", overlays);
}

// ============================================
/**
 * Gets the DMSO bottle SVG (reuses media bottle base with different label/color)
 */
function getDmsoBottleSvg(): string {
	const overlays: string[] = [
		createLiquidOverlay("media_bottle", 0.70, "buffer", SVG_MEDIA_BOTTLE),
		createDynamicLabel("media_bottle", "DMSO", SVG_MEDIA_BOTTLE),
	];
	return composeSvg(SVG_MEDIA_BOTTLE, "dmso_bottle", overlays);
}

// ============================================
/**
 * Gets the carboplatin stock bottle SVG (reuses media bottle base with different label/color)
 */
function getCarboplatinStockSvg(): string {
	const overlays: string[] = [
		createLiquidOverlay("media_bottle", 0.60, "drug", SVG_MEDIA_BOTTLE),
		createDynamicLabel("media_bottle", "Carboplatin", SVG_MEDIA_BOTTLE),
	];
	return composeSvg(SVG_MEDIA_BOTTLE, "carboplatin_stock", overlays);
}

// ============================================
/**
 * Gets the metformin stock bottle SVG (reuses media bottle base with different label/color)
 */
function getMetforminStockSvg(): string {
	const overlays: string[] = [
		createLiquidOverlay("media_bottle", 0.60, "drug", SVG_MEDIA_BOTTLE),
		createDynamicLabel("media_bottle", "Metformin", SVG_MEDIA_BOTTLE),
	];
	return composeSvg(SVG_MEDIA_BOTTLE, "metformin_stock", overlays);
}

// ============================================
/**
 * Gets the micropipette rack SVG (hand-drawn, static)
 */
function getMicropipetteRackSvg(): string {
	return SVG_MICROPIPETTE_RACK;
}

// ============================================
/**
 * Gets the biohazard decant bin SVG (hand-drawn, static)
 */
function getBiohazardDecanSvg(): string {
	return SVG_BIOHAZARD_DECANT;
}

// ============================================
/**
 * Gets the benchtop centrifuge SVG (hand-drawn, static)
 */
function getCentrifugeSvg(): string {
	return SVG_CENTRIFUGE;
}

// ============================================
/**
 * Gets the 37C water bath SVG (hand-drawn, static)
 */
function getWaterBathSvg(): string {
	return SVG_WATER_BATH;
}

// ============================================
/**
 * Gets the vortex mixer SVG (hand-drawn, static)
 */
function getVortexSvg(): string {
	return SVG_VORTEX;
}

// ============================================
/**
 * Gets the benchtop cell counter SVG (hand-drawn, static)
 */
function getCellCounterSvg(): string {
	return SVG_CELL_COUNTER;
}

// ============================================
/**
 * Gets the angry professor character SVG (coach card)
 */
function getAngryProfessorSvg(): string {
	return SVG_ANGRY_PROFESSOR;
}

// ============================================
/**
 * Gets the tip box SVG (decoration)
 */
function getTipBoxSvg(): string {
	return SVG_TIP_BOX;
}

// ============================================
/**
 * Gets the glove box SVG (decoration)
 */
function getGloveBoxSvg(): string {
	return SVG_GLOVE_BOX;
}

// ============================================
/**
 * Gets the waste tray SVG (decoration)
 */
function getWasteTraySvg(): string {
	return SVG_WASTE_TRAY;
}
