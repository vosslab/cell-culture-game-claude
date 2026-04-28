/**
 * test_yaml_edit_smoke.mjs - Smoke test for YAML editing pipeline.
 * Proves that non-coders can edit protocol.yaml and the game rebuilds correctly.
 *
 * Scenario A: Insert a no-op step between spray_hood and aspirate_old_media.
 * Scenario B: Swap serological_pipette for multichannel_pipette in seed_plate.
 *
 * Each scenario:
 * 1. Snapshots protocol.yaml
 * 2. Edits it programmatically
 * 3. Runs bash build_game.sh and asserts exit 0
 * 4. Loads the rebuilt game in Playwright
 * 5. Asserts the edit took effect via page.evaluate against PROTOCOL_STEPS
 * 6. Restores the snapshot
 * 7. Rebuilds and asserts PROTOCOL_STEPS is back to original
 *
 * Run: node devel/test_yaml_edit_smoke.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const PROTOCOL_YAML_PATH = path.join(REPO_ROOT, 'content', 'cell_culture', 'protocol.yaml');
const GAME_HTML_PATH = path.join(REPO_ROOT, 'cell_culture_game.html');
const GAME_URL = `file://${GAME_HTML_PATH}`;

let yamlSnapshot = null;
let scenarioAPass = false;
let scenarioBPass = false;

/**
 * Read the current protocol.yaml and cache it.
 */
function snapshotYaml() {
	yamlSnapshot = fs.readFileSync(PROTOCOL_YAML_PATH, 'utf8');
}

/**
 * Restore protocol.yaml from the snapshot.
 */
function restoreYaml() {
	if (yamlSnapshot) {
		fs.writeFileSync(PROTOCOL_YAML_PATH, yamlSnapshot, 'utf8');
	}
}

/**
 * Run bash build_game.sh and assert exit 0.
 */
function buildGame() {
	try {
		execSync('bash build_game.sh', { cwd: REPO_ROOT, stdio: 'pipe' });
	} catch (e) {
		throw new Error(`build_game.sh failed: ${e.message}`);
	}
}

/**
 * Scenario A: Insert a no-op step between spray_hood and aspirate_old_media.
 */
async function runScenarioA() {
	console.log('\n=== Scenario A: Insert no-op step ===');

	try {
		// Read current YAML
		let yaml = fs.readFileSync(PROTOCOL_YAML_PATH, 'utf8');

		// Change spray_hood's nextId from aspirate_old_media to smoke_test_step
		yaml = yaml.replace(
			/^(\s+)nextId: aspirate_old_media$/m,
			(match, indent) => {
				// Check if this is in the spray_hood block (comes after spray_ethanol trigger)
				const lines = yaml.split('\n');
				let isSprayHood = false;
				for (let i = lines.length - 1; i >= 0; i--) {
					if (lines[i] === match.trim()) {
						// Found our match, look backward for spray_hood
						for (let j = i; j >= 0; j--) {
							if (lines[j].includes('id: spray_hood')) {
								isSprayHood = true;
								break;
							}
							if (lines[j].includes('id:') && !lines[j].includes('id: spray_hood')) {
								break;
							}
						}
						break;
					}
				}

				if (isSprayHood) {
					return `${indent}nextId: smoke_test_step`;
				}
				return match;
			}
		);

		// More reliable approach: find spray_hood block and replace within it
		yaml = yaml.split('\n').map((line, idx, arr) => {
			// Find the spray_hood block
			const isSprayHoodBlock = arr.some((l, i) => {
				if (i > idx - 20 && i <= idx && l.includes('id: spray_hood')) {
					return true;
				}
				return false;
			});

			if (isSprayHoodBlock && line.trim() === 'nextId: aspirate_old_media') {
				return line.replace('aspirate_old_media', 'smoke_test_step');
			}
			return line;
		}).join('\n');

		// Insert the new step after spray_hood block
		// Find the line with "- id: aspirate_old_media" and insert before it
		const insertNewStep = `  - id: smoke_test_step
    label: "Smoke-test step (insert demo)"
    action: "Smoke-test step (insert demo)"
    why: "Demonstrates the YAML editing pipeline."
    partId: part1_split
    dayId: day1
    stepIndex: 1
    scene: hood
    requiredItems: [hood_surface]
    targetItems: [hood_surface]
    errorHints: {}
    requiredAction: spray_ethanol
    trigger:
      scene: hood
      event: "click:smoke_test"
    nextId: aspirate_old_media
`;

		yaml = yaml.replace(
			/^(\s+- id: aspirate_old_media)$/m,
			insertNewStep + '$1'
		);

		// Write the modified YAML
		fs.writeFileSync(PROTOCOL_YAML_PATH, yaml, 'utf8');

		// Build
		buildGame();

		// Load in Playwright and verify
		const browser = await chromium.launch({ headless: true });
		try {
			const page = await browser.newPage();
			await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(500);

			// Assertions
			const stepCount = await page.evaluate(() => PROTOCOL_STEPS.length);
			if (stepCount !== 26) {
				throw new Error(`Expected 26 steps, got ${stepCount}`);
			}

			const smokeTestStep = await page.evaluate(() => {
				return PROTOCOL_STEPS.find(s => s.id === 'smoke_test_step');
			});
			if (!smokeTestStep) {
				throw new Error('smoke_test_step not found in PROTOCOL_STEPS');
			}

			// Verify the chain still walks all 26 steps
			const chainValid = await page.evaluate(() => {
				const visited = [];
				let current = PROTOCOL_STEPS[0].id;
				while (current !== null && visited.length < 100) {
					visited.push(current);
					const step = PROTOCOL_STEPS.find(s => s.id === current);
					if (!step) return false;
					current = step.nextId;
				}
				return visited.length === PROTOCOL_STEPS.length;
			});
			if (!chainValid) {
				throw new Error('Next-id chain does not visit all steps');
			}

			scenarioAPass = true;
			console.log('Scenario A assertions passed');
		} finally {
			await browser.close();
		}

		// Restore and rebuild
		restoreYaml();
		buildGame();

		// Verify restoration
		const browser2 = await chromium.launch({ headless: true });
		try {
			const page = await browser2.newPage();
			await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(500);

			const stepCount = await page.evaluate(() => PROTOCOL_STEPS.length);
			if (stepCount !== 25) {
				throw new Error(`After restore: expected 25 steps, got ${stepCount}`);
			}
		} finally {
			await browser2.close();
		}

		console.log('Scenario A: PASS');
	} catch (err) {
		console.error(`Scenario A: FAIL: ${err.message}`);
		restoreYaml();
		buildGame();
	}
}

/**
 * Scenario B: Swap serological_pipette for multichannel_pipette in seed_plate.
 */
async function runScenarioB() {
	console.log('\n=== Scenario B: Swap tool in seed_plate ===');

	try {
		// Read current YAML
		let yaml = fs.readFileSync(PROTOCOL_YAML_PATH, 'utf8');

		// Find seed_plate block and swap the pipettes
		// Use a more robust regex-based approach
		const seedPlateRegex = /^(\s+- id: seed_plate\n[\s\S]*?requiredItems:\s*\[)([^\]]*)\]/m;
		yaml = yaml.replace(seedPlateRegex, (match, prefix, items) => {
			const itemsStr = items.replace(/serological_pipette/g, 'multichannel_pipette');
			return `${prefix}${itemsStr}]`;
		});

		// Also replace in targetItems
		const seedPlateTargetRegex = /^(\s+- id: seed_plate\n[\s\S]*?targetItems:\s*\[)([^\]]*)\]/m;
		yaml = yaml.replace(seedPlateTargetRegex, (match, prefix, items) => {
			const itemsStr = items.replace(/serological_pipette/g, 'multichannel_pipette');
			return `${prefix}${itemsStr}]`;
		});

		// Write the modified YAML
		fs.writeFileSync(PROTOCOL_YAML_PATH, yaml, 'utf8');

		// Build
		buildGame();

		// Load in Playwright and verify
		const browser = await chromium.launch({ headless: true });
		try {
			const page = await browser.newPage();
			await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(500);

			// Assertions
			const seedPlate = await page.evaluate(() => {
				return PROTOCOL_STEPS.find(s => s.id === 'seed_plate');
			});
			if (!seedPlate) {
				throw new Error('seed_plate step not found');
			}

			const hasMultichannel = seedPlate.requiredItems.includes('multichannel_pipette');
			const hasSerological = seedPlate.requiredItems.includes('serological_pipette');

			if (!hasMultichannel) {
				throw new Error('seed_plate.requiredItems missing multichannel_pipette');
			}
			if (hasSerological) {
				throw new Error('seed_plate.requiredItems still contains serological_pipette');
			}

			// Check targetItems too
			const targetHasMultichannel = seedPlate.targetItems.includes('multichannel_pipette');
			const targetHasSerological = seedPlate.targetItems.includes('serological_pipette');

			if (!targetHasMultichannel) {
				throw new Error('seed_plate.targetItems missing multichannel_pipette');
			}
			if (targetHasSerological) {
				throw new Error('seed_plate.targetItems still contains serological_pipette');
			}

			scenarioBPass = true;
			console.log('Scenario B assertions passed');
		} finally {
			await browser.close();
		}

		// Restore and rebuild
		restoreYaml();
		buildGame();

		// Verify restoration
		const browser2 = await chromium.launch({ headless: true });
		try {
			const page = await browser2.newPage();
			await page.goto(GAME_URL, { waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(500);

			const seedPlate = await page.evaluate(() => {
				return PROTOCOL_STEPS.find(s => s.id === 'seed_plate');
			});
			if (!seedPlate) {
				throw new Error('seed_plate step not found after restore');
			}

			const hasSerological = seedPlate.requiredItems.includes('serological_pipette');
			if (!hasSerological) {
				throw new Error('After restore: seed_plate.requiredItems missing serological_pipette');
			}
		} finally {
			await browser2.close();
		}

		console.log('Scenario B: PASS');
	} catch (err) {
		console.error(`Scenario B: FAIL: ${err.message}`);
		restoreYaml();
		buildGame();
	}
}

/**
 * Main entry point.
 */
async function main() {
	console.log('Starting YAML edit smoke tests...');

	// Take a snapshot at the start
	snapshotYaml();

	try {
		// Run both scenarios
		await runScenarioA();
		await runScenarioB();

		// Print summary
		console.log('\n=== Summary ===');
		if (scenarioAPass) {
			console.log('scenario A: PASS');
		} else {
			console.log('scenario A: FAIL');
		}

		if (scenarioBPass) {
			console.log('scenario B: PASS');
		} else {
			console.log('scenario B: FAIL');
		}

		if (scenarioAPass && scenarioBPass) {
			process.exit(0);
		} else {
			process.exit(1);
		}
	} finally {
		// Ensure YAML is restored even on failure
		restoreYaml();
		buildGame();
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	restoreYaml();
	buildGame();
	process.exit(1);
});
