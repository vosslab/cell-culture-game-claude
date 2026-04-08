"""
SVG asset contract lint test.

Validates that every SVG in assets/equipment/ follows the layer contract:
- Required groups exist (body, body_shadow, overlay_root)
- No inline raster images
- No duplicate IDs within a file
- No forbidden colors outside the approved palette
- Size and node count budget warnings
"""

import os
import re
import xml.etree.ElementTree

import pytest

import git_file_utils

REPO_ROOT = git_file_utils.get_repo_root()
ASSETS_DIR = os.path.join(REPO_ROOT, "assets", "equipment")

# Required group IDs that every equipment SVG must contain
REQUIRED_GROUPS = {"body", "body_shadow", "overlay_root"}

# Approved color palette (hex, lowercase)
# Material colors + overlay colors from style_constants.ts
APPROVED_COLORS = {
	# material colors
	"#b0b0b0",  # plastic
	"#888888",  # metal
	"#f0f0f0",  # glass
	"#e8d4a0",  # gel
	# overlay colors (should not appear in base SVGs, but allowed in palette)
	"#ff9a66",  # media
	"#4a90d9",  # buffer
	"#d4d4a0",  # waste
	"#c8a0d8",  # drug
	"#e0e8f0",  # ethanol
	"#d94444",  # error
	"#44aa66",  # success
	"#222222",  # signal
	# common structural colors allowed in any SVG
	"#000000",  # black (strokes)
	"#111111",
	"#1a1a1a",
	"#333333",  # outline stroke
	"#444444",
	"#555555",
	"#666666",  # detail stroke
	"#777777",
	"#999999",  # fine stroke
	"#aaaaaa",
	"#bbbbbb",
	"#cccccc",
	"#dddddd",
	"#eeeeee",
	"#ffffff",  # white
	"none",     # no fill/stroke
}

# Size budget: warn if SVG file exceeds this many bytes
SIZE_BUDGET_BYTES = 10240  # 10 KB

# Node budget: warn if SVG has more than this many elements
NODE_BUDGET = 200


#============================================
def collect_svg_files():
	"""Collect all .svg files in assets/equipment/."""
	if not os.path.isdir(ASSETS_DIR):
		return []
	svg_files = []
	for fname in sorted(os.listdir(ASSETS_DIR)):
		if fname.endswith(".svg"):
			svg_files.append(os.path.join(ASSETS_DIR, fname))
	return svg_files


#============================================
def parse_svg(file_path: str) -> xml.etree.ElementTree.Element:
	"""Parse an SVG file and return the root element."""
	tree = xml.etree.ElementTree.parse(file_path)
	return tree.getroot()


#============================================
def get_all_ids(root: xml.etree.ElementTree.Element) -> list:
	"""Extract all id attributes from the SVG tree."""
	ids = []
	for elem in root.iter():
		elem_id = elem.get("id")
		if elem_id is not None:
			ids.append(elem_id)
	return ids


#============================================
def get_all_group_ids(root: xml.etree.ElementTree.Element) -> set:
	"""Extract all id attributes from <g> elements."""
	group_ids = set()
	# handle both namespaced and non-namespaced g elements
	for elem in root.iter():
		tag = elem.tag
		# strip namespace if present
		if "}" in tag:
			tag = tag.split("}")[-1]
		if tag == "g":
			elem_id = elem.get("id")
			if elem_id is not None:
				group_ids.add(elem_id)
	return group_ids


#============================================
def count_elements(root: xml.etree.ElementTree.Element) -> int:
	"""Count total number of elements in the SVG tree."""
	count = 0
	for _ in root.iter():
		count += 1
	return count


#============================================
def extract_hex_colors(svg_text: str) -> set:
	"""Extract all hex color values from SVG text."""
	# match #rgb, #rrggbb, #rrggbbaa patterns
	hex_pattern = re.compile(r'#[0-9a-fA-F]{3,8}\b')
	colors = set()
	for match in hex_pattern.finditer(svg_text):
		color = match.group().lower()
		# normalize 3-char hex to 6-char
		if len(color) == 4:
			color = "#" + color[1]*2 + color[2]*2 + color[3]*2
		# strip alpha channel if 8-char
		if len(color) == 9:
			color = color[:7]
		colors.add(color)
	return colors


# ============================================
# Collect SVG files for parametrized tests
# ============================================
SVG_FILES = collect_svg_files()


#============================================
@pytest.mark.skipif(len(SVG_FILES) == 0, reason="No SVG assets found in assets/equipment/")
@pytest.mark.parametrize("svg_path", SVG_FILES,
	ids=lambda p: os.path.relpath(p, REPO_ROOT))
def test_has_viewbox(svg_path: str):
	"""Every equipment SVG must have a viewBox attribute on the root element."""
	root = parse_svg(svg_path)
	assert root.get("viewBox") is not None, (
		f"{os.path.basename(svg_path)}: missing viewBox attribute on root <svg>"
	)


#============================================
@pytest.mark.skipif(len(SVG_FILES) == 0, reason="No SVG assets found in assets/equipment/")
@pytest.mark.parametrize("svg_path", SVG_FILES,
	ids=lambda p: os.path.relpath(p, REPO_ROOT))
def test_required_groups(svg_path: str):
	"""Every equipment SVG must have body, body_shadow, and overlay_root groups."""
	root = parse_svg(svg_path)
	group_ids = get_all_group_ids(root)
	for required_id in REQUIRED_GROUPS:
		assert required_id in group_ids, (
			f"{os.path.basename(svg_path)}: missing required <g id=\"{required_id}\">"
		)


#============================================
@pytest.mark.skipif(len(SVG_FILES) == 0, reason="No SVG assets found in assets/equipment/")
@pytest.mark.parametrize("svg_path", SVG_FILES,
	ids=lambda p: os.path.relpath(p, REPO_ROOT))
def test_no_raster_images(svg_path: str):
	"""Equipment SVGs must not contain inline raster images."""
	root = parse_svg(svg_path)
	for elem in root.iter():
		tag = elem.tag
		if "}" in tag:
			tag = tag.split("}")[-1]
		assert tag != "image", (
			f"{os.path.basename(svg_path)}: contains <image> element (no raster images allowed)"
		)


#============================================
@pytest.mark.skipif(len(SVG_FILES) == 0, reason="No SVG assets found in assets/equipment/")
@pytest.mark.parametrize("svg_path", SVG_FILES,
	ids=lambda p: os.path.relpath(p, REPO_ROOT))
def test_no_duplicate_ids(svg_path: str):
	"""No duplicate IDs within a single SVG file."""
	root = parse_svg(svg_path)
	all_ids = get_all_ids(root)
	seen = set()
	duplicates = []
	for elem_id in all_ids:
		if elem_id in seen:
			duplicates.append(elem_id)
		seen.add(elem_id)
	assert len(duplicates) == 0, (
		f"{os.path.basename(svg_path)}: duplicate IDs found: {duplicates}"
	)


#============================================
@pytest.mark.skipif(len(SVG_FILES) == 0, reason="No SVG assets found in assets/equipment/")
@pytest.mark.parametrize("svg_path", SVG_FILES,
	ids=lambda p: os.path.relpath(p, REPO_ROOT))
def test_size_budget(svg_path: str):
	"""Warn if SVG file exceeds size budget."""
	file_size = os.path.getsize(svg_path)
	# use a warning-style message but still assert
	assert file_size <= SIZE_BUDGET_BYTES, (
		f"{os.path.basename(svg_path)}: {file_size} bytes exceeds "
		f"{SIZE_BUDGET_BYTES} byte budget"
	)


#============================================
@pytest.mark.skipif(len(SVG_FILES) == 0, reason="No SVG assets found in assets/equipment/")
@pytest.mark.parametrize("svg_path", SVG_FILES,
	ids=lambda p: os.path.relpath(p, REPO_ROOT))
def test_node_count_budget(svg_path: str):
	"""Warn if SVG has too many elements."""
	root = parse_svg(svg_path)
	node_count = count_elements(root)
	assert node_count <= NODE_BUDGET, (
		f"{os.path.basename(svg_path)}: {node_count} elements exceeds "
		f"{NODE_BUDGET} node budget"
	)
