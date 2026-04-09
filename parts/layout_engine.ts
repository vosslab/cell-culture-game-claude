// ============================================
// layout_engine.ts - Scene layout engine
// Computes positions and labels for scene items
// ============================================

// Average character width as percentage of font size
const AVG_CHAR_WIDTH_PCT = 0.55;

// Cache for SVG aspect ratios parsed at runtime
var _aspectRatioCache: Record<string, number> = {};

// ============================================
// Parse aspect ratio (height/width) from an SVG viewBox attribute
function parseSvgAspectRatio(svgHtml: string): number {
	var match = svgHtml.match(/viewBox="([^"]+)"/);
	if (!match) return 1.0;
	var parts = match[1].split(/\s+/);
	if (parts.length < 4) return 1.0;
	var vbWidth = parseFloat(parts[2]);
	var vbHeight = parseFloat(parts[3]);
	if (vbWidth <= 0) return 1.0;
	return vbHeight / vbWidth;
}

// ============================================
// Map asset IDs to their base SVG string constants
// These are the raw SVG files injected by build_game.sh,
// independent of game state (no dynamic fills or overlays)
function getStaticSvg(assetId: string): string {
	switch (assetId) {
		case 'flask': return SVG_T75_FLASK;
		case 'well_plate': return SVG_WELL_PLATE_24;
		case 'media_bottle': return SVG_MEDIA_BOTTLE;
		case 'trypsin_bottle': return SVG_MEDIA_BOTTLE;
		case 'ethanol_bottle': return SVG_ETHANOL_SPRAY;
		case 'serological_pipette': return SVG_SERO_PIPETTE;
		case 'aspirating_pipette': return SVG_ASPIRATING_PIPETTE;
		case 'multichannel_pipette': return SVG_MULTICHANNEL_PIPETTE;
		case 'drug_vials': return SVG_DRUG_VIAL_RACK;
		case 'waste_container': return SVG_WASTE_CONTAINER;
		case 'microscope': return SVG_MICROSCOPE;
		case 'incubator': return SVG_INCUBATOR;
		default: return '';
	}
}

// ============================================
// Get aspect ratio for an asset from its base SVG (cached)
function getAssetAspectRatio(assetId: string): number {
	if (_aspectRatioCache[assetId] !== undefined) {
		return _aspectRatioCache[assetId];
	}
	var svgHtml = getStaticSvg(assetId);
	if (svgHtml) {
		var ratio = parseSvgAspectRatio(svgHtml);
		_aspectRatioCache[assetId] = ratio;
		return ratio;
	}
	return 1.0;
}

// Minimum scale factor to prevent items from shrinking too much
const MIN_SCALE = 0.75;

// Internal zone padding (%) to prevent items touching zone edges
const ZONE_PADDING = 1;

// ============================================
function splitLabelAtMiddle(text: string): string[] {
	// Find the space nearest to the middle of the string
	var mid = Math.floor(text.length / 2);
	var bestIdx = -1;
	var bestDist = text.length;
	// scan all spaces, pick the one closest to midpoint
	for (var i = 0; i < text.length; i++) {
		if (text[i] === ' ') {
			var dist = Math.abs(i - mid);
			if (dist < bestDist) {
				bestDist = dist;
				bestIdx = i;
			}
		}
	}
	if (bestIdx < 0) {
		// no space found, return as single line
		return [text];
	}
	return [text.substring(0, bestIdx), text.substring(bestIdx + 1)];
}

// ============================================
function layoutZoneItems(
	zoneItems: SceneItem[],
	zone: ZoneDef,
	specs: Record<string, AssetSpec>,
	viewportW: number,
	viewportH: number
): ComputedItemLayout[] {
	var results: ComputedItemLayout[] = [];
	var n = zoneItems.length;
	if (n === 0) {
		return results;
	}
	// apply internal zone padding to prevent edge clipping
	var effectiveX0 = zone.x0 + ZONE_PADDING;
	var effectiveX1 = zone.x1 - ZONE_PADDING;
	var zoneWidth = effectiveX1 - effectiveX0;

	// compute visual widths and layout footprints
	// footprint uses same label width estimation as the label pass
	var widths: number[] = [];       // visual widths (for rendering)
	var footprints: number[] = [];   // layout footprints (for spacing)
	var totalFootprint = 0;
	for (var i = 0; i < n; i++) {
		var item = zoneItems[i];
		var spec = specs[item.asset];
		var visualW = spec.defaultWidth * item.widthScale;
		// estimate label width same way as layoutLabels()
		var charW = item.label.length * AVG_CHAR_WIDTH_PCT;
		var specLabelW = spec.labelWidth * item.widthScale;
		var estLabelW = Math.max(charW, specLabelW);
		// if label would wrap, use the wider wrapped line
		if (estLabelW > visualW && item.label.indexOf(' ') >= 0) {
			var split = splitLabelAtMiddle(item.label);
			var maxLineW = 0;
			for (var li = 0; li < split.length; li++) {
				var lineW = split[li].length * AVG_CHAR_WIDTH_PCT;
				if (lineW > maxLineW) maxLineW = lineW;
			}
			estLabelW = Math.max(maxLineW, specLabelW);
		}
		var footprint = Math.max(visualW, estLabelW);
		widths.push(visualW);
		footprints.push(footprint);
		totalFootprint += footprint;
	}

	// compute scale factor and gap
	var scaleFactor = 1.0;
	var gap = 0;
	var startX = effectiveX0;

	if (n === 1) {
		// single item: place based on alignment, no gap logic
		var align = zone.align || 'center';
		if (align === 'center') {
			startX = effectiveX0
				+ (zoneWidth - footprints[0]) / 2;
		} else if (align === 'right') {
			startX = effectiveX1 - footprints[0];
		}
		// 'left' keeps startX = effectiveX0
	} else {
		// multiple items: use footprints for distribution
		var totalGapWidth = (n - 1) * zone.gap;
		if (totalFootprint + totalGapWidth <= zoneWidth) {
			// items fit: spread gaps evenly
			gap = Math.max(
				zone.gap,
				(zoneWidth - totalFootprint) / (n - 1)
			);
		} else {
			// overflow: shrink gaps first, then scale
			gap = zone.gap;
			totalGapWidth = (n - 1) * gap;
			scaleFactor = Math.min(
				(zoneWidth - totalGapWidth) / totalFootprint,
				1.0
			);
			// enforce minimum scale
			scaleFactor = Math.max(scaleFactor, MIN_SCALE);
		}

		// apply scale factor to both visual and footprint
		var scaledFootprintTotal = 0;
		for (var i = 0; i < n; i++) {
			widths[i] = widths[i] * scaleFactor;
			footprints[i] = footprints[i] * scaleFactor;
			scaledFootprintTotal += footprints[i];
		}
		var totalSpan = scaledFootprintTotal + (n - 1) * gap;

		// compute starting X from alignment
		var align = zone.align || 'center';
		if (align === 'center') {
			startX = effectiveX0
				+ (zoneWidth - totalSpan) / 2;
		} else if (align === 'right') {
			startX = effectiveX1 - totalSpan;
		}
		// 'left' keeps startX = effectiveX0
	}

	// assign positions left-to-right using footprints
	var curX = startX;
	for (var i = 0; i < n; i++) {
		var item = zoneItems[i];
		var spec = specs[item.asset];
		var itemWidth = widths[i];
		var itemFootprint = footprints[i];
		// center visual width within footprint
		var visualOffset = (itemFootprint - itemWidth) / 2;

		// height from SVG aspect ratio, adjusted for viewport
		var aspectRatio = getAssetAspectRatio(item.asset);
		var height = itemWidth * aspectRatio * (viewportW / viewportH);

		// determine baseline for this item
		var baseline = item.baselineOverride ?? zone.baseline;
		var anchorOffset = spec.anchorYOffset ?? 0;

		// compute top position based on anchor mode
		var top = 0;
		if (item.anchorY === 'bottom') {
			top = baseline - height;
		} else if (item.anchorY === 'tip') {
			top = baseline - height + anchorOffset;
		} else {
			// 'center'
			top = baseline - height / 2;
		}

		// visual X is centered within footprint
		var visualX = curX + visualOffset;

		// hard clamp visual position to zone bounds
		if (visualX < effectiveX0) {
			visualX = effectiveX0;
		}
		if (visualX + itemWidth > effectiveX1) {
			visualX = effectiveX1 - itemWidth;
		}

		// build layout with placeholder label values
		// labelX centered on visual object, not footprint
		var layout: ComputedItemLayout = {
			id: item.id,
			x: visualX,
			y: top,
			width: itemWidth,
			height: height,
			tooltip: item.label,
			labelLines: [],
			labelX: visualX + itemWidth / 2,
			labelY: 0,
			labelWidth: 0,
			labelMultiline: false,
		};
		results.push(layout);

		// advance cursor by footprint, not visual width
		curX += itemFootprint + gap;
	}

	return results;
}

// ============================================
function layoutLabels(
	layouts: ComputedItemLayout[],
	items: SceneItem[],
	specs: Record<string, AssetSpec>,
	rules: SceneLayoutRules
): void {
	// build a lookup from item id to item and spec
	var itemMap: Record<string, SceneItem> = {};
	for (var i = 0; i < items.length; i++) {
		itemMap[items[i].id] = items[i];
	}

	// first pass: compute label text and width for each layout
	for (var i = 0; i < layouts.length; i++) {
		var lay = layouts[i];
		var item = itemMap[lay.id];
		var spec = specs[item.asset];
		var zone = rules.zones[item.zone];

		// estimate label width from character count
		var charWidth = item.label.length * AVG_CHAR_WIDTH_PCT;
		var specWidth = spec.labelWidth * item.widthScale;
		var estWidth = Math.max(charWidth, specWidth);

		// available width = layout footprint, not just visual
		var availableWidth = Math.max(
			lay.width, specWidth
		);

		// try full label first
		var labelText = item.label;
		var lines: string[] = [labelText];
		var finalWidth = estWidth;

		if (estWidth > availableWidth) {
			// too wide: try splitting at middle space
			var split = splitLabelAtMiddle(labelText);
			if (split.length === 2) {
				// recalculate width as the wider of the two lines
				var w1 = split[0].length * AVG_CHAR_WIDTH_PCT;
				var w2 = split[1].length * AVG_CHAR_WIDTH_PCT;
				finalWidth = Math.max(w1, w2, specWidth);
				lines = split;
			}

			// if still too wide and shortLabel exists, try it
			if (finalWidth > availableWidth && item.shortLabel) {
				labelText = item.shortLabel;
				var shortCharW = labelText.length * AVG_CHAR_WIDTH_PCT;
				finalWidth = Math.max(shortCharW, specWidth);
				lines = [labelText];

				// split short label if it has a space
				if (finalWidth > availableWidth
					&& labelText.indexOf(' ') >= 0) {
					var sSplit = splitLabelAtMiddle(labelText);
					if (sSplit.length === 2) {
						var sw1 = sSplit[0].length * AVG_CHAR_WIDTH_PCT;
						var sw2 = sSplit[1].length * AVG_CHAR_WIDTH_PCT;
						finalWidth = Math.max(sw1, sw2, specWidth);
						lines = sSplit;
					}
				}
			}

			// if still too wide, no space, no short label: truncate
			if (finalWidth > availableWidth && lines.length === 1
				&& !item.shortLabel) {
				// estimate how many chars fit
				var maxChars = Math.floor(
					availableWidth / AVG_CHAR_WIDTH_PCT
				);
				if (maxChars > 2) {
					lines = [labelText.substring(0, maxChars - 1)
						+ '...'];
					finalWidth = availableWidth;
				}
			}
		}

		lay.labelLines = lines;
		lay.labelWidth = finalWidth;
		lay.labelMultiline = lines.length > 1;

		// center label X on item, clamped to padded zone bounds
		var centerX = lay.x + lay.width / 2;
		var halfW = finalWidth / 2;
		var paddedX0 = zone.x0 + ZONE_PADDING;
		var paddedX1 = zone.x1 - ZONE_PADDING;
		var minX = paddedX0 + halfW;
		var maxX = paddedX1 - halfW;
		lay.labelX = Math.max(minX, Math.min(maxX, centerX));

		// label Y below baseline
		lay.labelY = zone.baseline + rules.labelOffsetY;
	}

	// second pass: collision resolution per zone
	// group layouts by zone
	var zoneGroups: Record<string, ComputedItemLayout[]> = {};
	for (var i = 0; i < layouts.length; i++) {
		var zoneId = itemMap[layouts[i].id].zone;
		if (!zoneGroups[zoneId]) {
			zoneGroups[zoneId] = [];
		}
		zoneGroups[zoneId].push(layouts[i]);
	}

	// resolve collisions in each zone
	var zoneKeys = Object.keys(zoneGroups);
	for (var z = 0; z < zoneKeys.length; z++) {
		var group = zoneGroups[zoneKeys[z]];
		var zone = rules.zones[zoneKeys[z]];

		// sort by labelX
		group.sort(function(a: ComputedItemLayout,
			b: ComputedItemLayout): number {
			return a.labelX - b.labelX;
		});

		// up to 3 passes to resolve chained overlaps
		var tolerance = 0.5;
		for (var pass = 0; pass < 3; pass++)
		for (var i = 0; i < group.length - 1; i++) {
			var left = group[i];
			var right = group[i + 1];
			var leftEdge = left.labelX + left.labelWidth / 2;
			var rightEdge = right.labelX - right.labelWidth / 2;

			if (leftEdge + tolerance > rightEdge) {
				// overlap detected: nudge apart symmetrically
				var overlap = leftEdge + tolerance - rightEdge;
				// nudge capped at 2x zone gap for tighter zones
				var nudge = Math.min(overlap / 2, zone.gap * 2);

				left.labelX -= nudge;
				right.labelX += nudge;

				// clamp to padded zone bounds
				var pX0 = zone.x0 + ZONE_PADDING;
				var pX1 = zone.x1 - ZONE_PADDING;
				var lHalf = left.labelWidth / 2;
				var rHalf = right.labelWidth / 2;
				left.labelX = Math.max(
					pX0 + lHalf,
					Math.min(pX1 - lHalf, left.labelX)
				);
				right.labelX = Math.max(
					pX0 + rHalf,
					Math.min(pX1 - rHalf, right.labelX)
				);
			}
		}
	}
}

// ============================================
function computeSceneLayout(
	items: SceneItem[],
	specs: Record<string, AssetSpec>,
	rules: SceneLayoutRules,
	viewportW: number,
	viewportH: number
): ComputedItemLayout[] {
	// group items by zone
	var zoneGroups: Record<string, SceneItem[]> = {};
	for (var i = 0; i < items.length; i++) {
		var zoneId = items[i].zone;
		if (!zoneGroups[zoneId]) {
			zoneGroups[zoneId] = [];
		}
		zoneGroups[zoneId].push(items[i]);
	}

	// sort each group by priority then id for deterministic order
	var zoneKeys = Object.keys(zoneGroups);
	for (var z = 0; z < zoneKeys.length; z++) {
		zoneGroups[zoneKeys[z]].sort(
			function(a: SceneItem, b: SceneItem): number {
				if (a.priority !== b.priority) {
					return a.priority - b.priority;
				}
				if (a.id < b.id) return -1;
				if (a.id > b.id) return 1;
				return 0;
			}
		);
	}

	// layout each zone
	var allLayouts: ComputedItemLayout[] = [];
	for (var z = 0; z < zoneKeys.length; z++) {
		var key = zoneKeys[z];
		var zone = rules.zones[key];
		var zoneLayouts = layoutZoneItems(
			zoneGroups[key], zone, specs, viewportW, viewportH
		);
		for (var j = 0; j < zoneLayouts.length; j++) {
			allLayouts.push(zoneLayouts[j]);
		}
	}

	// compute labels with collision resolution
	layoutLabels(allLayouts, items, specs, rules);

	return allLayouts;
}
