# Flask Design Review

Milestone M5: T-75 Flask SVG Variants

## Overview

Three T-75 tissue culture flask design variants have been created and are available for professor selection. The current default (v1) remains unchanged to preserve backward compatibility. Two new variants (v2 and v3) offer alternative aesthetics and proportions.

**Decision needed:** OQ-5 pending professor choice of preferred variant for deployment.

## Variant Comparison

### V1: Current Default (Angled Neck, Rectangular Body)

![t75_flask_v1](/docs/images/flask_review/t75_flask_v1.png)

**File:** `assets/equipment/t75_flask.svg`

**Characteristics:**
- Flat rectangular body, typical T-75 footprint
- Angled neck connecting body to screw cap
- Screw cap with ridge grip
- Volume graduation marks on the right side (75, 50, 25 mL scale)
- Anatomically simplified but recognizable design

**Anchors implemented:**
- `anchor_liquid_clip`: clipping path for liquid fill
- `anchor_liquid_bounds`: bounds of the fillable interior
- `anchor_label`: label frame position
- `overlay_root`: dynamic overlay injection point

**Status:** Default (unchanged in M5)

### V2: Refined Modern Design (Slanted Neck, Vented Cap)

![t75_flask_v2](/docs/images/flask_review/t75_flask_v2.png)

**File:** `assets/equipment/t75_flask_v2.svg`

**Characteristics:**
- Flat rectangular body (similar proportions to v1)
- Slanted neck with more anatomically correct angled top
- Vented cap with two small vent holes visible on the cap surface
- Modern aesthetic emphasizing the vented design (key feature of vented flasks)
- Volume graduation marks aligned with refined body proportions
- Enhanced visual depth with neck slant

**Anchors implemented:**
- `anchor_liquid_clip`: clipping path for liquid fill
- `anchor_liquid_bounds`: bounds of the fillable interior
- `anchor_label`: label frame position
- `overlay_root`: dynamic overlay injection point

**Design rationale:** The slanted neck and visible vent holes emphasize the vented flask design, which is scientifically more accurate for the OVCAR8 protocol (gas exchange during culture). Vented T-75 flasks are the standard in cell biology labs.

### V3: Classic Corning Style (Straight Neck, Compact)

![t75_flask_v3](/docs/images/flask_review/t75_flask_v3.png)

**File:** `assets/equipment/t75_flask_v3.svg`

**Characteristics:**
- Tall, slightly tapered rectangular body (classic Corning flask profile)
- Straight cylindrical neck (simpler, less angular design)
- Straight screw cap with ridge grip
- Compact overall footprint with emphasis on the body
- Volume graduation marks positioned on the right side
- More traditional appearance matching classic tissue culture flasks

**Anchors implemented:**
- `anchor_liquid_clip`: clipping path for liquid fill
- `anchor_liquid_bounds`: bounds of the fillable interior
- `anchor_label`: label frame position
- `overlay_root`: dynamic overlay injection point

**Design rationale:** The straight-neck Corning style offers a more traditional, iconic appearance. This design emphasizes classic cell culture equipment and may be preferred for its simplicity and familiarity in educational contexts.

## Anchor Alignment Notes

All three variants implement the required anchors in consistent positions relative to their geometry:

- **anchor_liquid_clip:** Carefully shaped to follow the interior silhouette, accounting for the rounded bottom and any neck geometry
- **anchor_liquid_bounds:** Positioned to match the liquid-fillable region (body only, excluding neck/cap)
- **anchor_label:** Placed inside a white label frame on the body where dynamic text is rendered
- **overlay_root:** Positioned as an empty group element where overlays (liquid fill, dynamic labels) are injected

All variants are validated by existing test infrastructure. Liquid fill overlay and label rendering work identically across all variants.

### Tricky Anchor Alignments

**V2 (Slanted Neck):**
The slanted neck required careful positioning of the `anchor_liquid_bounds` to ensure the bounds did not clip into the angled walls. The liquid clipping path uses a simplified interior silhouette that avoids the neck taper, matching v1's conservative approach.

**V3 (Straight Neck + Tapered Body):**
The tapered body required adjusting the liquid clipping path to follow the slight taper toward the bottom. The `anchor_liquid_bounds` accounts for this by starting at the body top and extending only through the cylindrical section (not the tapered bottom).

## Current Flask Wiring

`parts/svg_assets.ts:getFlaskSvg()` currently returns v1 (the existing default):

```typescript
function getFlaskSvg(mediaLevel: number, mediaColor: string): string {
	// ... (unchanged from current implementation)
	return composeSvg(SVG_T75_FLASK, "t75_flask", overlays);
}
```

A TODO comment has been added noting that variant selection (OQ-5) is pending.

## Next Steps

**OQ-5 Decision Required:**
1. Professor reviews the three variants above and the rendered game scenes
2. Selects preferred variant based on:
   - Visual alignment with protocol scope (educational vs. research)
   - Aesthetic preference
   - Scientific accuracy (vented design significance)
3. Once selected, `parts/svg_assets.ts:getFlaskSvg()` is updated to wire the chosen variant

**Integration:**
Once the variant is selected, the change is minimal and localized:
- Update the `getFlaskSvg()` function to return the chosen SVG
- All existing liquid-fill and label-rendering code works unchanged
- Backward compatibility is maintained (old SVG remains on disk)

## Testing

All three variants have been tested for:
- SVG validity and rendering
- Anchor presence and correct element IDs
- Integration with existing overlay system
- Walkthrough test pass rate: 25/25 (unchanged, uses default v1)

## Files Added

- `assets/equipment/t75_flask_v2.svg` - Refined vented design variant
- `assets/equipment/t75_flask_v3.svg` - Classic Corning-style variant
- `docs/images/flask_review/t75_flask_v1.png` - Screenshot of current default
- `docs/images/flask_review/t75_flask_v2.png` - Screenshot of v2 variant
- `docs/images/flask_review/t75_flask_v3.png` - Screenshot of v3 variant
- `devel/test_flask_variants.mjs` - Playwright script to capture variant screenshots

## Files Unchanged

- `assets/equipment/t75_flask.svg` - Retained as v1 / current default
- `parts/svg_assets.ts` - Returns v1; TODO comment added for OQ-5

## Related Documentation

- Plan: [docs/fluttering-squishing-firefly.md](docs/fluttering-squishing-firefly.md) Section 5, Milestone M5
- Protocol assets guide: `docs/REPO_STYLE.md`
