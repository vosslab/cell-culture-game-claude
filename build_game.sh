#!/bin/bash
# build_game.sh - Compile TypeScript and concatenate into single HTML file
set -e

PARTS_DIR="parts"
ASSETS_DIR="assets/equipment"
OUTPUT="cell_culture_game.html"
TEMP_JS="_temp_bundle.js"
TEMP_TS="_temp_all.ts"

# Concatenate all TypeScript files in dependency order, then compile
TS_FILES=(
	"$PARTS_DIR/style_constants.ts"
	"$PARTS_DIR/scene_types.ts"
	"$PARTS_DIR/asset_specs.ts"
	"$PARTS_DIR/hood_config.ts"
	"$PARTS_DIR/bench_config.ts"
	"$PARTS_DIR/layout_engine.ts"
	"$PARTS_DIR/constants.ts"
	"$PARTS_DIR/game_state.ts"
	"$PARTS_DIR/cell_model.ts"
	"$PARTS_DIR/svg_overlays.ts"
	"$PARTS_DIR/svg_assets.ts"
	"$PARTS_DIR/ui_rendering.ts"
	"$PARTS_DIR/hood_scene.ts"
	"$PARTS_DIR/bench_scene.ts"
	"$PARTS_DIR/feed_cells.ts"
	"$PARTS_DIR/drug_treatment.ts"
	"$PARTS_DIR/incubator_scene.ts"
	"$PARTS_DIR/microscope_scene.ts"
	"$PARTS_DIR/scoring.ts"
	"$PARTS_DIR/init.ts"
)

# ============================================
# Process SVG asset files from assets/equipment/
# For each .svg file:
#   1. Strip XML declaration and Inkscape/Sodipodi metadata
#   2. Rewrite IDs with equipment prefix (body -> t75_flask__body)
#   3. Rewrite internal references (url(#id), href="#id")
#   4. Inject as TypeScript constant
# ============================================

> "$TEMP_TS"

# Process each SVG file in assets/equipment/
if [ -d "$ASSETS_DIR" ] && ls "$ASSETS_DIR"/*.svg 1>/dev/null 2>&1; then
	for svg_file in "$ASSETS_DIR"/*.svg; do
		# Extract equipment name from filename (e.g., t75_flask from t75_flask.svg)
		basename_noext=$(basename "$svg_file" .svg)
		# Convert to SCREAMING_SNAKE for TS constant name
		const_name="SVG_$(echo "$basename_noext" | tr '[:lower:]' '[:upper:]')"
		# Prefix for ID namespacing
		id_prefix="${basename_noext}__"

		# Read SVG content
		svg_content=$(cat "$svg_file")

		# Strip XML declaration
		svg_content=$(echo "$svg_content" | sed 's/<?xml[^?]*?>//g')

		# Strip Inkscape/Sodipodi metadata attributes
		svg_content=$(echo "$svg_content" | sed 's/ inkscape:[a-zA-Z_-]*="[^"]*"//g')
		svg_content=$(echo "$svg_content" | sed 's/ sodipodi:[a-zA-Z_-]*="[^"]*"//g')

		# Strip Inkscape namespace declarations
		svg_content=$(echo "$svg_content" | sed 's/ xmlns:inkscape="[^"]*"//g')
		svg_content=$(echo "$svg_content" | sed 's/ xmlns:sodipodi="[^"]*"//g')

		# Strip sodipodi:namedview elements (may span lines, handle single-line case)
		svg_content=$(echo "$svg_content" | sed 's/<sodipodi:namedview[^>]*\/>//g')

		# Rewrite IDs: id="foo" -> id="prefix__foo"
		svg_content=$(echo "$svg_content" | sed "s/id=\"\([^\"]*\)\"/id=\"${id_prefix}\1\"/g")

		# Rewrite url(#foo) references -> url(#prefix__foo)
		svg_content=$(echo "$svg_content" | sed "s/url(#\([^)]*\))/url(#${id_prefix}\1)/g")

		# Rewrite href="#foo" references -> href="#prefix__foo"
		svg_content=$(echo "$svg_content" | sed "s/href=\"#\([^\"]*\)\"/href=\"#${id_prefix}\1\"/g")

		# Rewrite clip-path="url(#foo)" already handled by url(# rule above

		# Write as TypeScript constant
		echo "const ${const_name} = \`" >> "$TEMP_TS"
		echo "$svg_content" >> "$TEMP_TS"
		echo "\`;" >> "$TEMP_TS"
		echo "" >> "$TEMP_TS"
	done
fi

# Legacy: inject cell-culture2-clean.svg if it exists
if [ -f "cell-culture2-clean.svg" ]; then
	echo -n "const CELL_CULTURE_PLATE_SVG = \`" >> "$TEMP_TS"
	cat cell-culture2-clean.svg >> "$TEMP_TS"
	echo "\`;" >> "$TEMP_TS"
	echo "" >> "$TEMP_TS"
else
	# Provide empty fallback so TypeScript does not error on the declare
	echo "const CELL_CULTURE_PLATE_SVG = '';" >> "$TEMP_TS"
	echo "" >> "$TEMP_TS"
fi

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
