# Usage

## Building the game

```bash
bash build_game.sh
```

This compiles all TypeScript files in `parts/` into a single self-contained HTML file,
`cell_culture_game.html`. The build order is defined in `build_game.sh`.

## Playing the game

Open `cell_culture_game.html` in any modern browser. No web server is required.

The game guides players through a cell culture workflow:

1. **Aspiration** - remove old media from the flask
2. **Media addition** - add fresh media to the target volume
3. **Drug treatment** - pipette the correct drug volume
4. **Microscope observation** - examine cells under the microscope

## Source files

TypeScript source and HTML templates live in the `parts/` directory. The SVG asset
`cell-culture2-clean.svg` is embedded at build time.
