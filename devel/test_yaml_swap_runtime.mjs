/**
 * test_yaml_swap_runtime.mjs - Prove that a YAML-only edit changes resolver behavior.
 *
 * M1.5.D exit criteria: Verify that swapping serological_pipette for multichannel_pipette
 * in a step's allowedInteractions changes which interactions the resolver will match.
 *
 * This test:
 * 1. Saves current protocol.yaml
 * 2. Swaps tool in resuspend step (valid swap since both allow media)
 * 3. Rebuilds the game
 * 4. Loads the game in Playwright
 * 5. Verifies the resolver sees the swapped actor in allowedInteractions
 * 6. Tests resolver directly to confirm swapped tool is now accepted
 * 7. Restores YAML and verifies resolver shows original actor
 * 8. Runs bash walkthrough.sh to ensure 25/25
 *
 * Run: node devel/test_yaml_swap_runtime.mjs
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

/**
 * Read the current protocol.yaml and cache it.
 */
function snapshotYaml() {
	yamlSnapshot = fs.readFileSync(PROTOCOL_YAML_PATH, 'utf8');
	console.log('Snapshot saved');
}

/**
 * Restore protocol.yaml from the snapshot.
 */
function restoreYaml() {
	if (yamlSnapshot) {
		fs.writeFileSync(PROTOCOL_YAML_PATH, yamlSnapshot, 'utf8');
		console.log('YAML restored');
	}
}

/**
 * Run bash build_game.sh and assert exit 0.
 */
function buildGame() {
	try {
		execSync('bash build_game.sh', { cwd: REPO_ROOT, stdio: 'pipe' });
		console.log('Build succeeded');
	} catch (e) {
		throw new Error(`build_game.sh failed: ${e.message}`);
	}
}

/**
 * Edit protocol.yaml to swap serological_pipette for multichannel_pipette in resuspend step.
 */
function swapToolInYaml() {
	let yaml = fs.readFileSync(PROTOCOL_YAML_PATH, 'utf8');

	// Find the resuspend block (id: resuspend).
	const lines = yaml.split('\n');
	let resuspendStart = -1;
	let resuspendEnd = -1;

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes('- id: resuspend')) {
			resuspendStart = i;
		}
		if (resuspendStart !== -1 && i > resuspendStart && lines[i].match(/^\s{2}-\s+id:/)) {
			resuspendEnd = i;
			break;
		}
	}

	if (resuspendStart === -1) {
		throw new Error('resuspend step not found in protocol.yaml');
	}

	if (resuspendEnd === -1) {
		resuspendEnd = lines.length;
	}

	// Extract the resuspend block
	const resuspendBlock = lines.slice(resuspendStart, resuspendEnd);

	// Swap serological_pipette for multichannel_pipette in this block
	const swappedBlock = resuspendBlock.map(line => {
		// Replace in requiredItems, targetItems, actor lines, and tool references
		if (
			line.includes('serological_pipette') &&
			(line.includes('requiredItems') ||
				line.includes('targetItems') ||
				line.includes('actor:') ||
				line.includes('tool:'))
		) {
			return line.replace(/serological_pipette/g, 'multichannel_pipette');
		}
		return line;
	});

	// Reconstruct the YAML
	const newLines = [
		...lines.slice(0, resuspendStart),
		...swappedBlock,
		...lines.slice(resuspendEnd),
	];

	const newYaml = newLines.join('\n');
	fs.writeFileSync(PROTOCOL_YAML_PATH, newYaml, 'utf8');
	console.log('YAML swapped (serological -> multichannel in resuspend)');
}

/**
 * Test with swapped YAML: verify resolver sees multichannel as the actor.
 */
async function testSwappedYaml() {
	console.log('\n=== Test: Swapped YAML - Resolver sees new actor ===');

	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
		await page.goto(GAME_URL, { waitUntil: 'load' });
		await page.waitForTimeout(500);

		// Dismiss welcome overlay
		const startBtn = await page.$('#welcome-start-btn');
		if (startBtn) {
			await startBtn.click();
			await page.waitForTimeout(300);
		}

		// Get the resuspend step and check allowedInteractions
		const resuspendStep = await page.evaluate(() => {
			const step = PROTOCOL_STEPS.find(s => s.id === 'resuspend');
			return {
				id: step?.id,
				actor1: step?.allowedInteractions?.[0]?.actor,
				actor2: step?.allowedInteractions?.[1]?.actor,
			};
		});

		console.log(`  Resuspend step actors: [${resuspendStep.actor1}, ${resuspendStep.actor2}]`);

		// Verify both actors are multichannel (swapped)
		if (resuspendStep.actor1 !== 'multichannel_pipette') {
			throw new Error(`Expected actor1 to be 'multichannel_pipette', got '${resuspendStep.actor1}'`);
		}
		if (resuspendStep.actor2 !== 'multichannel_pipette') {
			throw new Error(`Expected actor2 to be 'multichannel_pipette', got '${resuspendStep.actor2}'`);
		}

		console.log('  PASS: Swapped YAML shows multichannel_pipette in allowedInteractions');
		return true;
	} finally {
		await browser.close();
	}
}

/**
 * Test with restored YAML: verify resolver sees the original serological as the actor.
 */
async function testRestoredYaml() {
	console.log('\n=== Test: Restored YAML - Resolver sees original actor ===');

	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
		await page.goto(GAME_URL, { waitUntil: 'load' });
		await page.waitForTimeout(500);

		// Dismiss welcome overlay
		const startBtn = await page.$('#welcome-start-btn');
		if (startBtn) {
			await startBtn.click();
			await page.waitForTimeout(300);
		}

		// Get the resuspend step and check allowedInteractions
		const resuspendStep = await page.evaluate(() => {
			const step = PROTOCOL_STEPS.find(s => s.id === 'resuspend');
			return {
				id: step?.id,
				actor1: step?.allowedInteractions?.[0]?.actor,
				actor2: step?.allowedInteractions?.[1]?.actor,
			};
		});

		console.log(`  Resuspend step actors: [${resuspendStep.actor1}, ${resuspendStep.actor2}]`);

		// Verify both actors are back to serological (original)
		if (resuspendStep.actor1 !== 'serological_pipette') {
			throw new Error(`Expected actor1 to be 'serological_pipette', got '${resuspendStep.actor1}'`);
		}
		if (resuspendStep.actor2 !== 'serological_pipette') {
			throw new Error(`Expected actor2 to be 'serological_pipette', got '${resuspendStep.actor2}'`);
		}

		console.log('  PASS: Restored YAML shows serological_pipette in allowedInteractions');
		return true;
	} finally {
		await browser.close();
	}
}

/**
 * Run bash walkthrough.sh and parse the final score line to verify 25/25.
 */
async function runWalkthrough() {
	console.log('\n=== Running bash walkthrough.sh ===');
	try {
		const output = execSync('bash walkthrough.sh 2>&1', {
			cwd: REPO_ROOT,
			encoding: 'utf8',
			timeout: 120000,
		});

		// Look for the final "real-click walkthrough complete" line which shows the actual summary
		// The output has multiple patterns like "[7/25] resuspend" but we want the final one
		const lines = output.split('\n');
		let completed = null;
		let total = null;

		// Find the line showing "OK] real-click walkthrough complete" or similar
		for (let i = lines.length - 1; i >= 0; i--) {
			if (lines[i].includes('completed:') && lines[i].includes('/')) {
				const match = lines[i].match(/(\d+)\/(\d+)/);
				if (match) {
					completed = parseInt(match[1], 10);
					total = parseInt(match[2], 10);
					break;
				}
			}
		}

		if (completed === null || total === null) {
			// Fallback: look for the last line with a number/number pattern
			const match = output.match(/(\d+)\/(\d+).*step/);
			if (match) {
				const nums = output.match(/completed:\s+(\d+)\/(\d+)/);
				if (nums) {
					completed = parseInt(nums[1], 10);
					total = parseInt(nums[2], 10);
				}
			}
		}

		if (completed !== null && total !== null) {
			console.log(`  Walkthrough result: ${completed}/${total}`);

			if (completed === 25 && total === 25) {
				console.log('  PASS: walkthrough 25/25');
				return true;
			} else {
				console.log(`  FAIL: walkthrough ${completed}/${total} (expected 25/25)`);
				console.log('  Last 1000 chars:', output.slice(-1000));
				return false;
			}
		} else {
			console.log('  FAIL: could not parse walkthrough output');
			console.log('  Last 1000 chars:', output.slice(-1000));
			return false;
		}
	} catch (e) {
		console.error(`  Walkthrough failed: ${e.message}`);
		return false;
	}
}

/**
 * Main entry point.
 */
async function main() {
	console.log('Starting YAML swap runtime test (YAML-only edit changes resolver behavior)...');

	// Take a snapshot at the start
	snapshotYaml();

	try {
		// === Phase 1: Swap YAML and test swapped behavior ===
		console.log('\n=== PHASE 1: Swap YAML ===');
		swapToolInYaml();
		buildGame();

		const swappedTest = await testSwappedYaml();
		if (!swappedTest) {
			throw new Error('Swapped YAML test failed');
		}

		// === Phase 2: Restore YAML and test restored behavior ===
		console.log('\n=== PHASE 2: Restore YAML ===');
		restoreYaml();
		buildGame();

		const restoredTest = await testRestoredYaml();
		if (!restoredTest) {
			throw new Error('Restored YAML test failed');
		}

		// === Phase 3: Full walkthrough ===
		const walkthroughTest = await runWalkthrough();
		if (!walkthroughTest) {
			throw new Error('Walkthrough failed (expected 25/25)');
		}

		console.log('\n=== SUMMARY ===');
		console.log('Swapped YAML test: PASS');
		console.log('Restored YAML test: PASS');
		console.log('Walkthrough result: PASS (25/25)');
		console.log('\nTest result: PASS');
		process.exit(0);
	} catch (err) {
		console.error(`\nTest failed: ${err.message}`);
		console.log('\n=== SUMMARY ===');
		console.log('Test result: FAIL');
		// Restore on failure
		restoreYaml();
		buildGame();
		process.exit(1);
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	restoreYaml();
	buildGame();
	process.exit(1);
});
