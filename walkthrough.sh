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

# Run the walkthrough (pass through any flags like --headed)
echo "Running walkthrough..."
node devel/protocol_walkthrough.mjs "$@"

echo ""
echo "Screenshots saved to build/walkthrough/"
ls -1 build/walkthrough/*.png 2>/dev/null | while read -r f; do echo "  $f"; done
