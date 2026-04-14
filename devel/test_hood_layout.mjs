#!/usr/bin/env node
/**
 * test_hood_layout.mjs - Playwright visual verification for hood scene layout.
 * Opens the game, starts it, screenshots the hood scene, and runs layout checks.
 * Run: node devel/test_hood_layout.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import process from 'node:process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;
const screenshotPath = 'test-results/hood_layout.png';

// Expected item count after M3: microscope and incubator moved to the
// bench scene, so the hood drops from 22 to 20 items.
const EXPECTED_ITEM_COUNT = 20;

// Viewports to test for responsive layout
const TEST_VIEWPORTS = [
	{ width: 1280, height: 720, name: '1280x720 (laptop)' },
	{ width: 1440, height: 900, name: '1440x900 (MacBook/desktop)' },
	{ width: 1920, height: 1080, name: '1920x1080 (Full HD)' },
];

// Default viewport for single-run checks
const DEFAULT_VIEWPORT = { width: 1200, height: 900 };

// ============================================
async function main() {
	// Ensure test-results/ directory exists
	fs.mkdirSync('test-results', { recursive: true });

	const browser = await chromium.launch({ headless: true });
	let exitCode = 0;

	try {
		// Set up default viewport for initial setup and screenshot
		const page = await browser.newPage({ viewport: DEFAULT_VIEWPORT });
		await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(300);

		// Click start button and wait for hood scene to load
		await page.click('#welcome-start-btn');
		await page.waitForTimeout(1000);

		// Take screenshot of hood scene at default viewport
		await page.screenshot({ path: screenshotPath });

		// ---- Multi-viewport sweep for responsive layout ----
		console.log('');
		console.log('=== Multi-Viewport Layout Sweep ===');

		for (const viewport of TEST_VIEWPORTS) {
			await page.setViewportSize({ width: viewport.width, height: viewport.height });
			await page.waitForTimeout(300); // Allow layout to settle

			console.log('');
			console.log(`Viewport ${viewport.name}:`);
			let viewportPass = true;

			// Check 1: Label overlap detection
			const labelOverlapResult = await page.evaluate(() => {
				const labels = Array.from(document.querySelectorAll('.hood-item-label'));
				const boxes = labels.map((el) => {
					const r = el.getBoundingClientRect();
					return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, text: el.textContent.trim() };
				});

				const overlaps = [];
				// check all pairs of labels that are on approximately the same Y row (within 20px)
				for (let i = 0; i < boxes.length; i++) {
					for (let j = i + 1; j < boxes.length; j++) {
						const a = boxes[i];
						const b = boxes[j];
						// same approximate Y row: their vertical centers within 20px
						const aCenterY = (a.top + a.bottom) / 2;
						const bCenterY = (b.top + b.bottom) / 2;
						if (Math.abs(aCenterY - bCenterY) > 20) {
							continue;
						}
						// check horizontal overlap, allow 2px tolerance for text shadows
						const tolerance = 2;
						const aRight = a.right - tolerance;
						const bLeft = b.left + tolerance;
						if (aRight > bLeft && a.left < b.right) {
							overlaps.push(`"${a.text}" overlaps with "${b.text}" (a.right=${a.right.toFixed(1)} b.left=${b.left.toFixed(1)})`);
						}
					}
				}
				return { count: labels.length, overlaps };
			});

			const check1Pass = labelOverlapResult.overlaps.length === 0;
			printCheckViewport(1, 'Label overlap detection', check1Pass,
				check1Pass
					? `${labelOverlapResult.count} labels checked, no overlaps`
					: `overlaps found: ${labelOverlapResult.overlaps.join('; ')}`
			);
			if (!check1Pass) {
				viewportPass = false;
				exitCode = 1;
			}

			// Item count at this viewport
			const itemCount = await page.evaluate(() => {
				return document.querySelectorAll('.hood-item').length;
			});
			const itemCountPass = itemCount === EXPECTED_ITEM_COUNT;
			printCheckViewport(3, 'Item count', itemCountPass,
				`found ${itemCount}, expected ${EXPECTED_ITEM_COUNT}`);
			if (!itemCountPass) {
				viewportPass = false;
				exitCode = 1;
			}

			// Check 6: All items contained within hood scene
			const containmentResult = await page.evaluate(() => {
				var scene = document.getElementById('hood-scene');
				if (!scene) return { ok: false, violations: ['hood-scene not found'] };
				var sceneBox = scene.getBoundingClientRect();
				var violations = [];

				// check all hood items are within scene bounds
				var items = document.querySelectorAll('.hood-item');
				for (var i = 0; i < items.length; i++) {
					var el = items[i];
					var id = el.getAttribute('data-item-id') || 'unknown';
					var box = el.getBoundingClientRect();
					// allow 2px tolerance for borders
					var tol = 2;
					if (box.left < sceneBox.left - tol) {
						violations.push(id + ' left edge outside scene ('
							+ box.left.toFixed(0) + ' < ' + sceneBox.left.toFixed(0) + ')');
					}
					if (box.right > sceneBox.right + tol) {
						violations.push(id + ' right edge outside scene ('
							+ box.right.toFixed(0) + ' > ' + sceneBox.right.toFixed(0) + ')');
					}
					if (box.top < sceneBox.top - tol) {
						violations.push(id + ' top edge outside scene ('
							+ box.top.toFixed(0) + ' < ' + sceneBox.top.toFixed(0) + ')');
					}
					if (box.bottom > sceneBox.bottom + tol) {
						violations.push(id + ' bottom edge outside scene ('
							+ box.bottom.toFixed(0) + ' > ' + sceneBox.bottom.toFixed(0) + ')');
					}
				}

				// check all labels are within scene bounds
				var labels = document.querySelectorAll('.hood-item-label');
				for (var i = 0; i < labels.length; i++) {
					var el = labels[i];
					var text = el.textContent.trim().substring(0, 20);
					var box = el.getBoundingClientRect();
					if (box.left < sceneBox.left - 2) {
						violations.push('label "' + text + '" left outside scene');
					}
					if (box.right > sceneBox.right + 2) {
						violations.push('label "' + text + '" right outside scene');
					}
					if (box.bottom > sceneBox.bottom + 2) {
						violations.push('label "' + text + '" bottom outside scene');
					}
				}
				return { ok: violations.length === 0, violations: violations };
			});
			const check6Pass = containmentResult.ok;
			printCheckViewport(6, 'Items/labels within bounds', check6Pass,
				check6Pass
					? `all ${itemCount} items and labels contained`
					: containmentResult.violations.slice(0, 2).join('; '));
			if (!check6Pass) {
				viewportPass = false;
				exitCode = 1;
			}

			// Check 7: No item-to-item overlap
			const itemOverlapResult = await page.evaluate(() => {
				var items = Array.from(document.querySelectorAll('.hood-item'));
				var boxes = items.map(function(el) {
					var r = el.getBoundingClientRect();
					return {
						id: el.getAttribute('data-item-id') || 'unknown',
						left: r.left, right: r.right,
						top: r.top, bottom: r.bottom,
					};
				});
				var overlaps = [];
				for (var i = 0; i < boxes.length; i++) {
					for (var j = i + 1; j < boxes.length; j++) {
						var a = boxes[i];
						var b = boxes[j];
						// check 2D overlap with 2px tolerance
						var tol = 2;
						var hOverlap = a.right - tol > b.left && b.right - tol > a.left;
						var vOverlap = a.bottom - tol > b.top && b.bottom - tol > a.top;
						if (hOverlap && vOverlap) {
							overlaps.push(a.id + ' overlaps ' + b.id);
						}
					}
				}
				return { count: items.length, overlaps: overlaps };
			});
			const check7Pass = itemOverlapResult.overlaps.length === 0;
			printCheckViewport(7, 'No item-to-item overlap', check7Pass,
				check7Pass
					? `${itemOverlapResult.count} items, no overlaps`
					: itemOverlapResult.overlaps.slice(0, 2).join('; '));
			if (!check7Pass) {
				viewportPass = false;
				exitCode = 1;
			}

			if (viewportPass) {
				console.log(`  Results: all checks passed`);
			}
		}

		// Return to default viewport for remaining checks
		await page.setViewportSize({ width: DEFAULT_VIEWPORT.width, height: DEFAULT_VIEWPORT.height });
		await page.waitForTimeout(300);

		// ---- Check 2: Flask is visually prominent (wider than pipette items) ----
		const flaskSizeResult = await page.evaluate(() => {
			const flask = document.querySelector('[data-item-id="flask"]');
			if (!flask) {
				return { ok: false, detail: 'flask element not found' };
			}
			const flaskBox = flask.getBoundingClientRect();

			// find all pipette items (items with "pipette" in data-item-id)
			const pipettes = Array.from(document.querySelectorAll('.hood-item')).filter((el) => {
				const id = el.getAttribute('data-item-id') || '';
				return id.includes('pipette');
			});

			if (pipettes.length === 0) {
				return { ok: false, detail: 'no pipette items found' };
			}

			const pipetteWidths = pipettes.map((el) => {
				const r = el.getBoundingClientRect();
				return { id: el.getAttribute('data-item-id'), width: r.width };
			});

			// flask must be wider than all pipette items
			const narrowerThan = pipetteWidths.filter((p) => flaskBox.width <= p.width);
			const ok = narrowerThan.length === 0;
			return {
				ok,
				detail: `flask.width=${flaskBox.width.toFixed(1)} pipettes=[${pipetteWidths.map((p) => p.id + ':' + p.width.toFixed(1)).join(', ')}]`,
			};
		});

		const check2Pass = flaskSizeResult.ok;
		printCheck(2, 'Flask is visually prominent (wider than pipettes)', check2Pass, flaskSizeResult.detail);
		if (!check2Pass) exitCode = 1;

		// ---- Check 3: All items are visible ----
		const itemCount = await page.evaluate(() => {
			return document.querySelectorAll('.hood-item').length;
		});
		const check3Pass = itemCount === EXPECTED_ITEM_COUNT;
		printCheck(3, 'All items are visible', check3Pass,
			`found ${itemCount} .hood-item elements, expected ${EXPECTED_ITEM_COUNT}`);
		if (!check3Pass) exitCode = 1;

		// ---- Check 3b: microscope and incubator moved off the hood ----
		const movedItems = await page.evaluate(() => {
			return {
				microscope: document.querySelector('#hood-scene [data-item-id="microscope"]') !== null,
				incubator: document.querySelector('#hood-scene [data-item-id="incubator"]') !== null,
			};
		});
		const check3bPass = !movedItems.microscope && !movedItems.incubator;
		printCheck('3b', 'Microscope and incubator not present on hood', check3bPass,
			`microscope=${movedItems.microscope} incubator=${movedItems.incubator}`);
		if (!check3bPass) exitCode = 1;

		// ---- Check 4: Labels exist ----
		const labelCount = await page.evaluate(() => {
			return document.querySelectorAll('.hood-item-label').length;
		});
		const check4Pass = labelCount === EXPECTED_ITEM_COUNT;
		printCheck(4, 'Labels exist', check4Pass,
			`found ${labelCount} .hood-item-label elements, expected ${EXPECTED_ITEM_COUNT}`);
		if (!check4Pass) exitCode = 1;

		// ---- Check 5: Layer structure ----
		const layerResult = await page.evaluate(() => {
			const itemsLayer = document.querySelector('#hood-items-layer');
			const labelsLayer = document.querySelector('#hood-labels-layer');
			return {
				hasItemsLayer: !!itemsLayer,
				hasLabelsLayer: !!labelsLayer,
			};
		});
		const check5Pass = layerResult.hasItemsLayer && layerResult.hasLabelsLayer;
		printCheck(5, 'Layer structure', check5Pass,
			`#hood-items-layer=${layerResult.hasItemsLayer} #hood-labels-layer=${layerResult.hasLabelsLayer}`);
		if (!check5Pass) exitCode = 1;


		// ---- Check 8: Labels anchored to their objects ----
		const anchorResult = await page.evaluate(() => {
			var items = Array.from(document.querySelectorAll('.hood-item'));
			var labels = Array.from(document.querySelectorAll('.hood-item-label'));
			var violations = [];
			// labels appear in same order as items in the DOM
			for (var i = 0; i < items.length && i < labels.length; i++) {
				var itemBox = items[i].getBoundingClientRect();
				var labelBox = labels[i].getBoundingClientRect();
				var id = items[i].getAttribute('data-item-id') || 'unknown';
				// label center X should be near item center X (within 15px)
				var itemCenterX = itemBox.left + itemBox.width / 2;
				var labelCenterX = labelBox.left + labelBox.width / 2;
				var dx = Math.abs(itemCenterX - labelCenterX);
				if (dx > 15) {
					violations.push(id + ' label X off by ' + dx.toFixed(0) + 'px');
				}
				// label should be near its item (above or below)
				// back row items have labels above, front row below
				var aboveGap = itemBox.top - labelBox.bottom;
				var belowGap = labelBox.top - itemBox.bottom;
				var bestGap = Math.min(Math.abs(aboveGap), Math.abs(belowGap));
				if (bestGap > 35) {
					violations.push(id + ' label too far: ' + bestGap.toFixed(0) + 'px');
				}
			}
			return { violations: violations };
		});
		const check8Pass = anchorResult.violations.length === 0;
		printCheck(8, 'Labels anchored to objects', check8Pass,
			check8Pass
				? 'all labels properly anchored'
				: anchorResult.violations.join('; '));
		if (!check8Pass) exitCode = 1;

		// ---- Check 9: No labels are truncated ----
		const truncResult = await page.evaluate(() => {
			var labels = Array.from(document.querySelectorAll('.hood-item-label'));
			var truncated = [];
			for (var i = 0; i < labels.length; i++) {
				var text = labels[i].textContent || '';
				if (text.indexOf('...') >= 0 || text.indexOf('\u2026') >= 0) {
					truncated.push(text.trim());
				}
			}
			return { count: labels.length, truncated: truncated };
		});
		const check9Pass = truncResult.truncated.length === 0;
		printCheck(9, 'No labels truncated', check9Pass,
			check9Pass
				? truncResult.count + ' labels, none truncated'
				: 'truncated: ' + truncResult.truncated.join(', '));
		if (!check9Pass) exitCode = 1;

		console.log('');
		console.log(`Screenshot saved to ${screenshotPath}`);

		await page.close();
	} finally {
		await browser.close();
	}

	process.exit(exitCode);
}

// ============================================
function printCheck(num, name, pass, detail) {
	// Print OK/FAIL for each check with optional detail on failure
	const status = pass ? 'OK  ' : 'FAIL';
	console.log(`${status}  Check ${num}: ${name}`);
	if (!pass || detail) {
		console.log(`      ${detail}`);
	}
}

// ============================================
function printCheckViewport(num, name, pass, detail) {
	// Print viewport-scoped check result with indentation
	const status = pass ? 'OK  ' : 'FAIL';
	console.log(`  ${status}  Check ${num}: ${name}`);
	if (!pass || detail) {
		console.log(`        ${detail}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
