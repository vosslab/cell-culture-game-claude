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

		<!-- Subtle shadow on pad for depth -->
		<ellipse cx="400" cy="569" rx="320" ry="6" fill="#000000" opacity="0.1" />

		<!-- Side walls (3D effect) -->
		<polygon points="0,100 50,50 50,550 0,550" fill="#666666" />
		<polygon points="750,50 800,100 800,550 750,550" fill="#777777" />

		<!-- Subtle shadow at bottom for depth -->
		<rect x="40" y="545" width="720" height="8" fill="#000000" opacity="0.08" />
	</svg>`;
}

/**
 * Gets the T-75 tissue culture flask SVG (Hybrid C: base + overlays)
 * @param mediaLevel - fill level from 0 to 1
 * @param mediaColor - color of media: 'old' (yellow-orange) or 'fresh' (pink-orange)
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
 * Gets the serological pipette SVG (Hybrid C: base only, static)
 */
function getSeroPipetteSvg(): string {
	return SVG_SERO_PIPETTE;
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
	// well positions match base SVG: cx = 22 + col*28, cy = 18 + row*26
	const spacingX = 28;
	const spacingY = 26;
	const offsetX = 22;
	const offsetY = 18;
	const wellR = 10;
	let overlayContent = '';
	// inject colored circles on top of base SVG empty wells
	for (let row = 0; row < PLATE_ROWS; row++) {
		for (let col = 0; col < PLATE_COLS; col++) {
			const cx = offsetX + col * spacingX;
			const cy = offsetY + row * spacingY;
			const well = wells[row * PLATE_COLS + col];
			let fill = '';
			if (well.hasCells && well.drugConcentrationUm > 0) {
				// deeper purple for higher drug concentration
				const intensity = Math.min(1, well.drugConcentrationUm / 10);
				const r = Math.round(200 - intensity * 60);
				const g = Math.round(180 - intensity * 80);
				const b = Math.round(220 - intensity * 20);
				fill = 'rgb(' + r + ',' + g + ',' + b + ')';
			} else if (well.hasCells) {
				fill = '#f0a0b0'; // pink = cells + media
			}
			if (fill) {
				overlayContent += '<circle cx="' + cx + '" cy="' + cy + '" r="' + wellR + '"'
					+ ' fill="' + fill + '" opacity="0.9"/>';
			}
		}
	}
	// concentration labels at bottom (engine-owned since they use game constants)
	for (let col = 0; col < PLATE_COLS; col++) {
		const cx = offsetX + col * spacingX;
		overlayContent += '<text x="' + cx + '" y="125" font-family="Arial,sans-serif"'
			+ ' font-size="5" fill="#999999" text-anchor="middle">' + DRUG_CONCENTRATION_LABELS[col] + '</text>';
	}
	return composeSvg(SVG_WELL_PLATE_24, "well_plate_24", [overlayContent]);
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
