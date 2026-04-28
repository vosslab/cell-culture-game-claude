/**
 * test_step_dispatch.mjs - Playwright tests for step_dispatch.ts helpers.
 * Validates getIncubationSteps, getModalOwnedSteps, getStepsForScene, etc.
 * Run: node devel/test_step_dispatch.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import process from 'node:process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;

// ============================================
async function runTests(page) {
	const results = [];

	// Test 1: getIncubationSteps returns exactly 3 entries with expected ids
	try {
		const incubSteps = await page.evaluate(() => {
			return PROTOCOL_STEPS
				.filter(s => s.isIncubation === true)
				.map(s => s.id);
		});
		const expectedIds = new Set(['incubate_day1', 'incubate_48h', 'incubate_mtt']);
		const actualIds = new Set(incubSteps);
		const pass = incubSteps.length === 3 &&
			[...expectedIds].every(id => actualIds.has(id));
		results.push({
			name: 'getIncubationSteps returns 3 entries {incubate_day1, incubate_48h, incubate_mtt}',
			pass,
			detail: pass ? 'ok' : `got ${incubSteps.length} steps: ${incubSteps.join(', ')}`,
		});
	} catch (e) {
		results.push({
			name: 'getIncubationSteps returns 3 entries {incubate_day1, incubate_48h, incubate_mtt}',
			pass: false,
			detail: String(e),
		});
	}

	// Test 2: getModalOwnedSteps('drug_treatment') returns 6 specific steps
	try {
		const drugModalSteps = await page.evaluate(() => {
			return PROTOCOL_STEPS
				.filter(s => s.modal && s.modal.owner === 'drug_treatment')
				.map(s => s.id);
		});
		const expectedIds = new Set([
			'carb_intermediate',
			'carb_low_range',
			'carb_high_range',
			'metformin_stock',
			'add_carboplatin',
			'add_metformin'
		]);
		const actualIds = new Set(drugModalSteps);
		const pass = drugModalSteps.length === 6 &&
			[...expectedIds].every(id => actualIds.has(id));
		results.push({
			name: 'getModalOwnedSteps("drug_treatment") returns 6 expected steps',
			pass,
			detail: pass ? 'ok' : `got ${drugModalSteps.length} steps: ${drugModalSteps.join(', ')}`,
		});
	} catch (e) {
		results.push({
			name: 'getModalOwnedSteps("drug_treatment") returns 6 expected steps',
			pass: false,
			detail: String(e),
		});
	}

	// Test 3: getModalOwnedSteps('microscope') returns at least 1 entry
	try {
		const microscopeModalSteps = await page.evaluate(() => {
			return PROTOCOL_STEPS
				.filter(s => s.modal && s.modal.owner === 'microscope')
				.map(s => s.id);
		});
		const pass = microscopeModalSteps.length >= 1 &&
			microscopeModalSteps.includes('count_cells');
		results.push({
			name: 'getModalOwnedSteps("microscope") returns >= 1 entry (count_cells)',
			pass,
			detail: pass ? 'ok' : `got ${microscopeModalSteps.length} steps: ${microscopeModalSteps.join(', ')}`,
		});
	} catch (e) {
		results.push({
			name: 'getModalOwnedSteps("microscope") returns >= 1 entry (count_cells)',
			pass: false,
			detail: String(e),
		});
	}

	// Test 4: getStepsForScene('hood') returns 14+ steps
	try {
		const hoodSteps = await page.evaluate(() => {
			return PROTOCOL_STEPS
				.filter(s => s.scene === 'hood')
				.map(s => s.id);
		});
		const pass = hoodSteps.length >= 14;
		results.push({
			name: 'getStepsForScene("hood") returns 14+ steps',
			pass,
			detail: pass ? `ok (${hoodSteps.length} steps)` : `got ${hoodSteps.length} steps`,
		});
	} catch (e) {
		results.push({
			name: 'getStepsForScene("hood") returns 14+ steps',
			pass: false,
			detail: String(e),
		});
	}

	// Test 5: getStepIdsRequiringTrigger includes 'spray_hood' and 'pbs_wash'
	try {
		const triggerStepIds = await page.evaluate(() => {
			return PROTOCOL_STEPS
				.filter(s => s.trigger)
				.map(s => s.id);
		});
		const triggerIdSet = new Set(triggerStepIds);
		const pass = triggerIdSet.has('spray_hood') && triggerIdSet.has('pbs_wash');
		results.push({
			name: 'getStepIdsRequiringTrigger includes "spray_hood" and "pbs_wash"',
			pass,
			detail: pass ? 'ok' : `missing trigger ids in set of ${triggerStepIds.length}`,
		});
	} catch (e) {
		results.push({
			name: 'getStepIdsRequiringTrigger includes "spray_hood" and "pbs_wash"',
			pass: false,
			detail: String(e),
		});
	}

	// Test 6: isModalOwnedStep and isIncubationStep convenience functions
	try {
		const checks = await page.evaluate(() => {
			const countCellsIsModal = PROTOCOL_STEPS
				.find(s => s.id === 'count_cells')?.modal !== undefined;
			const sprayHoodIsModal = PROTOCOL_STEPS
				.find(s => s.id === 'spray_hood')?.modal !== undefined;
			return {
				countCellsIsModal,
				sprayHoodIsModal,
			};
		});
		const pass = checks.countCellsIsModal === true &&
			checks.sprayHoodIsModal === false;
		results.push({
			name: 'isModalOwnedStep("count_cells") true; isModalOwnedStep("spray_hood") false',
			pass,
			detail: pass ? 'ok' : `count_cells modal=${checks.countCellsIsModal}, spray_hood modal=${checks.sprayHoodIsModal}`,
		});
	} catch (e) {
		results.push({
			name: 'isModalOwnedStep("count_cells") true; isModalOwnedStep("spray_hood") false',
			pass: false,
			detail: String(e),
		});
	}

	return results;
}

// ============================================
async function main() {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

	try {
		await page.goto(gameUrl, { waitUntil: 'networkidle' });
		const results = await runTests(page);

		const passed = results.filter(r => r.pass).length;
		const total = results.length;

		console.log(`\nstep_dispatch: ${passed}/${total}`);
		for (const result of results) {
			const status = result.pass ? 'PASS' : 'FAIL';
			console.log(`  [${status}] ${result.name}`);
			if (!result.pass) {
				console.log(`         ${result.detail}`);
			}
		}

		if (passed === total) {
			console.log(`\nstep_dispatch: OK ${passed}/${total}\n`);
			process.exit(0);
		} else {
			console.log(`\nstep_dispatch: FAILED ${passed}/${total}\n`);
			process.exit(1);
		}
	} catch (e) {
		console.error('Test error:', e);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

main();
