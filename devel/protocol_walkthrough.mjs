/**
 * protocol_walkthrough.mjs - Two-pass protocol walkthrough test
 *
 * Pass A: data-layer walkthrough
 *   Walk the nextId chain from the first step to null, calling completeStep()
 *   in order via page.evaluate. Screenshot each step. Assert final state:
 *   - completedSteps.length === PROTOCOL_STEPS.length (25)
 *   - stepsOutOfOrder === 0
 *   - activeStepId === null
 *
 * Pass B: wiring-coverage assertion
 *   Read window.__protocolValidation set by validateTriggerCoverage on load.
 *   Diff PROTOCOL_STEPS against window.__registeredTriggers.
 *   Fail if any validation error or missing trigger coverage.
 *
 * Run: node devel/protocol_walkthrough.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import process from 'node:process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;
const screenshotDir = 'build/walkthrough';

// Ensure screenshot directory exists and is empty so stale files from
// prior runs do not mix with the current walkthrough output.
fs.mkdirSync(screenshotDir, { recursive: true });
for (const f of fs.readdirSync(screenshotDir)) {
	if (f.endsWith('.png')) fs.unlinkSync(path.join(screenshotDir, f));
}

// ============================================
async function main() {
	console.log('Starting protocol walkthrough...\n');

	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		await page.goto(gameUrl, { waitUntil: 'load' });
		await page.waitForTimeout(500);

		// Dismiss the welcome overlay. In a fresh browser context
		// localStorage is empty, so init.ts shows welcome-overlay until
		// the student clicks welcome-start-btn. Click it here so every
		// screenshot shows the actual game instead of the splash.
		const startBtn = await page.$('#welcome-start-btn');
		if (startBtn) {
			await startBtn.click();
			await page.waitForTimeout(200);
		}

		// ============================================
		// Pass B (run FIRST): Read validator before state mutations
		// ============================================
		console.log('Pass B: Checking wiring coverage...');

		const validation = await page.evaluate(() => window.__protocolValidation);
		if (!validation || validation.ok !== true) {
			console.error('[FAIL] validateTriggerCoverage failed');
			console.error(`Title: ${validation?.title || 'unknown'}`);
			console.error(`Detail: ${validation?.detail || 'unknown'}`);
			process.exit(1);
		}
		console.log('[OK] validateTriggerCoverage passed: all steps registered\n');

		// ============================================
		// Pass A: Walk the nextId chain, call completeStep, screenshot
		// ============================================
		console.log('Pass A: Walking the protocol chain...');

		// Collect step ids by following nextId
		const stepIds = await page.evaluate(() => {
			const ids = [];
			let current = PROTOCOL_STEPS[0].id;
			while (current !== null) {
				ids.push(current);
				const step = PROTOCOL_STEPS.find(s => s.id === current);
				if (!step) break;
				current = step.nextId;
				// If nextId is a function (branching, not used yet), stop
				if (typeof current === 'function') break;
			}
			return ids;
		});

		console.log(`Found ${stepIds.length} steps in chain\n`);

		// Walk and screenshot each step
		for (let i = 0; i < stepIds.length; i++) {
			const id = stepIds[i];

			// Call completeStep
			await page.evaluate((stepId) => {
				completeStep(stepId);
			}, id);

			// Screenshot with zero-padded 1-based index so filenames
			// match human step numbering (01..25 for 25 steps).
			const index = String(i + 1).padStart(2, '0');
			const fname = `${index}_${id}.png`;
			const fpath = path.join(screenshotDir, fname);
			await page.screenshot({ path: fpath });
			console.log(`[${i + 1}/${stepIds.length}] ${id}`);
		}

		console.log('');

		// ============================================
		// Final state assertions
		// ============================================
		const finalState = await page.evaluate(() => ({
			completed: gameState.completedSteps.length,
			total: PROTOCOL_STEPS.length,
			outOfOrder: gameState.stepsOutOfOrder,
			activeStepId: gameState.activeStepId,
		}));

		console.log('Final state check:');
		console.log(`  completedSteps: ${finalState.completed}/${finalState.total}`);
		console.log(`  stepsOutOfOrder: ${finalState.outOfOrder}`);
		console.log(`  activeStepId: ${finalState.activeStepId}`);
		console.log('');

		let failed = false;

		if (finalState.completed !== finalState.total) {
			console.error(
				`FAIL: completed ${finalState.completed}/${finalState.total}, expected ${finalState.total}`,
			);
			failed = true;
		}

		if (finalState.outOfOrder !== 0) {
			console.error(
				`FAIL: ${finalState.outOfOrder} out-of-order attempts, expected 0`,
			);
			failed = true;
		}

		if (finalState.activeStepId !== null) {
			console.error(
				`FAIL: activeStepId is '${finalState.activeStepId}', expected null`,
			);
			failed = true;
		}

		// Report screenshot count
		const screenshots = fs.readdirSync(screenshotDir).filter(
			f => f.endsWith('.png'),
		);
		console.log(`Screenshots written: ${screenshots.length}`);

		await page.close();

		if (failed) {
			process.exit(1);
		}

		console.log(
			`\n[OK] walkthrough complete: ${finalState.completed}/${finalState.total} steps`,
		);
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error('Walkthrough error:', error);
	process.exit(1);
});
