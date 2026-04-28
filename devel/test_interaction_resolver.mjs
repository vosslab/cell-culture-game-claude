// devel/test_interaction_resolver.mjs
// Test the interaction resolver with Playwright

import { chromium } from 'playwright';
import path from 'path';

const gamePath = path.resolve('cell_culture_game.html');
const url = `file://${gamePath}`;

async function runTests() {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
	await page.goto(url);
	await page.waitForLoadState('networkidle');

	let passCount = 0;
	let totalTests = 0;

	// Test 1: spray_hood with no tool selected, click ethanol_bottle directly
	// Expected: { kind: 'discharge', event: 'spray_ethanol', target: 'hood_surface', consumesVolumeMl: 0 }
	totalTests++;
	try {
		const result = await page.evaluate(() => {
			const step = PROTOCOL_STEPS.find(s => s.id === 'spray_hood');
			return resolveInteraction({
				selectedTool: null,
				clickedItem: 'ethanol_bottle',
				activeStep: step,
				heldLiquid: undefined,
			});
		});
		if (
			result.kind === 'discharge' &&
			result.event === 'spray_ethanol' &&
			result.target === 'hood_surface' &&
			result.consumesVolumeMl === 0
		) {
			console.log('[PASS] Test 1: spray_hood direct click');
			passCount++;
		} else {
			console.log('[FAIL] Test 1: spray_hood direct click');
			console.log('  Result:', JSON.stringify(result));
		}
	} catch (err) {
		console.log('[FAIL] Test 1: spray_hood direct click - error:', err.message);
	}

	// Test 2: pbs_wash first interaction - load PBS with serological_pipette
	// Expected: { kind: 'load', resultActor: 'serological_pipette', resultLiquid: 'pbs', volumeMl: 4, colorKey: 'pbs' }
	totalTests++;
	try {
		const result = await page.evaluate(() => {
			const step = PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');
			return resolveInteraction({
				selectedTool: 'serological_pipette',
				clickedItem: 'pbs_bottle',
				activeStep: step,
				heldLiquid: undefined,
			});
		});
		if (
			result.kind === 'load' &&
			result.resultActor === 'serological_pipette' &&
			result.resultLiquid === 'pbs' &&
			result.volumeMl === 4 &&
			result.colorKey === 'pbs'
		) {
			console.log('[PASS] Test 2: pbs_wash load PBS');
			passCount++;
		} else {
			console.log('[FAIL] Test 2: pbs_wash load PBS');
			console.log('  Result:', JSON.stringify(result));
		}
	} catch (err) {
		console.log('[FAIL] Test 2: pbs_wash load PBS - error:', err.message);
	}

	// Test 3: pbs_wash second interaction - discharge PBS into flask
	// Expected: { kind: 'discharge', event: 'pbs_wash', target: 'flask', consumesVolumeMl: 4 }
	totalTests++;
	try {
		const result = await page.evaluate(() => {
			const step = PROTOCOL_STEPS.find(s => s.id === 'pbs_wash');
			return resolveInteraction({
				selectedTool: 'serological_pipette',
				clickedItem: 'flask',
				activeStep: step,
				heldLiquid: {
					tool: 'serological_pipette',
					liquid: 'pbs',
					volumeMl: 4,
					colorKey: 'pbs',
				},
			});
		});
		if (
			result.kind === 'discharge' &&
			result.event === 'pbs_wash' &&
			result.target === 'flask' &&
			result.consumesVolumeMl === 4
		) {
			console.log('[PASS] Test 3: pbs_wash discharge to flask');
			passCount++;
		} else {
			console.log('[FAIL] Test 3: pbs_wash discharge to flask');
			console.log('  Result:', JSON.stringify(result));
		}
	} catch (err) {
		console.log('[FAIL] Test 3: pbs_wash discharge to flask - error:', err.message);
	}

	// Test 4: aspirate_old_media with aspirating_pipette + click flask
	// Expected: { kind: 'discharge', event: 'aspirate', target: 'waste_container' }
	totalTests++;
	try {
		const result = await page.evaluate(() => {
			const step = PROTOCOL_STEPS.find(s => s.id === 'aspirate_old_media');
			return resolveInteraction({
				selectedTool: 'aspirating_pipette',
				clickedItem: 'flask',
				activeStep: step,
				heldLiquid: undefined,
			});
		});
		if (
			result.kind === 'discharge' &&
			result.event === 'aspirate' &&
			result.target === 'waste_container'
		) {
			console.log('[PASS] Test 4: aspirate_old_media with pipette');
			passCount++;
		} else {
			console.log('[FAIL] Test 4: aspirate_old_media with pipette');
			console.log('  Result:', JSON.stringify(result));
		}
	} catch (err) {
		console.log('[FAIL] Test 4: aspirate_old_media with pipette - error:', err.message);
	}

	// Test 5: count_cells step (no allowedInteractions) should return no-op
	// Expected: { kind: 'no-op' }
	totalTests++;
	try {
		const result = await page.evaluate(() => {
			const step = PROTOCOL_STEPS.find(s => s.id === 'count_cells');
			return resolveInteraction({
				selectedTool: 'serological_pipette',
				clickedItem: 'flask',
				activeStep: step,
				heldLiquid: undefined,
			});
		});
		if (result.kind === 'no-op') {
			console.log('[PASS] Test 5: count_cells no-op (legacy path)');
			passCount++;
		} else {
			console.log('[FAIL] Test 5: count_cells no-op (legacy path)');
			console.log('  Result:', JSON.stringify(result));
		}
	} catch (err) {
		console.log('[FAIL] Test 5: count_cells no-op (legacy path) - error:', err.message);
	}

	// Summary
	console.log('');
	if (passCount === totalTests) {
		console.log(`interaction_resolver: OK ${passCount}/${totalTests}`);
		await browser.close();
		process.exit(0);
	} else {
		console.log(`interaction_resolver: FAILED ${passCount}/${totalTests}`);
		await browser.close();
		process.exit(1);
	}
}

runTests().catch(err => {
	console.error('Test error:', err);
	process.exit(1);
});
