# Usage

Players learn cell culture techniques by completing a guided 9-step laboratory
protocol in the browser.

## Quick start

```bash
bash build_game.sh
open cell_culture_game.html
```

The build compiles all TypeScript files in [parts/](../parts/) into a single
self-contained HTML file. No web server is needed to play.

## Development server

[cell_culture_game.py](../cell_culture_game.py) serves the game locally with
auto-rebuild when the output is missing or stale:

```bash
source source_me.sh && python3 cell_culture_game.py
```

Default address: `http://127.0.0.1:5080`. Pass a port number as argument to
change it:

```bash
source source_me.sh && python3 cell_culture_game.py 8000
```

Endpoints:
- `/` serves the game HTML
- `/health` returns a JSON status object

## Playing the game

The game guides players through a 9-step cell culture protocol:

1. Spray and sanitize the sterile hood
2. Aspirate old media from the flask
3. Add fresh media to the target volume
4. Check cell viability under the microscope
5. Count cells using hemocytometer quadrant selection
6. Transfer cells to a well plate
7. Add drug dilutions (choose a serial dilution series)
8. Incubate the plate
9. Read plate results

Interact by clicking items or dragging tools to targets. Valid targets glow
with a pulsing green border. Real-time warnings appear in the sidebar when
technique errors occur.

## Scoring

Performance is rated on four categories:

| Category | Tracks |
| --- | --- |
| Order | Steps completed in correct sequence |
| Cleanliness | Contamination and sterile technique errors |
| Waste | Excess media usage |
| Timing | Speed to completion |

A 1-3 star rating is shown on the results screen.

## Inputs and outputs

- **Source:** TypeScript modules in [parts/](../parts/) and HTML/CSS templates
- **Build output:** `cell_culture_game.html` (single file, no external deps)
- **Test outputs:** `report_*.txt` files and `build/walkthrough/*.png` screenshots

## Running tests

```bash
source source_me.sh && python3 -m pytest tests/
```

Run only changed files for faster feedback:

```bash
FAST_REPO_HYGIENE=1 source source_me.sh && python3 -m pytest tests/
```

## Known gaps

- TODO: Document expected Playwright walkthrough screenshot output
