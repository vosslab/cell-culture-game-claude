#!/usr/bin/env node
/**
 * protocol_walkthrough.mjs - Automated browser walkthrough of the cell culture game.
 * Clicks through every protocol step, taking screenshots at each stage.
 * Run: node devel/protocol_walkthrough.mjs
 * Options: --headed (show browser), --headless (default)
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "build", "walkthrough");
const gamePath = path.resolve("cell_culture_game.html");
const gameUrl = `file://${gamePath}`;

function parseArgs(argv) {
	const options = { headless: true };
	for (let index = 2; index < argv.length; index += 1) {
		if (argv[index] === "--headed") options.headless = false;
		if (argv[index] === "--headless") options.headless = true;
	}
	return options;
}

function sleep(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function clickItem(page, itemId) {
	await page.locator(`.hood-item[data-item-id="${itemId}"]`).click();
}

let shotIndex = 0;
async function capture(page, name) {
	shotIndex += 1;
	const safeName = name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
	const fileName = `${String(shotIndex).padStart(2, "0")}_${safeName}.png`;
	await page.screenshot({ path: path.join(outputDir, fileName), fullPage: true });
	console.log(`[${shotIndex}] ${name}`);
}

async function runWalkthrough(page) {
	await page.goto(gameUrl, { waitUntil: "domcontentloaded" });
	await sleep(500);

	// Dismiss welcome overlay
	const startBtn = page.locator("#welcome-start-btn");
	if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		await startBtn.click();
		await sleep(300);
	}
	await page.locator("#hood-scene").waitFor({ state: "visible" });
	await sleep(500);
	await capture(page, "initial_state");

	// Step 1: Spray hood
	await clickItem(page, "ethanol_bottle");
	await sleep(300);
	await capture(page, "spray_hood");

	// Step 2: Aspirate old media
	await clickItem(page, "aspirating_pipette");
	await sleep(200);
	await clickItem(page, "flask");
	await sleep(2500);
	await capture(page, "aspirate_old_media");

	// Step 3: Add trypsin (pipette -> trypsin bottle -> flask)
	await clickItem(page, "serological_pipette");
	await sleep(200);
	await clickItem(page, "trypsin_bottle");
	await sleep(200);
	await clickItem(page, "flask");
	await sleep(300);
	await capture(page, "add_trypsin");

	// Step 4: Incubate trypsin (pick up flask -> click incubator)
	await clickItem(page, "flask");
	await sleep(200);
	await clickItem(page, "incubator");
	await sleep(500);
	await capture(page, "trypsin_incubating");
	await sleep(4000);
	await capture(page, "trypsin_incubation_done");

	// Step 5: Neutralize trypsin (pipette -> media bottle -> flask)
	await clickItem(page, "serological_pipette");
	await sleep(200);
	await clickItem(page, "media_bottle");
	await sleep(200);
	await clickItem(page, "flask");
	await sleep(2500);
	await capture(page, "neutralize_trypsin");

	// Step 6: Load hemocytometer (pipette -> flask -> microscope)
	await clickItem(page, "serological_pipette");
	await sleep(200);
	await clickItem(page, "flask");
	await sleep(200);
	await clickItem(page, "microscope");
	await sleep(300);
	await capture(page, "load_hemocytometer");

	// Step 7: Microscope viability check
	await clickItem(page, "microscope");
	await sleep(500);
	await capture(page, "microscope_viability");

	// Confirm viability
	await page.locator("#confirm-viability").click();
	await sleep(500);
	await capture(page, "hemocytometer_counting");

	// Step 8: Count cells (click each quadrant, enter count via dialog)
	const counts = [5, 6, 4, 7];
	for (let i = 0; i < 4; i++) {
		page.once("dialog", async (dialog) => {
			await dialog.accept(String(counts[i]));
		});
		await page.locator(`.quadrant-btn[data-quadrant="${i}"]`).click();
		await sleep(300);
	}
	await capture(page, "quadrants_counted");

	await page.locator("#submit-cell-count").click();
	await sleep(500);
	await capture(page, "count_complete");

	// Step 9: Transfer cells to plate (pipette -> flask -> well plate)
	await clickItem(page, "serological_pipette");
	await sleep(200);
	await clickItem(page, "flask");
	await sleep(200);
	await clickItem(page, "well_plate");
	await sleep(300);
	await capture(page, "transfer_to_plate");

	// Step 10: Add drugs (multichannel -> drug vials -> well plate)
	await clickItem(page, "multichannel_pipette");
	await sleep(200);
	await clickItem(page, "drug_vials");
	await sleep(200);
	await clickItem(page, "well_plate");
	await sleep(500);
	await capture(page, "dilution_choice");

	// Select half-log dilution (first option)
	await page.locator('.dilution-choice[data-dilution-index="0"]').click();
	await sleep(500);
	await capture(page, "drugs_added");

	// Step 11: Incubate (pick up well plate -> click incubator)
	await clickItem(page, "well_plate");
	await sleep(200);
	await clickItem(page, "incubator");
	await sleep(500);
	await capture(page, "incubation_started");
	await sleep(5000);
	await capture(page, "incubation_complete");

	// Step 12: Plate reader (auto-transitions after incubation)
	await sleep(2000);
	await capture(page, "plate_reader");

	// Complete experiment
	const completeBtn = page.locator("#complete-plate-read");
	if (await completeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		await completeBtn.click();
		await sleep(1000);
	}
	await capture(page, "results_screen");

	console.log(`\nSaved ${shotIndex} screenshots to ${path.relative(repoRoot, outputDir)}`);
}

async function main() {
	const options = parseArgs(process.argv);
	console.log(`Starting walkthrough (headless: ${options.headless})`);
	const { chromium } = await import("playwright");
	fs.mkdirSync(outputDir, { recursive: true });
	const browser = await chromium.launch({ headless: options.headless });
	try {
		const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
		await runWalkthrough(page);
		await page.close();
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
