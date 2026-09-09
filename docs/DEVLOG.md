# Development log

Entries are historical records, not current instructions. The September 8 pivot below supersedes earlier gameplay plans and deployment next steps.

## 2026-09-05: official starter and Nix environment

### Decisions

- Traffic cop is the first mechanics testbed; expanded Lemmings-inspired AI roles come later.
- Token balance remains a playtest question. Surplus may make deliberate havoc affordable without an explicit autonomy unlock.
- Use the official September Jam Bare Bones kit, preserving both kit metadata files.
- Use Ubuntu/WSL and a Nix flake, as requested. No global Node/npm installation or nix-env changes.

### Completed

- Scaffolded the official september-jam-barebones kit through RUN CLI.
- Preserved upstream architecture instructions and saved its README as RUN-TEMPLATE.md.
- Added flake.nix and flake.lock. Node 24.19.0, npm 11.17.0, RUN CLI 7.14.3 verified in the shell.
- Packaged the official RUN CLI with a pinned SHA-256 and Nix native dependencies, including ICU. No invariant-globalization workaround needed inside the flake.
- Marked only the flake files intent-to-add so nix develop can discover them; no commit made.
- Installed dependencies from the starter lockfile, then applied compatible updates to @xmldom/xmldom, nanoid, and postcss. npm reports zero known vulnerabilities.
- RUN browser login completed successfully. Credentials remain in the CLI's user configuration, outside the repository.
- Saved DESIGN.md with the agreed direction and open questions.

### Verification

- nix flake check --no-build: passed evaluation.
- nix develop: built and entered successfully; CLI and Node version checks passed.
- npm run build: TypeScript and production bundle passed after dependency updates.
- Vite development server started on port 5173.
- HTTP 200 confirmed from both Ubuntu and Windows at http://localhost:5173/.
- Browser automation could not initialize because of a tool sandbox startup error. Visual gameplay, menu round-trips, persistence, and mobile sizing still need manual verification.
- The upstream Pixi bundle produces Vite's non-fatal 500 KB chunk advisory.

### Next

1. Open the preview, press Play, return to Menu, and reload to test the upstream save behavior.
2. Replace the demo with an ordinary traffic intersection before introducing corruption.
3. Test one announced mutation and provisional token/reset behavior.
4. Replace thumbnail art, register Context Collapse, and deploy privately when the first playable build is ready.

No RUN game registration or deployment has been performed. The current preview is the upstream demo, not traffic gameplay.

### Recording notes

Show the concept, nix develop, a successful build, and the starter running. Explain the roles: Nix supplies the development tools; npm supplies project libraries; Vite runs/builds the game; rundot connects it to RUN. Capture what needed human judgment: selecting the eligible kit, preserving the design intent, and choosing the first test. Avoid recording login credentials.

## First private upload
Accepted city cover adopted at public/thumbnail.jpg. Game title and save namespace updated to AI Overlord; menu explicitly labels the starter demo. TypeScript/production build passed. Registered RUN game l7mD5BHH8LslWkr5mC7d with jam kit preserved. Private version 1.0.1 deployed; live text generation disabled explicitly after CLI auto-enabled it. Next: replace demo scene with traffic loop and iterate locally, then npm run deploy. Hosted visual playtest remains user-checkable; CLI deployment success is verified.

## Coordination agreement
User designated the lead as intent keeper and coordinator of independently critical specialists across Codex, Grok Build, and Claude Code. Delegate based on demonstrated task fit, maintain likes/dislikes and rationale, own implementation/integration/testing, and reserve user attention for people-facing and consequential creative decisions. See AGENTS.md for the durable agreement.


## 2026-09-08: city-building pivot

### Explicit user decisions

The game is now city building and traffic optimization, inspired by Factorio/Satisfactory's observe–improve–watch-results loop, SimCity's growth, and Minecraft's creative ownership. AI Overlord's traffic-cop, mutation, token, and chaos mechanics are superseded. First milestone: buildable map, homes, stores, connected roads, visible trips, and a forgiving economy. Later density upgrades, services dispatched from actual building locations, and weather inform the foundation but remain deferred.

The user requires simulation geometry independent of artwork after reporting a difficult asset-driven refactor. Establish tile scale, footprints, entrances, and connectivity first. Do not reference or request the previous RUN AI-builder prototype. Keep RUN integration, saves, and Nix tooling. Implement and verify locally; no deployment or public publication is part of this milestone.

### Preservation and durable notes

The pre-pivot source at commit 84eac54 is preserved in archive/ai-overlord/source-before-pivot.tar and Git history. Existing thumbnail and source artwork remain historical work; prior approval does not make them approved branding for the new game. AGENTS.md and DESIGN.md now carry the active direction; IMPLEMENTATION-LESSONS.md marks old gameplay evidence as historical, and CLAUDE.md distinguishes starter references from current requirements.

### Provisional implementation choices

“City Workshop” is a working label. The lead selected a 16×14 map, 10 m tiles, 1×1 roads, 2×2 homes, 3×2 stores, four orientations, explicit entrances, and cardinal road connectivity. Initial funds are 10,000; construction costs are 20/200/400; baseline income is 200 every 10 seconds plus a connected-home bonus; removal returns the full construction cost. These defaults are not user-approved balance. The existing RUN identity and historical save are preserved; city data uses the separate `city-workshop:city:v1` namespace.

### Verification status

Integrated the city model, Pixi scene, construction HUD, working-title menu, and timestamped RUN/local city saves. Existing gameplay is preserved in the source archive. The city uses procedural geometric artwork; no image generator or external source art was used. No deployment occurred.

- `nix develop -c npm test`: 10 tests pass, covering spatial rules, access, connectivity, refunds, predictable income, completed roundtrips, frame-rate agreement, save roundtrip/corruption, and route shortcuts.
- `nix develop -c npm run build` and `npm run build:bundled`: TypeScript and Vite pass. Vite reports the inherited large-chunk advisory; it is not a build failure.
- Chromium/Playwright local browser checks: touch construction, road drag, invalid placement, connection/time feedback, moving vehicles, pause, disconnection cancellation, full refund, reconnect, rotation, menu roundtrip, live reload, and preservation of the old save key. No browser errors on the verified run. Layout screenshots inspected at 390×844, 320×640, and 1440×900.
- The standalone production build also passed the browser flow, including a completed trip and the first $300 connected-city income payment.
- Found and corrected stale host storage taking precedence over newer local construction. Loads now select the newer timestamped snapshot; host writes are serialized/coalesced. Confirmed the reloaded game's connectivity and construction, then flushed it and compared geometry again.

Limits: no hosted RUN deployment/lifecycle playtest; traffic routes without congestion or collisions; service dispatch, density upgrades, and weather remain deferred. Small phone tile targets would benefit from future zoom/pan. Enjoyment and economy tuning need human playtesting.


## Tutorial and external-city direction

The user requested an external-city connection before the graphical overhaul. A home and store lead to an invitation to connect; outside traffic then grows with the town, introducing road-management pressure and further building/customization options. The user clarified that the disconnected town is an expandable tutorial for mechanics added over time, with an explicit skip route into the main game.

Recorded this in AGENTS.md and docs/DESIGN.md, with a pointer in CLAUDE.md for future implementation and graphics work. The same town should survive completion or skipping. Saved progression and future lesson additions must respect a player's choice to skip or finish. Proposed details such as the first-trip readiness check, boundary gateway, lesson structure, and queuing are distinguished from the user's accepted direction; unlock content and tuning remain unresolved.

This update changes documentation only. Tutorial, skipping, external traffic, and unlocks still need implementation and verification.


## Expansion foundation during graphics work

User named map expansion as the next objective, with mobile/browser support and traffic-focused creative growth. While Claude owns the graphics pass, implemented only model bounds/expansion and model tests, plus durable notes. The initial town is unchanged; optional expansion extends any edge without relocating construction or vehicles. Old city saves migrate on load.

Four new cases bring the suite to 14 passing tests: all-edge coordinate stability, signed-coordinate construction/routing, bounded expansion and larger saves, and legacy/malformed map handling. Free 8-tile strips and a 64×64 cap are provisional defaults. No camera, renderer, HUD, atlas, CSS, or asset edits were made by the expansion task. Player-facing controls, pan/zoom, and populated-phone verification remain pending graphics integration; see MAP-EXPANSION-HANDOFF.md. No deployment occurred.


## Working ON IT! title screen

User selected the supplied city-worker/commute artwork as the title screen and named the game **Working ON IT!**, with tagline **Fix the commute. Take the credit.** Display/package metadata and durable notes now use this name. Existing city and historical save keys remain unchanged.

MainMenu now provides real Start/Continue, New game with replacement confirmation, and Settings with a persisted control-tip preference. The menu uses a separate stylesheet to avoid interfering with Claude's gameplay graphics pass. It displays the original artwork above its baked-in controls and supplies semantic interactive controls below. No new image was generated and the production thumbnail is untouched.

The user supplied the original artwork at `public/images/title/working-on-it.png`. The image supplies the visible title and tagline; semantic headings remain available to screen readers. Its baked-in menu is clipped in CSS and replaced with functional controls, preserving the source image unchanged. Chromium screenshots were inspected at 390×844 and 320×640, with desktop bounds checked at 1440×900. Browser checks passed image decoding, Start/Continue, cancel/confirm New game, Settings persistence, Escape dismissal, and reload. TypeScript and production build pass. No deployment occurred.


## Map expansion integrated with completed graphics

After the user confirmed Claude's graphics pass was complete, integrated the saved bounds into the finished renderer and added Expand (edge preview + Add land), Pan mode, anchored pinch/wheel/+− zoom, and Town recentering. New land is provisionally free and the maximum remains 64×64. Camera focus and existing coordinates survive expansion; terrain is culled to the viewport plus scenery margins, and HUD/captions remain outside the camera transform.

Validation: 18 model/camera tests pass. TypeScript, RUN-integrated production build, and standalone production build pass. The full expansion browser flow also passes against the standalone production preview. Local Chromium checks pass all-edge growth, expansion cancellation, same-screen placement after expansion, negative-coordinate building, zoom hit-testing, pan/pinch without accidental construction, paused repainting, and expanded-town reload. Screenshots inspected at phone sizes; desktop and small-phone dialog bounds checked. See docs/map-expansion for artifacts and the repeatable browser check.

A populated 64×64 fixture with 32 homes, four stores, 342 road tiles, and 32 active trips loaded and ran without page errors; limit feedback, pan, and wheel zoom worked. Headless desktop Chromium sampled median 16.7 ms and p95 33.4 ms frame intervals over 60 frames. This is a limited local smoke check, not a real-phone performance guarantee or evidence of maximum traffic capacity. Physical-device load testing and advanced traffic/queuing remain future work. No deployment occurred.


## White terrain on initial load: fixed

User reported white tiles with only scenery shadows. Reproduced on fresh browser contexts at phone and tall-window sizes. The map integration rendered/cached terrain before cityArt frame initialization; the later atlas-ready callback reused the terrain cache because visible bounds were unchanged. Earlier interaction checks had missed the initial failure because camera movement rebuilt the terrain.

Moved initial camera focus after art initialization and invalidated the terrain cache in the atlas-ready callback, including late loading. Added docs/map-expansion/cold-render-check.mjs to verify terrain pixels before any camera interaction and after menu return, using isolated contexts at 390×844, 1440×900, and 1117×1800. The fresh-load regression passes in both Vite development and standalone production preview; TypeScript and standalone production build pass. Fixed phone rendering was visually inspected and saved in docs/map-expansion/cold-render-fixed.png. No simulation/save changes or deployment.
