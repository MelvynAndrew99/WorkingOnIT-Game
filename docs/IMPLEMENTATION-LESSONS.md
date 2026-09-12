# Shared implementation lessons

## Road transitions must fit the visible vehicle (2026-09-11)

- A double-width rectangle and isolated markings do not communicate a lane transition. Share pavement contours with display interpolation, remove the rectangular underlay, and match the source atlas curb width/colour. Check both orientations and offsets.
- A lone aligned section has no full-width through-lane length; render it as a connector. Preserve full turning pavement for a very short offset dogleg rather than forcing an S taper that puts tires onto grass. Real side junctions and building entrances also need their apron.
- Inspect exact paused vehicle samples as well as empty-road screenshots; moving simulation can advance a supposedly fixed pose before capture. Geometry tests should verify continuity, opposing lane separation and unchanged saved state.


## Paired carriageways and timed topology edits (2026-09-11)

- Adjacency cannot distinguish a median from a street. Shared paired-road topology must drive pathfinding, weighted snapshots, physical movement and rendering. Include both narrow-end offsets and rotations in actual return-route tests; retain return-reachability checks whenever any directed facility exists, not just manual one-way metadata.
- Multi-tile junctions need reservations spanning their full crossing/exit, including departures originating inside an extended junction. New departures or replans must not reserve an active work area even when their first tile is outside it. Verify physical service journeys and mid-motion reload, not graph reachability alone.
- Complete timed edits outside a cached simulation-index scope, then rebuild topology and invalidate the static visual cache together. Save exact payment provenance and restoration state; duplicate or conflicting metadata must reject rather than silently change directions.
- A refreshed source snapshot can leave an already-running Vite server serving timestamped modules alongside fresh bare imports. Restart the isolated server before final UI automation; a second store instance otherwise falsely reports missing construction. Keep world-space preview text readable at narrow scale, and inspect the actual desktop controls after adding rotation rows.
- Evidence and limits: [four-lane delivery](roadworks/FOUR-LANE-IMPLEMENTED.md), 48 model test files, build and desktop/narrow controls. No performance or final balance conclusions follow from these functional checks.

## Saved-city troubleshooting workflow (2026-09-10)

User explicitly requests reusing the successful full-town debugging process for future issues. Follow [the saved-city troubleshooting brief](SAVED-CITY-DEBUGGING.md): collect diagnostics plus the complete city save, preserve the original, reproduce with the real simulation in isolation, trace actual blockers, and retain regression coverage including reload and preservation checks. Diagnostics alone are not a full save. Explain that browser `copy()` returning `undefined` is normal. Never reset or modify the player’s active town to obtain a reproduction; distinguish verified model recovery from active-browser recovery and publication.


## UI verification budget (2026-09-10 user decision)

Default to two representative layouts, desktop and narrow. Expand coverage only for a concrete issue or task-specific need, explaining why. Earlier multi-size test records document completed work; they do not mandate repeating those matrices. Continue checking actual interaction and screenshots within the selected layouts.

## Integrated UI and modal precedence (2026-09-10)

- Let briefing dialogs own modal interaction while simulation is paused. A PauseMenu driven only by `paused` covered the mayor's funding acknowledgement. Observe other open dialogs and queue PauseMenu until they close, without silently resuming. The real two-expansion tutorial reproduced the blocker and verifies the correction.
- Keep mission headings and actions anchored; scroll only longer task copy and secondary details. Measure two-line buttons as well as nominal 44px controls. Reusing the reserved feedback band for tutorial guidance reclaimed narrow map space without reducing type or targets.
- Run final browser checks against an isolated source snapshot. Editing verification/docs in the active Vite tree reloaded a long tutorial test and invalidated its imported state handles. Full desktop/narrow pointer-built tutorial, real EMS clearance/outside arrivals, saved continuation, 232 tests and production build pass; see [UI-05](ui-overhaul/UI-05.md). Physical-device comfort remains unverified.

## Land progression and sequential dialogs (2026-09-09)

- Save expansion entitlement separately from geometry. Spend only after a valid successful edge expansion. Verify earning through real household visits, monotonic receipts after later road edits, cash-claim independence and reload. Extending the active tutorial must not reactivate a completed historical tutorial.
- Arrange compass buttons spatially and verify their bounding boxes alongside actual changed map coordinates; labels alone do not establish correct orientation.
- Reusing a native dialog for an automatically opened follow-up can let the previous asynchronous close event acknowledge the new speech before the user reads it. Separate dialog ownership fixed the observed funding-speech race. Check actual opening, Escape/button acknowledgement and no repeat after reload.
- Evidence:185/185 model suite, production build,320/390/1440 browser checks in docs/land-progression/README.md. Milestone and growth pacing still require playtesting.

## H-road guided progression (2026-09-09)

- A popup is not the requested tutorial scenario. Verify fresh-game world geometry and player-created first buildings, then the complete progression, not just the dialogue component.
- New saved scenario metadata isolates staged tools from existing towns. Guard model mutations as well as dock buttons/mission shortcuts; Skip releases gates without deleting construction. Inherited roads record paid0.
- Initial natural-collision experiments failed for legal placements and timing variants. The user explicitly approved a scripted impaired-driver event; the final implementation uses a real approach driver and ordinary incident/dispatch state with a persisted one-time cause. No failed timing workaround or altered driving speed was retained. Do not describe that event as a natural conflict or imply controls prevent impaired driving.
- Guide bypass, diversion and final control toward the same incident junction. Independent tests caught an upper-junction event invalidating the advertised bypass and unrelated controls/closures incorrectly satisfying objectives.
- Verify actual starting-money and waiver progression through real dispatch/scene clearance, not only a rich test fixture. Browser imports must resolve the module already loaded by Vite: raw paths can instantiate a second store when HMR URLs differ and falsely report an empty town after successful placement.
- Evidence: docs/h-road-tutorial/README.md, full178 model suite, starter/browser checks. Physical-device balance and comfort remain playtest work.

## Manager briefings (2026-09-09)

- A successful specialist process exit is not a delivered file. Grok's first run wrote nothing; a bounded text-only recovery returned the actual component/CSS for lead integration. Preserve authorship and distinguish lead testing from provider output.
- Keep dialogue dismissal, tool selection and objective completion separate. A parent pauses the city and selects tools; the presentational dialog never mutates simulation. Label hypothetical briefing contexts when the player's crossing is safe.
- Verified with real mounted UI at320×640,390×844 and1440×900: paused city unchanged, Escape returns focus, Road selected without placement, tutorial stays pending. This does not implement or verify the later-level objective-deferral system. Evidence: docs/manager-popup/README.md.

## Tutorial control locators (2026-09-09)

- Derive contextual construction targets once for both the first-visit objective and actual dock locator. Keep the currently visible category distinct from the selected tool: browsing another shelf should highlight the path back to the target rather than forcibly switching shelves.
- Put interactive callouts in the measured footer/rail flow, so the renderer's existing resize observer excludes them from map input. Verify real pointer placement after the instruction/target changes, including a narrow phone and forced portrait.
- Decorative CSS generated content can change a button's accessible name. The first category test exposed this with the pointer marker; explicit category aria-labels preserve the original name. Reduced motion removes pulse while retaining the visible locator.
- Evidence: isolated browser flow covers Home/Store/Road placement, target/category changes, modal suppression, dismissal, live waiver prices, skip and four frame configurations. No model behavior was changed. Installed Claude reached its session limit; Codex delivered the UI, so do not attribute these edits to Claude.

## Retiring automatic tutorial construction (2026-09-09)

- Remove the exposed UI action and guard the old model command before any mutation; stale clients must not still stamp construction. Retain historical geometry and payment/learning receipts independently of whether creation remains available.
- Scenario removal needs both historical-save tests and an end-to-end player-built progression test. Verified by an earned-visit → controlled-crossing acknowledgement → actual bypass sequence, without crashes or invented rescue counters. Natural incident/dispatch coverage and legacy zero-refund accounting remain separately tested.
- Keep safe-design acknowledgement lesson-specific and unavailable during active incidents. It can satisfy a learning explanation without recording operational rescue success. Bypass checks should examine the relevant crossing rather than unrelated trips.
- Evidence: installed Claude's UI edits reviewed and integrated with Codex model changes; independent tests, 171/171 full suite, build and 390/1440 browser checks. Mayor proposal design is not implemented by this pattern.

## Emergency recovery and occupancy transitions (2026-09-09)

- A service-specific diversion exception must apply consistently to pathfinding, spawn, movement, replanning, passing and saved-corridor validation. Relaxing dispatch alone leaves responders stopped later. Active wrecks remain blocked; ordinary returns retain closures. Verified by the recovery suite and mounted browser scenario.
- An emergency assignment belongs to an incident, not permanently to its initial access tile. Reconsider adjacent approaches after topology changes and reserve the actual current lane before adopting a new path. Road-edit/save-continuation tests prove approach recovery without position jumps.
- Keep local path geometry while waiting for a route. Collapsing to one point loses lane direction and conservatively blocks both lanes, preventing a legitimate emergency pass. New waits keep up to three local points; old one-point waits remain conservative until safely rerouted. Saved customer/EMS tests check actual shared tile with opposing lanes, then restored shopping.
- Occupancy-sensitive phase changes must reserve the resulting footprint during admission, intermediate movement and grid reconstruction. Independent review found scene arrival could otherwise change from shared lane to full-tile work over an opposing civilian. The same-tick arrival regression verifies exclusive work space throughout.
- Test dispatch, traversal, work and return separately. A sole scene approach occupied by a completed crew with a blocked return can prevent remaining services working. The saved-town reopen regression verifies recovery; it does not promise all closed layouts clear unaided. Late rescue and eventual scene clearance are separate outcomes.
- Evidence: 170 model tests, production build and isolated phone/desktop live browser passes. Longer straight passes remain bounded by road geometry, full opposing-space reservations and safe merges; curved passing and exact user-save reproduction are not verified.

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

### Traffic queues and controllable intersections

- Keep movement in logical road space, with a persisted fixed-step accumulator. The 0.025-second traffic tick preserves departure/payment boundaries and existing progress/path rendering. Existing 14 construction/model tests pass unchanged; new checks cover queues, independent opposing lanes, phase gating, downstream clearance, save continuation, and dense-grid progress.
- Reserve a vehicle's junction path through its first exit before entry. Opposing straight movements can share an intersection; crossing/turning movements conflict. These are bounded initial car rules, not a full lane/vehicle-size model or a proof against all possible gridlock.
- Review reproduced a red-light bypass on adjoining junction tiles. Flood-fill adjoining degree-three-or-more road tiles into one intersection, with one shared controller gating its external entrances. Model and renderer use the same grouping. Tapping any member edits/removes the controller; merging intersections retires extra controls with explicit feedback. Do not introduce independent internal red phases that strand cars in the intersection.
- Grok's review and Claude's measurements exposed a game-design problem: idealized uncontrolled arbitration made every installed control a delay. The lead introduced explicit E/W priority with N/S gap acceptance. Same-demand tests now demonstrate that stops/lights restore service to the yielding arm, while preset choice changes outcomes. This establishes a measurable choice, not final balance or verified player enjoyment.
- Show longest current stop alongside completed-trip mean waiting. A low mean can hide uncompleted journeys: in the ten-home regression, uncontrolled priority completed only three north-arm trips over 180 seconds and left a stop longer than two minutes; the all-way stop completed 38 north-arm trips. Do not score demolition, missing demand, or starvation as optimization.
- Quantize metric timestamps and both sides of rolling-window cutoffs consistently. Floating elapsed-time accumulation otherwise changed which exact-boundary completions survived at different frame rates. The 180-second regression checks both metrics and history, not just positions/counters.
- Bound history against maximum possible departure volume, not an arbitrary small sample count. The current 16,384-record cap covers the 64×64 map, one trip/home, and four-second cadence. Revisit it when density or external demand changes. Skip topology reconstruction on ordinary placement when no controls exist.
- Pre-queue saves may contain overlapping trips. On migration, retain compatible active trips and defer conflicting departures to their still-existing homes without awarding completions. Preserve construction, funds, and IDs; otherwise overlapping reservations can deadlock a restored town.
- Delegated implementation is evidence to review, not acceptance by itself. Claude supplied the model/tests and exposed unfavorable signal balance; Grok supplied independent gameplay and junction-grouping criticism; the lead integrated UI and added regressions/fixes. No new subscription billing guarantees or cross-model capability rankings follow from this one task.

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
## Destination and emergency integration (2026-09-08)

- Verified by the incident suite: seeded wrecks prove dispatch/recovery, but do not prove collisions occur during play. Keep both direct real-pair validity tests and an unseeded traffic scenario that reaches a warning and collision; compare the same demand with controls. The current busy-crossing fixture reaches its first uncontrolled crash around 38.4 simulated seconds.
- Traffic owns waiting-route retries and exact physical position; incidents own dispatch, rescue deadlines, service work and outcomes. A second retry in the incident module used path[0] after smooth rerouting introduced multi-point waiting paths, allowing a responder to jump across a closure. The blocked-return save/reopen regression now checks bodyTile position, not a particular path representation.
- Reserve both inbound and parked visitor capacity. A returning vehicle waiting for a route is not an inbound reservation. Count parked visits separately from completed journeys, and keep parked/working/crashed time out of the road-starvation readout.
- Construction must preserve active journeys and rescue participants. Removing a home cannot erase its crashed car. Every immediate post-edit save must reload, including the interval before traffic recalculates a route around a removed road.
- Local worker exit is not evidence of delivered code. Grok's headless write step was cancelled after generating a draft; the lead recovered the proposed text, reviewed it, integrated it, and assigned independent tests. Claude's temporary incident implementation was replaced before final verification. Future delegates should keep temporary interface stubs outside another owner's production path.
- At phone scale, world-unit text becomes unreadable. Compensate operational labels for stage/camera scale, shorten their content, and move secondary statistics into a scrollable report. A map-height assertion alone does not establish a comfortable play area; inspect full playing-screen screenshots.
- Restore the saved simulation clock before validating expiring household benefits. Validating leisureUntil against a fresh city's zero clock rejected park saves after the first minute; a late-clock roundtrip regression catches this ordering bug.
- A route change can also change a car's lane. Check the candidate's occupied/reserved slots against other traffic before adopting it. A closure appearing immediately ahead requires a visible reverse maneuver inside the already-owned tile, not a half-tile snap after a timeout.
- Destination capacity can throttle a traffic comparison before the junction does. Keep enough visitor capacity in control experiments, and distinguish road waiting from unmet needs still at home.
- Quantize time-bound economy comparisons consistently with traffic and incident clocks. Floating-point elapsed time just below a park benefit's exact expiry granted an extra payment; the boundary regression checks both frame partitions and the expected amount.
- Use a stable source window for Vite browser checks. Concurrent module edits caused full reloads back to the title menu with no page errors, mimicking a navigation defect. Capture the failure DOM/screen and rerun only once source owners have finished.

### Public release review (2026-09-09)

- Verified with CLI 7.14.3: `rundot deploy --public` can succeed while returning `visibility: review`. `rundot game set-public --version 1.4.0` explicitly reported submission for review and automatic publication after review completes. Distinguish upload/submission success from an actually public listing; inspect returned visibility and active game tags.

### Service building artwork adoption (2026-09-09)

- Pack user-selected building compositions into the existing atlas with explicit semantic kind/side names and checked dimensions. Keep the editable generator and approved exports; leave geometry, dispatch and save data independent.
- Visual review needs real gameplay overlays, not only an asset contact sheet. Browser screenshots exposed station names covering new roof symbols; moving names above buildings then covered north-side access arrows. Place north-side names above the access tile as well. Pixel-scale label offsets should account for stage and camera scale.
- Verification covers loaded native frame sizes, all four upright orientations at phone/desktop sizes, and a placement preview. Distinct silhouettes and symbols are visually checked; player recognition and physical-device performance remain unmeasured.

### Emergency passing and vehicle artwork (2026-09-09)

- Verified by fifteen independent tests: reserve the complete passing corridor, both lane-change tiles, and every member of any crossed junction. Persist the maneuver stage and lateral shift, and validate them against geometry and occupancy on reload. Reserving only the body tile lets an oncoming car or a construction edit invalidate an in-progress maneuver.
- Test yielding for forward progress as well as no overlap. Cars already clearing an intersection and same-direction lead cars on green must keep moving; freezing them can trap the responder behind its own yielding traffic. A real red-light queue fixture proves before-green arrival, beyond artificial zero-speed blocker cases.
- Derive emergency speed and priority from duty state. Routine returns must not inherit an old saved emergency speed. Station dispatch at a red junction needs its own checked exception in addition to the junction-entry rule.
- Compare four fixed-camera vehicle views against civilian art at native size, then inspect gameplay overlays at phone scale. Service labels needed height-aware physical-pixel offsets to avoid covering the new sprites. Sprite dimensions never define logical vehicle occupancy.
- Browser tests importing bare Vite module paths after hot reload can reach a duplicate save/store singleton. Resolve the mounted resource URL and check actual flush/reload plus resumed motion. Use a stable source window and explicit state polling; no-page-error alone does not prove the test is inspecting the mounted game.
- Evidence: full suite 102/102 and production build passed. Browser phone/desktop checks cover mid-shift reload, opposing-lane motion, real service dispatch and arrival during red. Limits: conservative straight passes up to six tiles, protected committed road edits, no physical-device/performance or player-recognition claim.

### Building palette and opening missions (2026-09-09)

- Count learning progress at the exactly-once completed-visit boundary, independently of cash, and validate ancillary mission data without rejecting an otherwise valid city. Nine mission regressions cover saved visits, repeated households, demolition/disconnection and advance completion.
- Budget HUD height using the scene's measured header/footer viewport, then inspect actual screenshots. The direct palette retains about 213px of map at 320×640 with 44px targets and 17.6px text. A wide browser still holds a narrow portrait game frame: viewport media queries alone missed clipped desktop header text. Income now lives in Report.
- Distinguish tutorial feasibility fixtures from whole-game balance. Local capacity limits do not establish how external traffic or later road tools should work. Preserve user corrections alongside original specialist reviews; consensus is not verification.
- Keep frequently polled traffic counts out of live announcement regions; reserve announcements for actionable feedback. Native modal dialogs prevented construction click-through in the browser checks.

### Tutorial and external drivers (2026-09-09)

- Verified by the actual assisted sequence: stage emergency response before adding a bypass. Road/control improvements change trip choices and may prevent later demonstration crashes. Preserve this as successful foresight, not a reason to sabotage the layout. A safety acknowledgement is not an actual rescue statistic, and remains unavailable while the practice wreck is active.
- Lesson completion must match its causal claim: unrelated outbound cars do not prove a bypass, and one crew finishing a fire incident does not mean every required crew cleared it. Independent negative tests caught both false positives.
- Free help uses normal construction on a detached copy, commits atomically, and records finite assistance grants. Failure must preserve map bounds, IDs, funds and existing construction as well as visible buildings.
- Outside vehicles need an explicit gateway origin throughout route goals, parked departures, save validation and completion. Reusing household IDs would corrupt household demand/mission credit. Reuse actual occupancy and visitor reservations, and keep payments at the existing exactly-once boundary.
- Measured browser flows must wait for the claimed event. The first outside spawn occurs before the starter local visit finishes; waiting for outside presence alone cannot assert completed local shopping.

### Visible teaching and reward interface (2026-09-09)

- Passing map-height and button-size checks does not prove the workflow is right. User feedback rejected closing a menu to carry out its tutorial instruction. Keep the current teaching action visible and test real map construction while it stays on-screen.
- Category browsing and selected tool are different UI states. A repeated keyboard/coach selection must reveal its tool even when the underlying tool value did not change; explicit UI selection revision handles the coach case.
- Contextual instructions should respond to actual missing construction: home, destination, road connection, then completed visit. An urgent crash must override an unrelated house/park action with response guidance.
- Completion is not a payout. Persist an explicit claim receipt with the wallet, migrate old completions without automatic awards, and test repeated click/reload as well as earned-but-not-yet-claimed progress.
- Inspect real screenshots for duplicate feedback. The first-crash toast covered the wreck while repeating the inline coach; suppressing it retained the explanation and the scene.

### Browser display modes

- CSS-only frame width changes need a ResizeObserver that resizes Pixi; window resize alone does not cover a saved display preference changing live. Cap the stage scale at 1 on large windows so extra width exposes world instead of giant tiles.
- Verify pointer placement after switching as well as frame/canvas sizes. Browser checks passed desktop wide/automatic 1440×900, forced portrait 506.25×900, and phone 390×844. Settings persisted across reloads and town data survived. This verifies display behavior, not user acceptance of the separately delegated UI redesign.

### Responsive UI and objective cost waivers

- Verify no-cost construction through actual placement and preview, not wallet deltas. Record real payment on roads and buildings; preserve zero explicitly through parsing, refunds and reload. Legacy missing payment data retains its prior refund behavior.
- Bind a finite tutorial allowance to its own saved objective receipt, independently of fallible teaching metadata. Validate budget shape and ownership together; do not let a reset lesson borrow a later grant. Twenty economy tests include six independent safety regressions.
- Fund traffic fixtures explicitly when their purpose is routing/emergencies. Keep new-town budget viability and earned growth in separate real-visit tests. Full integrated model suite161/161passed, including player-built tutorial visits, three emergency responses and detour.
- Vite reloaded on test/docs writes during UI checks. Use an isolated source copy and screenshot output outside its watched tree for the final browser pass. Passing geometry checks alone missed a clipped short-phone tool label; inspect actual output and measure text overflow.
- Specialist output requires review of actual file diffs. A late full-file rewrite overwrote an independent grant-owner correction; stopping the writer, restoring the reviewed fix and rerunning tests prevented adoption of the inconsistent draft. Do not overlap source ownership even when a specialist appears to have moved to tests.

## Visible incident pacing

A teaching crash needs running simulation time before advice can explain its consequences. Base delayed advice on simulated time and saved progress rather than wall-clock timers; construction resets the wait and bypass completion cancels it. Dialogue must preserve player pause ownership, and a paused objective must expose Resume without expanding details. Optional tools must not remain hidden completion gates in historical saved stages.

## Single-responder tutorial migration

When simplifying a saved incident, preserve validation of previously dispatched crews without requiring them for new clearance. One effective-service helper must drive dispatch, completion, objectives, missions and scene badges. Verify saves before and after required-crew clearance while older optional crews still have real journeys. A scene badge should derive from outstanding services rather than severity or arrival order; use approved icons and fixed screen dimensions for readable map zoom.

## Validate the entire affected network

A tutorial bypass test using only the initial source/destination can falsely pass while a different branch remains isolated. Test top and bottom households independently, then actual trips during the still-active incident, not only paths after clearance. Optional tool guidance must follow selected tools without changing required progression. Model access alerts should separate missing topology from visitor capacity and traffic queues.

## Departures and visible obstruction queues

Reachable-destination filtering can hide demand by preventing any on-road journey during a blockage. Separate route planning from physical permission to enter blocked tiles, retaining a full goal path for save validation and capacity reservation. Moving arrivals closer to a crash can occupy the only emergency work tile: reserve that approach only for traffic heading toward the wreck, not cars passing along an adjacent usable bypass. Replanning a distant blockage should not make queued followers reverse/creep repeatedly. The191-test suite includes civilian queue continuation and legacy emergency-access regressions.

## Pricing existing traffic controls

Charge after road/junction validation and distinguish installation/replacement from free timing changes and removal. Keep actual payment on the shared junction controller; historical free controls default to zero refund. Replacement affordability includes the old refund atomically. Road-edit retirement must refund dropped controllers, not just explicit bulldozing. Check low-fund timing edits, failed replacement, upgrade/downgrade, reload and malformed payment fields.

## Release artifact and deployment retries

Build once, then release and publish the same checksummed artifact at the triggering commit. A missing success receipt does not prove an external deployment failed: persist an attempt before mutation and stop ambiguous retries for status inspection. Preserve matching release assets and reject changed bytes on rerun. Explicitly include hidden files when the artifact staging directory itself is hidden; stage only intended public release files there. Validate workflow expressions with actionlint and shell scripts with shellcheck; mock external tools to test publish failure modes without spending a real platform version.

## Mission diagnostics and automatic transition (2026-09-09)

Keep tuning, mission outcome evaluation, read-only diagnostics and presentation separate. Mark full reserved visitor capacity separately from an actual household waiting for capacity; do not infer road failure from occupancy alone. Both-direction reachability supplements real visit evidence, but does not prove stable throughput or a completed return. Automatic authorized road additions must happen before traffic-index construction, preserve actual-payment provenance, and retry only with persisted consent. Evidence:199 simulation tests and phone/desktop browser checks; current foundation is not a validated full puzzle campaign.

### Patrols share service occupancy (verified)

A routine service vehicle can reuse ordinary return-driving occupancy while retaining an explicit patrol flag. Reassignment must commit through the same occupied-lane check as replanning, rather than spawning a replacement at its station. Emergency recovery tests should assert response completion independently of later routine patrol presence. Verified by real dispatch/return and save tests; routine patrol geometry remains separate from artwork.

### Gridlock and replacement response recovery (verified)

Strict emergency junction emptiness must cover the junction itself; exit tiles still use lane compatibility. Requiring the opposite exit lane to be empty can deadlock the very civilian yielding to the responder. A stopped-traffic retry must find a real alternative before backing up, and must concern the remaining route rather than unrelated stationary cars. Otherwise it creates repeated reverse/creep or pointless route trimming.

A stale response assignment must not permanently monopolize a service request. Replacement transfers responsibility, not the original vehicle's position: preserve its occupied path and fractional progress, save explicit cancelled-return state, then route it home physically. Validate legacy assignment -> replacement -> reload -> exactly-once service work for each crew. Verified in 210 model tests including dedicated gridlock and backup fixtures. The user's live account save was not accessible, so exact-city recovery still needs playtesting.

### Crew scene occupancy versus return admission (verified)

Whole-road scene occupancy plus immediate U-turn return can trap crews against each other. Separate parked work from road occupancy; retain the actual arrival position and explicitly check clear road space before departure. Save completed-but-parked crews and retain their incident references until they return. Recovery from old scene-turn states must back up at simulation speed before switching parking state. Verified simultaneous police/EMS/fire work, blocked return -> reload -> reopen -> every original crew home, plus an old fractional-progress return snapshot. Tutorial timing tests must target actual incomplete work rather than depend on crews previously blocking each other.

### Vehicle diagnostics reuse movement rules

Expose read-only snapshots from the occupancy module instead of guessing blockages in the renderer. Share the road index/grid across the inspected batch, and clone returned paths so UI/report use cannot mutate trips. Separate response intent from vehicle type: a returning police car correctly follows ordinary traffic rules. Provide copied snapshots and a text fallback because host clipboard access may differ. Read-only blocker and disconnected-scene-return tests pass.

### Siren yielding must consider the blocking vehicle (verified regression)

User's live inspector showed EMS waiting on a civilian whose own reason was yielding with no conflicting reservation. Reproduced a circular wait at an incident approach: response admission requires the exit tile exclusively, while its occupant yields to the responder approaching the junction. Direction-only lead-car exceptions miss this opposing-approach case. Yield logic now checks the responder's actual next admission reservations against the civilian's held space, permitting that blocker to clear through ordinary movement gates. Keep committed passing-corridor yields and all occupancy checks. Regression fails before the fix; after it, the blocking car clears and each service reaches scene work. No exact user save was supplied.

### Weighted routes retain physical admission (verified)

Select the destination before weighting its route, and validate departure occupancy against that selected path. Compare old and candidate costs on one directional snapshot, exclude the querying car, and avoid charging control delay twice. New bypass construction can turn the stopped car's tile into a junction: excluding every junction from replanning breaks recovery. Permit sustained-stop reconsideration through existing gradual reversal and reservation checks, while moving committed junction traffic keeps its route. Save cooldown continuity separately from derived observations. Verified in 224 tests and 390/1440 browser save/reload checks; workstation query timings do not establish physical-phone performance. See docs/traffic-world/routing-implementation.md.

### Emergency weighted routing keeps intent separate from vehicle type (J3)

Cost dispatch and subsequent scene-approach reconsideration consistently; otherwise a tile-count retarget can overwrite the weighted choice. Active responses may omit control delay and cross civilian diversions only because physical movement already supports those exceptions. Routine returns use ordinary speed and restrictions even before their old response speed field is updated. Reserve ordinary query capacity separately from prioritized responses and test repeated response pressure. Route selection never replaces safe admission, committed passing, parked work or return merges. Evidence:232 model tests and390/1440 browser response/reload/work/return plus civilian completions; physical-phone performance remains unmeasured.

### FLOW-01 service observations and purpose fairness (verified)

Timestamp actual completed stays separately from physical returns; carry optional local attribution in the existing bounded traffic history and retain completed parked customers in live observations. A valid route both ways does not prove the current car can return from its committed destination. Keep fixed household targets and all current households alongside averages; absent old attribution means unknown evidence, not invented progress. Restore elapsed time before parsing trip timestamps.

Equal-urgency demand ties can starve shopping if leisure refills before every departure. Persist the last successful departure purpose and alternate ties without reassigning a committed journey. A real long-park-trip/reload regression verifies continuing shopping and leisure service.

Comparison fixtures must assert each placement and every destination's reachability: a spare slot in an accidentally disconnected store is not evidence of usable spare capacity. Same queued-town copies verify retiming and nearby destinations with every household served; a preplanned layout needs no forced jam. 244 model tests and build pass; narrow-window qualification variation and player-observed fun remain tuning work. See [FLOW-01](flow-puzzles/FLOW-01.md).

### FLOW-02 civic recognition and compact feedback (verified)

Keep comparison thresholds separate from civic qualification through the same measurement function. A shopping quota that ignores real park journeys can reject useful mixed-purpose service; verify a retained-park town and reload before choosing the gate. A slower original layout may genuinely serve all homes and should not be forced to fail. New recognition belongs in the existing receipt system, with optional observation state and a saved high-water household target; corrupted optional state must not erase old receipts.

Pure helpers in mutually importing model modules are safe at call time, but a top-level definition reading a not-yet-initialized imported constant caused an ES-module initialization failure. Keep mission definitions independent of that initialization order.

Polled Flow labels/counts should stay outside live regions. Reuse the objective's compact note and scrollable Details slots. Numeric bounds passed while the initial narrow Dashboard still had poor reading space; inspect screenshots, shorten copy and measure heading fit too. Road approach observation must follow connected roads, not a geometric radius across an unconnected parallel street. Verified in253 model tests, build and two-layout browser evidence; observed fun remains separate. [FLOW-02](flow-puzzles/flow02/README.md).

### Moving a saved external connector (verified)

Run one-time sandbox migration after validating and selecting the winning host/local save, keeping pure parseCity useful for original-state reproductions. Moving the connector must update every visitor origin and returning goal together, preserving local path geometry and fractional position. Returners must re-enter physical routing instead of completing at the obsolete endpoint. Verify a disconnected wait, reconnect through actual construction, physical completion and reload. An expansion rejection must precede progress refresh or allowance consumption. Reconnection guidance belongs in the measured objective layout; adding a supplemental row caused overlap on narrow screens. See [delivery](land-progression/connected-edge/README.md).
