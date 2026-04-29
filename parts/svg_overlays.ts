// ============================================
// svg_overlays.ts - Anchor-based dynamic overlay system
// ============================================
// Engine-owned: generates overlay SVG groups that are injected
// into base SVG assets at the overlay_root group.
// All overlays use anchor elements defined in the base SVG
// to position themselves correctly.
// ============================================

//============================================
/**
 * Parse an anchor element's position and size from a base SVG string.
 * Anchors are invisible rect/circle elements with known IDs.
 * Returns {x, y, width, height} or null if not found.
 */
function parseAnchorBounds(svgString: string, equipmentId: string, anchorId: string): {x: number, y: number, width: number, height: number} | null {
	// look for the prefixed anchor ID
	const prefixedId = equipmentId + "__" + anchorId;
	// try rect anchor: <rect id="prefix__anchor_foo" x="10" y="20" width="30" height="40"
	const rectPattern = new RegExp(
		'<rect[^>]*id="' + prefixedId + '"[^>]*>'
	);
	const rectMatch = svgString.match(rectPattern);
	if (rectMatch) {
		const tag = rectMatch[0];
		const x = parseFloat((tag.match(/\bx="([^"]*)"/) || ["", "0"])[1]);
		const y = parseFloat((tag.match(/\by="([^"]*)"/) || ["", "0"])[1]);
		const w = parseFloat((tag.match(/\bwidth="([^"]*)"/) || ["", "0"])[1]);
		const h = parseFloat((tag.match(/\bheight="([^"]*)"/) || ["", "0"])[1]);
		return {x: x, y: y, width: w, height: h};
	}
	return null;
}

//============================================
/**
 * Create a pipette liquid fill overlay.
 * For serological pipettes: volumeMl is converted to a level (0-1) based on capacity.
 * The liquid rectangle is bottom-anchored, clipped to the inner glass tube.
 * @param equipmentId - equipment identifier (e.g., "sero_pipette")
 * @param volumeMl - liquid volume in milliliters
 * @param capacityMl - total capacity in milliliters
 * @param color - hex color code for the liquid
 * @param svgString - base SVG to extract anchor bounds from
 */
function createPipetteLiquidOverlay(equipmentId: string, volumeMl: number, capacityMl: number, color: string, svgString: string): string {
	// clamp volume to capacity
	const clampedVol = Math.max(0, Math.min(volumeMl, capacityMl));
	if (clampedVol <= 0) {
		return "";
	}
	const level = clampedVol / capacityMl;
	const prefixedClip = equipmentId + "__anchor_liquid_clip";
	// get liquid bounds from the base SVG
	const bounds = parseAnchorBounds(svgString, equipmentId, "anchor_liquid_bounds");
	if (!bounds) {
		return "";
	}
	// liquid fills from the bottom up
	const liquidHeight = bounds.height * level;
	const liquidY = bounds.y + bounds.height - liquidHeight;
	let svg = '<g id="' + equipmentId + '__liquid">';
	// clipped liquid rectangle
	svg += '<rect'
		+ ' x="' + bounds.x + '"'
		+ ' y="' + liquidY + '"'
		+ ' width="' + bounds.width + '"'
		+ ' height="' + liquidHeight + '"'
		+ ' fill="' + color + '"'
		+ ' opacity="0.8"'
		+ ' clip-path="url(#' + prefixedClip + ')"'
		+ '/>';
	svg += '</g>';
	return svg;
}

//============================================
/**
 * Create a liquid fill overlay that clips to the container shape.
 * The liquid rectangle is positioned based on level (0 = empty, 1 = full)
 * within the anchor_liquid_bounds area, clipped by anchor_liquid_clip.
 */
function createLiquidOverlay(equipmentId: string, level: number, role: ColorRole, svgString: string): string {
	// clamp level
	const clampedLevel = Math.max(0, Math.min(1, level));
	if (clampedLevel <= 0) {
		return "";
	}
	const color = COLOR_MAP[role];
	const prefixedClip = equipmentId + "__anchor_liquid_clip";
	// get liquid bounds from the base SVG
	const bounds = parseAnchorBounds(svgString, equipmentId, "anchor_liquid_bounds");
	if (!bounds) {
		return "";
	}
	// liquid fills from the bottom up
	const liquidHeight = bounds.height * clampedLevel;
	const liquidY = bounds.y + bounds.height - liquidHeight;
	// surface highlight ellipse at top of liquid
	const surfaceCx = bounds.x + bounds.width / 2;
	const surfaceRx = bounds.width / 2 * 0.9;
	const surfaceRy = surfaceRx * TOP_FACE_RATIO;
	let svg = '<g id="' + equipmentId + '__liquid">';
	// clipped liquid rectangle
	svg += '<rect'
		+ ' x="' + bounds.x + '"'
		+ ' y="' + liquidY + '"'
		+ ' width="' + bounds.width + '"'
		+ ' height="' + liquidHeight + '"'
		+ ' fill="' + color + '"'
		+ ' opacity="0.8"'
		+ ' clip-path="url(#' + prefixedClip + ')"'
		+ '/>';
	// liquid surface highlight
	svg += '<ellipse'
		+ ' cx="' + surfaceCx + '"'
		+ ' cy="' + liquidY + '"'
		+ ' rx="' + surfaceRx + '"'
		+ ' ry="' + surfaceRy + '"'
		+ ' fill="' + color + '"'
		+ ' opacity="0.4"'
		+ ' clip-path="url(#' + prefixedClip + ')"'
		+ '/>';
	svg += '</g>';
	return svg;
}

//============================================
/**
 * Create a highlight border overlay around an equipment item.
 * Uses the anchor_highlight bounds for positioning.
 */
function createHighlightOverlay(equipmentId: string, active: boolean, svgString: string): string {
	if (!active) {
		return "";
	}
	const bounds = parseAnchorBounds(svgString, equipmentId, "anchor_highlight");
	if (!bounds) {
		return "";
	}
	const color = COLOR_MAP["success"];
	return '<g id="' + equipmentId + '__highlight">'
		+ '<rect'
		+ ' x="' + (bounds.x - 2) + '"'
		+ ' y="' + (bounds.y - 2) + '"'
		+ ' width="' + (bounds.width + 4) + '"'
		+ ' height="' + (bounds.height + 4) + '"'
		+ ' fill="none"'
		+ ' stroke="' + color + '"'
		+ ' stroke-width="' + STROKE_HIGHLIGHT + '"'
		+ ' rx="' + (RADIUS_BODY + 1) + '"'
		+ ' stroke-dasharray="6,3"'
		+ ' opacity="0.8"'
		+ '/>'
		+ '</g>';
}

//============================================
/**
 * Create an error indicator overlay at the anchor_error position.
 */
function createErrorOverlay(equipmentId: string, message: string, svgString: string): string {
	const bounds = parseAnchorBounds(svgString, equipmentId, "anchor_error");
	if (!bounds) {
		return "";
	}
	const color = COLOR_MAP["error"];
	const cx = bounds.x + bounds.width / 2;
	const cy = bounds.y + bounds.height / 2;
	return '<g id="' + equipmentId + '__error_state">'
		+ '<circle'
		+ ' cx="' + cx + '"'
		+ ' cy="' + cy + '"'
		+ ' r="8"'
		+ ' fill="' + color + '"'
		+ ' opacity="0.9"'
		+ '/>'
		+ '<text'
		+ ' x="' + cx + '"'
		+ ' y="' + (cy + 3) + '"'
		+ ' font-family="Arial,sans-serif"'
		+ ' font-size="10"'
		+ ' fill="#ffffff"'
		+ ' text-anchor="middle"'
		+ ' font-weight="bold"'
		+ '>!</text>'
		+ '</g>';
}

//============================================
/**
 * Create a dynamic text label at the anchor_label position.
 */
function createDynamicLabel(equipmentId: string, text: string, svgString: string): string {
	if (!text) {
		return "";
	}
	const bounds = parseAnchorBounds(svgString, equipmentId, "anchor_label");
	if (!bounds) {
		return "";
	}
	// center text within the label bounds
	const cx = bounds.x + bounds.width / 2;
	const cy = bounds.y + bounds.height / 2 + 3;
	return '<g id="' + equipmentId + '__label_dynamic">'
		+ '<text'
		+ ' x="' + cx + '"'
		+ ' y="' + cy + '"'
		+ ' font-family="Arial,sans-serif"'
		+ ' font-size="6"'
		+ ' fill="#333333"'
		+ ' text-anchor="middle"'
		+ '>' + text + '</text>'
		+ '</g>';
}

//============================================
/**
 * Create a directional arrow overlay between two points.
 */
function createArrowOverlay(fromX: number, fromY: number, toX: number, toY: number): string {
	// arrowhead size
	const headLen = 6;
	// calculate angle
	const dx = toX - fromX;
	const dy = toY - fromY;
	const angle = Math.atan2(dy, dx);
	// arrowhead points
	const ax1 = toX - headLen * Math.cos(angle - Math.PI / 6);
	const ay1 = toY - headLen * Math.sin(angle - Math.PI / 6);
	const ax2 = toX - headLen * Math.cos(angle + Math.PI / 6);
	const ay2 = toY - headLen * Math.sin(angle + Math.PI / 6);
	return '<g class="overlay_arrow">'
		+ '<line'
		+ ' x1="' + fromX + '"'
		+ ' y1="' + fromY + '"'
		+ ' x2="' + toX + '"'
		+ ' y2="' + toY + '"'
		+ ' stroke="#333333"'
		+ ' stroke-width="' + STROKE_DETAIL + '"'
		+ ' marker-end="none"'
		+ '/>'
		+ '<polygon'
		+ ' points="' + toX + ',' + toY + ' ' + ax1 + ',' + ay1 + ' ' + ax2 + ',' + ay2 + '"'
		+ ' fill="#333333"'
		+ '/>'
		+ '</g>';
}

//============================================
/**
 * Compose a base SVG with dynamic overlays.
 * Finds the overlay_root group in the base SVG and injects overlay content.
 * This avoids brittle raw string concatenation.
 */
function composeSvg(baseSvgConstant: string, equipmentId: string, overlays: string[]): string {
	// find the prefixed overlay_root group
	const overlayRootId = equipmentId + "__overlay_root";
	const overlayRootTag = '<g id="' + overlayRootId + '">';
	// check if overlay_root exists with self-closing tag
	const selfClosingTag = '<g id="' + overlayRootId + '"/>';
	const selfClosingTagAlt = '<g id="' + overlayRootId + '" />';
	// join all non-empty overlays
	const overlayContent = overlays.filter(function(o) { return o.length > 0; }).join("\n");
	// try self-closing tag first
	if (baseSvgConstant.indexOf(selfClosingTag) !== -1) {
		return baseSvgConstant.replace(
			selfClosingTag,
			overlayRootTag + overlayContent + "</g>"
		);
	}
	if (baseSvgConstant.indexOf(selfClosingTagAlt) !== -1) {
		return baseSvgConstant.replace(
			selfClosingTagAlt,
			overlayRootTag + overlayContent + "</g>"
		);
	}
	// try open+close tag (empty group)
	const emptyGroup = overlayRootTag + "</g>";
	if (baseSvgConstant.indexOf(emptyGroup) !== -1) {
		return baseSvgConstant.replace(
			emptyGroup,
			overlayRootTag + overlayContent + "</g>"
		);
	}
	// try open tag (group may have whitespace content)
	const openTagIdx = baseSvgConstant.indexOf(overlayRootTag);
	if (openTagIdx !== -1) {
		// find the matching </g>
		const closeIdx = baseSvgConstant.indexOf("</g>", openTagIdx + overlayRootTag.length);
		if (closeIdx !== -1) {
			return baseSvgConstant.substring(0, openTagIdx + overlayRootTag.length)
				+ overlayContent
				+ baseSvgConstant.substring(closeIdx);
		}
	}
	// fallback: inject before closing </svg> tag
	const closeSvgIdx = baseSvgConstant.lastIndexOf("</svg>");
	if (closeSvgIdx !== -1) {
		return baseSvgConstant.substring(0, closeSvgIdx)
			+ '<g id="' + overlayRootId + '">' + overlayContent + "</g>"
			+ baseSvgConstant.substring(closeSvgIdx);
	}
	// last resort: return base unchanged
	return baseSvgConstant;
}
