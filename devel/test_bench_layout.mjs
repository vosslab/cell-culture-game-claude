#!/usr/bin/env node
/**
 * test_bench_layout.mjs - Playwright smoke check for the bench scene.
 * Opens the game, clicks the To Bench nav button, verifies the bench
 * scene shows and the hood scene hides, then clicks To Hood and checks
 * the round-trip restores the hood without mutating protocol state.
 * Run: node devel/test_bench_layout.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import process from 'node:process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;
const screenshotPath = 'test-results/bench_layout.png';

// Expected bench item count after M3: 4 bench-only instruments
// (centrifuge, water_bath, vortex, cell_counter) plus microscope and
// incubator moved over from the hood.
const EXPECTED_BENCH_ITEM_COUNT = 6;
const EXPECTED_BENCH_ITEM_IDS = [
	'centrifuge', 'water_bath', 'vortex', 'cell_counter',
	'microscope', 'incubator',
];

// Viewports to test for responsive layout
const TEST_VIEWPORTS = [
	{ width: 1280, height: 720, name: '1280x720 (laptop)' },
	{ width: 1440, height: 900, name: '1440x900 (MacBook/desktop)' },
	{ width: 1920, height: 1080, name: '1920x1080 (Full HD)' },
];

// ============================================
async function main() {
	fs.mkdirSync('test-results', { recursive: true });

	const browser = await chromium.launch({ headless: true });
	let exitCode = 0;

	try {
		const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
		await page.goto(gameUrl, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(300);

		// Dismiss welcome overlay
		await page.click('#welcome-start-btn');
		await page.waitForTimeout(500);

		// Capture initial state for round-trip comparison
		const initialState = await page.evaluate(() => {
			return {
				activeScene: gameState.activeScene,
				currentStep: gameState.currentStep,
				completedSteps: gameState.completedSteps.slice(),
				selectedTool: gameState.selectedTool,
			};
		});

		const tests = [];

		// ---- Check 1: hood is visible at startup, bench is hidden ----
		const initialVisibility = await page.evaluate(() => {
			const hood = document.getElementById('hood-scene');
			const bench = document.getElementById('bench-scene');
			return {
				hoodDisplay: hood ? getComputedStyle(hood).display : 'missing',
				benchDisplay: bench ? getComputedStyle(bench).display : 'missing',
			};
		});
		tests.push({
			name: 'Check 1: Hood visible, bench hidden at startup',
			pass: initialVisibility.hoodDisplay !== 'none' && initialVisibility.benchDisplay === 'none',
			detail: `hood=${initialVisibility.hoodDisplay} bench=${initialVisibility.benchDisplay}`,
		});

		// ---- Check 2: switchScene('bench') is callable from page context ----
		// Patch 1 added the 'bench' scene id and the switchScene() entry; the
		// hood-side nav button has been intentionally removed from the hood
		// rendering, so we drive the scene switch programmatically rather
		// than via a DOM click. Either entry path must produce the same
		// state transition.
		const switchOk = await page.evaluate(() => {
			if (typeof switchScene !== 'function') return false;
			switchScene('bench');
			return true;
		});
		tests.push({
			name: 'Check 2: switchScene(bench) callable from page',
			pass: switchOk,
			detail: switchOk ? 'switchScene exists and returned' : 'switchScene undefined',
		});
		await page.waitForTimeout(300);

		// ---- Check 3: bench now visible, hood now hidden ----
		const afterSwitch = await page.evaluate(() => {
			const hood = document.getElementById('hood-scene');
			const bench = document.getElementById('bench-scene');
			return {
				activeScene: gameState.activeScene,
				hoodDisplay: hood ? getComputedStyle(hood).display : 'missing',
				benchDisplay: bench ? getComputedStyle(bench).display : 'missing',
			};
		});
		tests.push({
			name: 'Check 3: Bench visible after switchScene call',
			pass: afterSwitch.activeScene === 'bench' &&
				afterSwitch.benchDisplay !== 'none' &&
				afterSwitch.hoodDisplay === 'none',
			detail: `activeScene=${afterSwitch.activeScene} hood=${afterSwitch.hoodDisplay} bench=${afterSwitch.benchDisplay}`,
		});

		// ---- Check 4: bench background + To Hood button rendered ----
		const benchDom = await page.evaluate(() => {
			return {
				hasBg: document.getElementById('bench-bg') !== null,
				hasItemsLayer: document.getElementById('bench-items-layer') !== null,
				hasLabelsLayer: document.getElementById('bench-labels-layer') !== null,
				hasBackBtn: document.getElementById('bench-to-hood-btn') !== null,
			};
		});
		tests.push({
			name: 'Check 4: Bench scene scaffolding rendered',
			pass: benchDom.hasBg && benchDom.hasItemsLayer && benchDom.hasLabelsLayer && benchDom.hasBackBtn,
			detail: `bg=${benchDom.hasBg} items=${benchDom.hasItemsLayer} labels=${benchDom.hasLabelsLayer} backBtn=${benchDom.hasBackBtn}`,
		});

		// ---- Check 4a: all 6 expected bench items are rendered ----
		const benchItemIds = await page.evaluate(() => {
			const nodes = document.querySelectorAll('#bench-scene .hood-item');
			return Array.from(nodes).map((el) => el.getAttribute('data-item-id') || '');
		});
		const missing = EXPECTED_BENCH_ITEM_IDS.filter((id) => benchItemIds.indexOf(id) < 0);
		tests.push({
			name: 'Check 4a: All 6 bench items rendered',
			pass: benchItemIds.length === EXPECTED_BENCH_ITEM_COUNT && missing.length === 0,
			detail: `found=${benchItemIds.length} ids=[${benchItemIds.join(',')}] missing=[${missing.join(',')}]`,
		});

		// ---- Check 4b: microscope and incubator render on the bench ----
		const modalTargetsRender = await page.evaluate(() => {
			const m = document.querySelector('#bench-scene [data-item-id="microscope"]');
			const i = document.querySelector('#bench-scene [data-item-id="incubator"]');
			return {
				microscope: m !== null && (m.querySelector('svg') !== null),
				incubator: i !== null && (i.querySelector('svg') !== null),
			};
		});
		tests.push({
			name: 'Check 4b: Microscope and incubator rendered on bench',
			pass: modalTargetsRender.microscope && modalTargetsRender.incubator,
			detail: `microscope=${modalTargetsRender.microscope} incubator=${modalTargetsRender.incubator}`,
		});

		// ---- Check 4c: no hood-only items bleed through on bench ----
		const hoodOnlyOnBench = await page.evaluate(() => {
			const checkIds = ['flask', 'well_plate', 'media_bottle', 'drug_vials'];
			const leaked = [];
			for (const id of checkIds) {
				if (document.querySelector('#bench-scene [data-item-id="' + id + '"]')) {
					leaked.push(id);
				}
			}
			return leaked;
		});
		tests.push({
			name: 'Check 4c: No hood-only items present on bench',
			pass: hoodOnlyOnBench.length === 0,
			detail: `leaked=[${hoodOnlyOnBench.join(',')}]`,
		});

		// ---- Multi-viewport sweep: item count stays stable ----
		const viewportResults = [];
		for (const vp of TEST_VIEWPORTS) {
			await page.setViewportSize({ width: vp.width, height: vp.height });
			await page.waitForTimeout(300);
			const count = await page.evaluate(() => {
				return document.querySelectorAll('#bench-scene .hood-item').length;
			});
			viewportResults.push({ vp, count });
		}
		const vpFail = viewportResults.filter((r) => r.count !== EXPECTED_BENCH_ITEM_COUNT);
		tests.push({
			name: 'Check 4d: Bench item count stable across viewports',
			pass: vpFail.length === 0,
			detail: viewportResults.map((r) => `${r.vp.name}=${r.count}`).join(' | '),
		});
		// restore default viewport for screenshot and round-trip
		await page.setViewportSize({ width: 1200, height: 900 });
		await page.waitForTimeout(200);

		// Screenshot the bench while it's visible
		await page.screenshot({ path: screenshotPath });

		// ---- Check 5: Round-trip back to hood ----
		await page.click('#bench-to-hood-btn');
		await page.waitForTimeout(300);

		const afterReturn = await page.evaluate(() => {
			const hood = document.getElementById('hood-scene');
			const bench = document.getElementById('bench-scene');
			return {
				activeScene: gameState.activeScene,
				currentStep: gameState.currentStep,
				completedSteps: gameState.completedSteps.slice(),
				selectedTool: gameState.selectedTool,
				hoodDisplay: hood ? getComputedStyle(hood).display : 'missing',
				benchDisplay: bench ? getComputedStyle(bench).display : 'missing',
			};
		});
		tests.push({
			name: 'Check 5: Round-trip restores hood visibility',
			pass: afterReturn.activeScene === 'hood' &&
				afterReturn.hoodDisplay !== 'none' &&
				afterReturn.benchDisplay === 'none',
			detail: `activeScene=${afterReturn.activeScene} hood=${afterReturn.hoodDisplay} bench=${afterReturn.benchDisplay}`,
		});

		// ---- Check 6: Protocol state not mutated by scene switch ----
		const stateUnchanged =
			afterReturn.currentStep === initialState.currentStep &&
			afterReturn.completedSteps.length === initialState.completedSteps.length &&
			afterReturn.selectedTool === initialState.selectedTool;
		tests.push({
			name: 'Check 6: Round-trip does not mutate protocol state',
			pass: stateUnchanged,
			detail: `currentStep=${afterReturn.currentStep} completedSteps.length=${afterReturn.completedSteps.length} selectedTool=${afterReturn.selectedTool}`,
		});

		// Report
		let passed = 0;
		let failed = 0;
		for (const t of tests) {
			if (t.pass) {
				console.log('OK    ' + t.name);
				passed++;
			} else {
				console.log('FAIL  ' + t.name);
				console.log('      ' + t.detail);
				failed++;
			}
		}
		console.log('');
		console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
		console.log('Screenshot saved to ' + screenshotPath);

		if (failed > 0) exitCode = 1;
	} catch (err) {
		console.error('Test error:', err);
		exitCode = 2;
	} finally {
		await browser.close();
	}

	process.exit(exitCode);
}

main();
