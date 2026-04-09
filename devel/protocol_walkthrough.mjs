#!/usr/bin/env node
/**
 * protocol_walkthrough.mjs - Automated browser walkthrough of the cell culture game.
 * Clicks through every protocol step, taking screenshots at each stage.
 * Run: node devel/protocol_walkthrough.mjs --headless
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "build", "walkthrough");
const basePort = 5081;

function parseArgs(argv) {
	const options = {
		headless: true,
		port: basePort,
	};
	for (let index = 2; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === "--headed") {
			options.headless = false;
			continue;
		}
		if (token === "--headless") {
			options.headless = true;
			continue;
		}
		if (token === "--port") {
			options.port = Number(argv[index + 1]);
			index += 1;
		}
	}
	return options;
}

function sleep(milliseconds) {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

async function waitForHealth(url, timeoutMs) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				return;
			}
		} catch (error) {
			// ignore while the server starts
		}
		await sleep(200);
	}
	throw new Error(`Timed out waiting for ${url}`);
}

function startDevServer(port) {
	const command = `source source_me.sh && python3 cell_culture_game.py ${port}`;
	const child = spawn("bash", ["-lc", command], {
		cwd: repoRoot,
		stdio: ["ignore", "pipe", "pipe"],
	});
	let stdout = "";
	let stderr = "";
	child.stdout.on("data", (chunk) => {
		stdout += chunk.toString();
	});
	child.stderr.on("data", (chunk) => {
		stderr += chunk.toString();
	});
	return { child, getLogs: () => ({ stdout, stderr }) };
}

async function stopDevServer(child) {
	if (child.killed || child.exitCode !== null) {
		return;
	}
	child.kill("SIGTERM");
	for (let attempt = 0; attempt < 20; attempt += 1) {
		if (child.exitCode !== null) {
			return;
		}
		await sleep(100);
	}
	child.kill("SIGKILL");
}

async function clickItem(page, itemId) {
	await page.locator(`.hood-item[data-item-id="${itemId}"]`).click();
}

async function capture(page, index, name) {
	const safeName = name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
	const fileName = `${String(index).padStart(2, "0")}_${safeName}.png`;
	await page.screenshot({
		path: path.join(outputDir, fileName),
		fullPage: true,
	});
}

async function runWalkthrough(page, port) {
	let shot = 1;
	await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
	// Dismiss welcome overlay if present
	const startBtn = page.locator("#welcome-start-btn");
	if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		await startBtn.click();
		await sleep(300);
	}
	// Wait for game to render
	await page.locator("#hood-scene").waitFor({ state: "visible" });
	await sleep(500);
	await capture(page, shot, "initial_state");
	console.log(`[${shot}] Game loaded`);
	shot += 1;

	// Step 1: Spray hood
	await clickItem(page, "ethanol_bottle");
	await sleep(300);
	await capture(page, shot, "spray_hood");
	console.log(`[${shot}] Spray hood complete`);
	shot += 1;

	// Step 2: Aspirate old media
	await clickItem(page, "aspirating_pipette");
	await sleep(200);
	await clickItem(page, "flask");
	// Wait for aspiration animation (2 seconds)
	await sleep(2500);
	await capture(page, shot, "aspirate_old_media");
	console.log(`[${shot}] Aspirate old media complete`);
	shot += 1;

	// Step 3: Add fresh media (pipette -> media bottle -> flask)
	await clickItem(page, "serological_pipette");
	await sleep(200);
	await clickItem(page, "media_bottle");
	await sleep(200);
	await clickItem(page, "flask");
	// Wait for media addition animation (2 seconds)
	await sleep(2500);
	await capture(page, shot, "add_fresh_media");
	console.log(`[${shot}] Add fresh media complete`);
	shot += 1;

	// Step 4 & 5: Microscope (viability + counting)
	await clickItem(page, "microscope");
	await sleep(500);
	await capture(page, shot, "microscope_viability");
	console.log(`[${shot}] Microscope viability view`);
	shot += 1;

	// Confirm viability
	await page.locator("#confirm-viability").click();
	await sleep(500);
	await capture(page, shot, "hemocytometer_counting");
	console.log(`[${shot}] Hemocytometer counting view`);
	shot += 1;

	// Select all 4 quadrants
	for (let i = 0; i < 4; i++) {
		await page.locator(`.quadrant-btn[data-quadrant="${i}"]`).click();
		await sleep(100);
	}
	await page.locator("#submit-cell-count").click();
	await sleep(500);
	await capture(page, shot, "count_complete");
	console.log(`[${shot}] Cell count submitted`);
	shot += 1;

	// Step 6: Transfer cells to plate (pipette -> flask -> well plate)
	await clickItem(page, "serological_pipette");
	await sleep(200);
	await clickItem(page, "flask");
	await sleep(200);
	await clickItem(page, "well_plate");
	await sleep(300);
	await capture(page, shot, "transfer_to_plate");
	console.log(`[${shot}] Cells transferred to plate`);
	shot += 1;

	// Step 7: Add drugs (multichannel -> drug vials -> well plate)
	await clickItem(page, "multichannel_pipette");
	await sleep(200);
	await clickItem(page, "drug_vials");
	await sleep(200);
	await clickItem(page, "well_plate");
	await sleep(500);
	// Dilution choice dialog should appear
	await capture(page, shot, "dilution_choice");
	console.log(`[${shot}] Dilution choice dialog shown`);
	shot += 1;

	// Select the correct dilution (first option, index 0)
	await page.locator('.dilution-choice[data-dilution-index="0"]').click();
	await sleep(500);
	await capture(page, shot, "drugs_added");
	console.log(`[${shot}] Drugs added with half-log dilution`);
	shot += 1;

	// Step 8: Incubate (click well plate when cells + drugs present)
	await clickItem(page, "well_plate");
	await sleep(500);
	// Wait for incubation animation (4 seconds)
	await sleep(4500);
	await capture(page, shot, "incubation_complete");
	console.log(`[${shot}] Incubation complete`);
	shot += 1;

	// Step 9: Plate reader (should auto-transition)
	await sleep(2000);
	await capture(page, shot, "plate_reader");
	console.log(`[${shot}] Plate reader results`);
	shot += 1;

	// Complete experiment
	await page.locator("#complete-plate-read").click();
	await sleep(1000);
	await capture(page, shot, "results_screen");
	console.log(`[${shot}] Results screen`);

	console.log(`\nSaved ${shot} walkthrough screenshots to ${path.relative(repoRoot, outputDir)}`);
}

async function main() {
	const options = parseArgs(process.argv);
	console.log(`Starting walkthrough (headless: ${options.headless}, port: ${options.port})`);
	const { chromium } = await import("playwright");
	fs.mkdirSync(outputDir, { recursive: true });
	console.log("Starting dev server...");
	const { child, getLogs } = startDevServer(options.port);
	const serverUrl = `http://127.0.0.1:${options.port}/health`;
	console.log(`Waiting for server at ${serverUrl}...`);
	const browser = await chromium.launch({ headless: options.headless });
	try {
		await waitForHealth(serverUrl, 15000);
		const page = await browser.newPage({
			viewport: { width: 1024, height: 768 },
		});
		await runWalkthrough(page, options.port);
		await page.close();
	} catch (error) {
		const logs = getLogs();
		console.error(logs.stdout);
		console.error(logs.stderr);
		throw error;
	} finally {
		await browser.close();
		await stopDevServer(child);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
