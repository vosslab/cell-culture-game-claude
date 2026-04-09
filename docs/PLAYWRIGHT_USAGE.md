# Playwright usage

How to use Playwright for browser automation and visual testing in this repo.

## Install

Playwright is a dev dependency. After cloning:

```bash
npm install
npx playwright install
```

`npm install` gets the `playwright` Node library. `npx playwright install` downloads
browser binaries (Chromium, Firefox, WebKit).

## Key rule: scripts must run from the project root

Node resolves `import 'playwright'` by searching `node_modules/` starting from the
script's own directory and walking up. A script in `/tmp/` will not find the project's
`node_modules/`.

**Wrong:**

```bash
node /tmp/_test_game_ui.mjs
# Error: Cannot find module 'playwright'
```

**Right:**

```bash
cd /Users/vosslab/nsh/cell-culture-game-claude
node devel/test_game_ui.mjs
```

Put test scripts inside the repo (e.g., `devel/` or `scripts/`), not in `/tmp/`.

## Packages

| Package | Purpose |
| --- | --- |
| `playwright` | Library/API for browser automation (what we use) |
| `@playwright/test` | Test runner with fixtures, assertions, reporters |
| `playwright-core` | Low-level core without bundled browsers (rarely needed) |

For "open a local HTML file, click things, take screenshots", use `playwright`.

## Script template

```javascript
import { chromium } from 'playwright';
import path from 'path';

const gamePath = path.resolve('cell_culture_game.html');
const url = `file://${gamePath}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(url);
await page.waitForTimeout(500);

// Interact with the page
await page.click('#welcome-start-btn');
await page.waitForTimeout(300);

// Screenshot
await page.screenshot({ path: 'test-results/screenshot.png' });

// Measure element positions
const box = await page.locator('#my-element').boundingBox();
console.log('Position:', box);

await browser.close();
```

Run with:

```bash
node devel/my_test.mjs
```

## Common patterns

### Click a hood item

Hood items use `data-item-id`:

```javascript
await page.click('[data-item-id="ethanol_bottle"]');
```

### Wait for animations

Use `waitForTimeout` after actions that trigger animations:

```javascript
await page.click('[data-item-id="flask"]');
await page.waitForTimeout(2500);  // aspiration takes ~2s
```

### Check element alignment

Use `boundingBox()` to compare positions of overlapping elements:

```javascript
const svgRect = await page.locator('#microscope-svg rect[fill="#e8f5e9"]').first().boundingBox();
const button = await page.locator('.quadrant-btn').first().boundingBox();
const dx = Math.abs(svgRect.x - button.x);
const dy = Math.abs(svgRect.y - button.y);
console.log(`Offset: dx=${dx.toFixed(1)} dy=${dy.toFixed(1)}`);
```

### Evaluate JavaScript in the page

```javascript
const result = await page.evaluate(() => {
    return document.querySelectorAll('.quadrant-btn').length;
});
console.log('Button count:', result);
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Cannot find module 'playwright'` | Run the script from the project root, not `/tmp/` |
| `browserType.launch: Executable doesn't exist` | Run `npx playwright install` |
| `npx playwright` works but `node script.mjs` fails | Different issue: npx resolves packages differently than Node require |
| Timeout clicking an element | Check the selector; use `data-item-id` not `data-item` for hood items |

## Verify install

```bash
npm ls playwright
```

Should show `playwright@x.x.x` under the project.

## File conventions

- Put Playwright scripts in `devel/` (development/testing utilities)
- Put screenshots in `test-results/` (gitignored)
- Use `.mjs` extension for ES module scripts
