#!/bin/bash
# run_web_server.sh - Build the game and serve it on the local network
# Usage: bash run_web_server.sh
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Build the game
echo "Building game..."
bash build_game.sh

# Start the server on all interfaces for LAN access
source source_me.sh && python3 cell_culture_game.py --lan
