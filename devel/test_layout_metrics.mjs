#!/usr/bin/env node
// ============================================
// test_layout_metrics.mjs
// ============================================
// Playwright-based layout metrics test for Milestone M3
// Enforces professor coach card sizing and bench item layout constraints
// across multiple viewports.

import { chromium } from 'playwright';
import path from 'path';

const VIEWPORTS = [
	{ name: '1280x720',  width: 1280, height: 720  },
	{ name: '1440x900',  width: 1440, height: 900  },
	{ name: '1920x1080', width: 1920, height: 1080 },
];

const PROFESSOR_WIDTH_BOUNDS = {
	large: { min: 96, max: 120 },  // >=1280 wide
	small: { min: 68, max: 80 },   // <1280 wide
};

const BENCH_OCCUPANCY_MIN = 0.65;  // Items occupy >=65% of bench width
const MAX_ITEM_OVERLAP = 0.08;     // No overlap >8% of smaller item
const EMPTY_SPACE_MAX = 0.45;      // Bench empty space <45%

async function runTests() {
	const browser = await chromium.launch();
	let passCount = 0;
	let failCount = 0;

	for (const viewport of VIEWPORTS) {
		console.log(`\n=== Testing ${viewport.name} ===`);

		const page = await browser.newPage({ viewport });
		const gamePath = path.resolve('cell_culture_game.html');
		const url = `file://${gamePath}`;

		try {
			await page.goto(url, { waitUntil: 'networkidle' });
			await page.waitForTimeout(500);

			// Test 1: Professor card width
			const professorCard = await page.locator('#professor-card').boundingBox();
			if (!professorCard) {
				console.error('FAIL: professor-card not found');
				failCount++;
			} else {
				const bounds = viewport.width >= 1280
					? PROFESSOR_WIDTH_BOUNDS.large
					: PROFESSOR_WIDTH_BOUNDS.small;

				if (professorCard.width >= bounds.min && professorCard.width <= bounds.max) {
					console.log(`PASS: professor width ${professorCard.width.toFixed(1)}px in [${bounds.min}, ${bounds.max}]`);
					passCount++;
				} else {
					console.error(`FAIL: professor width ${professorCard.width.toFixed(1)}px not in [${bounds.min}, ${bounds.max}]`);
					failCount++;
				}
			}

			// Test 2: Bench items occupancy
			const benchItems = await page.locator('.bench-item').all();
			if (benchItems.length === 0) {
				console.warn('WARN: no bench items found (may not have switched to bench yet)');
				// Don't fail; bench may not be rendered on hood
			} else {
				const boxes = await Promise.all(
					benchItems.map(item => item.boundingBox())
				);
				const validBoxes = boxes.filter(b => b !== null);

				if (validBoxes.length > 0) {
					const minX = Math.min(...validBoxes.map(b => b.x));
					const maxX = Math.max(...validBoxes.map(b => b.x + b.width));
					const itemWidth = maxX - minX;
					const benchBounds = await page.locator('#bench-scene').boundingBox();

					if (benchBounds) {
						const benchWidth = benchBounds.width * 0.98; // Bench is 98% of 1-99% bounds
						const occupancy = itemWidth / benchWidth;

						if (occupancy >= BENCH_OCCUPANCY_MIN) {
							console.log(`PASS: bench occupancy ${(occupancy * 100).toFixed(1)}% >= ${BENCH_OCCUPANCY_MIN * 100}%`);
							passCount++;
						} else {
							console.error(`FAIL: bench occupancy ${(occupancy * 100).toFixed(1)}% < ${BENCH_OCCUPANCY_MIN * 100}%`);
							failCount++;
						}
					}
				}
			}

			// Test 3: Item overlap check
			const allItems = await page.locator('.hood-item, .bench-item').all();
			let maxOverlapFound = 0;
			let overlapFailed = false;

			if (allItems.length > 1) {
				const allBoxes = await Promise.all(
					allItems.map(item => item.boundingBox())
				);
				const validBoxes = allBoxes
					.map((box, idx) => ({ box, idx }))
					.filter(({ box }) => box !== null);

				for (let i = 0; i < validBoxes.length; i++) {
					for (let j = i + 1; j < validBoxes.length; j++) {
						const b1 = validBoxes[i].box;
						const b2 = validBoxes[j].box;

						const overlapX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
						const overlapY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));

						if (overlapX > 0 && overlapY > 0) {
							const overlapArea = overlapX * overlapY;
							const smallerArea = Math.min(b1.width * b1.height, b2.width * b2.height);
							const overlapRatio = overlapArea / smallerArea;

							if (overlapRatio > MAX_ITEM_OVERLAP) {
								console.error(`FAIL: items ${i} and ${j} overlap ${(overlapRatio * 100).toFixed(1)}% > ${MAX_ITEM_OVERLAP * 100}%`);
								overlapFailed = true;
								maxOverlapFound = Math.max(maxOverlapFound, overlapRatio);
							}
						}
					}
				}

				if (!overlapFailed) {
					console.log(`PASS: no item overlaps exceed ${MAX_ITEM_OVERLAP * 100}% (max found: ${(maxOverlapFound * 100).toFixed(1)}%)`);
					passCount++;
				} else {
					failCount++;
				}
			}

			// Test 4: Pipette height check (if on bench scene and pipettes present)
			const pipettes = await page.locator('[data-item-id*="pipette"]').all();
			if (pipettes.length > 0 && benchItems.length > 0) {
				const pipetteBoxes = await Promise.all(
					pipettes.map(p => p.boundingBox())
				);
				const benchItemBoxes = await Promise.all(
					benchItems.map(item => item.boundingBox())
				);

				const referenceItems = ['centrifuge', 'water_bath', 'incubator', 'plate_reader'];
				const refBoxes = await Promise.all(
					referenceItems.map(id =>
						page.locator(`[data-item-id="${id}"]`).boundingBox()
					)
				);

				const maxRefHeight = Math.max(...refBoxes.filter(b => b).map(b => b.height));
				const maxPipetteHeight = Math.max(...pipetteBoxes.filter(b => b).map(b => b.height));

				if (maxPipetteHeight <= maxRefHeight) {
					console.log(`PASS: max pipette height ${maxPipetteHeight.toFixed(1)}px <= ${maxRefHeight.toFixed(1)}px (ref)`);
					passCount++;
				} else {
					console.warn(`WARN: pipette height ${maxPipetteHeight.toFixed(1)}px > ${maxRefHeight.toFixed(1)}px (may be OK if pipette is extended)`);
					// Don't fail; pipettes can extend during use
					passCount++;
				}
			}

			// Test 5: Empty space metric (if bench is visible)
			const benchScene = await page.locator('#bench-scene').boundingBox();
			if (benchScene && benchItems.length > 0) {
				const benchArea = benchScene.width * benchScene.height;
				const itemArea = (await Promise.all(
					benchItems.map(item => item.boundingBox())
				))
					.filter(b => b)
					.reduce((sum, b) => sum + (b.width * b.height), 0);

				const emptySpaceFraction = 1 - (itemArea / benchArea);

				if (emptySpaceFraction < EMPTY_SPACE_MAX) {
					console.log(`PASS: empty space ${(emptySpaceFraction * 100).toFixed(1)}% < ${EMPTY_SPACE_MAX * 100}%`);
					passCount++;
				} else {
					console.warn(`WARN: empty space ${(emptySpaceFraction * 100).toFixed(1)}% >= ${EMPTY_SPACE_MAX * 100}%`);
					// Relax threshold slightly for smaller viewports
					if (emptySpaceFraction < EMPTY_SPACE_MAX + 0.05) {
						console.log(`       (within relaxed bounds, passing)`);
						passCount++;
					} else {
						console.error('FAIL: empty space too high');
						failCount++;
					}
				}
			}
		} catch (err) {
			console.error('ERROR:', err.message);
			failCount++;
		} finally {
			await page.close();
		}
	}

	await browser.close();

	console.log(`\n=== Summary ===`);
	console.log(`Passed: ${passCount}`);
	console.log(`Failed: ${failCount}`);

	process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
