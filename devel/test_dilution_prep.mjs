/**
 * test_dilution_prep.mjs - Playwright tests for dilution preparation functions.
 * Opens cell_culture_game.html and validates prepareCarbIntermediate, prepareCarbLowRange,
 * prepareCarbHighRange, and prepareMetforminWorking functions via page.evaluate().
 * Run: node devel/test_dilution_prep.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import process from 'node:process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;

// ============================================
async function runTests(page) {
	const results = [];

	// Test 1: prepareCarbIntermediate - good case
	try {
		const result = await page.evaluate(() => prepareCarbIntermediate(20, 980));
		const pass = result.ok === true;
		results.push({
			name: 'prepareCarbIntermediate(20, 980) - correct',
			pass,
			detail: pass ? 'ok' : `Expected ok=true, got ok=${result.ok}`,
		});
	} catch (e) {
		results.push({
			name: 'prepareCarbIntermediate(20, 980) - correct',
			pass: false,
			detail: String(e),
		});
	}

	// Test 2: prepareCarbIntermediate - bad case (wrong ratio)
	try {
		const result = await page.evaluate(() => prepareCarbIntermediate(40, 960));
		const pass = result.ok === false;
		results.push({
			name: 'prepareCarbIntermediate(40, 960) - wrong ratio',
			pass,
			detail: pass ? 'ok' : `Expected ok=false, got ok=${result.ok}`,
		});
	} catch (e) {
		results.push({
			name: 'prepareCarbIntermediate(40, 960) - wrong ratio',
			pass: false,
			detail: String(e),
		});
	}

	// Test 3: prepareCarbLowRange(0, 2, 998) - good case
	try {
		const result = await page.evaluate(() => prepareCarbLowRange(0, 2, 998));
		const pass = result.ok === true;
		results.push({
			name: 'prepareCarbLowRange(0, 2, 998) - correct',
			pass,
			detail: pass ? 'ok' : `Expected ok=true, got ok=${result.ok}`,
		});
	} catch (e) {
		results.push({
			name: 'prepareCarbLowRange(0, 2, 998) - correct',
			pass: false,
			detail: String(e),
		});
	}

	// Test 4: prepareCarbLowRange(0, 5, 995) - bad case
	try {
		const result = await page.evaluate(() => prepareCarbLowRange(0, 5, 995));
		const pass = result.ok === false;
		results.push({
			name: 'prepareCarbLowRange(0, 5, 995) - wrong ratio',
			pass,
			detail: pass ? 'ok' : `Expected ok=false, got ok=${result.ok}`,
		});
	} catch (e) {
		results.push({
			name: 'prepareCarbLowRange(0, 5, 995) - wrong ratio',
			pass: false,
			detail: String(e),
		});
	}

	// Test 5: prepareCarbHighRange(1, 50, 950) - good case
	try {
		const result = await page.evaluate(() => prepareCarbHighRange(1, 50, 950));
		const pass = result.ok === true;
		results.push({
			name: 'prepareCarbHighRange(1, 50, 950) - correct',
			pass,
			detail: pass ? 'ok' : `Expected ok=true, got ok=${result.ok}`,
		});
	} catch (e) {
		results.push({
			name: 'prepareCarbHighRange(1, 50, 950) - correct',
			pass: false,
			detail: String(e),
		});
	}

	// Test 6: prepareCarbHighRange(1, 100, 900) - bad case
	try {
		const result = await page.evaluate(() => prepareCarbHighRange(1, 100, 900));
		const pass = result.ok === false;
		results.push({
			name: 'prepareCarbHighRange(1, 100, 900) - wrong ratio',
			pass,
			detail: pass ? 'ok' : `Expected ok=false, got ok=${result.ok}`,
		});
	} catch (e) {
		results.push({
			name: 'prepareCarbHighRange(1, 100, 900) - wrong ratio',
			pass: false,
			detail: String(e),
		});
	}

	// Test 7: prepareMetforminWorking(10, 990) - good case
	try {
		const result = await page.evaluate(() => prepareMetforminWorking(10, 990));
		const pass = result.ok === true;
		results.push({
			name: 'prepareMetforminWorking(10, 990) - correct',
			pass,
			detail: pass ? 'ok' : `Expected ok=true, got ok=${result.ok}`,
		});
	} catch (e) {
		results.push({
			name: 'prepareMetforminWorking(10, 990) - correct',
			pass: false,
			detail: String(e),
		});
	}

	// Test 8: prepareMetforminWorking(20, 980) - bad case
	try {
		const result = await page.evaluate(() => prepareMetforminWorking(20, 980));
		const pass = result.ok === false;
		results.push({
			name: 'prepareMetforminWorking(20, 980) - wrong ratio',
			pass,
			detail: pass ? 'ok' : `Expected ok=false, got ok=${result.ok}`,
		});
	} catch (e) {
		results.push({
			name: 'prepareMetforminWorking(20, 980) - wrong ratio',
			pass: false,
			detail: String(e),
		});
	}

	return results;
}

// ============================================
async function main() {
	console.log('Starting dilution_prep tests...\n');

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
