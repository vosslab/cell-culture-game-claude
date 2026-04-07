#!/bin/bash
# build_game.sh - Compile TypeScript and concatenate into single HTML file
set -e

PARTS_DIR="parts"
OUTPUT="cell_culture_game.html"
TEMP_JS="_temp_bundle.js"

# Concatenate all TypeScript files in dependency order, then compile
TS_FILES=(
	"$PARTS_DIR/constants.ts"
	"$PARTS_DIR/game_state.ts"
	"$PARTS_DIR/cell_model.ts"
	"$PARTS_DIR/svg_assets.ts"
	"$PARTS_DIR/ui_rendering.ts"
	"$PARTS_DIR/hood_scene.ts"
	"$PARTS_DIR/feed_cells.ts"
	"$PARTS_DIR/drug_treatment.ts"
	"$PARTS_DIR/incubator_scene.ts"
	"$PARTS_DIR/microscope_scene.ts"
	"$PARTS_DIR/scoring.ts"
	"$PARTS_DIR/init.ts"
)

# Generate SVG asset constant from cell-culture2.svg
TEMP_TS="_temp_all.ts"
echo -n "const CELL_CULTURE_PLATE_SVG = \`" > "$TEMP_TS"
cat cell-culture2-clean.svg >> "$TEMP_TS"
echo "\`;" >> "$TEMP_TS"
echo "" >> "$TEMP_TS"

# Concatenate all TS into one file, then compile
for f in "${TS_FILES[@]}"; do
	if [ -f "$f" ]; then
		cat "$f" >> "$TEMP_TS"
		echo "" >> "$TEMP_TS"
	fi
done

# Compile TypeScript to JavaScript (strip types only, no module system)
# Strip TypeScript types only, no module wrapping (keeps all declarations global)
npx esbuild "$TEMP_TS" --outfile="$TEMP_JS" --target=es2020 --bundle=false 2>/dev/null

# Build the HTML file
cat "$PARTS_DIR/head.html" > "$OUTPUT"
echo "<style>" >> "$OUTPUT"
cat "$PARTS_DIR/style.css" >> "$OUTPUT"
echo "</style>" >> "$OUTPUT"
cat "$PARTS_DIR/body.html" >> "$OUTPUT"
echo "<script>" >> "$OUTPUT"
cat "$TEMP_JS" >> "$OUTPUT"
echo "</script>" >> "$OUTPUT"
cat "$PARTS_DIR/tail.html" >> "$OUTPUT"

# Clean up temp files
rm -f "$TEMP_TS" "$TEMP_JS"

echo "Built: $OUTPUT"
