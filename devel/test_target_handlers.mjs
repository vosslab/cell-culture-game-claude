#!/usr/bin/env node
/**
 * test_target_handlers.mjs - Highlighted-target click audit
 *
 * Systematic defense against the cell_counter / M4-stub class of bug:
 * every item that appears in a step's targetItems is highlighted in
 * green for the student, so clicking any one of them MUST produce an
 * observable response. Silent handlers (branches that fall through or
 * were never written) are the signature failure.
 *
 * For each protocol step with scene 'hood' or 'bench', this test:
 *   1. Sets gameState.activeStepId to the step
 *   2. Switches to the step's scene
 *   3. For each standalone-clickable targetItem (bench equipment or
 *      hood items that do not require a specific held tool), clicks
 *      the DOM element and snapshots the state before / after
 *   4. Asserts that SOMETHING observable changed: notification shown,
 *      selectedTool changed, activeStepId advanced, or a game-state
 *      flag flipped (hemocytometerLoaded, flaskMediaAge, etc).
 *
 * The goal is not to replay the full protocol. It is to prove that
 * every highlighted target has a click handler, no matter how basic.
 * The walkthrough_ui.mjs test covers end-to-end; this one covers
 * breadth.
 *
 * Run: node devel/test_target_handlers.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import process from 'node:process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;

// Items that can be clicked standalone (no held-tool precondition).
// Tool-plus-item combos like flask, well_plate, mtt_vial are skipped
// because probing them without the matching tool produces expected
// "pick up the pipette first" guards, which is also a form of
// handler coverage but makes the test noisy. The items below are
// the ones whose silent-no-op case is the real stuck-point risk.
const STANDALONE_CLICKABLE = new Set([
	'ethanol_bottle',
	'aspirating_pipette',
	'serological_pipette',
	'multichannel_pipette',
	'pbs_bottle',
	'trypsin_bottle',
	'media_bottle',
	'waste_container',
	'biohazard_decant',
	'dmso_bottle',
	'mtt_vial',
	'drug_vials',
	'carboplatin_stock',
	'metformin_stock',
	'sterile_water',
	'dilution_tube_rack',
	'centrifuge',
	'water_bath',
	'cell_counter',
	'microscope',
	'vortex',
	'incubator',
]);

async function runAudit(page) {
	const results = [];
	const stepsInfo = await page.evaluate(() => {
		return PROTOCOL_STEPS.map((s) => ({
			id: s.id,
			scene: s.scene,
			targetItems: s.targetItems || [],
		})).filter((s) => s.scene === 'hood' || s.scene === 'bench');
	});

	for (const step of stepsInfo) {
		for (const itemId of step.targetItems) {
			if (!STANDALONE_CLICKABLE.has(itemId)) continue;

			// Fresh probe: reset active step, switch scene, clear any
			// previous tool, install a notification counter, click the
			// item, and check if anything changed.
			const observed = await page.evaluate(
				async ({ stepId, scene, itemId }) => {
					// Capture showNotification calls for this probe.
					if (!window.__probeNotifyCount) {
						window.__probeNotifyCount = 0;
						const orig = window.showNotification;
						window.showNotification = function (...args) {
							window.__probeNotifyCount++;
							return orig.apply(this, args);
						};
					}
					const startNotify = window.__probeNotifyCount;

					gameState.activeStepId = stepId;
					gameState.selectedTool = null;
					switchScene(scene);
					await new Promise((r) => setTimeout(r, 80));

					const before = {
						tool: gameState.selectedTool,
						active: gameState.activeStepId,
						hemoLoaded: gameState.hemocytometerLoaded,
						drugsAdded: gameState.drugsAdded,
						flaskAge: gameState.flaskMediaAge,
						scene: gameState.activeScene,
						completed: gameState.completedSteps.length,
					};

					const containerId = scene === 'hood' ? 'hood-scene' : 'bench-scene';
					const container = document.getElementById(containerId);
					if (!container) return { error: `scene container #${containerId} missing` };
					const el = container.querySelector(`[data-item-id="${itemId}"]`);
					if (!el) return { error: `item [data-item-id="${itemId}"] not found in ${containerId}` };

					el.click();
					await new Promise((r) => setTimeout(r, 120));

					const after = {
						tool: gameState.selectedTool,
						active: gameState.activeStepId,
						hemoLoaded: gameState.hemocytometerLoaded,
						drugsAdded: gameState.drugsAdded,
						flaskAge: gameState.flaskMediaAge,
						scene: gameState.activeScene,
						completed: gameState.completedSteps.length,
					};
					const notifyDelta = window.__probeNotifyCount - startNotify;

					return { before, after, notifyDelta };
				},
				{ stepId: step.id, scene: step.scene, itemId },
			);

			if (observed.error) {
				results.push({
					name: `${step.id}: click ${itemId}`,
					pass: false,
					detail: observed.error,
				});
				continue;
			}

			// Something observable must change.
			const stateChanged =
				observed.before.tool !== observed.after.tool ||
				observed.before.active !== observed.after.active ||
				observed.before.hemoLoaded !== observed.after.hemoLoaded ||
				observed.before.drugsAdded !== observed.after.drugsAdded ||
				observed.before.flaskAge !== observed.after.flaskAge ||
				observed.before.scene !== observed.after.scene ||
				observed.before.completed !== observed.after.completed;
			const notified = observed.notifyDelta > 0;
			const pass = stateChanged || notified;
			results.push({
				name: `${step.id}: click ${itemId} produces observable response`,
				pass,
				detail: pass
					? `ok (${stateChanged ? 'state' : ''}${stateChanged && notified ? '+' : ''}${notified ? 'notify' : ''})`
					: `silent handler: no state change, no notification. This is the cell_counter class of bug.`,
			});
		}
	}

	return results;
}

// ============================================
async function main() {
	console.log('Starting target-handler audit...\n');

	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(500);

		// Dismiss welcome overlay
		const startBtn = await page.$('#welcome-start-btn');
		if (startBtn) {
			await startBtn.click();
			await page.waitForTimeout(300);
		}

		const results = await runAudit(page);

		let passed = 0;
		let failed = 0;
		for (const r of results) {
			const icon = r.pass ? '[PASS]' : '[FAIL]';
			console.log(`${icon} ${r.name} -- ${r.detail}`);
			if (r.pass) passed++;
			else failed++;
		}

		console.log(`\n${passed}/${passed + failed} audits passed`);
		if (failed > 0) process.exit(1);
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
