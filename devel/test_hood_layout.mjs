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

// ============================================
async function main() {
	// Ensure test-results/ directory exists
	fs.mkdirSync('test-results', { recursive: true });

	const browser = await chromium.launch({ headless: true });
	let exitCode = 0;

	try {
		const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
		await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(300);

		// Click start button and wait for hood scene to load
		await page.click('#welcome-start-btn');
		await page.waitForTimeout(600);

		// Take screenshot of hood scene
		await page.screenshot({ path: screenshotPath });

		// ---- Check 1: Label overlap detection ----
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
		printCheck(1, 'Label overlap detection', check1Pass,
			check1Pass
				? `${labelOverlapResult.count} labels checked, no overlaps`
				: `overlaps found: ${labelOverlapResult.overlaps.join('; ')}`
		);
		if (!check1Pass) exitCode = 1;

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

		// ---- Check 3: All items are visible (expect 12) ----
		const itemCount = await page.evaluate(() => {
			return document.querySelectorAll('.hood-item').length;
		});
		const check3Pass = itemCount === 12;
		printCheck(3, 'All items are visible', check3Pass,
			`found ${itemCount} .hood-item elements, expected 12`);
		if (!check3Pass) exitCode = 1;

		// ---- Check 4: Labels exist (expect 12) ----
		const labelCount = await page.evaluate(() => {
			return document.querySelectorAll('.hood-item-label').length;
		});
		const check4Pass = labelCount === 12;
		printCheck(4, 'Labels exist', check4Pass,
			`found ${labelCount} .hood-item-label elements, expected 12`);
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

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
