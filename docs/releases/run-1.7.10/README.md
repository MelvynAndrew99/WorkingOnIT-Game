# RUN 1.7.10 — published September 11, 2026

User explicitly requested publishing the updated game so graphics are available online. Uploaded the frozen, verified current working-tree production build to the existing Working ON IT! game. RUN returned a successful 1.7.10 upload with initial visibility `review`; the subsequent tag check confirms **Review (Approved) 1.7.10 and Public 1.7.10**. Previous public version was 1.7.9.

[Play Working ON IT!](https://w.run/melvynandrew99/working-on-it)

This publishes the current title/menu artwork, city-rendering/pathfinding optimizations and accumulated local intersection/connection fixes. See [player-facing changelog](changelog.md). Model performance gains do not establish universal device FPS; the supplied-town benchmark's desktop software-rendering limitation remains documented.

## Verification

- Model suite passes; current Node reporter summarizes 32 test files. [Tests](tests.txt).
- Production TypeScript/Vite build passes, with the existing bundle-size warning. [Build](build.txt).
- Exact frozen upload served under a nested `/game/` path. Desktop 1440×900 and narrow 390×900 verify title graphics, city atlas, zoom, running simulation and preservation of the supplied town's roads/buildings on reload. No page errors or failed local asset requests. [Results](smoke-results.json).
- The same 61-file artifact was hash-checked before upload; it contains production assets, not benchmark saves or source documents. [Manifest](artifact.json).
- [Sanitized upload/publication receipt](../run-1.7.10-receipt.json). Raw CLI output stays in temporary local files because share links may include private review keys.

The upload took several minutes without progress output; it was monitored, not duplicated. No Git push/commit, game identity/orientation change, or player-storage mutation was performed. Existing working-tree changes are preserved.
