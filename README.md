# Cell culture game

An interactive browser-based simulation game that teaches cell culture laboratory
techniques. Players practice aspirating old media, feeding cells with fresh media,
drug treatment pipetting, and microscope observation in a guided workflow.

## Quick start

```bash
bash build_game.sh
open cell_culture_game.html
```

The build script compiles TypeScript source files from `parts/` into a single
self-contained HTML file. Open it in any modern browser to play.

## Documentation

- [docs/INSTALL.md](docs/INSTALL.md): prerequisites and setup
- [docs/USAGE.md](docs/USAGE.md): how to build and play
- [docs/CHANGELOG.md](docs/CHANGELOG.md): record of changes
- [docs/AUTHORS.md](docs/AUTHORS.md): maintainers and contributors
- [docs/PYTHON_STYLE.md](docs/PYTHON_STYLE.md): Python conventions for this repo
- [docs/MARKDOWN_STYLE.md](docs/MARKDOWN_STYLE.md): Markdown formatting rules
- [docs/REPO_STYLE.md](docs/REPO_STYLE.md): repo-wide organization conventions

## Testing

```bash
source source_me.sh && python3 -m pytest tests/
```

## License

- Code: [LGPL v3](LICENSE.LGPL_v3)
- Non-code content: [CC BY 4.0](LICENSE.CC_BY_4_0)

Maintained by Neil Voss, https://bsky.app/profile/neilvosslab.bsky.social
