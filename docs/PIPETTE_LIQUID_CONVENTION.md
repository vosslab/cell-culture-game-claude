# Pipette Liquid Fill Convention

## Overview

Serological pipettes in the game visualize liquid fill through a bottom-anchored fill rectangle clipped to the inner glass tube. This document explains the asset structure and color conventions.

## SVG Structure: anchor_liquid_clip

Each pipette SVG that supports liquid visualization must define a `<clipPath>` with id `anchor_liquid_clip` shaped to the container interior (glass tube only, excluding cotton plug and tip):

```svg
<defs>
	<!-- Liquid clipping region: follows inner glass tube only -->
	<clipPath id="anchor_liquid_clip">
		<rect x="5.5" y="15" width="5" height="101" rx="0.5"/>
	</clipPath>
</defs>
```

The clip path geometry must cover the interior space where liquid appears without spilling onto non-liquid parts of the tool.

## Anchor Elements

Two invisible anchor rects help position overlays:

1. **anchor_liquid_bounds**: Defines the fill region where liquid can rise. Typically matches the inner tube bounds.
   ```svg
   <rect id="anchor_liquid_bounds" x="5.5" y="15" width="5" height="101" fill="none" stroke="none" display="none"/>
   ```

2. **anchor_liquid_clip**: The clipPath referenced above, prevents liquid from overflowing.

## Color Map

Liquid colors are driven by reagent `colorKey` values from `inventory_data.ts:REAGENTS`:

| Reagent | Color Key | Hex Code | Notes |
| --- | --- | --- | --- |
| Complete media | media | #f7a6b8 | Pink |
| PBS buffer | pbs | #b8e5ff | Light blue |
| Trypsin | trypsin | #ffe082 | Yellow |
| Cell suspension | cells | #f3d6a2 | Cloudy tan |
| Drug working stock | drug | #d8b4ff | Violet |
| MTT reagent | mtt | #fff59d | Pale yellow |
| DMSO | dmso | #e0e0e0 | Gray |

Colors are defined in `parts/style_constants.ts:COLOR_MAP` and must match the `displayColor` field in `inventory_data.ts`.

## Implementation: createPipetteLiquidOverlay

```typescript
function createPipetteLiquidOverlay(
	equipmentId: string,        // e.g., "sero_pipette"
	volumeMl: number,           // volume in milliliters
	capacityMl: number,         // total capacity in milliliters
	color: string,              // hex color code
	svgString: string           // base SVG to parse anchors from
): string
```

The function:

1. Clamps volume to [0, capacityMl]
2. Parses `anchor_liquid_bounds` from the base SVG
3. Computes fill height as `height * (volume / capacity)`
4. Positions the rect at the bottom of the bounds (bottom-anchored)
5. Clips the rect to `anchor_liquid_clip`
6. Returns SVG string injected into `overlay_root`

## Game State Integration

When a pipette is loaded with liquid via `resolveInteraction`, the result populates:

```typescript
gameState.heldLiquid = {
	tool: 'serological_pipette',
	liquid: 'pbs',
	volumeMl: 4,
	colorKey: 'pbs'
};
```

When the pipette is used (discharged) or put down, `heldLiquid` is cleared:

```typescript
gameState.heldLiquid = null;
```

## Rendering in Hood Scene

`parts/hood_scene.ts:getItemSvgHtml()` checks if `gameState.heldLiquid.tool` matches the item being rendered:

```typescript
case 'serological_pipette':
	if (gameState.heldLiquid && gameState.heldLiquid.tool === 'serological_pipette') {
		const reagent = REAGENTS[gameState.heldLiquid.liquid];
		const color = reagent ? reagent.displayColor : COLOR_MAP[gameState.heldLiquid.colorKey];
		return getSeroPipetteSvg(gameState.heldLiquid.volumeMl, color);
	}
	return getSeroPipetteSvg();
```

## Future Extensions

- **Multichannel pipette**: 8 parallel channels with individual fill rects (deferred to M5)
- **Aspirating pipette**: Similar single-tube fill (deferred to M5)
- **Dynamic color override**: Drag-and-drop mixing (not in scope for this plan)

## Testing

`devel/test_pipette_liquid.mjs` uses Playwright to verify:

1. Liquid overlay present when pipette is loaded
2. Overlay color matches expected reagent color
3. Fill height is non-zero and consistent with volume/capacity ratio
