# Shared implementation lessons

This is the shared engineering record for Codex, Claude Code and Grok Build. Read AGENTS.md for user intent and approval boundaries, docs/DESIGN.md for gameplay direction, and CLAUDE.md for the inherited RUN architecture. This file records implementation evidence, not a competing design vision.

## How specialists use this record

Before work: read the relevant entries and source code. Follow accepted patterns. If a pattern appears unsuitable, explain the concrete tradeoff to the lead rather than silently introducing an alternative architecture.

After work: propose a concise lesson with context/problem, decision, evidence/checks, scope, and remaining uncertainty. Mark it proposed until verified. The lead integrates accepted lessons, removes duplication, and marks superseded entries. Delegates should return proposed notes in their handoff rather than simultaneously edit this shared file unless explicitly assigned ownership.

Record only reusable findings. Avoid transcripts, speculation presented as fact, credentials, and one-off command noise. Failed approaches are useful when the reason for failure is captured. User preferences belong in AGENTS.md; gameplay decisions belong in DESIGN.md. Reference those rather than duplicating them.

## Pivot scope (2026-09-08)

Current gameplay direction is city building and traffic optimization; see docs/DESIGN.md. AI Overlord-specific lessons below remain evidence about archived mechanics, not instructions to reintroduce them. The pre-pivot source at 84eac54 is retained in archive/ai-overlord/source-before-pivot.tar. RUN integration, save compatibility, lifecycle ownership, and Nix practices remain relevant.

### Spatial foundation

- User-reported failure: switching an earlier game's artwork to Kenney's Roguelike Modern City assets caused a difficult refactor. This is user evidence, not a source-code audit of that project; do not request or reference the previous prototype.
- Required response: simulation data must be independent of artwork. Establish tile scale, footprints, explicit entrances, and connectivity before adding features.
- Verified implementation pattern: define footprints and entrance offsets in model tile coordinates; rotate both together; derive renderer positions from that model. Keep texture sizes and decorative offsets out of connectivity and persistence.
- Evidence: ten city model tests and integrated TypeScript builds pass. Rotated footprint/entrance geometry, occupancy, cardinal routes, shortcut metrics, refunds, clocks, roundtrips, and corrupt saves are checked independently of rendering.
- Preserve old saves unchanged; use a separate versioned namespace for incompatible city data. City saves include logical geometry, stable IDs, routes, progress, and both income/departure clocks. Browser verification confirmed the old save key survives city creation and reload.
- A host-first load can restore stale state while recent writes are still pending. Save timestamped envelopes, prefer the newer valid local/host snapshot, and serialize/coalesce host writes. The browser reload check must inspect the restored game and flush it again, not merely read an unchanged localStorage blob. Verified in local browser; cross-device clock skew remains a limitation of timestamp conflict resolution.
- Planned roundtrip driving time excludes departure waiting. Shortcut tests prove the metric falls from 10s to 6s and subsequent departures take the shortcut; current trips retain their valid routes. This is route optimization, not a congestion model.
- Derive map bounds from measured HUD panels and stage scaling. Browser checks covered touch placement, pointer road drawing, resizing to 320×640 and 1440×900, pause, and menu teardown. Very small screens fit the board but provide small tile targets; zoom/pan is a future usability improvement.

### Expandable map foundation

- Verified by 14 model tests: store logical buildable bounds on the city; expand bounds without translating existing buildings, roads, or trip paths. North/west growth uses signed tile coordinates while IDs and counters remain nonnegative.
- Validate placement, external entrance tiles, save array sizes, and trip paths against saved bounds, not initial renderer constants. Missing bounds migrate to the initial map; malformed bounds reject the save rather than silently clipping/resetting it. Tests include routing across the former boundary and saves with more than the old map's 224 road tiles.
- WIDTH/HEIGHT remain starter-size compatibility aliases; the integrated renderer and input hit-testing use city.map and signed world coordinates. Four pure camera tests check pan/zoom inverses and anchored zoom. Browser checks verify all-edge expansion, camera-preserved placement, building in negative coordinates, pan/pinch without construction, and live saved-town reload.
- Mask the camera world to the measured space between HUD panels. Keep captions and controls outside the camera transform; rebuild only visible terrain with a small scenery margin. Zoom changes the world transform rather than rebuilding every sprite.
- Defer single-touch construction until release or a deliberate road drag. A second touch claims a camera gesture, suppressing construction until all pointers release. Paused camera/construction edits need explicit Pixi render calls. Verified with browser touch input and a paused game; physical-device performance remains to be tested.

### Cold-start texture cache regression

- Camera integration called focusTown (and renderGround) before initCityArt created frame textures. The terrain cache then retained Texture.WHITE sprites when the atlas callback saw the same visible bounds. Panning could repair the scene and hide the first-load failure.
- Initialize atlas frames before initial camera rendering; invalidate the terrain cache whenever texture readiness changes, even if map/viewport bounds are unchanged. Scene readiness and camera geometry are separate cache dependencies.
- Reproduced white terrain on fresh phone and tall-window loads. The cold-render browser regression samples terrain pixels before any pan/zoom/resize and repeats in isolated contexts at three viewport sizes, then checks menu return. Interaction-only tests and absence of console errors do not prove the initial rendering is correct.

## Verified patterns

### Environment and builds

- Use Ubuntu/WSL with the repository's Nix flake. Run npm and rundot inside nix develop; avoid mixing Windows npm with WSL-installed dependencies.
- npm run dev includes the host setting needed for the current preview workflow. npm run build runs TypeScript checking then Vite. npm run deploy builds before uploading.
- The pinned RUN CLI needs native dependencies including ICU. The Nix derivation supplies them; no invariant-globalization workaround is required inside the shell.
- Verification: shell tool versions, flake evaluation, production build and local HTTP responses passed during setup. HTTP success alone does not verify visual gameplay or mobile behavior.

### RUN platform integration

- Preserve september-jam-barebones kit metadata in game.config.prod.json and rundot/kit.json. Existing game ID: l7mD5BHH8LslWkr5mC7d. Do not register a new game for each iteration.
- Routine uploads remain private. Public publication is a separate decision.
- CLI auto-enabled text generation on first deployment. rundot/textGen.config.json now explicitly disables it. The archived prototype did not need real runtime model calls; city simulation also has no runtime model-call requirement.
- Uploading a server configuration alone did not change the active private version's config ID. Deploying then verifying game info confirmed the active config. Verify active state, not just successful config upload.
- Consult installed CLI help: public documentation can describe older command names or config layouts.

### Game architecture inherited from the official starter

- React owns screens/HUD, Pixi owns simulation/rendering, and the shared store carries discrete events rather than per-frame React updates.
- Keep SDK boot and lifecycle ordering. Scenes own their ticker callbacks/display objects and clean them up on exit.
- Use the design-unit stage and resize hooks instead of hard-coded physical pixel positions.
- SDK failures must not prevent plain-browser play. Follow the existing save and lifecycle patterns; see CLAUDE.md for details.
- Historical, superseded by the city pivot: v0.1 traffic mechanics were implemented and covered by model tests. Those checks do not validate the new city simulation.

### Cross-model art workflow

- Grok Build's Imagine tools generated actual image assets inside its session image directory. In this environment, headless sessions repeatedly ended before their Execute-based copy/export step produced project files. Ask Grok to return the exact generated path and let the lead handle export and verification. This is an observed environment limitation, not a general claim about Grok.
- Inspect the actual generated image: Grok's verbal quality assessment did not always catch incorrect action direction or a villainous expression.
- Retain masters outside public and export production thumbnail as 512x512 JPG. Inspect small-size readability. User approval of art remains necessary; a successful generation is not adoption.
- Pass text-only briefs when source-image sharing has not been explicitly authorized. Do not silently send user reference files to external tools.

## Lesson handoff template

- Task / owner:
- Problem or observation:
- Proposed reusable pattern:
- Evidence and validation:
- Limits or uncertainty:
- Existing entry superseded (if any):
- Status: proposed / verified / superseded

## Historical v0.1 integration lessons (2026-09-05)

- Verified by model tests: resolve rotated controls at the input boundary once; collision simulation accepts resolved lanes and knows nothing about keyboard labels.
- Verified by integration review: agree shared board geometry and vehicle footprints before parallel implementation. Renderer bodies now match model dimensions (26x44, trucks26x68); decorative shadows are not collision promises.
- Verified by code review: reset renderer identities when restarting a fresh simulation; reused IDs must not retain old vehicle art.
- Verified by story integration: narrative copy must not report unmeasured outcomes. Claude's draft required editing before adoption.
- Proposed, not audio-tested: keep music's shared palette and motif while escalating rhythmic density rather than volume. Preserve space for gameplay cues and evaluate retry fatigue.
- Proposed, not playtest-proven: recoverable mistakes and short shifts may encourage mastery. Unit tests prove rules, not enjoyment. Household observations should drive the next balance pass.
## Historical emergency dispatch verification (AI Overlord)

- Verified by 18-test suite: ordinary mechanics still work; default no-input shift clears both emergency kinds without crashes; overlapping requests serialize with warnings; next dispatch waits through wreck recovery; closures and same-approach occupancy defer rather than discard emergency requests; restart isolates config and schedule.
- Browser check: mobile emergency warning visible, pause freezes countdown, automatic crossing completes with no input and no page errors.
- Scope: this automatic traffic-shift dispatch behavior is historical and does not define the future city service system. City ambulances must originate at actual hospitals.
- Historical shared pattern: safety guarantees belong in dispatch scheduling, not collision immunity. Ordinary player-controlled traffic can still hit an emergency vehicle. Keep warnings outside the general event-message slot so other notices do not hide the immediate hazard.