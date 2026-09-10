# Approved park sprite

User selected Claude's candidate: “Yes I like that sprite.” Installed locally in September 2026.

Actual Claude Code authored `claude-candidate.svg` from a text-only brief. Source and original preview are preserved. `tools/build-park-sprites.mjs` exports transparent192px PNGs and derived SVGs to public/images/city/park-{N,E,S,W}. Only entrance paving/border openings change; fountain, benches and trees stay upright. Run inside nix develop with PLAYWRIGHT_MODULE and CHROMIUM_PATH pointing to local installs.

Renderer uses the real logical entrance side, with existing primitive art as loading-failure fallback. Manifest preloads the four sprites; late loading refreshes the scene. Gameplay, footprint, capacities, rotation and saves are unchanged.

Verified production build and four placed orientations in a fresh isolated browser context, with external networking blocked. `installed-four-entrances.png` records the in-game check. Initial visual-check script was rejected before execution because its reset operations could threaten saved construction; the replacement refused populated towns and used no persistent browser profile.
