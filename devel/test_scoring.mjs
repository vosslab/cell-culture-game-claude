#!/usr/bin/env node
/**
 * test_scoring.mjs - Playwright tests for scoring.ts calculateScore function.
 * Opens cell_culture_game.html and validates protocol-fidelity scoring with
 * five categories: dilutionAccuracy, plateMap, timing, mttTechnique, absorbancePlausibility.
 * Run: node devel/test_scoring.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import process from 'node:process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;

// ============================================
async function runTests(page) {
	const results = [];

	// Test 1: Happy path - fresh gameState with all counters at defaults
	// Set a monotonic absorbance profile (row 0 highest, row 7 lowest, for cols 0..5)
	try {
		const result = await page.evaluate(() => {
			// Reset gameState counters to defaults
			gameState.dilutionErrors = 0;
			gameState.plateMapErrors = 0;
			gameState.mttTechniqueErrors = 0;
			gameState.incubationTimingOk = true;

			// Set monotonic absorbance: row 0 = 1.0, decreasing to row 7 = 0.2
			// Apply to columns 0-5 (carboplatin only)
			for (let row = 0; row < 8; row++) {
				const absorbance = 1.0 - (row * 0.1); // 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3
				for (let col = 0; col < 6; col++) {
					const wellIdx = row * 12 + col;
					gameState.wellPlate[wellIdx].absorbance = absorbance;
				}
			}

			// Call calculateScore
			const score = calculateScore();
			return score;
		});

		const pass = result.totalPoints >= 90 && result.stars === 3;
		results.push({
			name: 'Happy path: fresh gameState, monotonic profile, score >= 90, stars === 3',
			pass,
			detail: pass ? 'ok' : `Expected total >= 90 and stars === 3, got total=${result.totalPoints}, stars=${result.stars}`,
		});
	} catch (e) {
		results.push({
			name: 'Happy path: fresh gameState, monotonic profile, score >= 90, stars === 3',
			pass: false,
			detail: String(e),
		});
	}

	// Test 2: Wrong-dilution path - set multiple errors to drop score below 60
	try {
		const result = await page.evaluate(() => {
			gameState.dilutionErrors = 5;
			gameState.plateMapErrors = 3;
			gameState.mttTechniqueErrors = 2;
			gameState.incubationTimingOk = false;

			// Set non-monotonic absorbance to reduce that category too
			for (let row = 0; row < 8; row++) {
				const absorbance = Math.sin(row) * 0.5 + 0.5;
				for (let col = 0; col < 6; col++) {
					const wellIdx = row * 12 + col;
					gameState.wellPlate[wellIdx].absorbance = absorbance;
				}
			}

			const score = calculateScore();
			return score;
		});

		// Multiple errors: dilution=0, plateMap=5, timing=8, mtt=10, absorbance reduced
		// Should total < 60 with stars <= 2
		const pass = result.totalPoints < 60 && result.stars <= 2;
		results.push({
			name: 'Multiple errors path: score < 60, stars <= 2',
			pass,
			detail: pass ? 'ok' : `Expected total < 60 and stars <= 2, got total=${result.totalPoints}, stars=${result.stars}`,
		});
	} catch (e) {
		results.push({
			name: 'Multiple errors path: score < 60, stars <= 2',
			pass: false,
			detail: String(e),
		});
	}

	// Test 3: All five category fields present in result
	try {
		const result = await page.evaluate(() => {
			gameState.dilutionErrors = 0;
			gameState.plateMapErrors = 0;
			gameState.mttTechniqueErrors = 0;
			gameState.incubationTimingOk = true;

			// Set monotonic absorbance
			for (let row = 0; row < 8; row++) {
				const absorbance = 1.0 - (row * 0.1);
				for (let col = 0; col < 6; col++) {
					const wellIdx = row * 12 + col;
					gameState.wellPlate[wellIdx].absorbance = absorbance;
				}
			}

			const score = calculateScore();
			return {
				hasDilutionAccuracy: 'dilutionAccuracy' in score.categories,
				hasPlateMap: 'plateMap' in score.categories,
				hasTiming: 'timing' in score.categories,
				hasMttTechnique: 'mttTechnique' in score.categories,
				hasAbsorbancePlausibility: 'absorbancePlausibility' in score.categories,
			};
		});

		const pass = result.hasDilutionAccuracy && result.hasPlateMap && result.hasTiming && result.hasMttTechnique && result.hasAbsorbancePlausibility;
		results.push({
			name: 'All five category fields present in ScoreResult',
			pass,
			detail: pass ? 'ok' : `Result: ${JSON.stringify(result)}`,
		});
	} catch (e) {
		results.push({
			name: 'All five category fields present in ScoreResult',
			pass: false,
			detail: String(e),
		});
	}

	// Test 4: Non-monotonic absorbance reduces absorbancePlausibility
	try {
		const result = await page.evaluate(() => {
			gameState.dilutionErrors = 0;
			gameState.plateMapErrors = 0;
			gameState.mttTechniqueErrors = 0;
			gameState.incubationTimingOk = true;

			// Monotonic profile
			for (let row = 0; row < 8; row++) {
				const absorbance = 1.0 - (row * 0.1);
				for (let col = 0; col < 6; col++) {
					const wellIdx = row * 12 + col;
					gameState.wellPlate[wellIdx].absorbance = absorbance;
				}
			}

			const monoScore = calculateScore();
			const monoAbsorbancePoints = monoScore.categories.absorbancePlausibility.points;

			// Jumbled profile - non-monotonic
			for (let row = 0; row < 8; row++) {
				const jumbled = Math.sin(row) * 0.5 + 0.5; // oscillating values
				for (let col = 0; col < 6; col++) {
					const wellIdx = row * 12 + col;
					gameState.wellPlate[wellIdx].absorbance = jumbled;
				}
			}

			const jumbledScore = calculateScore();
			const jumbledAbsorbancePoints = jumbledScore.categories.absorbancePlausibility.points;

			return {
				monoPoints: monoAbsorbancePoints,
				jumbledPoints: jumbledAbsorbancePoints,
			};
		});

		const pass = result.jumbledPoints < result.monoPoints;
		results.push({
			name: 'Non-monotonic absorbance reduces absorbancePlausibility score',
			pass,
			detail: pass ? 'ok' : `Jumbled (${result.jumbledPoints}) should be < Monotonic (${result.monoPoints})`,
		});
	} catch (e) {
		results.push({
			name: 'Non-monotonic absorbance reduces absorbancePlausibility score',
			pass: false,
			detail: String(e),
		});
	}

	// Test 5: No legacy field names remain on ScoreResult (order, cleanliness, wastedMedia)
	try {
		const result = await page.evaluate(() => {
			gameState.dilutionErrors = 0;
			gameState.plateMapErrors = 0;
			gameState.mttTechniqueErrors = 0;
			gameState.incubationTimingOk = true;

			// Set monotonic absorbance
			for (let row = 0; row < 8; row++) {
				const absorbance = 1.0 - (row * 0.1);
				for (let col = 0; col < 6; col++) {
					const wellIdx = row * 12 + col;
					gameState.wellPlate[wellIdx].absorbance = absorbance;
				}
			}

			const score = calculateScore();
			return {
				hasOrder: 'order' in score.categories,
				hasCleanliness: 'cleanliness' in score.categories,
				hasWastedMedia: 'wastedMedia' in score.categories,
			};
		});

		const pass = !result.hasOrder && !result.hasCleanliness && !result.hasWastedMedia;
		results.push({
			name: 'No legacy field names (order, cleanliness, wastedMedia) on ScoreResult',
			pass,
			detail: pass ? 'ok' : `Result: ${JSON.stringify(result)}`,
		});
	} catch (e) {
		results.push({
			name: 'No legacy field names (order, cleanliness, wastedMedia) on ScoreResult',
			pass: false,
			detail: String(e),
		});
	}

	return results;
}

// ============================================
async function main() {
	console.log('Starting scoring tests...\n');

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
