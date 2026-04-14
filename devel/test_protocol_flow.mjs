#!/usr/bin/env node
/**
 * test_protocol_flow.mjs - Playwright tests for protocol flow and game state.
 * Validates PROTOCOL_STEPS, gameState.day, computeWellViability, and renderProtocolUI.
 * Run: node devel/test_protocol_flow.mjs
 */

import { chromium } from 'playwright';
import path from 'path';
import process from 'node:process';

const gamePath = path.resolve('cell_culture_game.html');
const gameUrl = `file://${gamePath}`;

// ============================================
async function runTests(page) {
	const results = [];

	// Test 1 intentionally omitted: counting steps or enumerating a fixed
	// list of part ids is a brittle shape check. docs/TYPESCRIPT_STYLE.md
	// asks for behavioral assertions instead, and the schema/integrity
	// tests below already cover the real invariants.

	// Validate all required fields exist on each step
	try {
		const validation = await page.evaluate(() => {
			const issues = [];
			for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
				const step = PROTOCOL_STEPS[i];
				if (!step.id || step.id.length === 0) issues.push(`Step ${i}: missing id`);
				if (!step.action || step.action.length === 0) issues.push(`Step ${i}: missing action`);
				if (step.action.length > 60) issues.push(`Step ${i}: action too long (${step.action.length} > 60)`);
				if (!step.why || step.why.length === 0) issues.push(`Step ${i}: missing why`);
				if (step.why.length > 100) issues.push(`Step ${i}: why too long (${step.why.length} > 100)`);
				if (!step.partId) issues.push(`Step ${i}: missing partId`);
				if (!step.dayId) issues.push(`Step ${i}: missing dayId`);
				if (typeof step.stepIndex !== 'number') issues.push(`Step ${i}: missing stepIndex`);
				if (!step.requiredItems || step.requiredItems.length === 0) issues.push(`Step ${i}: missing or empty requiredItems`);
			}
			return issues;
		});
		const pass = validation.length === 0;
		results.push({
			name: 'All steps have required fields',
			pass,
			detail: pass ? 'ok' : validation.slice(0, 3).join('; '),
		});
	} catch (e) {
		results.push({
			name: 'All steps have required fields',
			pass: false,
			detail: String(e),
		});
	}

	// Test 3: Validate no docx section markers in why text
	try {
		const validation = await page.evaluate(() => {
			const markers = ['Part 1', 'Part 2', 'Part 3', 'Part 4', 'Part 5', 'Part 6', 'Part 7', '(Part'];
			const issues = [];
			for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
				const step = PROTOCOL_STEPS[i];
				for (const marker of markers) {
					if (step.why.includes(marker)) {
						issues.push(`Step ${i}: why contains "${marker}"`);
						break;
					}
				}
			}
			return issues;
		});
		const pass = validation.length === 0;
		results.push({
			name: 'No docx section markers in why text',
			pass,
			detail: pass ? 'ok' : validation.join('; '),
		});
	} catch (e) {
		results.push({
			name: 'No docx section markers in why text',
			pass: false,
			detail: String(e),
		});
	}

	// Test 4: Parts are in correct order
	try {
		const validation = await page.evaluate(() => {
			const expectedOrder = ['part1_split', 'part2_count', 'part3_seed', 'part4_dilute', 'part5_treat', 'part6_mtt', 'part7_read'];
			const seenParts = [];
			for (const step of PROTOCOL_STEPS) {
				if (!seenParts.includes(step.partId)) {
					seenParts.push(step.partId);
				}
			}
			if (JSON.stringify(seenParts) !== JSON.stringify(expectedOrder)) {
				return `Expected ${expectedOrder.join(', ')}, got ${seenParts.join(', ')}`;
			}
			return null;
		});
		const pass = validation === null;
		results.push({
			name: 'Parts are in correct order',
			pass,
			detail: pass ? 'ok' : validation,
		});
	} catch (e) {
		results.push({
			name: 'Parts are in correct order',
			pass: false,
			detail: String(e),
		});
	}

	// Test 5: All requiredItems resolve to valid items
	try {
		const validation = await page.evaluate(() => {
			const allItems = new Set();
			for (const item of HOOD_SCENE_ITEMS) allItems.add(item.id);
			for (const item of BENCH_SCENE_ITEMS) allItems.add(item.id);

			const issues = [];
			for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
				const step = PROTOCOL_STEPS[i];
				for (const itemId of step.requiredItems) {
					if (!allItems.has(itemId)) {
						issues.push(`Step ${i} (${step.id}): item "${itemId}" not found`);
					}
				}
			}
			return issues;
		});
		const pass = validation.length === 0;
		results.push({
			name: 'All requiredItems resolve to valid items',
			pass,
			detail: pass ? 'ok' : validation.slice(0, 3).join('; '),
		});
	} catch (e) {
		results.push({
			name: 'All requiredItems resolve to valid items',
			pass: false,
			detail: String(e),
		});
	}

	// Test 6: gameState.day starts at 'day1_seed'
	try {
		const day = await page.evaluate(() => gameState.day);
		const pass = day === 'day1_seed';
		results.push({
			name: "gameState.day starts at 'day1_seed'",
			pass,
			detail: pass ? 'ok' : `Expected 'day1_seed', got '${day}'`,
		});
	} catch (e) {
		results.push({
			name: "gameState.day starts at 'day1_seed'",
			pass: false,
			detail: String(e),
		});
	}

	// Test 7: gameState.seenPartIntros is an empty array
	try {
		const intros = await page.evaluate(() => gameState.seenPartIntros);
		const pass = Array.isArray(intros) && intros.length === 0;
		results.push({
			name: 'gameState.seenPartIntros is an empty array',
			pass,
			detail: pass ? 'ok' : `Expected empty array, got ${JSON.stringify(intros)}`,
		});
	} catch (e) {
		results.push({
			name: 'gameState.seenPartIntros is an empty array',
			pass: false,
			detail: String(e),
		});
	}

	// Test 8: computeWellViability(0, false) == 1.0
	try {
		const viability = await page.evaluate(() => computeWellViability(0, false));
		const pass = Math.abs(viability - 1.0) < 0.01;
		results.push({
			name: 'computeWellViability(0, false) == 1.0',
			pass,
			detail: pass ? 'ok' : `Expected ~1.0, got ${viability.toFixed(3)}`,
		});
	} catch (e) {
		results.push({
			name: 'computeWellViability(0, false) == 1.0',
			pass: false,
			detail: String(e),
		});
	}

	// Test 9: computeWellViability(0, true) == 1.0
	try {
		const viability = await page.evaluate(() => computeWellViability(0, true));
		const pass = Math.abs(viability - 1.0) < 0.01;
		results.push({
			name: 'computeWellViability(0, true) == 1.0',
			pass,
			detail: pass ? 'ok' : `Expected ~1.0, got ${viability.toFixed(3)}`,
		});
	} catch (e) {
		results.push({
			name: 'computeWellViability(0, true) == 1.0',
			pass: false,
			detail: String(e),
		});
	}

	// Test 10: computeWellViability(5, false) is approximately 0.55 (+/- 0.02)
	try {
		const viability = await page.evaluate(() => computeWellViability(5, false));
		const pass = Math.abs(viability - 0.55) < 0.02;
		results.push({
			name: 'computeWellViability(5, false) is approximately 0.55',
			pass,
			detail: pass ? `ok (${viability.toFixed(3)})` : `Expected ~0.55, got ${viability.toFixed(3)}`,
		});
	} catch (e) {
		results.push({
			name: 'computeWellViability(5, false) is approximately 0.55',
			pass: false,
			detail: String(e),
		});
	}

	// Test 11: computeWellViability(5, true) < computeWellViability(5, false) (metformin sensitizes)
	try {
		const v1 = await page.evaluate(() => computeWellViability(5, false));
		const v2 = await page.evaluate(() => computeWellViability(5, true));
		const pass = v2 < v1;
		results.push({
			name: 'computeWellViability(5, true) < computeWellViability(5, false)',
			pass,
			detail: pass ? `ok (no-met: ${v1.toFixed(3)}, +met: ${v2.toFixed(3)})` : `Expected lower with metformin, got ${v2.toFixed(3)} >= ${v1.toFixed(3)}`,
		});
	} catch (e) {
		results.push({
			name: 'computeWellViability(5, true) < computeWellViability(5, false)',
			pass: false,
			detail: String(e),
		});
	}

	// Test 12: renderProtocolUI() returns HTML with expected classes
	try {
		const html = await page.evaluate(() => renderProtocolUI());
		const hasAll = html.includes('day-pill') && html.includes('step-action') && html.includes('step-why');
		results.push({
			name: 'renderProtocolUI() returns HTML with day-pill, step-action, step-why',
			pass: hasAll,
			detail: hasAll ? 'ok' : `Missing required classes in HTML`,
		});
	} catch (e) {
		results.push({
			name: 'renderProtocolUI() returns HTML with day-pill, step-action, step-why',
			pass: false,
			detail: String(e),
		});
	}

	return results;
}

// ============================================
async function main() {
	console.log('Starting protocol_flow tests...\n');

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
