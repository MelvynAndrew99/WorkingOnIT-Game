# Local verification artifacts

September 8, 2026: actual Chromium screenshots of the first city milestone, not proposed cover art. `playable-phone.png` shows a moving roundtrip; `small-phone.png` and `desktop.png` show the saved town after reload, paused.

`browser-check.mjs` exercises the actual UI, then saves screenshots under `/tmp`. It expects a fresh browser context and a running local game. It requires Playwright and a compatible Chromium; these are verification tools, not runtime game dependencies. Run Node inside `nix develop`.

Set `CITY_URL` for the local dev/preview server. If Playwright is not installed as a project dependency, set `CITY_PLAYWRIGHT_MODULE` to its installed `index.mjs` path. Optionally set `CITY_CHROMIUM_PATH` to a Nix Chromium binary. Then run:

```bash
nix develop -c node docs/city-milestone/browser-check.mjs
```

Verified against Vite development and standalone production preview. The script checks touch placement, road drag, rejected placement, reachable-home count and planned trip time, a moving and completed trip, income, pause, full refunds, disconnection/reconnection, rotation, menu cleanup, live reload, legacy-save preservation, responsive bounds, and absence of browser errors. Model tests separately cover a route-shortening improvement and corrupt saves.

No hosted RUN deployment was performed. Very small phones have small tile targets; future camera controls can improve precision. Economy and enjoyment still need human playtesting.

The coordinate assumptions in this milestone's browser script predate the camera. For the current integrated game, use `docs/map-expansion/browser-check.mjs`; the screenshots here remain historical milestone evidence.
