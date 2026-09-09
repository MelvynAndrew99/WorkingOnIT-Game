# Project instructions: city building and traffic optimization

## Land progression and final tutorial lesson (2026-09-09)

User requests teaching map expansion at the tutorial's end: manager boasts that more land means more roads and it is free; after two expansions he backtracks because the mayor requires completed missions/levels for more funding. Direction controls must align with physical growth: North above, West left, East right, South below.

Implementation: two free expansion strips per town, then saved earned permits. Lead-selected initial mission target is6 different households with completed shopping visits and retained store access; later levels require9,12,... (three more each). One permit per level, no cash charge for using it. These numeric targets are implementation defaults, not user-selected balance. Completed growth before the free strips are used earns credit. Permits, consumption and mayor briefing receipt persist; later road changes do not revoke an earned permit. Cash mission claims remain independent.

New and still-active H tutorials finish the control lesson, then require two actual expansions before completion/outside-city invitation. Older completed tutorials remain complete and all towns keep existing geometry. Missing historical expansion metadata starts with two new free allowances; existing land is never charged or removed. Skip releases tutorial gates but does not grant unlimited land. See docs/land-progression/README.md for verification and limitations. This supersedes earlier universally free map-expansion defaults.

## Guided H-road tutorial delivered locally (2026-09-09)

User corrected the popup-only delivery: they expect the actual H-road tutorial. Fresh game/save creation now uses roads-only H infrastructure, no buildings, staged Home/Store placement on existing roads, earned growth with additional homes/Park, scripted incident, road bypass, diversion, real Police/EMS/Fire clearance, then a Stop/Light and explicit outside connection. Existing towns retain their geometry and prior tutorial; no automatic reset or new district. New H tutorials gate tools in both model and UI; explicit Skip unlocks everything. This supersedes earlier all-tools-open guidance for this new scenario only.

Latest explicit user permission: the tutorial can force an accident and label it a drunk/impaired driver, independently of intersection design. Implemented one scripted impaired-driver fire incident at the lower central junction when an actual driver reaches its approach, after growth. Real wreck/traffic/dispatch and save rules apply. Do not claim it is a natural two-car conflict or that a Stop prevents impaired driving. Default main-game collision rules remain unchanged. No artificial tutorial speed/position staging was retained.

Training rescue timing is held until services unlock and all three station entrances have road access, then the normal90-second deadline starts. A bypass is not rescue; every required crew must actually finish. Manager More roads briefing opens once at the bypass stage and saves its receipt. Tutorial speech dismissal never ignores/completes the objective. After-level deferral remains queued.

Codex implemented/integrated with bounded Codex UI and independent test agents; this is not a Claude/Grok tutorial implementation (Grok authored the previously delivered popup). Full178 model tests and build pass; actual phone/desktop fresh-game placement/reload/Skip tests and independent real900-fund full-arc tests are recorded in docs/h-road-tutorial/README.md. No upload in this task.

## Manager briefing and later objective independence (2026-09-09)

Delivery: actual Grok returned the reusable manager component/CSS; Codex integrated it with current crash/detour objectives, parent-owned pause and Road selection. User-opened only. Browser checks320/390/1440 and build pass; speech closure does not complete/defer objectives or build anything. Safe tutorials label the briefing as hypothetical. See docs/manager-popup/README.md. H-road tutorial, automatic inactivity advice and later-level deferral remain separate queued work.

Latest tone clarification: the manager need not always fumble or be wrong. He can solve problems competently; comedy may come from doing useful things in the wrong order, embellishing his contribution, or requesting conspicuous improvements so people see how good he is. Preserve sincere care plus hunger for recognition, with varied outcomes rather than a mandatory failure gag or mandatory crew put-down.

Latest objective clarification: “Ignore” means defer until other work is finished, not abandon. After leveling up, let the player reorder attention while retaining the pending objective and its eventual real completion requirements. Prefer “Not yet” / “Later” wording. The manager's appearances should convey enthusiasm for more/bigger, visible improvements and recognition; his requested work can be worthwhile even when its timing is wrong. Tutorial objectives remain non-deferrable.

User approved the H-road tutorial humor and explicitly assigned the manager popup to installed Grok. Bounded delivery: manager says “We need more roads! I knew this town had potential.” and explains a player-built bypass, with crew reminder that victims still need actual service access. Lead integrates this reusable briefing with objectives. New H-road starter scenario and staged tool unlocks are design direction, not yet implemented. Preserve existing towns; do not inject a practice district.

Latest correction: tutorial objectives cannot be ignored. A future “Ignore / I have a plan” objective option only becomes available after the player has leveled up; the exact progression threshold is not selected. Closing a speech never ignores/completes an objective or awards progress. Preserve the separately established explicit Skip tutorial option. User-opened briefings are distinct from unsolicited manager crisis hints, which still require sustained relevant inaction.

## Pre-v0.1 release review (2026-09-09)

User accepted the prominent tutorial guidance and asked installed Grok/Claude for independent pre-upload review. Claude returned its session limit (reset reported 2pm America/New_York); no Claude approval/review delivered. Grok review is running. Lead verified 171 tests, build, four guidance layouts and production-asset boot/placement/save reload on390/1440. Fixed tips setting to actually hide optional callouts/highlights while retaining objective controls, and clarified zero refunds for free construction. Current boot is silent (`initMusic` is not called); old theme file remaining on disk is not installed new audio.

Read-only RUN tags now confirm1.5.0 public, superseding earlier1.4.0-live/review-pending notes. User's v0.1 is the upcoming player-facing milestone label; keep the existing RUN identity and incrementing technical upload version. No upload performed during this review.

Update: Grok completed its model/economy review with no confirmed standalone blocker in inspected scope. Claude remains unavailable, so there is no two-specialist sign-off. Before release, verify a prior public save migration and RUN/device lifecycle, improve discoverability of the safe-crossing acknowledgement on phones and the explicit outside-city invitation, and decide whether the alpha includes selected audio. Grok also identified catalog-price construction spending totals counting waived construction. Details and qualification of unverified findings: docs/release-v0.1/review.md. The earlier sentence describing Grok as running is superseded by this update.

## Prominent tutorial tool guidance (2026-09-09, implemented locally)

User requests mobile-game-style, in-your-face onboarding: a toast-like callout above the objective and highlighting on actual selectable controls such as Home $200. Prefer teaching where tools are over relying only on the duplicate objective tool button. Highlight the relevant category if needed to reveal a tool, then its actual button; follow contextual lesson progress and player placement. Installed Claude Code owns the UI implementation; lead integrates/verifies. Keep prices live, reduced-motion support, other controls usable and map input clear. This explicit onboarding is separate from delayed unsolicited manager crisis advice. No automatic construction or Practice restoration.

Delivery: the installed Claude client reached its session limit before delivering changes; Codex implemented this focused request directly. Prominent yellow callout, category/tool pointer and pulsing outline now follow real Home/Store/Road progress and selected-tool placement, with context dismissal and static reduced-motion highlighting. Existing measured layout preserves map input. Four browser configurations (320,390,1440 wide/forced portrait) verify actual placement and guidance changes; production build passes. See docs/tutorial-highlights/README.md. No publication, model change or new art.

## Practice removal implemented (2026-09-09)

Actual installed Claude Code removed both Practice UI actions; Codex removed the runtime district builder and made stale practice commands no-ops. Existing practice buildings, metadata and refund receipts remain intact. Player-built controlled crossings with no active incidents permit explicit safety acknowledgement at the appropriate lesson, without fabricated rescue stats; a real bypass can finish detour learning without a practice flag. Natural response, first-crash pause, waivers and skip remain. 171/171 tests, production build and 390/1440 browser checks pass locally. See docs/practice-removal/README.md. This supersedes prior queued-removal labels; mayor Help/Later proposals remain queued. No publication or exact personal-save repair is claimed.

## Practice removal and optional mayor requests (2026-09-09)

Latest user correction: Practice adding its architecture to their map is unwanted. Explicitly backlog removing the training Practice button and equivalent expanded entry point. They like the mayor requesting an addition with Help or Later choices. See TUTORIAL-01 in docs/BACKLOG.md: Claude UI first next interface pass, Codex tutorial/action/save compatibility. Preserve existing practice buildings and receipts; keep lessons completable and skip available. Do not auto-place a renamed practice district or treat delay/silence as consent. Exact proposal content, construction method, costs and siting remain design work. This supersedes prior Practice-button approval and is queued, not implemented in this recording pass.

## Driving-style proposal and balance gate (2026-09-09)

Latest explicit user requirement: road problems must be genuinely solvable so all drivers can travel safely and reach destinations, with satisfaction even when hard decisions are necessary. Require safe service across driver styles and affected approaches at the designed demand. Do not impose unavoidable random accidents after the modeled conflict is solved, or count permanent waiting/disconnection/deleted demand as efficiency. Growth may change requirements; hidden aggression or accident quotas must not invalidate success. Exact difficult tradeoffs remain to design, not a mandate for any specific sacrifice.

User is considering cautious/aggressive styles with different caution margins and probabilistic accidents at unmanaged conflicts, while retaining efficiency optimization as the core and signs/lights/roads as mitigation. Record this as a hypothesis needing balance, not selected rates or a requirement that every aggressive pair crash. DRIVER-01 in docs/BACKLOG.md schedules Codex behavior prototype, Grok balance review and Claude feedback after the advice foundation and before tuning/activating crisis charges. Lead proposal: stable saved local behavior rules, risk tied to actual conflicts, reproducible comparisons and reliable control effectiveness. No runtime AI integration, real-world vehicle-product behavior claim, driver mix or probability is selected; no implementation started in this recording pass.

## Implemented emergency recovery first slice (2026-09-09)

User asked to start the next backlog item. Codex implemented and independently reviewed/tested CRISIS-01: outbound services cross civilian diversions, reconsider incident approaches after road edits, seek routes around stopped traffic and pass longer straight queues with complete opposing-lane/merge reservations. Newly stranded vehicles preserve their lane geometry in saves rather than blocking both lanes. Scene arrival reserves full work space before entry. Fatalities still occur after missed deadlines; later restored access permits clearance without resetting the town. 170/170 tests and 390/1440 browser checks pass; production build passes. See docs/emergency-recovery/README.md.

This is local, not published or verified against the user's exact save. Returns still obey diversions, and a blocked return can occupy sole scene access until reopened. Old one-point waiting saves lack lane information and stay conservative until rerouted. New clinics still cannot replace an assigned stuck ambulance; advice must not claim otherwise before that follow-up is implemented. Delayed manager advice and crisis costs remain queued. This section supersedes earlier statements that no implementation has started and the six-tile passing cap; other physical passing limits remain.

## Scheduled crisis/workaround backlog (2026-09-09)

Latest clarification: user prefers emergency vehicles making progress through heavy traffic unless physical congestion prevents it; prioritize yielding/passing improvements in CRISIS-01. Preserve fatalities when serious-crash response is too late. No-reset recovery means eventual scene clearance and continued town play, not guaranteed rescue. Do not remove meaningful deadlines, grant teleportation/overlap, or add an unselected per-fatality fine. Exact congestion/access limits need testing; see docs/BACKLOG.md.

Latest user requirement: attempts to restore access, including removing a stop sign, still left a crash unreachable; resetting the city must never be the required recovery. CRISIS-01 is the top blocking correctness task, ahead of advice and financial pressure. Preserve existing towns/saves and verify dispatch/routing recovery; do not sell a deadlock as gameplay or claim screenshots establish its exact cause. Read docs/BACKLOG.md for initial code evidence and regression requirements. No implementation fix has been applied by this recording/inspection pass.

Latest user clarification: unsolicited manager advice only appears after sustained lack of player response to the relevant problem. Do not trigger his head pop-up immediately on detection. Unresolved traffic disruption costs city money during that opportunity to act; the advice delay is not a financial grace period. Exact interval/rate remain undecided. Keep this advice eligibility separate from tutorial waiver timing and preserve actual recovery as the basis for relief. Details and timing acceptance are in docs/BACKLOG.md.

Follow-up: user reports blocked EMS and wants the manager to suggest another clinic as a quick workaround, with his head popping up when he thinks he can help. Add this to Claude's Pass 1 advice assignment. No room for another clinic is an explicit unresolved case: evaluate feasible road/access or space alternatives instead of repeating impossible advice. Codex must verify whether a new clinic can dispatch when the current ambulance is already assigned and stuck. See CRISIS-02 in docs/BACKLOG.md for proposed triggers, alternatives and tests. Character advice can be shortsighted but should work in the actual simulation. Recorded/scheduled only; new portrait artwork still needs selection.

Latest user request is to record and schedule, not immediately implement. Read docs/BACKLOG.md for the next gameplay work queue and acceptance criteria. Lead owns scheduling/assignments: Codex responder access through civilian diversions, installed Claude Code truthful on-screen stranded-driver explanations, installed Grok Build ongoing crisis costs after correctness/feedback, then Claude teaching with Codex simulation verification. No specialists have been launched by this backlog update.

User's intended loop: a crisis costs money as it persists, encouraging a quick player-built workaround; growth creates reasons to revisit and optimize it. The manager's “More roads!” enthusiasm and premature victory claims embody shortsighted middle management. Players learn his advice is not always optimal. Preserve creative alternatives, successful foresight and care during rescue. Reported stranded-car and diverted-police behavior needs local reproduction; suspected EMS/fire behavior is not verified. Emergency access depends on service/disaster and physical passability, not blanket permission to cross wrecks. A detour does not rescue victims or clear an incident. Exact crisis rates/relief/balance remain undecided.

Read docs/DESIGN.md for current gameplay direction, docs/IMPLEMENTATION-LESSONS.md before relevant work, and CLAUDE.md for the inherited RUN architecture.

## Current user decisions (2026-09-08)

- The repository has pivoted from AI Overlord to a city-building and traffic optimization game. This explicitly supersedes the old traffic-cop, player-as-AI, token, mutation, chaos, and takeover gameplay direction.
- Inspiration: Factorio/Satisfactory's observe–improve–watch-results loop, SimCity's growth, and Minecraft's creative ownership. The player builds a city, sees how trips work, and improves it.
- First playable milestone: a buildable map, placeable homes and stores, connected roads, visible trips, and a forgiving economy supporting experimentation. Generous starting funds, predictable income, and full construction refunds are reasonable initial defaults.
- Establish tile scale, building footprints, road entrances, and connectivity before adding features. Keep simulation data separate from artwork. The user reports that an earlier switch to Kenney's Roguelike Modern City assets caused a difficult refactor; asset dimensions must not define simulation geometry.
- The initial construction milestone is complete. Latest scope correction: establish two initial mechanics—shape road routes and control intersections—through visible queues, completed trips, and waiting feedback. Collision/hospital response follows this first optimization slice and must work before its tutorial lessons are authored. The latest approved slice adds destination visits/capacity, parks, earned growth, collisions, fire/police/EMS dispatch, and traffic diversion. Density upgrades and weather remain later scope.
- The user has now volunteered the earlier project's module map and collision/hospital behavior as reference. Use only that supplied context; do not require a code import or assume the earlier implementation was correct.
- Preserve existing work before replacing gameplay. The pre-pivot source at commit 84eac54 is retained in archive/ai-overlord/source-before-pivot.tar and Git history.
- Keep useful RUN integration, saves, and Nix tooling. Run npm and rundot inside nix develop. npm run dev starts the game.
- Implement and verify locally. Latest user authorization: once a thumbnail for Working ON IT! has been selected and prepared, publish the game on run.world using the rundot CLI inside nix develop. This supersedes the earlier local-only publication boundary; the user has now approved thumbnail-candidate-v1.png in docs/artwork/working-on-it/. Verify the build and release, preserve the existing RUN identity, and do not treat the historical AI Overlord thumbnail as satisfying this condition.
- Approved game title: Working ON IT! Tagline: “Fix the commute. Take the credit.” The user selected the supplied city-worker/commute image as the title screen, installed at public/images/title/working-on-it.png. Use its visible title and tagline, with live menu controls replacing the baked-in controls; preserve the source image. “City Workshop” is a superseded working label. Preserve the existing RUN identity and old save data. City saves use a separate namespace to avoid overwriting historical progress.
- The father-and-son project and YouTube development context remain useful background; the old AI-replacement premise no longer defines the game.

- Rotation clarification: keep building artwork upright from the fixed player perspective. Rotate the logical footprint and entrance placement, not the sprite. This supersedes the earlier request to rotate sprites.

## Accepted comedy and music direction (2026-09-09)

- Tone: cheerful competence, inflated self-importance. Everyone else dreads the commute; our city manager cannot wait to help and be admired. He sincerely cares, but his pride runs ahead of his competence and he quietly dreams of becoming mayor.
- Helping people is the real gameplay achievement; his appetite for credit at the expense of other people's pain is the joke. He welcomes their commuting misery as an opportunity to feel indispensable and claim a personal triumph, without recognizing the selfishness. Do not soften this into harmless vanity alone. His selfishness is a lack of self-awareness, not malicious or villainous: he cannot read the room and does not notice how his excitement about being needed lands with people in pain. He does not wish them harm or deliberately create suffering for credit. Pair small, visible improvements and enormous self-congratulation with dry reality checks from crews and commuters. Humor is affectionate and situational, including when his own fixes create believable complications.
- Preserve care for people during emergency responses. This direction does not revive the old deliberate-chaos progression or make causing casualties an achievement.
- The user supplied “What a Jam!” as the theme/credits song and character victory speech: joyful soul-funk with light gospel touches, 116 BPM, a comically self-satisfied adult male lead and crew responses. Preserve the supplied lyrics and style in docs/WHAT-A-JAM.md; consult docs/AUDIO-BRIEF.md for production context. The earlier instrumental-only candidate brief does not constrain this vocal song.
- Song references to water crews, potholes, towing, buses, roundabouts and mayoral ambition establish personality and possibilities, not a commitment to implement all those systems now. No recording has been supplied or installed with this brief.

## Objectives and post-jam direction (user decision)

- Objectives should build recognition toward the manager's ambition to become mayor. This is now gameplay progression direction, superseding the earlier characterization-only treatment of mayoral ambition; it does not require an election simulation.
- Silly civic objectives can create believable downstream traffic problems that players solve as they improve. Preserve his huge ego and lack of self-awareness without turning him malicious. Keep road/traffic optimization as the core work and let players use creative solutions.
- Latest clarification: give tasks whose initial solutions do not scale with city growth; players learn to revisit and optimize them. Growth changes infrastructure demands, rather than player skill triggering harder challenges. User example: homes feeding a store along a local road, then external-city connection turning that road into a through route. Preserve successful foresight and creative alternatives rather than forcing every layout to fail.
- The user wants to discuss this growth-loop hypothesis with all agents tomorrow after waking. Record it now; do not start an overnight agent discussion or treat the example as verified design. See docs/DESIGN.md for the concrete scenario and open questions.
- Aim for a satisfying initial objective arc within the five-day jam window, then continue developing if players enjoy it. Future missions should extend existing cities and preserve progress. See docs/DESIGN.md for proposed objective examples and unresolved balance; those examples are not user-selected mission text.
- The user is interested in RUN monetization and sees opportunity in a newer platform. This is their business motivation, not verified market demand or authorization to add a particular payment/advertising mechanic.

## Tutorial and external-city progression (user decision)

- Teach mechanics in a town disconnected from the external city. Keep the tutorial expandable as new mechanics are added, rather than hard-coding it as only home/store placement.
- Once the player has a home and store, offer the external-city connection as the transition out of the tutorial into the main game. The player chooses to connect; do not silently introduce outside traffic while they are learning.
- Provide an explicit Skip tutorial option so players can enter the main game immediately without completing tutorial objectives. Skipping must bypass tutorial gates, including access to the external connection and its progression unlocks.
- Connection introduces outside traffic that increases as the town grows, creating road-management decisions, and opens further building/architecture options and customization. Exact unlock content and traffic scaling remain to be designed.
- Preserve the player's town when progressing. Future mechanics must include a plan for teaching them in the disconnected tutorial; keep learning progress separate from artwork and persist it safely.
- The tutorial must teach collisions, different vehicle responses, and hospital ambulance response. Design and verify collision/road-optimization mechanics first, then author lessons using those mechanics. A home/store pair alone is not the full tutorial. This supersedes the earlier first-trip-only onboarding proposal.
- This is accepted design direction, not a claim that tutorial, skip, external traffic, or unlocks are implemented. The graphics pass is complete; the next priority is gameplay. See docs/DESIGN.md for scope, proposed implementation guidance, and acceptance checks.

## Implemented first traffic-flow slice

- Queues, independent opposing lanes, junction exit reservations, all-way stops, and signal presets are implemented independently of artwork. The HUD separates planned route time from recent completions, measured waiting, and longest current stop.
- Provisional unsigned-intersection rule: east–west has priority; north–south waits for a gap. Stops and lights replace that rule. This makes service to a waiting approach a meaningful decision; do not treat aggregate throughput alone as success.
- Adjoining junction tiles share one controller. Tap any member to change/remove it; all external approaches display the active phase. Road edits retire orphan/duplicate controls explicitly. Stops/controls are initially free; construction refunds remain full.
- This is still a construction/traffic sandbox, not a completed mission campaign or tutorial. Outside traffic is still deferred. The subsequent approved destination/emergency slice adds collisions and service vehicles. See docs/traffic-flow/README.md for controls and limitations.

## Implemented destination and emergency slice

- User approved shopping/leisure demand, capacity-aware destination choice, off-road parked visits, a park, and income from successful visits supporting further construction. The earlier design-discussion-only status is superseded.
- Additional stores should serve real unmet/overflow demand or improve access. Do not force every resident to tour every duplicate store. Reserve inbound and occupied visitor capacity; preserve safe return departures and exactly-once income across saves.
- The same approval explicitly adds accidents at uncontrolled conflicts, police/fire/EMS services, and rerouting around blocked roads. All required crews must contribute to clearance; an ambulance alone must not erase a burning wreck.
- Keep simulation/art separation, saves, full refunds, and a viable starter budget. Numerical capacities, visit times, payouts, crash exposure and deadlines remain provisional tuning, not user-selected balance.
- User explicitly requested divide-and-conquer implementation. Claude Code implemented core visits/traffic, Grok Build generated the incident draft, and the lead recovered/reviewed/integrated it with independent Codex tests. The headless Grok write was cancelled; process exit alone was not treated as delivery.
- Current controls: More buildings opens Park/Hospital/Fire station/Police station; Road closure diverts arrivals around blocked tiles; City report exposes demand, occupancy, rescue deadlines and missing/busy/unreachable services. Native buttons have shorter visible labels on phones.
- Implemented defaults: stores 4 and parks 8 visitor slots; visits 5s/10s; shopping 100 once per completed visit; recovery allowance 20/10s plus 15/10s per household served by a park in the last 60s. One car per home and one response vehicle per station keep demand bounded. These are provisional.
- Actual incompatible unsigned junction claims accumulate a visible warning before a crash; stops/lights prevent that mechanism. Minor/serious/fire incidents need police / police+EMS / police+EMS+fire. Responders use actual station entrances, shared road occupancy, scene work and return routes. No outside traffic, mission campaign or tutorial has been silently activated.

## Collisions, road optimization, and emergency response

- The road-flow loop is established; implement collision and emergency response now, before scripting their tutorial lessons. Different vehicle types must ultimately have understandable responses.
- Hospitals dispatch ambulances from their actual locations to traffic accidents. Serious accidents have a response deadline; people can die if help arrives too late.
- Traffic must be diverted/rerouted around incidents. Hospital access and road layouts must matter to rescue outcomes.
- Placeable stop signs and traffic lights are core player tools for maximizing road throughput, not optional decoration. The user identifies iterative traffic-control optimization as a central source of enjoyment. Teach these controls alongside collisions, vehicle differences, and emergency access.
- Use the real simulation for the tutorial's ambulance demonstration in the disconnected town. Do not substitute an animation, arbitrary edge spawn, or collision immunity for working dispatch/routing.
- Exact vehicle roster, accident triggers, severity/deadline values, traffic-control operation/timing, and recovery timing remain design proposals in DESIGN.md, not approved balance. Preserve forgiving construction/refunds and tutorial skipping.

## Growing map and concurrent graphics work

- User's next objective: expand the map to support creative road layouts in a growing city, keeping traffic optimization as the focus. Design for both phone and browser play; avoid turning scope into an unbounded city simulator.
- Claude completed the graphics pass. Map expansion is now integrated with its renderer; preserve its atlas/building/vehicle artwork when extending the camera or controls.
- Expansion foundation is implemented in cityMap.ts and cityModel.ts: saved bounds, stable world coordinates, and expansion in any cardinal direction. Provisional choices are 8-tile strips, a 64×64 maximum, and free expansion. These are not user-approved balance or verified phone performance limits.
- Expansion is player-accessible through Expand: preview/select an edge, then Add land. Pan mode, pinch/wheel and +/− zoom, and Town recentering support browsing the map without shrinking it to fit. Expansion preserves camera focus and saved construction. See docs/MAP-EXPANSION-HANDOFF.md for verification and remaining limits.

## Provisional implementation defaults

The lead selected a 16×14 map with 10 m tiles, 1×1 road tiles, 2×2 homes, and 3×2 stores; four building orientations with explicit single road entrances; and cardinal road connectivity. Initial construction costs are 20/200/400 for roads/homes/stores, starting funds are 10,000, and the old 200-per-10-second connectivity income is superseded by the approved earned-growth slice, with a small recovery allowance and completed-visit income. Construction receives a full refund on removal. These are first-milestone implementation choices, not user-approved balance or fixed long-term design. See docs/DESIGN.md for the spatial contract.

## Release status (2026-09-09)

- Approved thumbnail installed. RUN now confirms version 1.4.0 is approved and public. User requested the accumulated update: version 1.5.0 uploaded successfully using rundot, with public release queued automatically after platform review. At the release check, public still pointed to 1.4.0; do not claim 1.5.0 is live until verified. See docs/DEVLOG.md.

## Emergency vehicle direction (2026-09-09)

- User wants police, EMS and fire vehicles to have their own response-driving logic: emergency responses should not normally wait for traffic lights and may use any road lane, including the opposing lane, to reach incidents.
- Implemented after user approval: all three services have dedicated approved directional artwork. Outbound responders bypass red lights/stops when space is clear and can pass a queue using a reserved opposing-lane corridor, including a straight crossing of an empty junction. Civilians yield while lead cars and cars already inside the junction keep clearing.
- Current conservative passing limit is a straight corridor of at most six tiles with clear opposing space and a safe merge; 0.4-second lateral transitions are persisted. These are implementation defaults, not user-selected balance. Road edits in committed corridors briefly wait for the merge. Return trips use ordinary speed/rules and no response flashing. Preserve actual occupancy, meaningful access, and separate visual/simulation geometry.

## Approved service vehicle artwork (2026-09-09)

- User selected the police/EMS/fire set in `docs/artwork/service-vehicles/`: blue/white patrol car, pale box ambulance with teal medical symbol, and red ladder-equipped fire engine. All have four fixed-camera views. Preserve editable source and approved exports.
- Artwork approval is separate from simulation geometry. Response lights and emergency driving state belong to the simulation/renderer logic, not baked sprite colors.

## Approved service building artwork (2026-09-09)

- User approved the fire/police/hospital set in `docs/artwork/service-buildings/`. Adopt the brick fire tower and garage bays, blue police portico and shield, and pale EMS wings with teal medical symbol. Preserve the editable generator and exports.
- These buildings use the existing 3×2/2×3 logical footprints and actual entrance markers, with upright artwork for all four orientations. No gameplay geometry or dispatch changes follow from art approval.

## Historical artwork and approval boundaries

- AI Overlord / Context Collapse gameplay and cover decisions are historical. The pre-pivot snapshot preserves the original instructions and work, including accepted and rejected candidates and their rationale. Do not inherit its robot, catastrophe, meme, or console-era cover brief as current city-game direction.
- The user approved docs/artwork/working-on-it/thumbnail-candidate-v1.png, adapted with imagegen from their title-screen artwork. It is adopted as public/thumbnail.jpg (512×512 JPG). The previous AI Overlord thumbnail is preserved as docs/artwork/working-on-it/previous-ai-overlord-thumbnail.jpg; the original title-screen image is unchanged.
- New artwork remains a candidate until the user explicitly selects it. Agent review is not approval. Save alternatives separately, show actual output, and preserve editable/high-resolution sources. RUN thumbnail export remains 512×512 JPG.
- Do not send source images to external tools without explicit authorization; text-only briefs are sufficient. Be honest about which tool made artwork.

## Working agreement: lead agent represents the user

User explicitly authorizes delegation to Codex subagents, installed Grok Build, and Claude Code according to demonstrated task performance. The lead owns coordination, integration, verification, and faithful representation of user intent; do not make the user manage specialist execution.

- Maintain durable notes about accepted decisions, rejected approaches and WHY, unresolved hypotheses, and explicit approval boundaries. Read these notes before briefing new specialists. New user corrections supersede earlier interpretations.
- Distinguish explicit user preferences from lead inferences. Do not claim to know unstated preferences. Clarify only consequential uncertainty; handle routine implementation autonomously.
- Brief experts with goals, relevant evidence, constraints, and acceptance criteria, but avoid leading them toward the lead's preferred answer. Ask for disagreement, alternatives, and failure modes. Independent expertise does not mean ignoring user constraints, and no model is guaranteed unbiased.
- Keep the user's intent distinct from specialist advice. Synthesize disagreements and exercise judgment; do not use majority vote as a substitute for reasoning.
- Route by observed quality rather than brand reputation. Grok Imagine produced the accepted historical AI Overlord cover after iteration, making Grok a useful visual collaborator. This does not establish the new game's art direction. Claude provided a useful independent cover critique. Codex has handled implementation, Nix/RUN setup, integration, and verification. These are observations from this project, not universal rankings.
- Give delegated tasks concrete scope, permitted file areas, and expected deliverables. Avoid overlapping writes and unnecessary agents. Honor restrictions on sending source files externally; text-only briefs are sufficient unless sharing is explicitly authorized.
- Complete authorized work and verify outputs before reporting success. Progress updates should emphasize results, decisions and blockers, not ask the user to manage mechanics of delegation.
- User wants to focus on people-facing systems, player feedback and creative direction rather than implementation. Bring back playable/visible work and concise consequential tradeoffs.
- Artwork adoption still needs user selection. The AI Overlord cover is preserved historical work; the approved Working ON IT! square adaptation is now adopted. Public release on run.world is authorized once the user has selected a thumbnail for this game; follow the release condition above.
- Do not imply awareness of the zpet project's details without inspecting user-provided context. This working agreement applies here and does not imply automatic memory across unrelated projects.

## Subscription collaboration and audio

- User explicitly invites installed Claude Code and Grok Build to share implementation work through their existing subscriptions. Give bounded assignments, review the actual work, and verify integration locally. Tool availability or delegation alone is not evidence of a successful implementation or a guaranteed billing saving.
- User has a Suno subscription and will generate audio/music from prompts supplied here. Do not require an audio integration or new paid service to validate the first traffic loop. Preserve existing audio until replacements are selected.

## Specialist learning and shared patterns
All specialists must read docs/IMPLEMENTATION-LESSONS.md before relevant work and include proposed reusable lessons in their handoff afterward. The lead verifies and merges notes into that shared record, avoiding concurrent writes and competing copies of the vision. Separate proposed hypotheses from verified patterns; preserve evidence and mark superseded lessons. Implementation convergence must not suppress independent criticism. Do not create a new architecture or revise product intent silently.

## Interface and growth-first missions (2026-09-09)

- User explicitly requested Codex, Claude Code and Grok Build collaboration on easier building-tool access and a simple mission list. Early manager objectives should prioritize attracting more driving and saving money; efficiency/congestion/fatality improvements belong later.
- Manager favors stores/parks as traffic attractions and says to buy public services when needed. After an accident he advises building around the mess while saving for police/EMS. Preserve his shortsighted budget-first voice; a detour does not medically rescue people or clear wrecks in the simulation. These are user directions, not verified game balance.
- Review and implement a bounded first mission/interface slice. Exact targets, budgets, rewards, driver-growth rules and interface layout remain implementation/design choices to evaluate. New missions should use the existing city; retain current save data, all tools and creative alternatives. Earlier overnight-discussion deferral no longer applies: the user has now asked for the discussion and work.

## Traffic-first main game clarification (2026-09-09)

- Latest user correction: cheap roads, bounded local household demand and absent outside traffic describe the disconnected learning stage, not permanent limits of the main game. Main-game priority is road/traffic optimization over city-building systems.
- Connected external cities supply additional traffic as the town grows and according to the design/capacity it supports. Parked visitors free on-road space for additional traffic while creating arrival/departure pressure at destinations. The user’s “8 parked + map size” expresses that capacity relationship, not an approved numeric spawn formula. Do not retain one-car-per-home as a universal demand ceiling.
- User identifies bus stops, wider roads and one-way roads as future optimization tools, and wants incentives for efficiency after initial growth lessons. These systems and external demand are not yet implemented by the current interface/mission slice. Preserve the early growth-first objectives as the learning phase; develop later goals around supporting demand efficiently and safely.
- Correct the prior specialist inference that inexpensive roads or parking mean congestion cannot accumulate. Cheap construction supports experimentation. Keep effective foresight valuable; the exact growth/capacity-to-external-demand function remains to design and test.

## Staged tutorial and free assistance (user clarification, 2026-09-09)

Tutorial scenarios may deliberately create small, legible traffic problems so players learn to recognize them and experiment with tools. Provide an optional free worked solution when a player gets stuck; assistance should explain the change and let the real simulation demonstrate its result. This supersedes any blanket prohibition on staged tutorial problems. Preserve creative alternative solutions and successful foresight. Main-game pressure still comes from growth; do not force every successful layout to fail. Exact scenarios and the assistance interaction remain to be implemented and verified. The current optional growth mission board is a foundation, not the completed tutorial, external-city transition, or free solution system.

## Implemented tutorial and outside drivers (2026-09-09)

User requested building the tutorial with accidents and autonomous vehicle behavior. The local implementation now offers seven saved lessons covering trips, parking/capacity, driver decisions, controls, natural collisions, service response and detours. New towns start guided; existing towns are offered opt-in guidance. Free worked examples/practice use real placement and driving in vacant land, preserve the town/funds, and are one-time transactional grants. The first active tutorial incident pauses the scene and opens explanation. Safe-crossing acknowledgement preserves foresight without inventing rescues. Skip remains available on the title screen and during lessons.

The explicit outside-city connection is now implemented: choose an existing boundary road after a home/store pair, or immediately after Skip. Connection preserves the town, ends active guidance and enables real capacity-aware outside trips; no tutorial completion silently connects. Gateway coordinates persist across expansion. Provisional growth-based interval max(4,12-homes) seconds and concurrent limit min(16,2+homes+destinations); missed arrivals do not backlog. All existing tools are available in tutorial, skipped and connected play. Future bus stops, wider/one-way roads and architecture/customization unlocks remain later work. This section supersedes earlier tutorial/outside-traffic deferred labels. See docs/tutorial/README.md for constraints and verification.

## On-screen tutorial, rewarded missions and interface (2026-09-09 user correction)

The user rejected the menu-hidden tutorial: instructions must live in a dedicated nonmodal gameplay panel, visible while building and progressing through lessons until exited/skipped/completed. Missions are a separate visible bottom card with progress and rewards. This supersedes the previous shared tutorial/mission-dialog design and recognition-only reward choice.

Implemented locally: contextual on-screen coach, compact navy/yellow/cyan interface, Roads/Places/Services dock, inline emergency guidance, visible claimable mission rewards and optional detailed reports/city-link reference. Rewards100/200/200/400 are lead-selected provisional amounts, not user-selected balance. Tutorial and reward receipts preserve towns and progress; awards require one explicit claim. Keep actual model outcomes, safety alternatives, first-crash pause and all tool access. Read docs/interface-redesign/README.md before UI changes.

The user is concurrently generating music and using Splice for layered effects. Audio production handoff is docs/AUDIO-CUE-LIST.md; accepted What a Jam! direction remains. No new audio has been supplied or installed by this UI pass.

## UI ownership and economy correction (2026-09-09, latest user direction)

The user likes the navy/cyan/yellow colors but rejects the current interface layout and explicitly assigns the UI redesign to installed Claude Code. The lead owns a saved Automatic / Desktop wide / Mobile portrait display setting; do not treat the previous layout verification as user acceptance.

The user assigns economy work to installed Grok Build: reduce the excessive 10,000 starting budget for new towns and make tutorial revenue motivate earning destinations. Free assistance means waiving objective construction costs, not a Free Help button that builds a worked solution. After sustained lack of progress, the mayor can offer the relevant construction free. A Clinic is only an example of a stalled objective, not a special Clinic-only grant. Preserve player placement/experimentation, progress and existing saved balances. Amounts, stall duration and grant bounds remain implementation tuning. These corrections supersede earlier free-worked-example descriptions; economy changes are not yet implemented.

### Approved specialist source access

User explicitly approved: “I approve Claude and Grok accessing the specified source files through their installed clients”. The exact source scope and provider destinations are recorded in docs/economy-rework/source-access.md. This authorizes the UI/economy assignments and their necessary follow-up reviews through installed Claude Code and Grok Build. Do not ask again for that same scope. Images, credentials, private saves and unrelated files remain excluded.

## Verified UI and tutorial economy integration (2026-09-09)

Actual Claude Code implemented the responsive interface redesign: the desktop exposes all tools and uses side panels, phones use categories and a single current-objective panel, and map navigation is directly accessible. Navy/cyan/yellow and approved artwork remain. The lead integrated measured side-panel camera bounds, live frame resize and saved Automatic / Desktop wide / Mobile portrait settings under Menu → Settings → Game display. This is implemented locally, not a new published release or a claim of user acceptance of the final layout.

Actual Grok Build authored the economy module/model/test draft. The lead reviewed and integrated it with independent grant-accounting corrections. New towns start at900; stored balances remain intact. Completed shopping visits still earn100 and mission rewards remain100/200/200/400. These amounts are provisional. After60 simulated seconds without progress, the mayor automatically waives a finite allowance of construction for the current stalled lesson. Players place their own buildings/roads; no Free Help button or automatic worked solution. Valid relevant construction resets the wait. Pause freezes it. Tutorial skip/completion expires the current grant, and saved receipts prevent renewal. The Clinic remains only an example of a relevant objective.

Roads/buildings record actual payment; waived construction refunds0 and ordinary construction refunds what was paid. Optional practice crossings still place real traffic demand, but are separate teaching scenarios with0 refund provenance. Saves preserve ownership and remaining allowances independently of tutorial metadata. See docs/economy-rework/contract.md and docs/claude-ui-handoff/verification.md. Full model suite161/161 passed; browser scenarios cover320,390,1440wide and forcedportrait, real placement, claim/reload, dynamic prices and free construction/refunds. This verifies implementation, not player-tested economy balance.

## Tutorial placement freedom (2026-09-09 user correction)

Only the first Home and Store have guided placement regions. After that pair, the player chooses locations for further homes, stores and parks; growth objectives do not prescribe lots. Keep subsequent road/service lesson unlocks. Allow building removal/repositioning with ordinary refund rules while protecting starter roads until the bypass lesson. New games start with no tool selected: highlighting Home must teach the menu interaction, not select it automatically. Implemented locally; existing towns are preserved.

## Crash pacing and optional diversion (2026-09-09 playtest correction)

Divert is not required to finish the tutorial. The bypass advances directly to real crew clearance; old diversion-step saves can continue. Roads, Divert and Police/Clinic/Fire unlock at the crash. The H crash no longer pauses traffic, so players can see queues developing and continue adding buildings. Manager advice waits30 simulated seconds without construction progress (lead-selected tuning), preserves the user pause state, and does not repeat. Suggested unbuilt H-connection tiles are highlighted without requiring that route. Paused objectives clearly state that traffic and the assistance timer are stopped and expose Run traffic. Preserve finite free-construction assistance, player placement and held training rescue deadline. This supersedes earlier compulsory diversion and immediate crash-popup/pause behavior. Implemented locally, not uploaded.

### Shopping demand during the tutorial crash (2026-09-09)

User correction: after completing their existing journey home, tutorial households should head for shopping rather than substituting an existing park during the crash. Implemented for the active H incident in stages5–7: preserve existing trips, restrict new departures to shopping, and retain unmet shopping at home if no route/capacity exists. A valid bypass releases those departures. Skip, cleared incidents and ordinary play restore normal shopping/leisure selection. Existing demand and incident state provide save continuity without a new save field. Verification:188/188 model tests, including active-trip preservation, blocked shop/reachable park, reload, bypass recovery and Skip.

## Preserve trip intent when routes fail (2026-09-09 user clarification)

The user defines the core as a pathfinding/traffic optimization simulation with increasing complexity and staged chaos. A blocked journey must not disappear because a driver substitutes a different activity or destination. Preserve the intended destination/task; reroute the journey to that goal, or keep it pending until the player restores access. A shopping trip must not become a park visit merely because the shop is unreachable. This is general gameplay direction, not only a tutorial workaround. Existing journeys finish their return before the next assignment changes, as clarified in the preceding tutorial correction.

Growth and incidents create problems for the player to observe and solve; the satisfaction comes from delivering intended journeys safely and efficiently. Do not erase that feedback through convenient goal substitution. This does not authorize making every good road layout fail, malicious manager behavior, or teleporting vehicles through blocked roads.

Implementation status: the active H tutorial incident now prevents shopping-to-leisure fallback for new departures. General destination commitment, household fallback outside that incident, and alternate-store selection still need a bounded implementation review; do not claim this rule is already enforced throughout the simulation.

## Simple response and optional-trip patience (2026-09-09 latest clarification)

User selected EMS / Clinic as the single tutorial responder. Implement an injury crash, required-service graphic, and real EMS clearance; older active tutorial crashes must not require a reset. Ordinary incident rules are a separate follow-up review. The user wants to deepen mechanics after finishing the tutorial. Trip commitment is not absolute forever: optional leisure may be abandoned after too much delay, with a meaningful consequence and manager notice marking the underlying problem as a priority. Essential trips such as the future work example retain their purpose. This supersedes a blanket prohibition on all goal abandonment, but does not authorize instant substitution. Penalty type, patience, purpose classification beyond leisure, and broader incident roster remain unresolved. Read docs/TRAFFIC-RULES.md for the accepted direction, proposed rules and next decisions.

## Gameplay music and credits correction (2026-09-09)

The user reconfirms 96 BPM for normal in-game background music and has two tracks to supply. What a Jam! is intended for ending credits, preserving its supplied 116 BPM style and lyrics; a future radio station perk may offer it and other radio-style songs. Do not derive a 116 BPM gameplay requirement from the credits song. No new recordings were supplied or installed by this documentation update. User Suno skill: T:\Business\songwriter\skills\suno.txt, readable here at /mnt/t/Business/songwriter/skills/suno.txt. Read it for future Suno prompting; adapt its examples to current game tone rather than reviving identity/corruption themes. See docs/AUDIO-BRIEF.md and docs/DESIGN.md.

## Two-loop tutorial access correction (2026-09-09)

User requires the crash tutorial to keep running, highlight alternate roads at both ends of the H (two loops / infinity shape), show optional Divert selection and placement before the wreck, and retain delayed manager advice. Verify every Home can reach its shopping destination and return; the first Home alone is insufficient. The prior right-side-only bypass acceptance left lower-left homes blocked. Model now checks all current homes against the first Store, with both-end suggestions and ordinary alternative solutions allowed. General visible roadway alerts identify homes without shop/return access, with a focus action and map markers. Show Divert remains optional. No automatic crash pause, including legacy guided towns. Player construction and saved progress are preserved.

## Blocked journeys must produce road queues (2026-09-09 user correction)

Cars must leave home and advance toward their intended destination when an existing road route is temporarily blocked by a crash or diversion. The previous hold-at-home shopping workaround concealed traffic demand and is superseded. Prefer a usable route; if none exists, plan over existing roads through the temporary obstruction, but physical movement still stops before it. Preserve destination, visitor reservation, safe occupancy and saved journey identity. Missing road connections or full visitor reservations can still prevent a departure.

Keep a scene approach clear for emergency work: a civilian approaching a wreck stops before occupying the required working area. Queue followers retain their lane instead of repeatedly reversing toward a distant obstruction with no alternate route. Real alternate routes release the same queued trips. This behavior applies to civilian journeys generally, including the H tutorial; emergency response retains its dedicated rules.191/191 tests and production build pass, covering new departures, visible forward progress, no crossing the wreck, stable queue, save/reload, same-trip bypass recovery, diversion approach and real legacy multi-service clearance.

## Modest traffic-control prices (2026-09-09 user correction)

Stops and Lights must cost money, but remain inexpensive. Lead-selected initial prices: Stops $25 and Lights $75 per governed intersection. This supersedes all earlier free-control defaults. Repeated signal taps only adjust timing and are free. Changing control type refunds its actual purchase before charging the replacement; removal and controls retired by road edits refund actual payment once. Invalid/unaffordable placement changes nothing. Historical controls without payment provenance were free and refund $0. Prices appear in the tool dock. Existing tutorial earnings cover the control lesson; no new control waiver is introduced.
