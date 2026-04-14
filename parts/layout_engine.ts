// ============================================
// layout_engine.ts - Scene layout engine
// Computes positions and labels for scene items
// ============================================
//
// Alignment-preservation invariant (applies under all inputs, including
// pathological overflow where items visually overlap):
//
//   align === 'left':   first.x ~= effectiveX0
//   align === 'right':  last.x + last.width ~= effectiveX1
//   align === 'center': (first.x + last.x + last.width) / 2
//                       ~= (effectiveX0 + effectiveX1) / 2
//
// All comparisons use EPSILON tolerance. Visible item overlap is the
// acceptable signal that content is oversized for its zone; silently
// re-centering or clamping items to the opposite edge is never acceptable.
// Bounds checks operate on visual boxes (lay.x, lay.x + lay.width), not
// footprints. Footprints are spacing hints used only for inter-item
// distribution and label-availability estimation.

// Average character width as percentage of font size
const AVG_CHAR_WIDTH_PCT = 0.55;

// Float tolerance for fit-vs-overflow comparisons and invariant checks
const EPSILON = 0.001;

// Max footprint inflation: label can expand footprint up to K * visual width
const MAX_FOOTPRINT_RATIO = 1.4;

// Max gap between items (% of scene) to prevent excessive spreading
const MAX_GAP = 4;

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
		case 'sterile_water': return SVG_MEDIA_BOTTLE;
		case 'pbs_bottle': return SVG_MEDIA_BOTTLE;
		case 'conical_15ml_rack': return SVG_CONICAL_15ML_RACK;
		case 'dilution_tube_rack': return SVG_DILUTION_TUBE_RACK;
		case 'mtt_vial': return SVG_MEDIA_BOTTLE;
		case 'dmso_bottle': return SVG_MEDIA_BOTTLE;
		case 'carboplatin_stock': return SVG_MEDIA_BOTTLE;
		case 'metformin_stock': return SVG_MEDIA_BOTTLE;
		case 'micropipette_rack': return SVG_MICROPIPETTE_RACK;
		case 'biohazard_decant': return SVG_BIOHAZARD_DECANT;
		case 'centrifuge': return SVG_CENTRIFUGE;
		case 'water_bath': return SVG_WATER_BATH;
		case 'vortex': return SVG_VORTEX;
		case 'cell_counter': return SVG_CELL_COUNTER;
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
// Depth tiers for scene items. back = parked on rear shelf (smaller and
// higher in the scene), mid = normal working position (baseline as-is,
// no scale change), front = active / pulled-forward (slightly larger and
// slightly lower). depthScale multiplies item visual width; depthBaseline
// is added to the zone's baseline (larger baseline = lower on screen).
// back_shelf goes UP (baseline - 4), front goes DOWN (baseline + 4).
const DEPTH_SCALE_BACK = 0.80;
const DEPTH_SCALE_MID = 1.00;
const DEPTH_SCALE_FRONT = 1.10;
const DEPTH_BASELINE_BACK = -4;
const DEPTH_BASELINE_MID = 0;
const DEPTH_BASELINE_FRONT = 4;

// ============================================
function depthScaleFor(depth: string | undefined): number {
	if (depth === 'back') return DEPTH_SCALE_BACK;
	if (depth === 'front') return DEPTH_SCALE_FRONT;
	return DEPTH_SCALE_MID;
}

// ============================================
function depthBaselineOffsetFor(depth: string | undefined): number {
	if (depth === 'back') return DEPTH_BASELINE_BACK;
	if (depth === 'front') return DEPTH_BASELINE_FRONT;
	return DEPTH_BASELINE_MID;
}

// ============================================
// Verify the alignment-preservation invariant for a cluster of items.
// first = leftmost item (lowest x), last = rightmost item (highest x).
// Returns true iff the mode-specific visual-edge equality holds.
function clusterAnchorOk(
	first: ComputedItemLayout,
	last: ComputedItemLayout,
	align: string,
	effectiveX0: number,
	effectiveX1: number
): boolean {
	if (align === 'left') {
		return Math.abs(first.x - effectiveX0) < EPSILON;
	}
	if (align === 'right') {
		return Math.abs((last.x + last.width) - effectiveX1) < EPSILON;
	}
	if (align === 'justify') {
		// Both first left edge AND last right edge must be flush.
		var leftOk = Math.abs(first.x - effectiveX0) < EPSILON;
		var rightOk = Math.abs((last.x + last.width) - effectiveX1) < EPSILON;
		return leftOk && rightOk;
	}
	// center
	var clusterMid = (first.x + last.x + last.width) / 2;
	var zoneMid = (effectiveX0 + effectiveX1) / 2;
	return Math.abs(clusterMid - zoneMid) < EPSILON;
}

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
	// Tab-stops: partition items by per-item alignStop, run each
	// sub-cluster as its own row with the corresponding alignment, then
	// concatenate. Items at the same stop are packed with zone.gap; the
	// whitespace between stops is whatever the sub-cluster math leaves.
	if (zone.align === 'tab-stops') {
		var leftItems: SceneItem[] = [];
		var centerItems: SceneItem[] = [];
		var rightItems: SceneItem[] = [];
		for (var ti = 0; ti < n; ti++) {
			var stop = zoneItems[ti].alignStop || 'center';
			if (stop === 'left') leftItems.push(zoneItems[ti]);
			else if (stop === 'right') rightItems.push(zoneItems[ti]);
			else centerItems.push(zoneItems[ti]);
		}
		var groups: Array<{items: SceneItem[], align: string}> = [
			{ items: leftItems,   align: 'left' },
			{ items: centerItems, align: 'center' },
			{ items: rightItems,  align: 'right' },
		];
		for (var gi = 0; gi < groups.length; gi++) {
			if (groups[gi].items.length === 0) continue;
			var subZone: ZoneDef = {
				x0: zone.x0,
				x1: zone.x1,
				baseline: zone.baseline,
				gap: zone.gap,
				align: groups[gi].align as ('left' | 'center' | 'right'),
			};
			var subLayouts = layoutZoneItems(
				groups[gi].items, subZone, specs, viewportW, viewportH
			);
			for (var sj = 0; sj < subLayouts.length; sj++) {
				results.push(subLayouts[sj]);
			}
		}
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
		// depth multiplier: back 0.80, mid 1.00, front 1.10.
		// Applied to item.widthScale so downstream footprint and label math
		// all see the depth-adjusted size consistently.
		var depthScale = depthScaleFor(item.depth);
		var visualW = spec.defaultWidth * item.widthScale * depthScale;
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
		// cap label influence on footprint to prevent spacing blowup
		var cappedLabelW = Math.min(estLabelW, visualW * MAX_FOOTPRINT_RATIO);
		var footprint = Math.max(visualW, cappedLabelW);
		widths.push(visualW);
		footprints.push(footprint);
		totalFootprint += footprint;
	}

	// compute scale factor and gap
	var scaleFactor = 1.0;
	var gap = 0;
	var startX = effectiveX0;
	var align = zone.align || 'center';

	if (n === 1) {
		// single item: place based on alignment using visual-edge math.
		// startX is the LEFT EDGE OF THE FOOTPRINT SLOT; the visual box
		// sits inset by (footprint - width) / 2 inside that slot. To make
		// the visual edge hug the zone edge, offset startX by that inset.
		// 'justify' with a single item is ambiguous (both edges cannot be
		// flush simultaneously); fall back to center placement.
		var soloInset = (footprints[0] - widths[0]) / 2;
		if (align === 'center' || align === 'justify') {
			startX = effectiveX0 + (zoneWidth - widths[0]) / 2 - soloInset;
		} else if (align === 'right') {
			startX = effectiveX1 - widths[0] - soloInset;
		} else {
			// left
			startX = effectiveX0 - soloInset;
		}
	} else {
		// multiple items: use footprints for distribution
		var totalGapWidth = (n - 1) * zone.gap;
		if (totalFootprint + totalGapWidth <= zoneWidth + EPSILON) {
			if (align === 'left' || align === 'right') {
				// left/right align: cluster items at edge, use minimum gap
				gap = zone.gap;
			} else if (align === 'justify') {
				// justify (space-between): expand gap uncapped so first
				// and last items' VISUAL edges (not footprint edges) land
				// on effectiveX0 and effectiveX1. The visual span equals
				// scaledFootprintTotal + (n-1)*gap - firstInset - lastInset
				// and must equal zoneWidth, so:
				//   gap = (zoneWidth + firstInset + lastInset - totalFp)
				//         / (n - 1)
				var jFirstInset = (footprints[0] - widths[0]) / 2;
				var jLastInset  = (footprints[n - 1] - widths[n - 1]) / 2;
				gap = (zoneWidth + jFirstInset + jLastInset - totalFootprint)
					/ (n - 1);
				// Never shrink below the zone's configured minimum gap;
				// if items would need to overlap to reach both edges,
				// fall back to zone.gap and accept less-than-flush span.
				if (gap < zone.gap) {
					gap = zone.gap;
				}
			} else {
				// center align: spread gaps evenly, capped
				gap = Math.min(
					MAX_GAP,
					Math.max(zone.gap, (zoneWidth - totalFootprint) / (n - 1))
				);
			}
		} else {
			// overflow: shrink gaps first, then scale
			gap = zone.gap;
			totalGapWidth = (n - 1) * gap;
			scaleFactor = Math.min(
				(zoneWidth - totalGapWidth) / totalFootprint,
				1.0
			);
			// enforce minimum scale to keep items legible
			scaleFactor = Math.max(scaleFactor, MIN_SCALE);
		}

		// apply scale factor to both visual and footprint
		var scaledFootprintTotal = 0;
		for (var i = 0; i < n; i++) {
			widths[i] = widths[i] * scaleFactor;
			footprints[i] = footprints[i] * scaleFactor;
			scaledFootprintTotal += footprints[i];
		}

		// post-scale overflow recovery (Bug 1 fix): if items still do not
		// fit after the MIN_SCALE floor was applied, collapse the gap -
		// potentially to a negative value so items visibly overlap while
		// the cluster origin still honors the alignment invariant.
		var naiveSpan = scaledFootprintTotal + (n - 1) * gap;
		if (naiveSpan > zoneWidth + EPSILON) {
			gap = (zoneWidth - scaledFootprintTotal) / (n - 1);
			// gap may be negative; that is intentional
		}
		var totalSpan = scaledFootprintTotal + (n - 1) * gap;

		// compute starting X using visual-edge math: the boundary items'
		// VISUAL edges (not footprint edges) hug the zone edges.
		// first item's visual left = startX + (footprints[0] - widths[0]) / 2
		// last item's  visual right = startX + totalSpan
		//                             - (footprints[n-1] - widths[n-1]) / 2
		var firstInset = (footprints[0] - widths[0]) / 2;
		var lastInset = (footprints[n - 1] - widths[n - 1]) / 2;
		if (align === 'center') {
			// center the visual span within the zone
			var visualSpan = totalSpan - firstInset - lastInset;
			startX = (effectiveX0 + effectiveX1) / 2
				- visualSpan / 2 - firstInset;
		} else if (align === 'right') {
			startX = effectiveX1 - totalSpan + lastInset;
		} else if (align === 'justify') {
			// justify: first item's visual left edge hugs effectiveX0.
			// Gap was chosen above so last item's visual right edge lands
			// on effectiveX1 (space-between distribution). If the gap
			// floor kicked in (items couldn't expand enough), the right
			// edge may fall short; that is the intentional fallback.
			startX = effectiveX0 - firstInset;
		} else {
			// left
			startX = effectiveX0 - firstInset;
		}
	}

	// assign positions left-to-right using footprints.
	// No per-item visual clamp (Bug 2 fix): the startX math above keeps
	// items inside the zone by construction. An invariant check after the
	// loop catches any regression.
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

		// determine baseline for this item. Order of precedence:
		//   1. item.baselineOverride (explicit per-item value wins)
		//   2. zone.baseline + depth offset (back -4, mid 0, front +4)
		// A manual baselineOverride is intentional and must not be nudged
		// by depth; depth tiers only shift items that ride the zone
		// baseline.
		var baseline: number;
		if (item.baselineOverride !== undefined) {
			baseline = item.baselineOverride;
		} else {
			baseline = zone.baseline + depthBaselineOffsetFor(item.depth);
		}
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

		// build layout with placeholder label values
		// labelX centered on visual object, not footprint
		var layout: ComputedItemLayout = {
			id: item.id,
			x: visualX,
			y: top,
			width: itemWidth,
			height: height,
			footprint: itemFootprint,
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

	// ---- post-condition invariant checks (safety net for Bug 2 removal) ----
	// first = leftmost (index 0), last = rightmost (index n-1)
	var first = results[0];
	var last = results[n - 1];
	if (!clusterAnchorOk(first, last, align, effectiveX0, effectiveX1)) {
		console.warn(
			'layout_engine: alignment anchor violated'
			+ ' (align=' + align + ', n=' + n + ')'
			+ ' first.x=' + first.x.toFixed(3)
			+ ' last.x+w=' + (last.x + last.width).toFixed(3)
			+ ' effective=[' + effectiveX0.toFixed(3)
			+ ',' + effectiveX1.toFixed(3) + ']'
		);
	}
	// visual-box containment only in non-overflow case (gap >= -EPSILON)
	if (gap >= -EPSILON) {
		if (first.x < effectiveX0 - EPSILON) {
			console.warn(
				'layout_engine: first item escapes left zone edge'
				+ ' first.x=' + first.x.toFixed(3)
				+ ' effectiveX0=' + effectiveX0.toFixed(3)
			);
		}
		if (last.x + last.width > effectiveX1 + EPSILON) {
			console.warn(
				'layout_engine: last item escapes right zone edge'
				+ ' last.x+w=' + (last.x + last.width).toFixed(3)
				+ ' effectiveX1=' + effectiveX1.toFixed(3)
			);
		}
	}

	return results;
}

// ============================================
// Group layouts by their source item's zone ID. Uses itemMap for the
// id -> SceneItem lookup; every layout must resolve or the function throws.
function groupLayoutsByZone(
	layouts: ComputedItemLayout[],
	itemMap: Record<string, SceneItem>
): Record<string, ComputedItemLayout[]> {
	var groups: Record<string, ComputedItemLayout[]> = {};
	for (var i = 0; i < layouts.length; i++) {
		var src = itemMap[layouts[i].id];
		if (!src) {
			throw new Error(
				'groupLayoutsByZone: layout id ' + layouts[i].id
				+ ' has no matching item in itemMap'
			);
		}
		var zoneId = src.zone;
		if (!groups[zoneId]) {
			groups[zoneId] = [];
		}
		groups[zoneId].push(layouts[i]);
	}
	return groups;
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

		// estimate label width from character count (unscaled char units)
		var charWidth = item.label.length * AVG_CHAR_WIDTH_PCT;
		var specWidth = spec.labelWidth * item.widthScale;
		var estWidth = Math.max(charWidth, specWidth);

		// Available width for label wrap decisions. lay.footprint is
		// post-scale, so we recover the effective scale from the ratio of
		// rendered visual width to unscaled visual width and project
		// lay.footprint back into unscaled units. All comparisons below
		// (charWidth, estWidth, finalWidth, availableWidth) are then in
		// unscaled units, matching the existing char-width math.
		var unscaledVisual = spec.defaultWidth * item.widthScale;
		var effectiveScale = unscaledVisual > 0
			? lay.width / unscaledVisual : 1.0;
		var unscaledFootprint = effectiveScale > 0
			? lay.footprint / effectiveScale : lay.footprint;
		var availableWidth = Math.max(unscaledFootprint, specWidth);

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

		// label X centered on object, clamped to padded zone bounds
		var centerX = lay.x + lay.width / 2;
		var halfW = finalWidth / 2;
		var paddedX0 = zone.x0 + ZONE_PADDING;
		var paddedX1 = zone.x1 - ZONE_PADDING;
		var minX = paddedX0 + halfW;
		var maxX = paddedX1 - halfW;
		lay.labelX = Math.max(minX, Math.min(maxX, centerX));

		// labels always above the object to avoid going outside hood
		lay.labelY = lay.y - rules.labelOffsetY;
	}

	// second pass: collision resolution per zone
	var zoneGroups = groupLayoutsByZone(layouts, itemMap);
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

	// final pass: group-level clamp to scene bounds if defined.
	// Group items by zone and translate each group as a unit so that
	// right/center/left alignment semantics are preserved even when one
	// item in a cluster would violate sceneBounds. (Bug 4 fix.)
	if (rules.sceneBounds) {
		var sb = rules.sceneBounds;
		var itemMapForClamp: Record<string, SceneItem> = {};
		for (var i = 0; i < items.length; i++) {
			itemMapForClamp[items[i].id] = items[i];
		}
		var clampGroups = groupLayoutsByZone(allLayouts, itemMapForClamp);
		var clampKeys = Object.keys(clampGroups);
		for (var gi = 0; gi < clampKeys.length; gi++) {
			var gKey = clampKeys[gi];
			var gLays = clampGroups[gKey];
			var gZone = rules.zones[gKey];
			var gAlign = (gZone && gZone.align) || 'center';

			// compute max violations on each axis
			var maxLeft = 0;
			var maxRight = 0;
			var maxTop = 0;
			var maxBottom = 0;
			for (var li = 0; li < gLays.length; li++) {
				var gLay = gLays[li];
				if (gLay.x < sb.left) {
					var lv = sb.left - gLay.x;
					if (lv > maxLeft) maxLeft = lv;
				}
				if (gLay.x + gLay.width > sb.right) {
					var rv = (gLay.x + gLay.width) - sb.right;
					if (rv > maxRight) maxRight = rv;
				}
				if (gLay.y < sb.top) {
					var tv = sb.top - gLay.y;
					if (tv > maxTop) maxTop = tv;
				}
				if (gLay.y + gLay.height > sb.bottom) {
					var bv = (gLay.y + gLay.height) - sb.bottom;
					if (bv > maxBottom) maxBottom = bv;
				}
			}

			// x-axis: resolve violations, alignment-preferred tiebreak
			var dx = 0;
			if (maxLeft > EPSILON && maxRight > EPSILON) {
				// group is wider than sceneBounds -- impossible to satisfy
				// both edges; honor the alignment-preferred edge.
				if (gAlign === 'right') {
					dx = -maxRight;
				} else {
					// left or center default to left edge
					dx = maxLeft;
				}
				console.warn(
					'layout_engine: zone "' + gKey
					+ '" exceeds sceneBounds width'
					+ ' (align=' + gAlign + ')'
				);
			} else if (maxLeft > 0) {
				dx = maxLeft;
			} else if (maxRight > 0) {
				dx = -maxRight;
			}

			// y-axis: same pattern but no alignment concept for vertical
			var dy = 0;
			if (maxTop > EPSILON && maxBottom > EPSILON) {
				// height exceeds sceneBounds: prefer top
				dy = maxTop;
				console.warn(
					'layout_engine: zone "' + gKey
					+ '" exceeds sceneBounds height'
				);
			} else if (maxTop > 0) {
				dy = maxTop;
			} else if (maxBottom > 0) {
				dy = -maxBottom;
			}

			// apply uniform shift to every item AND label in the group
			if (dx !== 0 || dy !== 0) {
				for (var li2 = 0; li2 < gLays.length; li2++) {
					var s = gLays[li2];
					s.x += dx;
					s.y += dy;
					s.labelX += dx;
					s.labelY += dy;
				}
			}
		}
	}

	return allLayouts;
}
