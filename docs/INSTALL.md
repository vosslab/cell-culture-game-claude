# Install

## Prerequisites

- **Node.js** with `npx` available on PATH (used to run esbuild for TypeScript compilation)
- A modern web browser (Chrome, Firefox, Safari, Edge)

## Setup

1. Clone the repository.
2. Ensure Node.js is installed: `node --version`
3. Run the build: `bash build_game.sh`

The build script uses `npx esbuild` to compile TypeScript. No global install of
esbuild is required; npx fetches it automatically.

## Python development tools

For running tests and linting:

```bash
source source_me.sh && python3 -m pytest tests/
```

Python dependencies are listed in [../pip_requirements-dev.txt](../pip_requirements-dev.txt).
