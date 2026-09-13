<!-- Latest user approval: implement destination visits/capacity, parks/earned growth, accidents, fire/police/EMS dispatch, and road diversion. Prior deferred/proposal-only labels for these systems are superseded. Lead coordinates bounded specialists and verifies locally; public release is now authorized once the user selects a Working ON IT! thumbnail. -->
<!-- Latest scope: first validate route shaping + junction controls with real queues and measured traffic feedback. Collision/hospital response follows, before its tutorial lessons. Use installed Claude Code/Grok Build for bounded delegated work; lead reviews and verifies locally. User generates Suno audio from prompts. -->
# Current project direction

Latest (2026-09-10): the sandbox remains the main game; small Chess.com-style Challenges develop alongside it using the real simulation. Read `docs/challenges/PLAN.md` (including its corrected scope section) before challenge work. The manager is referred to as The Man (his MANAGER sign lost its "AGER"). Radio unlock and monetization directions are recorded in `docs/DESIGN.md`. The title-screen W-ON-IT radio (`src/audio/radio.ts`, reusable `src/ui/CityRadio.tsx`) implements free, Level 25 and purchase unlock types; purchase flows are not implemented.

Latest progression direction: civic objectives build recognition toward the manager's mayoral ambitions; silly successes can cause understandable downstream traffic problems. Deliver a short jam objective arc with room for post-jam missions and preserved city progress. Read `docs/DESIGN.md` under “Objectives: recognition on the road to City Hall” before mission work; example missions and numerical rewards remain proposals.

Accepted character/tone direction: cheerful competence and inflated self-importance. The city manager sincerely helps commuters and takes enormous credit for small accomplishments; crews provide dry reality checks. Helping people is the gameplay achievement; his appetite for credit at the expense of other people's pain is the joke. He welcomes their misery as a chance to be indispensable and admired, without recognizing the selfishness. Do not reduce this to harmless vanity. His selfishness is a lack of self-awareness, not malicious or villainous: he cannot read the room and does not notice how his excitement about being needed lands with people in pain. He does not wish them harm or deliberately create suffering for credit. Read the tone section of `docs/DESIGN.md` and the user-supplied theme/credits song in `docs/WHAT-A-JAM.md` before writing character feedback or audio briefs. Musical references to future services do not expand current gameplay scope.

The implemented destination/emergency slice uses `cityVisits.ts` for household demand, visitor reservations, parked stays and recreation income, `cityIncidents.ts` for collision risk/dispatch/work/outcomes, and `cityTraffic.ts` for all physical movement and route retries. `cityModel.ts` remains the logical construction/save boundary. Read `docs/destination-emergency/README.md` for controls and verified scope. Keep these systems independent of artwork.

Read AGENTS.md, docs/DESIGN.md, and docs/IMPLEMENTATION-LESSONS.md first. The September 8, 2026 pivot replaces AI Overlord with a city-building and traffic optimization game. The first milestone is homes, stores, roads, visible connected trips, and a forgiving economy. The old gameplay and cover brief are historical. The approved title is Working ON IT!, with tagline “Fix the commute. Take the credit.” City Workshop is the former working label.

Keep simulation geometry independent of artwork: tile scale, rotated footprints, explicit entrances, and cardinal road connectivity are the model contract. Preserve RUN SDK initialization/lifecycles, local/RUN saves, and Nix tooling. Run npm and rundot inside nix develop. Preserve the existing save key and RUN game identity during this pivot; display-title changes do not authorize abandoning old saves. Public release on run.world is authorized once a user-selected Working ON IT! thumbnail is ready. Use rundot inside nix develop, verify the build and release, and preserve the existing RUN identity. The historical AI Overlord thumbnail does not satisfy this condition.

The reference below describes the inherited starter, not the current gameplay implementation. Demo field names, scene filenames, and sample verification steps are historical examples; inspect current source before adapting them. The pre-pivot source is preserved at archive/ai-overlord/source-before-pivot.tar (84eac54).

Latest playtest discussion: destination variety, parked visits, capacity, a park, and earned growth. Read the proposed next slice in DESIGN.md; these mechanics are not implemented yet.

## Upcoming tutorial/progression requirement

Read the tutorial and external-city sections in AGENTS.md and docs/DESIGN.md before extending mechanics. Teach in an expandable disconnected town, offer connection to enter the main game, and support skipping directly into main play without tutorial gates. Persist progression separately from artwork and keep completed/skipped players out of forced re-onboarding when lessons change. Design and verify collision/queuing, placeable stop signs and traffic lights with measurable throughput effects, distinct vehicle behavior, incident rerouting, and hospital-origin ambulance dispatch with serious-accident deadlines before authoring the tutorial. The first-trip-only tutorial proposal is superseded. The tutorial and external-city flow remain planned. The approved destination/emergency slice implements the underlying visits, accidents, fire/police/EMS dispatch, and diversion first.

## Active city milestone

- `src/game/cityModel.ts` owns logical tiles, rotated footprints, entrances, routes, economy, and save validation; it imports no artwork or renderer.
- `src/game/cityMap.ts` owns expandable bounds; `cityCamera.ts` owns renderer-independent pan/zoom transforms; `cityControls.ts` connects HUD commands to the mounted scene.
- `src/game/cityScene.ts` drives the model, renders its geometry in Pixi, and owns construction input and scene cleanup. `GameCanvas.tsx` mounts this scene.
- `src/state/store.ts` carries construction tools and discrete HUD reports. `src/state/save.ts` persists the city to a separate namespace using timestamped local/host snapshots and serialized host writes.
- `npm test` currently runs 41 construction, camera, traffic, and integration tests. Current local run instructions and controls are in README.md.
- Old gameplay code is in the pre-pivot source archive. The starter file list and recipes below describe the original template, not current demo/score fields.

# Minimal Template: Pixi.js v8 + React 19 + Tailwind v4

The genre-neutral starting point in this jam kit: platform wiring (SDK
boot, lifecycles, design-unit stage, saves) plus a throwaway demo scene,
and nothing else. Start here when your game is not a tower defense. The
kit's tower defense template (standalone mirror:
github.com/series-ai/september-jam-tower-defense) is built on exactly these patterns and
contains working systems to copy when you need them: audio buses +
settings screen, all-time leaderboards, a persistent meta economy, and
rewarded ads (which came from the npm package
`@series-inc/run-game-helpers` — a copy-in library that also has daily
rewards, IAP, quests, tutorial, and more).

## File Structure (as-shipped)

- **src/main.tsx** — Entry point. The boot sequence, numbered 1–8; the ORDER matters (SDK init → save load → React mount → boot-cover lift → asset warm → menu → lifecycles → fire-and-forget analytics). Add work at the `ADAPT:` points; don't reorder.
- **src/sdk/runSdk.ts** — `initSdk()` (awaits `RundotGameAPI.initializeAsync()`, never throws — local dev without the host runs SDK-less) and `registerLifecycles()` for all six host hooks. `sdkReady()` tells you whether the host answered.
- **src/state/store.ts** — Tiny external store (`useSyncExternalStore`) bridging game code ↔ React. `store.patch({...})` from anywhere; `useStore(selector)` in components. Exports the `AppState` type — add game-facing UI state fields here.
- **src/state/save.ts** — Persistence, wired end to end: write-through to RUN `appStorage` (host) + localStorage (always), loaded once at boot (main.tsx step 2), flushed on onSleep/onQuit. `recordBest()` is the demo mutation (Hud's Menu button calls it); extend `SaveData` + `parse()` with your fields and follow its shape for your own mutations. Never throws.
- **src/assets/manifest.ts** — Asset list in two tiers: `critical` (awaited by the loading screen) and `deferred` (loads in background).
- **src/assets/preload.ts** — `warmAssets(onProgress)` via Pixi `Assets` bundles.
- **src/game/pixiApp.ts** — Pixi v8 `Application` factory: DPR cap, autoDensity, transparent canvas. Pixel-art switches are marked `ADAPT:` here.
- **src/game/stage.ts** — Design-resolution stage. Scenes position on `stage.root` in design units (`DESIGN_WIDTH` 720); `stage.designHeight()` gives current height in units (1280 at 9:16, up to ~1560 on tall phones). `stage.onResize(cb)` for re-anchoring.
- **src/game/GameCanvas.tsx** — React ↔ Pixi boundary. StrictMode-safe mount/destroy; freezes the ticker while `store.paused`.
- **src/game/demoScene.ts** — Throwaway demo (bouncing sprite → store → HUD). Replace it, but keep its `createXxxScene(app, stage) → Scene` contract (`{ destroy() }`).
- **src/ui/** — `App.tsx` (phase router: loading → menu → playing), `LoadingScreen.tsx`, `MainMenu.tsx`, `Hud.tsx` — Tailwind reference screens.
- **src/styles/app.css** — Tailwind import, `@theme` palette, device-frame CSS (`#app-frame`), safe-area utilities.
- **index.html** — Locked mobile viewport, inline boot cover with 4s safety fade (never a stuck black screen), React root `#root`.
- **public/** — Small static assets (<100KB). `public/images/placeholder.png` is the demo sprite.
- **public/cdn-assets/** — Large assets deployed to CDN. Load at runtime via `RundotGameAPI.cdn.fetchAsset('name.png')` → blob URL → `Assets.load({ src: blobUrl, loadParser: 'loadTextures' })` → revoke the blob URL.
- **public/thumbnail.jpg** — Placeholder game tile. MUST be replaced with real art (exactly 512×512 JPG) before deploying; `rundot deploy` rejects placeholders and wrong dimensions.
- **vite.config.ts** — `base: './'` (required), `rundotGameLibrariesPlugin()` + React + Tailwind plugins, esnext target (SDK and boot path use top-level await).
- **game.config.prod.json** — Ships pre-baked with `kitId: "september-jam-barebones"` so `rundot init` can attribute the game to this kit and auto-enter it in the jam; do not remove or blank out `kitId`. `rundot init` fills in the rest (`gameId`, `keywords`) in place. This template renders its own loading screen, so init without `--uses-preloader`.

## Key Patterns

- **Layering** — React owns navigation (which screen exists); Pixi owns the game. Both live inside the CSS device frame `#app-frame`, so canvas and DOM UI always align. UI overlays are `pointer-events-none`; controls opt back in.
- **Game → UI** — `store.patch()` on discrete events (score, wave, popups), never per-frame. **UI → game** — a store field the scene reads, or a direct function call into the scene module.
- **Coordinates** — Never raw pixels. Width is always 720 design units; anchor vertical layout off `stage.designHeight()` and re-anchor in `stage.onResize()`. Keep must-see content in the top 1280 units or bottom-anchor it. Landscape games invert the pattern (see `ADAPT:` in stage.ts).
- **SDK posture** — Every `RundotGameAPI` call can reject; everything is try/catch'd, and the game must boot and run in a plain browser without the host. `initSdk()` runs before any other SDK call.
- **Lifecycles** — onPause/onResume: freeze/unfreeze (store.paused → ticker). onSleep: persist progress (the reliable hook). onQuit: last-chance flush (may not fire on hard close). Never fire fresh SDK RPCs from sleep/quit handlers.
- **Assets** — Bundled assets go in `src/assets/manifest.ts` (critical vs deferred) and are warmed at boot with progress. CDN assets (`public/cdn-assets/`) load on demand via `RundotGameAPI.cdn.fetchAsset()`.
- **Embedded libraries** — `react`/`react-dom` are pinned to exactly 19.2.4 so `rundotGameLibrariesPlugin()` externalizes them at build (host/CDN serves them). Do not bump React casually: a version mismatch silently falls back to bundling. `npm run build:bundled` forces a standalone bundle. Pixi is always bundled.
- **Dependency gotchas** — `firebase` must stay in `devDependencies`: the SDK dynamically imports `firebase/app` without declaring it, and removing it breaks `vite build`. The `allowScripts` field in package.json silences npm's install-script warnings; keep entries name-only (unpinned) so dependency bumps don't re-trigger them.

## What to Modify

- **New game logic** → New scene modules in `src/game/` following the `createXxxScene(app, stage) → { destroy() }` contract; swap them in `GameCanvas.tsx`. Position everything in design units.
- **New small assets** → `public/images/`, listed in `src/assets/manifest.ts` (critical if needed before gameplay, deferred otherwise).
- **New large/CDN assets** → `public/cdn-assets/`, loaded via `RundotGameAPI.cdn.fetchAsset()` (pattern in its README).
- **UI screens / HUD** → React components in `src/ui/`, routed by phase in `App.tsx`; style with Tailwind; game-facing state through `store.patch()`.
- **Title** → `<title>` in index.html + heading strings in `LoadingScreen.tsx` / `MainMenu.tsx` + `name` in package.json. City persistence uses `city-workshop:city:v1`; historical `ai-overlord:traffic:v1` is untouched. Future display-title changes must not discard either save namespace.
- **Palette** → the `@theme` block in `src/styles/app.css`.
- **Orientation** → portrait is default. For landscape: `rundot init --orientation Landscape` and adjust the 9:16 media query in `app.css` (see `ADAPT:`).
- **Save/persistence** → extend `SaveData`/`parse()` in `src/state/save.ts` and patch the new fields in `main.tsx` step 2. The boot load and lifecycle flushes are already wired.
- **Platform systems (audio, leaderboards, meta economy, ads, ...)** → copy working implementations from the jam kit's tower defense template (github.com/series-ai/september-jam-tower-defense), or from the `@series-inc/run-game-helpers` npm package (daily rewards, IAP, quests, tutorial...). Copy the files in — never import that package at runtime.
- **Game config (resolution, DPR, pixel-art)** → `DESIGN_WIDTH` in stage.ts (keep 720 unless art dictates otherwise); DPR cap / texture settings in pixiApp.ts.

All intended edit points carry `ADAPT:` comments — search the source for `ADAPT:` for the full list.

## UI Copy Style

- Never use em dashes (—) in player-facing text. Use commas, parentheses, or separate lines instead. (Code comments are exempt.)
- Keep instructions short and imperative, one idea per line.
- Minimum text size: 1.1rem (~17.6px). Never render player-facing text smaller unless explicitly asked, it is too small to read on most mobile devices. Tailwind's text-xs/text-sm are both below this floor; use text-[1.1rem] or larger instead.

## AI Agent Recipes (complete checklists for common requests)

After ANY recipe, run `npx tsc --noEmit` — the compiler catches leftovers (`noUnusedLocals` is on, so dead imports fail the build).

**"Replace the demo scene with my game"**
- Create `src/game/yourScene.ts` exporting `createYourScene(app, stage)` that returns `{ destroy() }` (remove the ticker callback and display objects there). Move the `Scene` interface into it — it currently lives in `demoScene.ts`. Position everything in design units.
- `src/game/GameCanvas.tsx`: update the `createDemoScene`/`Scene` import and the `createDemoScene(app, stage)` call.
- Delete `src/game/demoScene.ts`.
- `src/state/store.ts`: replace the demo `score`/`best` fields with your game's UI-facing state; update their readers — `src/ui/Hud.tsx` (shows `score`, records the best on its Menu button) and `src/ui/MainMenu.tsx` (best readout, `score: 0` reset on Play).
- `src/state/save.ts`: replace `best` + `recordBest()` with your persisted fields and mutations; patch them into the store in `main.tsx` step 2.
- Keep the patterns: store patches on discrete events only (never per-frame), and the scene destroys everything it created.

**"Add a persisted field (wallet, unlocks, settings, stats...)"**
- `src/state/save.ts`: add the field to `SaveData`, `DEFAULTS`, and `parse()` (validate — corrupt or missing input must fall back to the default), plus a mutation that updates `data` and calls `flushSave()`, following `recordBest()`'s shape.
- If the UI shows it: add it to `AppState` in `src/state/store.ts` (interface + initial state) and patch it at boot in `main.tsx` step 2.

**"Add a screen (settings, shop, credits...)"**
- `src/state/store.ts`: add the phase to the `phase` union.
- Create `src/ui/YourScreen.tsx`; route it in `src/ui/App.tsx` (`phase === 'yourscreen'`); add an entry button that patches `phase` (e.g. in `MainMenu.tsx`) and a back button that patches it back.
- Follow the UI Copy Style rules below; scrollable lists need `touch-pan-y` (the app frame locks `touch-action` for game input).

**"Rename the game"** — Update display metadata in `<title>` in index.html, headings in `MainMenu.tsx` + `LoadingScreen.tsx`, and `name` in package.json as appropriate. Retain the current city save namespace and RUN identity on future renames; preserve the historical traffic save separately.

**"Add audio / leaderboards / rewarded ads / a meta economy"** — copy the working system from the jam kit's tower defense template (github.com/series-ai/september-jam-tower-defense; it documents its own file list in its CLAUDE.md), or copy modules from the `@series-inc/run-game-helpers` npm package. Copy files in; never import that package at runtime.

## Verification (after scaffolding a game from this template)

- `npm install` clean; `npm run dev` boots with no console errors (black cover → loading bar → menu; no white flash, no stuck black screen).
- Play → scene runs; HUD reflects store updates; Menu round-trips destroy the Pixi app cleanly (no WebGL context warnings).
- Best bounces shows on the menu after a session and survives a page reload (save round-trip working).
- Across device sizes in the device toolbar, content stays proportional (design-unit stage working); landscape letterboxes.
- `npm run build` passes (it type-checks first); `npm run preview` serves a working game; `dist/index.html` asset URLs start with `./`.
- Before first deploy: real 512×512 `public/thumbnail.jpg`, and `rundot init` has been run (it fills in `game.config.prod.json`, keeping the baked-in `kitId`).

## Shared engineering memory
Read docs/IMPLEMENTATION-LESSONS.md before implementation. Return proposed lessons with evidence and uncertainties at handoff; the lead maintains the canonical record. User intent is in AGENTS.md and gameplay direction in docs/DESIGN.md.

## Tutorial and external traffic module additions

`cityTutorial.ts` owns saved optional teaching observations, real practice placement and transactional free assistance. `cityExternal.ts` owns explicit saved gateways and bounded outside arrivals; outside trips use existing movement, incidents and visits with a gateway origin instead of a household. `cityModel.ts` validates both and advances them with real traffic ticks. `TutorialPanel.tsx` shares the mission dialog, and scene commands apply changes/focus/pause/save. Read docs/tutorial/README.md before changing lessons or traffic demand; prior deferred tutorial/external labels are superseded.
