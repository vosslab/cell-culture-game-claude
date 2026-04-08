# File structure

## Top-level layout

| Path | Purpose |
| --- | --- |
| [build_game.sh](../build_game.sh) | Compile TypeScript and assemble single-file HTML |
| [walkthrough.sh](../walkthrough.sh) | Build and run Playwright E2E walkthrough |
| [cell_culture_game.py](../cell_culture_game.py) | Local development HTTP server |
| [cell_culture_game.html](../cell_culture_game.html) | Generated game output (git-ignored) |
| [source_me.sh](../source_me.sh) | Bash environment setup for Python 3.12 |
| [VERSION](../VERSION) | CalVer version string |
| [README.md](../README.md) | Project overview and quick start |
| [AGENTS.md](../AGENTS.md) | AI agent coding guidelines |
| [pip_requirements.txt](../pip_requirements.txt) | Runtime Python dependencies |
| [pip_requirements-dev.txt](../pip_requirements-dev.txt) | Dev dependencies (pytest, pyflakes, bandit) |
| [LICENSE.LGPL_v3](../LICENSE.LGPL_v3) | Code license |
| [LICENSE.CC_BY_4_0](../LICENSE.CC_BY_4_0) | Content license |

## Key subtrees

### `parts/` - TypeScript game source

Game modules compiled in dependency order by [build_game.sh](../build_game.sh).

| File | Purpose |
| --- | --- |
| [head.html](../parts/head.html) | HTML document header |
| [style.css](../parts/style.css) | Game CSS (drag-drop highlights, layout) |
| [body.html](../parts/body.html) | HTML body structure |
| [tail.html](../parts/tail.html) | HTML closing tags |
| [constants.ts](../parts/constants.ts) | Protocol steps, plate layout, scoring config |
| [game_state.ts](../parts/game_state.ts) | GameState interface, well plate creation |
| [cell_model.ts](../parts/cell_model.ts) | Cell population and drug response model |
| [svg_assets.ts](../parts/svg_assets.ts) | SVG rendering for all visual elements |
| [hood_scene.ts](../parts/hood_scene.ts) | Sterile hood interaction scene |
| [microscope_scene.ts](../parts/microscope_scene.ts) | Cell counting with hemocytometer |
| [incubator_scene.ts](../parts/incubator_scene.ts) | Incubation placement scene |
| [feed_cells.ts](../parts/feed_cells.ts) | Media handling logic |
| [drug_treatment.ts](../parts/drug_treatment.ts) | Serial dilution selection |
| [ui_rendering.ts](../parts/ui_rendering.ts) | Sidebar HUD, warnings, score display |
| [scoring.ts](../parts/scoring.ts) | Score calculation (order, cleanliness, waste, timing) |
| [init.ts](../parts/init.ts) | Bootstrap, validation, render dispatcher |

### `tests/` - pytest test suite

| File | Purpose |
| --- | --- |
| [conftest.py](../tests/conftest.py) | pytest fixtures and Playwright config |
| [git_file_utils.py](../tests/git_file_utils.py) | Shared git operations for test scoping |
| [test_pyflakes_code_lint.py](../tests/test_pyflakes_code_lint.py) | Static analysis linting |
| [test_import_requirements.py](../tests/test_import_requirements.py) | Import policy validation |
| [test_import_star.py](../tests/test_import_star.py) | Forbids `from X import *` |
| [test_import_dot.py](../tests/test_import_dot.py) | Forbids relative imports |
| [test_init_files.py](../tests/test_init_files.py) | `__init__.py` style enforcement |
| [test_ascii_compliance.py](../tests/test_ascii_compliance.py) | ASCII-only source check |
| [test_bandit_security.py](../tests/test_bandit_security.py) | Security linting |
| [test_indentation.py](../tests/test_indentation.py) | Tab indentation enforcement |
| [test_whitespace.py](../tests/test_whitespace.py) | Trailing whitespace check |
| [test_shebangs.py](../tests/test_shebangs.py) | Shebang consistency |
| [test_cell_culture_walkthrough.py](../tests/test_cell_culture_walkthrough.py) | E2E Playwright browser test |
| [check_ascii_compliance.py](../tests/check_ascii_compliance.py) | Single-file ASCII checker |
| [fix_ascii_compliance.py](../tests/fix_ascii_compliance.py) | Single-file ASCII fixer |
| [fix_whitespace.py](../tests/fix_whitespace.py) | Whitespace fixer utility |

### `docs/` - documentation

| File | Purpose |
| --- | --- |
| [CHANGELOG.md](CHANGELOG.md) | Chronological record of changes |
| [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) | System design and data flow |
| [FILE_STRUCTURE.md](FILE_STRUCTURE.md) | This file |
| [INSTALL.md](INSTALL.md) | Prerequisites and setup |
| [USAGE.md](USAGE.md) | Build and gameplay instructions |
| [AUTHORS.md](AUTHORS.md) | Maintainers and contributors |
| [PYTHON_STYLE.md](PYTHON_STYLE.md) | Python conventions |
| [TYPESCRIPT_STYLE.md](TYPESCRIPT_STYLE.md) | TypeScript conventions |
| [MARKDOWN_STYLE.md](MARKDOWN_STYLE.md) | Markdown formatting rules |
| [REPO_STYLE.md](REPO_STYLE.md) | Repo-wide organization conventions |
| [CLAUDE_HOOK_USAGE_GUIDE.md](CLAUDE_HOOK_USAGE_GUIDE.md) | Claude Code permissions hook guide |

### `devel/` - developer tools

| File | Purpose |
| --- | --- |
| [commit_changelog.py](../devel/commit_changelog.py) | Generate commit messages from changelog diffs |
| [protocol_walkthrough.mjs](../devel/protocol_walkthrough.mjs) | Playwright automation for E2E screenshots |

## Generated artifacts

These are produced by the build and test pipelines, not tracked in git:

| Path | Source |
| --- | --- |
| `cell_culture_game.html` | [build_game.sh](../build_game.sh) output |
| `build/walkthrough/*.png` | Playwright E2E screenshots |
| `report_pyflakes.txt` | pyflakes lint output |
| `report_import_requirements.txt` | Import policy report |
| `report_init.txt` | `__init__.py` style report |
| `report_import_star.txt` | `import *` usage report |

## Where to add new work

| Type | Location |
| --- | --- |
| Game logic | New `.ts` file in `parts/`, add to build order in [build_game.sh](../build_game.sh) |
| Game styles | [parts/style.css](../parts/style.css) |
| Python tooling | Repo root as single-purpose script |
| Tests | `tests/test_*.py` |
| Documentation | `docs/` with SCREAMING_SNAKE_CASE filename |
| Developer tools | `devel/` |
