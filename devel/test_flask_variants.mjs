#!/usr/bin/env node
/**
 * test_flask_variants.mjs
 * Playwright test script to render and compare T-75 flask variants at game scale.
 * Captures screenshots for docs/FLASK_DESIGN_REVIEW.md
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = path.resolve('docs/images/flask_review');

// Create screenshot directory if it doesn't exist
if (!fs.existsSync(screenshotDir)) {
	fs.mkdirSync(screenshotDir, { recursive: true });
}

async function captureFlaskVariant(page, variant, filepath) {
	console.log(`Capturing ${variant} variant...`);

	// Read the SVG file
	const svgContent = fs.readFileSync(filepath, 'utf-8');

	// Create a test page with the flask SVG
	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				body {
					margin: 0;
					padding: 40px;
					background: #f5f5f5;
					font-family: Arial, sans-serif;
				}
				.flask-container {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
					gap: 20px;
				}
				.flask-wrapper {
					background: white;
					padding: 30px;
					border: 1px solid #ddd;
					border-radius: 4px;
					display: inline-block;
					box-shadow: 0 2px 8px rgba(0,0,0,0.1);
				}
				svg {
					width: 120px;
					height: 200px;
					display: block;
				}
				.label {
					font-size: 14px;
					font-weight: bold;
					color: #333;
					margin-top: 10px;
				}
			</style>
		</head>
		<body>
			<div class="flask-container">
				<div class="flask-wrapper">
					${svgContent}
				</div>
				<div class="label">T-75 Flask ${variant.toUpperCase()}</div>
			</div>
		</body>
		</html>
	`);

	await page.waitForTimeout(300);

	const screenshot = path.join(screenshotDir, `t75_flask_${variant}.png`);
	await page.screenshot({ path: screenshot, fullPage: false });
	console.log(`  -> ${screenshot}`);
}

async function main() {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 600, height: 500 }
	});
	const page = await context.newPage();

	try {
		// Define variant paths: v1 is the current default, v2 and v3 are new
		const variants = [
			{ name: 'v1', path: 'assets/equipment/t75_flask.svg' },
			{ name: 'v2', path: 'assets/equipment/t75_flask_v2.svg' },
			{ name: 'v3', path: 'assets/equipment/t75_flask_v3.svg' }
		];

		for (const variant of variants) {
			const fullPath = path.resolve(variant.path);
			await captureFlaskVariant(page, variant.name, fullPath);
		}

		console.log('\nFlask variant screenshots captured successfully.');
		console.log(`Screenshots saved to: ${screenshotDir}`);
		console.log('\nVariant descriptions:');
		console.log('  v1: Current default - flat rectangular body, angled neck');
		console.log('  v2: Refined design - slanted neck, vented cap, modern');
		console.log('  v3: Classic design - straight-neck Corning style, compact');

	} catch (error) {
		console.error('Error capturing flask variants:', error);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

main();
