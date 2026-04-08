# Install

The game builds from TypeScript source into a single self-contained HTML file.
"Installed" means you can run `bash build_game.sh` and open the output in a browser.

## Requirements

- **Node.js** with `npx` on PATH (esbuild is fetched automatically via npx)
- **Python 3.12** for running tests and the development server
- **Bash** shell (build scripts and [source_me.sh](../source_me.sh) require Bash)
- A modern browser (Chrome, Firefox, Safari, Edge)

## Install steps

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd cell-culture-game-claude
   ```

2. Verify Node.js is available:
   ```bash
   node --version
   ```

3. Install Python dev dependencies (for tests and linting):
   ```bash
   pip3 install -r pip_requirements-dev.txt
   ```

4. Build the game:
   ```bash
   bash build_game.sh
   ```

## Verify install

```bash
bash build_game.sh && test -f cell_culture_game.html && echo "OK"
```

This confirms the TypeScript compilation succeeded and the output HTML exists.

## Python development tools

Run the test suite:

```bash
source source_me.sh && python3 -m pytest tests/
```

Python dev dependencies are listed in
[pip_requirements-dev.txt](../pip_requirements-dev.txt): bandit, packaging,
pyflakes, pytest, rich.

For the E2E browser walkthrough test, Playwright and Chromium are also required
(see [pip_extras.txt](../pip_extras.txt)).

## Known gaps

- TODO: Confirm minimum Node.js version required by esbuild
- TODO: Document Playwright/Chromium install steps for E2E testing
