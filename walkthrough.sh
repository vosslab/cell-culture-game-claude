#!/bin/bash
# walkthrough.sh - Build the game, then run the Playwright browser walkthrough
# Usage: bash walkthrough.sh [--headed]
#
# Screenshots are saved to build/walkthrough/
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Build the game first
echo "Building game..."
bash build_game.sh

# Check for Playwright
if [ ! -d "node_modules/playwright" ]; then
	echo "Installing Playwright..."
	npm install playwright
	npx playwright install chromium
fi

# Check for Chromium browsers in system cache or local
SYSTEM_CACHE="$HOME/Library/Caches/ms-playwright"
LOCAL_CACHE="node_modules/playwright-core/.local-browsers"
if [ ! -d "$SYSTEM_CACHE" ] && [ ! -d "$LOCAL_CACHE" ]; then
	echo "Installing Chromium browser..."
	npx playwright install chromium
fi

# Run the data-layer walkthrough first -- asserts completeStep() order
# via page.evaluate, fast gate for graph / trigger-coverage regressions.
echo "Running data-layer walkthrough..."
node devel/protocol_walkthrough.mjs "$@"

# Run the real-click walkthrough second -- drives the protocol through
# DOM clicks and catches banner/wiring mismatches the data-layer pass
# cannot see. Both must pass for walkthrough.sh to succeed.
echo ""
echo "Running real-click walkthrough..."
node devel/protocol_walkthrough_ui.mjs "$@"

# Target-handler audit: for every step, prove every item in
# targetItems has an observable click handler. Guards against the
# cell_counter / M4-stub class of bug where a highlighted target
# produces a silent no-op.
echo ""
echo "Running target-handler audit..."
node devel/test_target_handlers.mjs

# Step completeness audit (M2): verify every protocol step has proper
# wiring: requiredItems >= targetItems, scene membership correct,
# every item is used or visualOnly, etc.
echo ""
echo "Running step completeness audit..."
node devel/test_step_completeness.mjs

echo ""
echo "Screenshots saved to:"
echo "  build/walkthrough/      (data-layer pass)"
echo "  build/walkthrough_ui/   (real-click pass)"
ls -1 build/walkthrough/*.png 2>/dev/null | while read -r f; do echo "  $f"; done
ls -1 build/walkthrough_ui/*.png 2>/dev/null | while read -r f; do echo "  $f"; done
