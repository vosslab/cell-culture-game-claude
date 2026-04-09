#!/bin/bash
# run_web_server.sh - Build the game and serve it on the local network
# Usage: bash run_web_server.sh
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Clean previous build artifacts and rebuild from scratch
echo "Cleaning previous build..."
rm -f cell_culture_game.html _temp_bundle.js _temp_all.ts
echo "Building game..."
bash build_game.sh

# Detect the local IP address for the LAN URL
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
PORT=5080

echo ""
echo "========================================"
echo "  Send this link to others on your network:"
echo "  http://${LOCAL_IP}:${PORT}"
echo "========================================"
echo ""

# Start the server on all interfaces for LAN access
sleep 1 && open http://127.0.0.1:5080 &
source source_me.sh && python3 cell_culture_game.py --lan --port "$PORT"
