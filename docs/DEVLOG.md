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


## Gameplay order correction: collisions and hospital response before tutorial

User clarified that onboarding must teach collisions, how different vehicles respond, and hospital ambulance response. Serious accidents can cause deaths when response is late, and traffic needs diversion. This promotes hospitals/rescue into the next gameplay milestone and supersedes the lead's first-trip-only tutorial proposal. The user supplied earlier-project behavior as reference; no old code import is required.

Updated AGENTS.md, DESIGN.md, and CLAUDE.md. DESIGN.md distinguishes requirements from proposed vehicle rules, incident/deadline/recovery states, diversion controls, and staged acceptance criteria. Next dependency order is movement/queuing → collisions/closures/detours → hospital response → tutorial/missions. This turn updates design and instructions only; it does not implement or claim to verify those systems.


### Traffic controls are core gameplay

User further clarified that placing stop signs and traffic lights to maximize road throughput is a central optimization loop. Updated the design and instructions accordingly, superseding the suggestion to defer junction controls. Sign placement on approaches, junction-level signals, a few phase presets, clearance rules, emergency priority, and fair comparison metrics are proposed operational details, not finalized tuning. Tutorial lessons should let players observe and improve flow with these controls before layering on incident/ambulance challenges. Documentation only; implementation remains next.

### Initial traffic-flow slice and subscription collaboration

The latest scope narrows the first optimization phase to route shaping and junction controls. Collision/hospital response remains a follow-up before its tutorial lessons. The user explicitly invited installed Claude Code and Grok Build to share implementation work; the lead owns integration and verification. Claude is assigned the pure traffic model/tests; Grok provided a read-only critique of measurable optimization. Its key review concern is that an exclusive junction reservation makes signals pure delay unless compatible movements can share green. Completed-trip waiting alone also hides unserved demand, so current queues and connected homes must remain visible.

Added a Suno candidate brief in AUDIO-BRIEF.md for user-generated planning and commute music. No soundtrack adopted or audio service integrated.


The integrated slice now includes fixed-step queues, independent opposing lanes, safe junction exit reservations, all-way stops, three signal timing presets, and measured traffic feedback. Lead review added shared controllers for adjoining junction tiles, explicit E/W priority at unsigned intersections, a longest-stop readout, deterministic rolling-window boundaries, sufficient history capacity, and safe migration of legacy overlapping trips. Existing construction refunds, upright art, map expansion, save namespace, and RUN/Nix integration remain intact.

Local verification: 41 model/camera/integration tests, TypeScript/production builds, touch controls and save reload at 320×640/390×844/1440×900, shared-junction controls, cold terrain rendering, and existing expansion/pan/pinch checks. The compact HUD was corrected after a short-phone map-space failure. These checks establish behavior; real-device performance and household playtesting remain open. No deployment or publication performed.

### Destination demand, accidents, and emergency recovery

User approved the visit/capacity/park/earned-growth proposal and explicitly added collisions at uncontrolled junctions, fire/police/EMS recovery, and road diversion. Updated AGENTS.md, DESIGN.md, CLAUDE.md and implementation lessons. Preserved the starting work in a local archive before this slice; historical AI Overlord source, title artwork, RUN identity/save namespace and Nix tooling remain intact.

Claude Code implemented household needs, reserved visitor capacity, parked stays and returns, earned income, save migration, movement integration and construction protection. Grok Build generated the incident/dispatch draft, but its headless write step was cancelled. The lead recovered that draft, reviewed and integrated it, and added independent Codex incident tests. The temporary dispatch module was replaced before final verification.

Stores now serve available demand rather than forcing every home to tour every shop. Parks generate recreation trips and a bounded recent-recreation household income benefit. The map shows parked occupancy and inbound reservations. Hospitals, fire stations and police stations dispatch from their actual road entrances; crews travel, work and return. Real conflicting unsigned arrivals create warnings and accidents; stops/lights prevent that mechanism. Wrecks block road access until all required services finish. EMS deadlines record rescues or losses once, while road closures and connected detours redirect ordinary traffic.

Lead review fixed active-home/victim deletion, returning cars incorrectly reserving store space, unsafe route changes, immediate post-road-edit saves, invalid emergency references, a late-clock park save rejection, and an extra park payment at expiry. Working/waiting vehicles reserve their physical space; traffic alone retries routes, preventing duplicate incident retries from moving a responder across a closure.

Local verification: **87 passing tests**, TypeScript and production build pass. Real-module browser checks passed at 390×844, 320×640 and 1440×900; the final compact 320 pass leaves 194px of map height (390 leaves 309px). Existing touch controls/timing, cold terrain loading, all-edge expansion, pan/pinch, negative-coordinate building and save reload checks also pass. Build retains the existing large-chunk advisory; no deployment or publication occurred. Native-device performance, final balance, the expandable disconnected tutorial/skip flow, external-city traffic and missions remain future work.

## Working ON IT! release submission — 2026-09-09

- User approved the square title-art adaptation. Exported it as `public/thumbnail.jpg` (512×512 JPG); preserved the full-resolution candidate and previous AI Overlord thumbnail under `docs/artwork/working-on-it/`.
- Verified all 87 tests and TypeScript/Vite production build; the existing large-chunk advisory remains. Updated the RUN description to the current city/traffic sandbox and preserved game ID `l7mD5BHH8LslWkr5mC7d` and disabled text generation.
- Deployed version **1.4.0** with release notes and requested public visibility through rundot inside nix develop. RUN returned **review**, and `game set-public --version 1.4.0` confirmed automatic publication after platform review. Submission succeeded; public listing is not yet verified.
- User describes the competition as a $1,000 winning reward and over $3,000 in total prizes. This is user-supplied context, not verification of contest rules or entry eligibility.
- Clean guest-browser checks of the share and review routes redirected to RUN's catalog without mounting the game. The review route briefly supplied the correct game page title, but hosted gameplay could not be verified in that guest session. Local tests/build passed; platform review and hosted play remain outstanding.

### Back to Work association check

- `nix develop -c rundot jam promo` currently reports that Working ON IT! is not entered in any jams. Publication remains under review.
- Official event FAQ at https://events.run.world/events/september-2026-jam/ says eligible official-template games enter automatically once public and approved, usually within about five minutes. No separate submission form. This repository retains `september-jam-barebones` in both kit/config files; CLI-created official-template games are explicitly included.
- Recheck `rundot jam promo` after approval; local kit metadata alone is not proof of a recorded entry. Public submission deadline: September 14, 2026 at noon PT; judging closes September 18 at noon PT.

## 2026-09-09: approved emergency-service buildings

User selected the locally composed fire/police/EMS artwork in `docs/artwork/service-buildings/`. Installed all twelve side-specific sprites in the existing atlas and routed station rendering to them. Fire has a brick tower and engine bays, police a blue portico and shield, and EMS pale wings and a teal medical cross. Preserved footprint/entrance geometry, upright orientation, dispatch and saves. Moved station names above the artwork, with north-side names above their access tiles to leave arrows visible. Editable source and original review images remain preserved. Local production build and browser verification recorded in the artwork folder; this change has not been uploaded to RUN.

## 2026-09-09: emergency vehicles and priority driving

User approved distinct police/EMS/fire sprites and requested response driving with access to opposing lanes. Installed all twelve directional sprites and added real reserved passing, civilian yielding, safe signal/stop exceptions including station departures, persisted lane transitions, and ordinary return driving. Independent review caught same-direction yielding that could trap responders; corrected it and added progress checks. Passing is conservatively limited to six straight tiles with a safe merge, including an empty intersection when needed. Committed corridor edits briefly wait.

Verification: 102 simulation tests, production build, and phone/desktop browser save-and-resume/pass checks. Art sources and gameplay screenshots are in `docs/artwork/service-vehicles/` and `docs/emergency-driving/`. This local change has not been uploaded to RUN.

## 2026-09-09: direct building tools and optional opening missions

Integrated Claude Code's direct construction palette and compact HUD with Codex's saved four-job growth list, recognition, spending report and contextual manager/crew accident guidance. Grok Build and Claude reviewed the direction and explicitly corrected their interpretation of tutorial demand limits after user feedback. Clinic is the visible EMS tool label. Every tool remains available and early service construction carries no penalty; costs and income are unchanged.

111 simulation tests and the TypeScript/production build pass. Browser checks cover 320×640, 390×844 and 1440×900 tool selection, pause/rotation/pan/report, mission progress, guidance hide/reload/reopen, accident advice and modal click isolation. Evidence is in docs/interface-missions/. Staged tutorial problems and optional free worked solutions are accepted next teaching direction, not implemented by this mission foundation. External-city growth, tutorial skip/connection and future traffic tools remain pending. This update has not been uploaded to RUN.

### Detour marker orientation fix — 2026-09-09

Road-closure barriers now span the connected road axis: vertical on east–west roads, horizontal on north–south roads, and both axes at bends/junctions. This corrects the always-horizontal graphic without changing routing or saves. TypeScript/production build passed; a local browser fixture visually verified both straight orientations and a closed crossing with no page errors. Screenshot: docs/traffic-flow/detour-orientation.png.

## 2026-09-09: version 1.5.0 update submitted

User explicitly requested publishing the accumulated update. Re-ran all 111 simulation tests successfully; the current detour-fixed production build had passed TypeScript/Vite and visual browser verification. Uploaded dist through rundot with a Minor version bump, public visibility requested and release notes covering direct tools, optional missions, service artwork, priority response driving and detour orientation. Existing game identity and server config were preserved.

RUN returned success, version 1.5.0, visibility review. Explicit set-public for 1.5.0 confirmed automatic publication after review. Tags showed the previous 1.4.0 approved and public; it remains the live public version while 1.5.0 awaits review. Public URL: https://w.run/melvynandrew99/working-on-it . Hosted 1.5.0 gameplay was not independently verified.

## 2026-09-09: guided tutorial and autonomous outside drivers

Implemented seven saved tutorial lessons, optional transactional free examples/practice, title/in-lesson skip, first-active-incident pause/guide and a safe-crossing learning alternative. Practice generates real household traffic and natural minor/serious/fire incidents; real station-origin crews perform rescue/clearance. Existing driver destination choice, queue/control/reroute and response states supply NPC behavior.

Added explicit saved boundary-road connection and bounded growth-driven outside visitors using shared routing, parking, emergency and payment systems. Skipping bypasses tutorial prerequisites for connection; home/store players can also choose connection early. No connection happens automatically, and existing towns/progress persist. Future architecture unlocks, bus stops, road widths and one-way roads remain later scope.

Verification: 135 simulation tests pass, TypeScript/production build passes, and browser flows pass at 320×640, 390×844 and 1440×900 with readable 44px targets/17.6px text, no overflow or page errors. Natural first crash pause and saved explicit outside arrivals verified. Final prevention-acknowledgement guard separately regression-tested against an active real wreck. See docs/tutorial/README.md and screenshots. This change has not been uploaded to RUN.

## 2026-09-09: tutorial moved into gameplay; interface and rewards rebuilt

User rejected hidden teaching and cluttered green controls. Rebuilt gameplay chrome with a persistent nonmodal tutorial coach, contextual first-building actions, a separate rewarded mission card, compact categorized tool dock and navy/cyan/yellow styling. Map and full reports remain optional. First crashes now use inline urgent teaching with required-service actions; no duplicate modal/toast covers the scene. Existing sprites and autonomous simulation are preserved.

Explicit mission claims grant100/200/200/400 once, with saved receipts and safe migration; recurring visit income and construction prices are unchanged. Prepared docs/AUDIO-CUE-LIST.md for the user's concurrent music/Splice production. No new sound assets installed.

Verification:138 simulation tests and final production build pass. Phone/desktop browser flows passed320/390/1440 widths, including actual building with visible teaching, visit-driven progress, exactly-once UI claim/reload, tool/keyboard navigation, map/report/expansion, exit/connection and natural crash inline response. Final map heights229/425/481px with109px dock; readable targets/text. Screenshots and decisions:docs/interface-redesign/. This local update has not been uploaded to RUN.
## 2026-09-09 — Emergency recovery first slice

Implemented the next requested backlog item locally: emergency diversion access, alternate scene approaches, routes around stopped bodies, longer reserved straight passes, persisted waiting-lane geometry and exclusive scene arrival. Nine independent recovery regressions contribute to 170/170 passing tests; production build and 390/1440 live browser/save checks pass. Preserve rescue deadlines, fatalities, towns and progress. See docs/emergency-recovery/README.md for evidence and remaining blocked-return, legacy-heading and clinic-reassignment limits. This update is not deployed and does not claim the user's exact save is fixed.
## 2026-09-09 — Practice removal delivered locally

Installed Claude Code removed both tutorial Practice buttons; Codex retired the runtime placement action and generalized safe player-built lesson progression while preserving historical towns/receipts. 171 tests, production build and phone/desktop UI/save checks pass. See docs/practice-removal/README.md. The mayor Help/Later proposal flow remains queued; no automatic replacement district and no deployment.
## 2026-09-09 — Tutorial toast and real-button highlighting

User requested prominent mobile-style control discovery. Codex implemented a yellow callout above the objective plus category/tool pointers and pulsing outlines after installed Claude reached its session limit without delivery. Home/Store/Road targets follow actual placement/connectivity, support live free prices, dismissal and reduced motion, and yield to dialogs/emergency priority. Browser placement checks pass at 320,390,1440 wide/forced portrait; production build passes. See docs/tutorial-highlights/README.md. Local only, no publication.

## 2026-09-09 — v0.1 milestone uploaded as RUN 1.6.0

User authorized uploading the accumulated tutorial/traffic build before moving development to v0.2. `rundot deploy --bump Minor --public` succeeded for existing game l7mD5BHH8LslWkr5mC7d, version1.6.0, visibility review. Release notes: docs/releases/v0.1-changelog.md. No server config changes were detected. The approved thumbnail and game identity were preserved.

Final status check: private/review tags point to1.6.0; public still points to1.5.0. Publication was requested with the upload, but1.6.0 is not yet verified live. Public URL: https://w.run/melvynandrew99/working-on-it . No hosted gameplay verification of1.6.0 was performed.

After the user reported a branch swap, confirmed main at e099d45 (merged v0.1), current queue/EMS/control-cost changes present, all192 tests passing, and a fresh production build passing. User confirmed no duplicate upload was needed if the earlier upload had finished; no second version was created. Future work moves to the user's v0.2 milestone, distinct from RUN's platform version sequence.

## 2026-09-09 — Main release pipeline and manual RUN publishing

Added .github/workflows/release.yml: main pushes install locked dependencies through Nix, run tests/build, package a checksummed artifact and create a GitHub release tagged by workflow number/commit. Manual workflow_dispatch uses the same build and optionally publishes the exact artifact to existing RUN identity, with selectable platform bump. Normal main pushes do not publish RUN. Only release/publish jobs get contents:write. A repository RUNDOT_API_KEY secret is required only for publishing; local credentials are not copied.

Pinned action commits, preserved source identity/checksum, immutable release assets on rerun, and persisted RUN attempt/success receipts prevent blind duplicate uploads after uncertain failures. Read docs/releases/PIPELINE.md for operation and recovery. Local validation passed: clean npm ci,192 game tests, six mocked publishing tests, production build, actionlint and shellcheck. A hosted GitHub Actions run has not been verified.
