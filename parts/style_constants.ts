// ============================================
// style_constants.ts - Visual language constants for the artwork system
// ============================================

// Semantic color roles for dynamic overlays
// Each color has exactly one meaning. Never reuse across roles.
type ColorRole =
	| "media"       // DMEM, culture media
	| "buffer"      // water-based solutions
	| "waste"       // discarded liquid
	| "drug"        // drug/treatment solutions
	| "ethanol"     // 70% ethanol, sterile solutions
	| "error"       // contamination, wrong action
	| "success"     // correct action, completed step
	| "signal";     // protein bands, markers

// Maps each role to its hex color
const COLOR_MAP: Record<ColorRole, string> = {
	media:   "#ff9a66",
	buffer:  "#4a90d9",
	waste:   "#d4d4a0",
	drug:    "#c8a0d8",
	ethanol: "#e0e8f0",
	error:   "#d94444",
	success: "#44aa66",
	signal:  "#222222",
};

// ============================================
// Material colors for static base SVGs (curator-owned)
const COLOR_PLASTIC = "#b0b0b0";
const COLOR_METAL   = "#888888";
const COLOR_GLASS   = "#f0f0f0";
const COLOR_GEL     = "#e8d4a0";

// ============================================
// Stroke widths (px)
const STROKE_OUTLINE   = 1.5;  // equipment outer edges
const STROKE_DETAIL    = 0.8;  // internal features, seams
const STROKE_FINE      = 0.4;  // graduation marks, subtle lines
const STROKE_HIGHLIGHT = 2.0;  // error/correct indicators

// ============================================
// Corner radii (SVG rx attribute)
const RADIUS_BODY   = 4;  // equipment main shapes
const RADIUS_PARTS  = 2;  // buttons, sub-components
const RADIUS_LABELS = 1;  // text labels, tags

// ============================================
// Depth offset for 2.5D shadow (px)
const DEPTH_OFFSET_X = 0;
const DEPTH_OFFSET_Y = 0;

// ============================================
// Perspective rule: top-face ellipse ratio
// For containers with openings, ry = rx * this factor
const TOP_FACE_RATIO = 0.25;
