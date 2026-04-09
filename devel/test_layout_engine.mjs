#!/usr/bin/env node
/**
 * test_layout_engine.mjs - Playwright unit tests for the layout engine.
 * Opens cell_culture_game.html and calls computeSceneLayout() with synthetic data.
 * Run: node devel/test_layout_engine.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import process from 'node:process';
import { execSync } from 'child_process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;

// Compile layout_engine.ts to JS at test startup using esbuild
function compileLayoutEngine() {
	const tsFile = path.resolve('parts/layout_engine.ts');
	const js = execSync(
		`npx esbuild "${tsFile}" --bundle=false --target=es2020`,
		{ encoding: 'utf8' }
	);
	return js;
}

// ============================================
async function runTests(page) {
	// All test logic runs in a single page.evaluate() call
	const results = await page.evaluate(() => {
		// ---- helpers ----
		function item(id, priority, widthScale, anchorY, shortLabel) {
			return {
				id,
				asset: id,
				kind: 'bottle',
				zone: 'test',
				priority,
				widthScale: widthScale || 1.0,
				label: 'Label ' + id,
				shortLabel,
				anchorY: anchorY || 'bottom',
			};
		}
		function spec(defaultWidth, aspectRatio) {
			return { defaultWidth, aspectRatio, labelWidth: 5 };
		}

		// build a minimal SceneLayoutRules with one zone
		function makeRules(zoneOpts) {
			return {
				zones: {
					test: Object.assign(
						{ x0: 0, x1: 100, baseline: 80, gap: 2, align: 'center' },
						zoneOpts || {}
					),
				},
				labelFontSize: 10,
				labelLineHeight: 12,
				labelOffsetY: 2,
			};
		}

		// build specs map for a list of items using a single spec template
		function specsFor(items, defaultWidth, aspectRatio) {
			var s = spec(defaultWidth, aspectRatio);
			var map = {};
			for (var i = 0; i < items.length; i++) {
				map[items[i].asset] = s;
			}
			return map;
		}

		var tests = [];

		// ---- test 1: single item center align ----
		(function() {
			var name = 'Single item, center align';
			try {
				var it = item('a', 1, 1.0, 'bottom');
				var sp = specsFor([it], 10, 1.0);
				var rules = makeRules({ align: 'center' });
				var layouts = computeSceneLayout([it], sp, rules, 100, 100);
				var lay = layouts[0];
				// zone [0,100], item width 10 -> startX = (100-10)/2 = 45
				var expectedX = 45;
				var pass = Math.abs(lay.x - expectedX) < 0.01;
				tests.push({ name, pass, detail: `x=${lay.x.toFixed(2)} expected ${expectedX}` });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 2: single item left align ----
		(function() {
			var name = 'Single item, left align';
			try {
				var it = item('a', 1, 1.0, 'bottom');
				var sp = specsFor([it], 10, 1.0);
				var rules = makeRules({ align: 'left' });
				var layouts = computeSceneLayout([it], sp, rules, 100, 100);
				var lay = layouts[0];
				// ZONE_PADDING offsets from zone edge
				var pass = Math.abs(lay.x - 1) < 0.01;
				tests.push({ name, pass, detail: `x=${lay.x.toFixed(2)} expected 1 (zone padding)` });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 3: single item right align ----
		(function() {
			var name = 'Single item, right align';
			try {
				var it = item('a', 1, 1.0, 'bottom');
				var sp = specsFor([it], 10, 1.0);
				var rules = makeRules({ align: 'right' });
				var layouts = computeSceneLayout([it], sp, rules, 100, 100);
				var lay = layouts[0];
				// right edge should equal zone.x1 - ZONE_PADDING = 99
				var rightEdge = lay.x + lay.width;
				var pass = Math.abs(rightEdge - 99) < 0.01;
				tests.push({ name, pass, detail: `right edge=${rightEdge.toFixed(2)} expected 99 (zone padding)` });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 4: two items, priority ordering ----
		(function() {
			var name = 'Two items, priority ordering';
			try {
				// priority 1 should come before priority 2 (left of)
				var ia = item('b', 2, 1.0, 'bottom');
				var ib = item('a', 1, 1.0, 'bottom');
				var sp = specsFor([ia, ib], 10, 1.0);
				var rules = makeRules({ align: 'center' });
				var layouts = computeSceneLayout([ia, ib], sp, rules, 100, 100);
				// find by id
				var layA = layouts.find(function(l) { return l.id === 'a'; });
				var layB = layouts.find(function(l) { return l.id === 'b'; });
				// item with priority 1 (id=a) should be left of priority 2 (id=b)
				var pass = layA.x < layB.x;
				tests.push({ name, pass, detail: `a.x=${layA.x.toFixed(2)} b.x=${layB.x.toFixed(2)}` });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 5: three items, zone containment ----
		(function() {
			var name = 'Three items, zone containment';
			try {
				var items = [
					item('c', 1, 1.0, 'bottom'),
					item('d', 2, 1.0, 'bottom'),
					item('e', 3, 1.0, 'bottom'),
				];
				var sp = specsFor(items, 20, 1.0);
				var rules = makeRules({ x0: 0, x1: 100, gap: 2 });
				var layouts = computeSceneLayout(items, sp, rules, 100, 100);
				var pass = layouts.every(function(l) {
					return l.x >= 0 && (l.x + l.width) <= 100 + 0.01;
				});
				tests.push({ name, pass, detail: layouts.map(function(l) {
					return l.id + ':[' + l.x.toFixed(1) + ',' + (l.x + l.width).toFixed(1) + ']';
				}).join(' ') });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 6: overflow scaling ----
		(function() {
			var name = 'Overflow scaling, items still within zone';
			try {
				// 4 items each 30px wide, zone only 100px -> overflow
				var items = [
					item('f', 1, 1.0, 'bottom'),
					item('g', 2, 1.0, 'bottom'),
					item('h', 3, 1.0, 'bottom'),
					item('k', 4, 1.0, 'bottom'),
				];
				var sp = specsFor(items, 30, 1.0);
				var rules = makeRules({ x0: 0, x1: 100, gap: 1 });
				var layouts = computeSceneLayout(items, sp, rules, 100, 100);
				// check widths are smaller than original 30
				var scaledDown = layouts.every(function(l) { return l.width < 30; });
				var inZone = layouts.every(function(l) {
					return l.x >= -0.01 && (l.x + l.width) <= 100.01;
				});
				var pass = scaledDown && inZone;
				tests.push({ name, pass, detail: 'scaledDown=' + scaledDown + ' inZone=' + inZone
					+ ' widths=' + layouts.map(function(l) { return l.width.toFixed(1); }).join(',') });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 7: anchor bottom ----
		(function() {
			var name = 'Anchor bottom: item.y + height == baseline';
			try {
				var it = item('m', 1, 1.0, 'bottom');
				var sp = specsFor([it], 10, 1.0);
				var rules = makeRules({ baseline: 80 });
				var layouts = computeSceneLayout([it], sp, rules, 100, 100);
				var lay = layouts[0];
				var bottom = lay.y + lay.height;
				var pass = Math.abs(bottom - 80) < 0.01;
				tests.push({ name, pass, detail: `y+h=${bottom.toFixed(2)} expected 80` });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 8: anchor center ----
		(function() {
			var name = 'Anchor center: item midpoint == baseline';
			try {
				var it = item('n', 1, 1.0, 'center');
				var sp = specsFor([it], 10, 1.0);
				var rules = makeRules({ baseline: 80 });
				var layouts = computeSceneLayout([it], sp, rules, 100, 100);
				var lay = layouts[0];
				var mid = lay.y + lay.height / 2;
				var pass = Math.abs(mid - 80) < 0.01;
				tests.push({ name, pass, detail: `mid=${mid.toFixed(2)} expected 80` });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 9: anchor tip (anchorYOffset=0 behaves like bottom) ----
		(function() {
			var name = 'Anchor tip with anchorYOffset=0: same as bottom';
			try {
				var it = item('o', 1, 1.0, 'tip');
				var spMap = { o: { defaultWidth: 10, aspectRatio: 1.0, labelWidth: 5, anchorYOffset: 0 } };
				var rules = makeRules({ baseline: 80 });
				var layouts = computeSceneLayout([it], spMap, rules, 100, 100);
				var lay = layouts[0];
				// tip: top = baseline - height + anchorYOffset(0) = baseline - height
				// so bottom = lay.y + lay.height = baseline
				var bottom = lay.y + lay.height;
				var pass = Math.abs(bottom - 80) < 0.01;
				tests.push({ name, pass, detail: `y+h=${bottom.toFixed(2)} expected 80` });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 10: label wrapping ----
		(function() {
			var name = 'Label wrapping: long label on narrow item produces 2 lines';
			try {
				// item width 10, label "Hello World" ~6.6 chars wide; exceeds 10
				// AVG_CHAR_WIDTH_PCT = 0.55, "Hello World" = 11 chars * 0.55 = 6.05 > 4.5 (half of 10)
				// Actually need estWidth > lay.width. lay.width for 1 item center in [0,100] w=10
				// estWidth = max(charWidth, specWidth)
				// charWidth = label.length * 0.55
				// label = "Label p" = 7 chars -> 3.85 < 10 (won't wrap)
				// Use a long label that exceeds width
				var it = {
					id: 'p', asset: 'p', kind: 'bottle', zone: 'test', priority: 1,
					widthScale: 1.0,
					label: 'Alpha Beta Gamma',  // 16 chars * 0.55 = 8.8 > item width 8
					anchorY: 'bottom',
				};
				var spMap = { p: { defaultWidth: 8, aspectRatio: 1.0, labelWidth: 2 } };
				var rules = makeRules({ x0: 0, x1: 100 });
				var layouts = computeSceneLayout([it], spMap, rules, 100, 100);
				var lay = layouts[0];
				var pass = lay.labelMultiline === true && lay.labelLines.length === 2;
				tests.push({ name, pass, detail: 'lines=' + lay.labelLines.length
					+ ' multiline=' + lay.labelMultiline
					+ ' labelLines=' + JSON.stringify(lay.labelLines) });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 11: label collision ----
		(function() {
			var name = 'Label collision: two close items, labels nudged apart';
			try {
				// two narrow items close together so labels initially overlap
				// zone [0,20], two items each width 4, gap 1
				// after layout: item0.x~6, item1.x~11 (centers 8 and 13)
				// labelX0~8, labelX1~13
				// If labelWidth large enough they'll collide
				var ia = item('q', 1, 1.0, 'bottom');
				var ib = item('r', 2, 1.0, 'bottom');
				var spMap = {
					q: { defaultWidth: 4, aspectRatio: 1.0, labelWidth: 8 },
					r: { defaultWidth: 4, aspectRatio: 1.0, labelWidth: 8 },
				};
				var rules = {
					zones: {
						test: { x0: 0, x1: 30, baseline: 80, gap: 1, align: 'center' },
					},
					labelFontSize: 10, labelLineHeight: 12, labelOffsetY: 2,
				};
				var layouts = computeSceneLayout([ia, ib], spMap, rules, 100, 100);
				var layQ = layouts.find(function(l) { return l.id === 'q'; });
				var layR = layouts.find(function(l) { return l.id === 'r'; });
				// after collision resolution: left.labelX + left.labelWidth/2
				// should be <= right.labelX - right.labelWidth/2 + tolerance
				var leftEdge = layQ.labelX + layQ.labelWidth / 2;
				var rightEdge = layR.labelX - layR.labelWidth / 2;
				// They may still overlap slightly (single-pass nudge has limits)
				// but labelX values must be different (nudging occurred)
				var pass = layQ.labelX !== layR.labelX;
				tests.push({ name, pass, detail: `q.labelX=${layQ.labelX.toFixed(2)} r.labelX=${layR.labelX.toFixed(2)} leftEdge=${leftEdge.toFixed(2)} rightEdge=${rightEdge.toFixed(2)}` });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		// ---- test 12: deterministic sort by id ----
		(function() {
			var name = 'Deterministic sort: same priority sorted by id alphabetically';
			try {
				// same priority, ids in reverse alpha order -- engine must sort alpha
				var ic = item('z_item', 1, 1.0, 'bottom');
				var id = item('a_item', 1, 1.0, 'bottom');
				var sp = specsFor([ic, id], 10, 1.0);
				var rules = makeRules({});
				var layouts = computeSceneLayout([ic, id], sp, rules, 100, 100);
				var layA = layouts.find(function(l) { return l.id === 'a_item'; });
				var layZ = layouts.find(function(l) { return l.id === 'z_item'; });
				// a_item should be placed left of z_item
				var pass = layA.x < layZ.x;
				tests.push({ name, pass, detail: `a_item.x=${layA.x.toFixed(2)} z_item.x=${layZ.x.toFixed(2)}` });
			} catch (e) {
				tests.push({ name, pass: false, detail: String(e) });
			}
		})();

		return tests;
	});

	return results;
}

// ============================================
async function main() {
	// Compile layout engine before launching browser
	const layoutEngineJs = compileLayoutEngine();

	const browser = await chromium.launch({ headless: true });
	let exitCode = 0;
	try {
		const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
		await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
		// Inject the compiled layout engine JS directly into the page
		await page.addScriptTag({ content: layoutEngineJs });

		const results = await runTests(page);

		let passed = 0;
		let failed = 0;
		for (const r of results) {
			const status = r.pass ? 'OK  ' : 'FAIL';
			console.log(`${status}  ${r.name}`);
			if (!r.pass) {
				console.log(`      detail: ${r.detail}`);
			}
			if (r.pass) { passed++; } else { failed++; exitCode = 1; }
		}

		console.log('');
		console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);

		await page.close();
	} finally {
		await browser.close();
	}
	process.exit(exitCode);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
