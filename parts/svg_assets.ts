// ============================================
// svg_assets.ts - SVG templates for all game assets
// ============================================

// Cell culture plate artwork loaded from cell-culture2.svg
// This constant is injected by the build script
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
 * Gets the T-75 tissue culture flask SVG
 * @param mediaLevel - fill level from 0 to 1
 * @param mediaColor - color of media: 'old' (yellow-orange) or 'fresh' (pink-orange)
 */
function getFlaskSvg(mediaLevel: number, mediaColor: string): string {
	// Use the cell-culture2.svg artwork for the plate
	return CELL_CULTURE_PLATE_SVG;
}

/**
 * Gets the DMEM media bottle SVG
 */
function getMediaBottleSvg(): string {
	return `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="bottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#fff0f0;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#fff0f0;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="mediaLiquidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#ffb366;stop-opacity:0.9" />
				<stop offset="50%" style="stop-color:#ff9a66;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#ffb366;stop-opacity:0.9" />
			</linearGradient>
			<linearGradient id="capBottleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color:#4a4a4a;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#2a2a2a;stop-opacity:1" />
			</linearGradient>
		</defs>

		<!-- Screw cap -->
		<rect x="28" y="8" width="24" height="10" fill="url(#capBottleGrad)" stroke="#1a1a1a" stroke-width="0.5" rx="1" />
		<line x1="32" y1="13" x2="48" y2="13" stroke="#666" stroke-width="0.3" />
		<line x1="32" y1="16" x2="48" y2="16" stroke="#666" stroke-width="0.3" />

		<!-- Neck -->
		<path d="M 32 18 L 30 28 L 50 28 L 48 18 Z" fill="url(#bottleGrad)" stroke="#ddd" stroke-width="0.5" />

		<!-- Main bottle body (cylindrical) -->
		<rect x="20" y="28" width="40" height="60" fill="url(#bottleGrad)" stroke="#ddd" stroke-width="0.5" rx="3" />

		<!-- Liquid inside -->
		<path d="M 22 55 L 22 85 Q 22 88 24 89 L 56 89 Q 58 88 58 85 L 58 55 Z"
			fill="url(#mediaLiquidGrad)" opacity="0.85" />

		<!-- Liquid surface -->
		<ellipse cx="40" cy="55" rx="18" ry="2.5" fill="#ff9a66" opacity="0.6" />

		<!-- Label area -->
		<rect x="24" y="45" width="32" height="20" fill="#ffffff" opacity="0.8" stroke="#ccc" stroke-width="0.5" rx="1" />
		<text x="40" y="53" font-family="Arial, sans-serif" font-size="7" fill="#333333" text-anchor="middle" font-weight="bold">DMEM</text>
		<text x="40" y="61" font-family="Arial, sans-serif" font-size="5" fill="#666666" text-anchor="middle">Media</text>

		<!-- Shine on bottle -->
		<ellipse cx="26" cy="50" rx="3" ry="15" fill="#ffffff" opacity="0.5" />

		<!-- Bottom label bar (orange) -->
		<rect x="20" y="88" width="40" height="4" fill="#ff9a66" />
	</svg>`;
}

/**
 * Gets the serological pipette SVG
 */
function getSeroPipetteSvg(): string {
	return `<svg viewBox="0 0 20 150" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="pipetteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#fff5f5;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#fff5f5;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="cottonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#f0e0d0;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#f5ead8;stop-opacity:1" />
			</linearGradient>
		</defs>

		<!-- Graduated tube (main body) -->
		<rect x="6" y="15" width="8" height="100" fill="url(#pipetteGrad)" stroke="#999" stroke-width="0.5" rx="1" />

		<!-- Cotton plug at top -->
		<rect x="4" y="8" width="12" height="8" fill="url(#cottonGrad)" stroke="#ddd" stroke-width="0.3" rx="1" />
		<circle cx="10" cy="8" r="3" fill="#e8d4c0" opacity="0.6" />

		<!-- Graduation marks (every 2mm = 10% of tube) -->
		<line x1="4" y1="25" x2="16" y2="25" stroke="#999" stroke-width="0.3" opacity="0.6" />
		<line x1="4" y1="40" x2="16" y2="40" stroke="#999" stroke-width="0.3" opacity="0.6" />
		<line x1="4" y1="55" x2="16" y2="55" stroke="#999" stroke-width="0.3" opacity="0.6" />
		<line x1="4" y1="70" x2="16" y2="70" stroke="#999" stroke-width="0.3" opacity="0.6" />
		<line x1="4" y1="85" x2="16" y2="85" stroke="#999" stroke-width="0.3" opacity="0.6" />

		<!-- Finer graduation marks -->
		<line x1="6" y1="32" x2="14" y2="32" stroke="#ccc" stroke-width="0.2" opacity="0.4" />
		<line x1="6" y1="47" x2="14" y2="47" stroke="#ccc" stroke-width="0.2" opacity="0.4" />
		<line x1="6" y1="62" x2="14" y2="62" stroke="#ccc" stroke-width="0.2" opacity="0.4" />
		<line x1="6" y1="77" x2="14" y2="77" stroke="#ccc" stroke-width="0.2" opacity="0.4" />

		<!-- Pointed tip at bottom -->
		<path d="M 6 115 L 10 135 L 14 115 Z" fill="#cccccc" stroke="#999" stroke-width="0.3" />

		<!-- Slight shine on tube -->
		<rect x="7" y="20" width="2" height="90" fill="#ffffff" opacity="0.4" />
	</svg>`;
}

/**
 * Gets the pipette aid (motorized pipette controller) SVG
 */
function getPipetteAidSvg(): string {
	return `<svg viewBox="0 0 40 90" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="pipeAidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#4a90e2;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#357abd;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#2563a3;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="triggerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#6ba3e5;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#4a90e2;stop-opacity:1" />
			</linearGradient>
		</defs>

		<!-- Main body (blue plastic) -->
		<rect x="8" y="5" width="24" height="50" fill="url(#pipeAidGrad)" stroke="#2563a3" stroke-width="0.5" rx="3" />

		<!-- Trigger/grip -->
		<path d="M 8 30 L 5 40 L 5 50 Q 5 55 8 55 L 8 30 Z" fill="url(#triggerGrad)" stroke="#2563a3" stroke-width="0.5" rx="2" />

		<!-- Top push buttons (light gray) -->
		<circle cx="16" cy="12" r="2.5" fill="#cccccc" stroke="#999" stroke-width="0.3" />
		<circle cx="24" cy="12" r="2.5" fill="#cccccc" stroke="#999" stroke-width="0.3" />

		<!-- Window/display area -->
		<rect x="10" y="25" width="20" height="8" fill="#1a3a6a" stroke="#999" stroke-width="0.4" rx="1" />
		<text x="20" y="30" font-family="Arial, sans-serif" font-size="4" fill="#4a90e2" text-anchor="middle">P200</text>

		<!-- Ejector button at bottom -->
		<circle cx="20" cy="68" r="3" fill="#cccccc" stroke="#999" stroke-width="0.3" />

		<!-- Connection point for pipette (bottom opening) -->
		<rect x="16" y="75" width="8" height="8" fill="#555555" stroke="#333" stroke-width="0.3" rx="1" />

		<!-- Shade/highlight -->
		<ellipse cx="15" cy="20" rx="4" ry="8" fill="#ffffff" opacity="0.2" />
	</svg>`;
}

/**
 * Gets the aspirating pipette (Pasteur-style) SVG
 */
function getAspiratingPipetteSvg(): string {
	return `<svg viewBox="0 0 25 140" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="pasteurGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#fff8f8;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#fff8f8;stop-opacity:1" />
			</linearGradient>
		</defs>

		<!-- Rubber bulb at top -->
		<ellipse cx="12.5" cy="12" rx="6" ry="8" fill="#ffcccc" stroke="#ff9999" stroke-width="0.4" />

		<!-- Thin glass tube -->
		<line x1="10" y1="20" x2="10" y2="120" stroke="#999" stroke-width="0.8" />
		<line x1="15" y1="20" x2="15" y2="120" stroke="#999" stroke-width="0.8" />
		<rect x="10" y="20" width="5" height="100" fill="url(#pasteurGrad)" opacity="0.3" />

		<!-- Tubing connection at top -->
		<rect x="9" y="18" width="7" height="4" fill="#dd6666" stroke="#bb3333" stroke-width="0.3" rx="1" />

		<!-- Narrow tip at bottom -->
		<path d="M 10 120 L 12.5 135 L 15 120 Z" fill="#cccccc" stroke="#999" stroke-width="0.3" />

		<!-- Highlight on glass -->
		<line x1="11" y1="25" x2="11" y2="115" stroke="#ffffff" stroke-width="0.3" opacity="0.6" />
	</svg>`;
}

/**
 * Gets the waste container SVG
 */
function getWasteContainerSvg(): string {
	return `<svg viewBox="0 0 70 90" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="wasteBottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#f0f0f0;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#f0f0f0;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="wasteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#d4d4a5;stop-opacity:0.8" />
				<stop offset="50%" style="stop-color:#e8e8c0;stop-opacity:0.9" />
				<stop offset="100%" style="stop-color:#d4d4a5;stop-opacity:0.8" />
			</linearGradient>
		</defs>

		<!-- Erlenmeyer-style bottle -->
		<path d="M 20 15 L 18 30 L 15 55 Q 15 65 20 68 L 50 68 Q 55 65 55 55 L 52 30 L 50 15 Z"
			fill="url(#wasteBottleGrad)" stroke="#ccc" stroke-width="0.5" />

		<!-- Waste liquid inside -->
		<path d="M 17 45 L 17 55 Q 17 63 22 66 L 48 66 Q 53 63 53 55 L 53 45 Z"
			fill="url(#wasteGrad)" opacity="0.7" />

		<!-- Side arm connection port (small tube outlet) -->
		<circle cx="58" cy="30" r="2" fill="#999" stroke="#666" stroke-width="0.3" />
		<path d="M 55 30 Q 57 28 62 26" stroke="#888" stroke-width="1" fill="none" stroke-linecap="round" />

		<!-- Label area -->
		<rect x="22" y="50" width="26" height="10" fill="#ffffff" opacity="0.7" stroke="#ddd" stroke-width="0.3" rx="1" />
		<text x="35" y="57" font-family="Arial, sans-serif" font-size="6" fill="#333" text-anchor="middle">Waste</text>

		<!-- Shine -->
		<ellipse cx="25" cy="35" rx="3" ry="12" fill="#ffffff" opacity="0.5" />
	</svg>`;
}

/**
 * Gets the drug vial SVG
 */
function getDrugVialSvg(): string {
	return `<svg viewBox="0 0 30 50" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="vialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#f8f8f8;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#f8f8f8;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="drugLiquidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#e6d4ff;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#f0e8ff;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#e6d4ff;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="capVialGrad" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color:#666666;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#444444;stop-opacity:1" />
			</linearGradient>
		</defs>

		<!-- Black cap -->
		<rect x="9" y="3" width="12" height="5" fill="url(#capVialGrad)" stroke="#222" stroke-width="0.3" rx="1" />

		<!-- Vial neck -->
		<rect x="11" y="8" width="8" height="4" fill="url(#vialGrad)" stroke="#ddd" stroke-width="0.3" />

		<!-- Main vial body (rounded cylinder) -->
		<path d="M 10 12 L 10 35 Q 10 40 15 42 L 15 42 Q 20 40 20 35 L 20 12 Z"
			fill="url(#vialGrad)" stroke="#ddd" stroke-width="0.4" />

		<!-- Colorless liquid (slight purple tint to show it's drug) -->
		<path d="M 11 25 L 11 35 Q 11 39 15 41 L 15 41 Q 19 39 19 35 L 19 25 Z"
			fill="url(#drugLiquidGrad)" opacity="0.6" />

		<!-- Liquid surface -->
		<ellipse cx="15" cy="25" rx="4" ry="1.5" fill="#e6d4ff" opacity="0.4" />

		<!-- Label area -->
		<rect x="8" y="25" width="14" height="8" fill="#ffffff" opacity="0.8" stroke="#ddd" stroke-width="0.3" rx="0.5" />
		<text x="15" y="30" font-family="Arial, sans-serif" font-size="4" fill="#333" text-anchor="middle" font-weight="bold">Drug</text>
		<text x="15" y="34" font-family="Arial, sans-serif" font-size="3" fill="#666" text-anchor="middle">10 uM</text>

		<!-- Shine -->
		<ellipse cx="12" cy="20" rx="1.5" ry="6" fill="#ffffff" opacity="0.5" />
	</svg>`;
}

/**
 * Gets the micropipette SVG
 */
function getMicropipetteSvg(): string {
	return `<svg viewBox="0 0 35 100" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="micropipGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#6b8fc4;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#5a7cb5;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#4a6ba3;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="plungerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#d4b896;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#c0a080;stop-opacity:1" />
			</linearGradient>
		</defs>

		<!-- Plunger button at top -->
		<circle cx="17.5" cy="8" r="4" fill="url(#plungerGrad)" stroke="#8b7355" stroke-width="0.3" />
		<path d="M 15 10 L 17.5 12 L 20 10" stroke="#8b7355" stroke-width="0.5" fill="none" stroke-linecap="round" />

		<!-- Main shaft (blue body) -->
		<path d="M 14 12 L 13 60 Q 13 70 17.5 72 Q 22 70 22 60 L 21 12 Z" fill="url(#micropipGrad)" stroke="#3a5a93" stroke-width="0.4" />

		<!-- Display window -->
		<rect x="14.5" y="25" width="6" height="8" fill="#1a3a6a" stroke="#2a4a7a" stroke-width="0.3" rx="0.5" />
		<text x="17.5" y="31" font-family="Arial, sans-serif" font-size="3" fill="#6b8fc4" text-anchor="middle">10</text>

		<!-- Tip ejector button (lower front) -->
		<circle cx="17.5" cy="65" r="2" fill="#cccccc" stroke="#999" stroke-width="0.3" />

		<!-- Attachment point for tip -->
		<rect x="15.5" y="72" width="4" height="8" fill="#888888" stroke="#666" stroke-width="0.3" rx="0.5" />

		<!-- Highlight on shaft -->
		<ellipse cx="15" cy="40" rx="1.5" ry="12" fill="#ffffff" opacity="0.2" />

		<!-- Text label -->
		<text x="17.5" y="88" font-family="Arial, sans-serif" font-size="3" fill="#333" text-anchor="middle">P200</text>
	</svg>`;
}

/**
 * Gets the ethanol bottle SVG (spray bottle)
 */
function getEthanolBottleSvg(): string {
	return `<svg viewBox="0 0 40 80" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="ethanolGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
				<stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="triggerGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#dd5555;stop-opacity:1" />
			</linearGradient>
			<linearGradient id="ethanolLiquidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#e0e0ff;stop-opacity:0.7" />
				<stop offset="50%" style="stop-color:#f0f0ff;stop-opacity:0.8" />
				<stop offset="100%" style="stop-color:#e0e0ff;stop-opacity:0.7" />
			</linearGradient>
		</defs>

		<!-- Spray nozzle at top -->
		<rect x="16" y="5" width="8" height="4" fill="#666666" stroke="#333" stroke-width="0.3" rx="0.5" />
		<circle cx="20" cy="5" r="1.5" fill="#444444" />

		<!-- Pump tube going down inside -->
		<line x1="20" y1="9" x2="20" y2="50" stroke="#888" stroke-width="0.8" opacity="0.5" />

		<!-- Trigger -->
		<path d="M 14 20 L 8 35 Q 7 40 12 42 L 14 35 Z" fill="url(#triggerGrad2)" stroke="#bb3333" stroke-width="0.3" rx="1" />

		<!-- Main bottle body -->
		<path d="M 12 15 L 12 60 Q 12 68 18 70 L 22 70 Q 28 68 28 60 L 28 15 Z"
			fill="url(#ethanolGrad)" stroke="#ddd" stroke-width="0.4" />

		<!-- Ethanol liquid inside (clear with slight tint) -->
		<path d="M 14 45 L 14 60 Q 14 67 19 69 L 21 69 Q 26 67 26 60 L 26 45 Z"
			fill="url(#ethanolLiquidGrad)" opacity="0.6" />

		<!-- Liquid surface -->
		<ellipse cx="20" cy="45" rx="6" ry="1.5" fill="#e0e0ff" opacity="0.4" />

		<!-- Label -->
		<rect x="13" y="50" width="14" height="10" fill="#ffffff" opacity="0.8" stroke="#ccc" stroke-width="0.3" rx="0.5" />
		<text x="20" y="54" font-family="Arial, sans-serif" font-size="5" fill="#333" text-anchor="middle" font-weight="bold">70%</text>
		<text x="20" y="58" font-family="Arial, sans-serif" font-size="4" fill="#666" text-anchor="middle">EtOH</text>

		<!-- Shine -->
		<ellipse cx="15" cy="35" rx="2" ry="10" fill="#ffffff" opacity="0.5" />
	</svg>`;
}

/**
 * Gets the player hand SVG
 * @param action - 'idle' | 'grabbing' | 'pipetting' | 'spraying'
 */
function getHandSvg(action: string): string {
	if (action === 'idle') {
		return `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#f4c4a0;stop-opacity:1" />
					<stop offset="100%" style="stop-color:#e0b090;stop-opacity:1" />
				</linearGradient>
			</defs>

			<!-- Palm -->
			<ellipse cx="30" cy="45" rx="18" ry="22" fill="url(#skinGrad)" stroke="#d4a080" stroke-width="0.5" />

			<!-- Thumb -->
			<ellipse cx="15" cy="35" rx="6" ry="10" fill="url(#skinGrad)" stroke="#d4a080" stroke-width="0.4" transform="rotate(-30 15 35)" />

			<!-- Fingers (4) -->
			<ellipse cx="20" cy="15" rx="5" ry="12" fill="url(#skinGrad)" stroke="#d4a080" stroke-width="0.4" />
			<ellipse cx="30" cy="10" rx="5" ry="13" fill="url(#skinGrad)" stroke="#d4a080" stroke-width="0.4" />
			<ellipse cx="40" cy="10" rx="5" ry="13" fill="url(#skinGrad)" stroke="#d4a080" stroke-width="0.4" />
			<ellipse cx="50" cy="15" rx="5" ry="12" fill="url(#skinGrad)" stroke="#d4a080" stroke-width="0.4" />

			<!-- Palm details (shadow) -->
			<path d="M 25 50 Q 30 55 35 50" stroke="#d4a080" stroke-width="0.3" fill="none" opacity="0.5" />
		</svg>`;
	} else if (action === 'grabbing') {
		return `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="skinGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#f4c4a0;stop-opacity:1" />
					<stop offset="100%" style="stop-color:#e0b090;stop-opacity:1" />
				</linearGradient>
			</defs>

			<!-- Palm -->
			<ellipse cx="30" cy="45" rx="16" ry="20" fill="url(#skinGrad2)" stroke="#d4a080" stroke-width="0.5" />

			<!-- Thumb (curled) -->
			<path d="M 18 40 Q 15 30 18 25" stroke="#d4a080" stroke-width="5" fill="none" stroke-linecap="round" />
			<circle cx="18" cy="25" r="4" fill="url(#skinGrad2)" stroke="#d4a080" stroke-width="0.3" />

			<!-- Fingers (curled toward center) -->
			<path d="M 22 18 Q 25 28 28 35" stroke="#d4a080" stroke-width="4" fill="none" stroke-linecap="round" />
			<circle cx="22" cy="18" r="3.5" fill="url(#skinGrad2)" stroke="#d4a080" stroke-width="0.3" />

			<path d="M 32 15 Q 32 28 32 38" stroke="#d4a080" stroke-width="4" fill="none" stroke-linecap="round" />
			<circle cx="32" cy="15" r="3.5" fill="url(#skinGrad2)" stroke="#d4a080" stroke-width="0.3" />

			<path d="M 42 15 Q 42 28 38 38" stroke="#d4a080" stroke-width="4" fill="none" stroke-linecap="round" />
			<circle cx="42" cy="15" r="3.5" fill="url(#skinGrad2)" stroke="#d4a080" stroke-width="0.3" />

			<path d="M 50 22 Q 45 32 40 40" stroke="#d4a080" stroke-width="4" fill="none" stroke-linecap="round" />
			<circle cx="50" cy="22" r="3.5" fill="url(#skinGrad2)" stroke="#d4a080" stroke-width="0.3" />

			<!-- Palm details -->
			<path d="M 25 48 Q 30 52 35 48" stroke="#d4a080" stroke-width="0.3" fill="none" opacity="0.5" />
		</svg>`;
	} else if (action === 'pipetting') {
		return `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="skinGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#f4c4a0;stop-opacity:1" />
					<stop offset="100%" style="stop-color:#e0b090;stop-opacity:1" />
				</linearGradient>
			</defs>

			<!-- Palm (slightly rotated) -->
			<ellipse cx="32" cy="45" rx="16" ry="20" fill="url(#skinGrad3)" stroke="#d4a080" stroke-width="0.5" transform="rotate(15 32 45)" />

			<!-- Thumb pointing up -->
			<ellipse cx="45" cy="25" rx="5" ry="12" fill="url(#skinGrad3)" stroke="#d4a080" stroke-width="0.4" transform="rotate(20 45 25)" />

			<!-- Fingers extended upward (holding pipette) -->
			<ellipse cx="28" cy="15" rx="4" ry="14" fill="url(#skinGrad3)" stroke="#d4a080" stroke-width="0.4" />
			<ellipse cx="36" cy="10" rx="4" ry="15" fill="url(#skinGrad3)" stroke="#d4a080" stroke-width="0.4" />
			<ellipse cx="44" cy="12" rx="4" ry="14" fill="url(#skinGrad3)" stroke="#d4a080" stroke-width="0.4" />

			<!-- Index finger on trigger (bent) -->
			<path d="M 20 35 Q 18 25 22 18" stroke="#d4a080" stroke-width="5" fill="none" stroke-linecap="round" />
			<circle cx="22" cy="18" r="3" fill="url(#skinGrad3)" stroke="#d4a080" stroke-width="0.3" />

			<!-- Pinky -->
			<ellipse cx="50" cy="22" rx="4" ry="12" fill="url(#skinGrad3)" stroke="#d4a080" stroke-width="0.4" />
		</svg>`;
	} else if (action === 'spraying') {
		return `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="skinGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#f4c4a0;stop-opacity:1" />
					<stop offset="100%" style="stop-color:#e0b090;stop-opacity:1" />
				</linearGradient>
			</defs>

			<!-- Palm (extended forward) -->
			<ellipse cx="25" cy="45" rx="15" ry="18" fill="url(#skinGrad4)" stroke="#d4a080" stroke-width="0.5" />

			<!-- Thumb out to side -->
			<ellipse cx="10" cy="38" rx="5" ry="10" fill="url(#skinGrad4)" stroke="#d4a080" stroke-width="0.4" transform="rotate(-40 10 38)" />

			<!-- Fingers extended forward (around spray bottle trigger) -->
			<ellipse cx="18" cy="20" rx="4" ry="13" fill="url(#skinGrad4)" stroke="#d4a080" stroke-width="0.4" />
			<ellipse cx="25" cy="15" rx="4" ry="14" fill="url(#skinGrad4)" stroke="#d4a080" stroke-width="0.4" />
			<ellipse cx="32" cy="16" rx="4" ry="13" fill="url(#skinGrad4)" stroke="#d4a080" stroke-width="0.4" />
			<ellipse cx="38" cy="22" rx="4" ry="12" fill="url(#skinGrad4)" stroke="#d4a080" stroke-width="0.4" />

			<!-- Index finger on trigger (pressing) -->
			<path d="M 15 38 Q 12 30 16 22" stroke="#d4a080" stroke-width="5" fill="none" stroke-linecap="round" />
			<circle cx="16" cy="22" r="3" fill="url(#skinGrad4)" stroke="#d4a080" stroke-width="0.3" />

			<!-- Spray effect lines -->
			<line x1="20" y1="10" x2="18" y2="5" stroke="#4a90e2" stroke-width="0.8" opacity="0.7" stroke-linecap="round" />
			<line x1="25" y1="8" x2="25" y2="2" stroke="#4a90e2" stroke-width="0.8" opacity="0.7" stroke-linecap="round" />
			<line x1="30" y1="10" x2="32" y2="4" stroke="#4a90e2" stroke-width="0.8" opacity="0.7" stroke-linecap="round" />
		</svg>`;
	}

	// Default to idle
	return getHandSvg('idle');
}

/**
 * Gets the hemocytometer grid SVG for microscope view
 */
function getHemocytometerGridSvg(): string {
	return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="glassGridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" style="stop-color:#f5f9ff;stop-opacity:1" />
				<stop offset="100%" style="stop-color:#e8f0ff;stop-opacity:1" />
			</linearGradient>
		</defs>

		<!-- Background (glass/slide) -->
		<rect x="10" y="10" width="180" height="180" fill="url(#glassGridGrad)" stroke="#999" stroke-width="1" />

		<!-- Main grid lines (double lines for main divisions) -->
		<!-- Horizontal lines -->
		<line x1="10" y1="60" x2="190" y2="60" stroke="#333" stroke-width="0.8" />
		<line x1="10" y1="61" x2="190" y2="61" stroke="#333" stroke-width="0.8" />
		<line x1="10" y1="110" x2="190" y2="110" stroke="#333" stroke-width="0.8" />
		<line x1="10" y1="111" x2="190" y2="111" stroke="#333" stroke-width="0.8" />
		<line x1="10" y1="160" x2="190" y2="160" stroke="#333" stroke-width="0.8" />
		<line x1="10" y1="161" x2="190" y2="161" stroke="#333" stroke-width="0.8" />

		<!-- Vertical lines -->
		<line x1="60" y1="10" x2="60" y2="190" stroke="#333" stroke-width="0.8" />
		<line x1="61" y1="10" x2="61" y2="190" stroke="#333" stroke-width="0.8" />
		<line x1="110" y1="10" x2="110" y2="190" stroke="#333" stroke-width="0.8" />
		<line x1="111" y1="10" x2="111" y2="190" stroke="#333" stroke-width="0.8" />
		<line x1="160" y1="10" x2="160" y2="190" stroke="#333" stroke-width="0.8" />
		<line x1="161" y1="10" x2="161" y2="190" stroke="#333" stroke-width="0.8" />

		<!-- Fine grid lines (lighter) -->
		<!-- Smaller divisions within each major square -->
		<line x1="10" y1="35" x2="190" y2="35" stroke="#ccc" stroke-width="0.3" />
		<line x1="10" y1="85" x2="190" y2="85" stroke="#ccc" stroke-width="0.3" />
		<line x1="10" y1="135" x2="190" y2="135" stroke="#ccc" stroke-width="0.3" />

		<line x1="35" y1="10" x2="35" y2="190" stroke="#ccc" stroke-width="0.3" />
		<line x1="85" y1="10" x2="85" y2="190" stroke="#ccc" stroke-width="0.3" />
		<line x1="135" y1="10" x2="135" y2="190" stroke="#ccc" stroke-width="0.3" />

		<!-- Highlight corner counting squares -->
		<!-- Top-left -->
		<rect x="15" y="15" width="40" height="40" fill="none" stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.8" />
		<!-- Top-right -->
		<rect x="145" y="15" width="40" height="40" fill="none" stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.8" />
		<!-- Bottom-left -->
		<rect x="15" y="145" width="40" height="40" fill="none" stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.8" />
		<!-- Bottom-right -->
		<rect x="145" y="145" width="40" height="40" fill="none" stroke="#ff6b6b" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.8" />

		<!-- Label text for corner squares -->
		<text x="30" y="190" font-family="Arial, sans-serif" font-size="8" fill="#666">Count 4 corners</text>
	</svg>`;
}

// ============================================
function getWellPlateSvg(wells: WellData[]): string {
	// 24-well plate: 4 rows x 6 columns
	const wellR = 10;
	const spacingX = 28;
	const spacingY = 26;
	const offsetX = 22;
	const offsetY = 18;
	let svg = '<svg viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg">';
	// Plate body
	svg += '<rect x="2" y="2" width="196" height="126" rx="6" fill="#e8e8e8" stroke="#bbb" stroke-width="1.5"/>';
	// Column labels
	for (let col = 0; col < PLATE_COLS; col++) {
		const cx = offsetX + col * spacingX;
		svg += '<text x="' + cx + '" y="12" font-family="Arial,sans-serif" font-size="7" fill="#999" text-anchor="middle">' + (col + 1) + '</text>';
	}
	// Row labels
	const rowLabels = ['A', 'B', 'C', 'D'];
	for (let row = 0; row < PLATE_ROWS; row++) {
		const cy = offsetY + row * spacingY;
		svg += '<text x="6" y="' + (cy + 3) + '" font-family="Arial,sans-serif" font-size="7" fill="#999">' + rowLabels[row] + '</text>';
	}
	// Wells
	for (let row = 0; row < PLATE_ROWS; row++) {
		for (let col = 0; col < PLATE_COLS; col++) {
			const cx = offsetX + col * spacingX;
			const cy = offsetY + row * spacingY;
			const well = wells[row * PLATE_COLS + col];
			let fill = '#f5f5f5';
			if (well.hasCells && well.drugConcentrationUm > 0) {
				// Deeper purple for higher drug concentration
				const intensity = Math.min(1, well.drugConcentrationUm / 10);
				const r = Math.round(200 - intensity * 60);
				const g = Math.round(180 - intensity * 80);
				const b = Math.round(220 - intensity * 20);
				fill = 'rgb(' + r + ',' + g + ',' + b + ')';
			} else if (well.hasCells) {
				fill = '#f0a0b0'; // pink = cells + media
			}
			svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + wellR + '" fill="' + fill + '" stroke="#ccc" stroke-width="0.8"/>';
		}
	}
	// Concentration labels at bottom
	for (let col = 0; col < PLATE_COLS; col++) {
		const cx = offsetX + col * spacingX;
		svg += '<text x="' + cx + '" y="125" font-family="Arial,sans-serif" font-size="5" fill="#999" text-anchor="middle">' + DRUG_CONCENTRATION_LABELS[col] + '</text>';
	}
	svg += '</svg>';
	return svg;
}

// ============================================
function getDrugVialsSvg(): string {
	// Rack of 6 drug dilution vials
	let svg = '<svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">';
	// Rack
	svg += '<rect x="2" y="15" width="116" height="43" rx="3" fill="#ddd" stroke="#bbb" stroke-width="1"/>';
	// 6 vials
	for (let i = 0; i < 6; i++) {
		const cx = 12 + i * 18;
		const intensity = i / 5;
		const r = Math.round(220 - intensity * 80);
		const g = Math.round(220 - intensity * 100);
		const b = Math.round(240 - intensity * 20);
		svg += '<rect x="' + (cx - 5) + '" y="8" width="10" height="40" rx="2" fill="rgb(' + r + ',' + g + ',' + b + ')" stroke="#999" stroke-width="0.5"/>';
		svg += '<rect x="' + (cx - 5) + '" y="5" width="10" height="5" rx="1" fill="#888"/>';
		svg += '<text x="' + cx + '" y="55" font-family="Arial,sans-serif" font-size="5" fill="#666" text-anchor="middle">' + DRUG_CONCENTRATION_LABELS[i] + '</text>';
	}
	svg += '<text x="60" y="4" font-family="Arial,sans-serif" font-size="6" fill="#555" text-anchor="middle">Drug Stock (' + DRUG_STOCK_CONCENTRATION_UM + ' uM)</text>';
	svg += '</svg>';
	return svg;
}

// ============================================
function getMultichannelPipetteSvg(): string {
	return '<svg viewBox="0 0 60 120" xmlns="http://www.w3.org/2000/svg">'
		// Handle
		+ '<rect x="20" y="5" width="20" height="50" rx="4" fill="#5a8abf" stroke="#3d6a9f" stroke-width="1"/>'
		// Plunger button
		+ '<rect x="24" y="2" width="12" height="8" rx="2" fill="#4a7aaf" stroke="#3d6a9f" stroke-width="0.5"/>'
		// Shaft
		+ '<rect x="22" y="55" width="16" height="30" rx="2" fill="#ccc" stroke="#999" stroke-width="0.5"/>'
		// Multiple tips (4 channels)
		+ '<line x1="24" y1="85" x2="24" y2="110" stroke="#ddd" stroke-width="2"/>'
		+ '<line x1="28" y1="85" x2="28" y2="110" stroke="#ddd" stroke-width="2"/>'
		+ '<line x1="32" y1="85" x2="32" y2="110" stroke="#ddd" stroke-width="2"/>'
		+ '<line x1="36" y1="85" x2="36" y2="110" stroke="#ddd" stroke-width="2"/>'
		// Tip ends
		+ '<circle cx="24" cy="112" r="1.5" fill="#eee" stroke="#ccc" stroke-width="0.5"/>'
		+ '<circle cx="28" cy="112" r="1.5" fill="#eee" stroke="#ccc" stroke-width="0.5"/>'
		+ '<circle cx="32" cy="112" r="1.5" fill="#eee" stroke="#ccc" stroke-width="0.5"/>'
		+ '<circle cx="36" cy="112" r="1.5" fill="#eee" stroke="#ccc" stroke-width="0.5"/>'
		+ '</svg>';
}

// ============================================
function getMicroscopeSvg(): string {
	return '<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">'
		// Base
		+ '<rect x="10" y="100" width="60" height="10" rx="3" fill="#333" stroke="#222" stroke-width="1"/>'
		// Stage (where the slide goes)
		+ '<rect x="20" y="85" width="40" height="6" rx="1" fill="#555" stroke="#444" stroke-width="0.5"/>'
		// Stage clips
		+ '<rect x="22" y="83" width="4" height="4" rx="0.5" fill="#888"/>'
		+ '<rect x="54" y="83" width="4" height="4" rx="0.5" fill="#888"/>'
		// Arm (vertical)
		+ '<rect x="55" y="30" width="10" height="70" rx="2" fill="#444" stroke="#333" stroke-width="0.5"/>'
		// Arm curve to eyepiece
		+ '<path d="M 55 35 Q 55 20 40 15" stroke="#444" stroke-width="10" fill="none" stroke-linecap="round"/>'
		// Eyepiece tube
		+ '<rect x="32" y="5" width="16" height="15" rx="2" fill="#555" stroke="#444" stroke-width="0.5"/>'
		// Eyepiece lens (top)
		+ '<ellipse cx="40" cy="5" rx="10" ry="3" fill="#666" stroke="#555" stroke-width="0.5"/>'
		// Objective turret
		+ '<circle cx="40" cy="78" r="6" fill="#666" stroke="#555" stroke-width="0.5"/>'
		// Objectives (3 small tubes)
		+ '<rect x="35" y="78" width="3" height="8" rx="1" fill="#777"/>'
		+ '<rect x="39" y="80" width="3" height="6" rx="1" fill="#888"/>'
		+ '<rect x="43" y="79" width="3" height="7" rx="1" fill="#777"/>'
		// Focus knob
		+ '<circle cx="65" cy="65" r="5" fill="#777" stroke="#666" stroke-width="0.5"/>'
		+ '<circle cx="65" cy="65" r="2" fill="#888"/>'
		// Label
		+ '<text x="40" y="118" font-family="Arial,sans-serif" font-size="7" fill="#999" text-anchor="middle">Microscope</text>'
		+ '</svg>';
}
