#!/usr/bin/env node
/**
 * test_plate_96.mjs - Playwright tests for plate_96 functions.
 * Opens cell_culture_game.html and validates PLATE_96 constants,
 * getCarbConcUm(), hasMetformin(), applyPlateDoseMap(), and label arrays.
 * Run: node devel/test_plate_96.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import process from 'node:process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;

// ============================================
async function runTests(page) {
	const results = [];

	// Test 1: PLATE_96_ROWS === 8
	try {
		const rows = await page.evaluate(() => PLATE_96_ROWS);
		const pass = rows === 8;
		results.push({
			name: 'PLATE_96_ROWS === 8',
			pass,
			detail: pass ? 'ok' : `Expected 8, got ${rows}`,
		});
	} catch (e) {
		results.push({
			name: 'PLATE_96_ROWS === 8',
			pass: false,
			detail: String(e),
		});
	}

	// Test 2: PLATE_96_COLS === 12
	try {
		const cols = await page.evaluate(() => PLATE_96_COLS);
		const pass = cols === 12;
		results.push({
			name: 'PLATE_96_COLS === 12',
			pass,
			detail: pass ? 'ok' : `Expected 12, got ${cols}`,
		});
	} catch (e) {
		results.push({
			name: 'PLATE_96_COLS === 12',
			pass: false,
			detail: String(e),
		});
	}

	// Test 3: CARB_CONC_BY_ROW_UM.length === 8
	try {
		const len = await page.evaluate(() => CARB_CONC_BY_ROW_UM.length);
		const pass = len === 8;
		results.push({
			name: 'CARB_CONC_BY_ROW_UM.length === 8',
			pass,
			detail: pass ? 'ok' : `Expected 8, got ${len}`,
		});
	} catch (e) {
		results.push({
			name: 'CARB_CONC_BY_ROW_UM.length === 8',
			pass: false,
			detail: String(e),
		});
	}

	// Test 4: CARB_CONC_BY_ROW_UM[0] === 0.0 (row A = control)
	try {
		const val = await page.evaluate(() => CARB_CONC_BY_ROW_UM[0]);
		const pass = val === 0.0;
		results.push({
			name: 'CARB_CONC_BY_ROW_UM[0] === 0.0 (row A)',
			pass,
			detail: pass ? 'ok' : `Expected 0.0, got ${val}`,
		});
	} catch (e) {
		results.push({
			name: 'CARB_CONC_BY_ROW_UM[0] === 0.0 (row A)',
			pass: false,
			detail: String(e),
		});
	}

	// Test 5: CARB_CONC_BY_ROW_UM[7] === 25.0 (row H = highest)
	try {
		const val = await page.evaluate(() => CARB_CONC_BY_ROW_UM[7]);
		const pass = val === 25.0;
		results.push({
			name: 'CARB_CONC_BY_ROW_UM[7] === 25.0 (row H)',
			pass,
			detail: pass ? 'ok' : `Expected 25.0, got ${val}`,
		});
	} catch (e) {
		results.push({
			name: 'CARB_CONC_BY_ROW_UM[7] === 25.0 (row H)',
			pass: false,
			detail: String(e),
		});
	}

	// Test 6: getCarbConcUm(3) === 0.125 (row D)
	try {
		const val = await page.evaluate(() => getCarbConcUm(3));
		const pass = val === 0.125;
		results.push({
			name: 'getCarbConcUm(3) === 0.125 (row D)',
			pass,
			detail: pass ? 'ok' : `Expected 0.125, got ${val}`,
		});
	} catch (e) {
		results.push({
			name: 'getCarbConcUm(3) === 0.125 (row D)',
			pass: false,
			detail: String(e),
		});
	}

	// Test 7: hasMetformin(0) === false
	try {
		const val = await page.evaluate(() => hasMetformin(0));
		const pass = val === false;
		results.push({
			name: 'hasMetformin(0) === false',
			pass,
			detail: pass ? 'ok' : `Expected false, got ${val}`,
		});
	} catch (e) {
		results.push({
			name: 'hasMetformin(0) === false',
			pass: false,
			detail: String(e),
		});
	}

	// Test 8: hasMetformin(5) === false
	try {
		const val = await page.evaluate(() => hasMetformin(5));
		const pass = val === false;
		results.push({
			name: 'hasMetformin(5) === false',
			pass,
			detail: pass ? 'ok' : `Expected false, got ${val}`,
		});
	} catch (e) {
		results.push({
			name: 'hasMetformin(5) === false',
			pass: false,
			detail: String(e),
		});
	}

	// Test 9: hasMetformin(6) === true
	try {
		const val = await page.evaluate(() => hasMetformin(6));
		const pass = val === true;
		results.push({
			name: 'hasMetformin(6) === true',
			pass,
			detail: pass ? 'ok' : `Expected true, got ${val}`,
		});
	} catch (e) {
		results.push({
			name: 'hasMetformin(6) === true',
			pass: false,
			detail: String(e),
		});
	}

	// Test 10: hasMetformin(11) === true
	try {
		const val = await page.evaluate(() => hasMetformin(11));
		const pass = val === true;
		results.push({
			name: 'hasMetformin(11) === true',
			pass,
			detail: pass ? 'ok' : `Expected true, got ${val}`,
		});
	} catch (e) {
		results.push({
			name: 'hasMetformin(11) === true',
			pass: false,
			detail: String(e),
		});
	}

	// Test 11: ROW_LABELS[0] === 'A'
	try {
		const val = await page.evaluate(() => ROW_LABELS[0]);
		const pass = val === 'A';
		results.push({
			name: "ROW_LABELS[0] === 'A'",
			pass,
			detail: pass ? 'ok' : `Expected 'A', got ${val}`,
		});
	} catch (e) {
		results.push({
			name: "ROW_LABELS[0] === 'A'",
			pass: false,
			detail: String(e),
		});
	}

	// Test 12: ROW_LABELS[7] === 'H'
	try {
		const val = await page.evaluate(() => ROW_LABELS[7]);
		const pass = val === 'H';
		results.push({
			name: "ROW_LABELS[7] === 'H'",
			pass,
			detail: pass ? 'ok' : `Expected 'H', got ${val}`,
		});
	} catch (e) {
		results.push({
			name: "ROW_LABELS[7] === 'H'",
			pass: false,
			detail: String(e),
		});
	}

	// Test 13: COL_LABELS[0] === '1'
	try {
		const val = await page.evaluate(() => COL_LABELS[0]);
		const pass = val === '1';
		results.push({
			name: "COL_LABELS[0] === '1'",
			pass,
			detail: pass ? 'ok' : `Expected '1', got ${val}`,
		});
	} catch (e) {
		results.push({
			name: "COL_LABELS[0] === '1'",
			pass: false,
			detail: String(e),
		});
	}

	// Test 14: COL_LABELS[11] === '12'
	try {
		const val = await page.evaluate(() => COL_LABELS[11]);
		const pass = val === '12';
		results.push({
			name: "COL_LABELS[11] === '12'",
			pass,
			detail: pass ? 'ok' : `Expected '12', got ${val}`,
		});
	} catch (e) {
		results.push({
			name: "COL_LABELS[11] === '12'",
			pass: false,
			detail: String(e),
		});
	}

	// Test 15: After applyPlateDoseMap(), each well's drugConcentrationUm matches its row
	try {
		const result = await page.evaluate(() => {
			applyPlateDoseMap();
			// Check a few wells to verify dose map applied
			const well00 = gameState.wellPlate[0]; // row 0, col 0
			const well37 = gameState.wellPlate[3 * 12 + 7]; // row 3, col 7
			const well76 = gameState.wellPlate[7 * 12 + 5]; // row 7, col 5
			return {
				well00CarbOk: well00.drugConcentrationUm === 0.0,
				well37CarbOk: well37.drugConcentrationUm === 0.125,
				well76CarbOk: well76.drugConcentrationUm === 25.0,
			};
		});
		const pass = result.well00CarbOk && result.well37CarbOk && result.well76CarbOk;
		results.push({
			name: 'applyPlateDoseMap() sets drugConcentrationUm by row',
			pass,
			detail: pass ? 'ok' : `Result: ${JSON.stringify(result)}`,
		});
	} catch (e) {
		results.push({
			name: 'applyPlateDoseMap() sets drugConcentrationUm by row',
			pass: false,
			detail: String(e),
		});
	}

	// Test 16: After applyPlateDoseMap(), each well's metforminPresent matches its column
	try {
		const result = await page.evaluate(() => {
			applyPlateDoseMap();
			// Check wells at column 0 (no metformin) and column 6+ (metformin)
			const well00 = gameState.wellPlate[0]; // row 0, col 0
			const well06 = gameState.wellPlate[6]; // row 0, col 6
			const well16 = gameState.wellPlate[1 * 12 + 6]; // row 1, col 6
			const well111 = gameState.wellPlate[11]; // row 0, col 11
			return {
				well00MetOk: well00.metforminPresent === false,
				well06MetOk: well06.metforminPresent === true,
				well16MetOk: well16.metforminPresent === true,
				well111MetOk: well111.metforminPresent === true,
			};
		});
		const pass = result.well00MetOk && result.well06MetOk && result.well16MetOk && result.well111MetOk;
		results.push({
			name: 'applyPlateDoseMap() sets metforminPresent by column',
			pass,
			detail: pass ? 'ok' : `Result: ${JSON.stringify(result)}`,
		});
	} catch (e) {
		results.push({
			name: 'applyPlateDoseMap() sets metforminPresent by column',
			pass: false,
			detail: String(e),
		});
	}

	return results;
}

// ============================================
async function main() {
	console.log('Starting plate_96 tests...\n');

	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });

		// Allow page JS to load fully
		await page.waitForTimeout(500);

		const results = await runTests(page);

		// Print results
		let passCount = 0;
		for (const test of results) {
			const status = test.pass ? 'OK' : 'FAIL';
			console.log(`[${status}] ${test.name}`);
			if (!test.pass) {
				console.log(`     ${test.detail}`);
			}
			if (test.pass) passCount++;
		}

		console.log(`\nResults: ${passCount}/${results.length} passed`);

		await page.close();

		// Exit with error code if any test failed
		if (passCount !== results.length) {
			process.exit(1);
		}
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error('Test error:', error);
	process.exit(1);
});
