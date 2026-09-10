# Working ON IT! backlog

## Completed UI cleanup: UI-06 — remove Jobs & city link clutter (2026-09-10)

**Status: implemented and verified locally on desktop and narrow; no publication.** User wants the persistent “Jobs & city link” entry and its Jobs / City link & guide screens removed. Completed jobs/levels, the finished tutorial list and gateway-coordinate reference are clutter, not useful ongoing tasks. This is a new cleanup request after the completed UI-01–05 scope and supersedes its requirement to retain that full board. This focused cleanup is complete before J4; the rest of the overhaul remains closed.

Keep the current mission, live progress/reward and any earned-but-unclaimed reward actionable. “Completed” must not discard an unclaimed payout: preserve its current-card claim flow and exactly-once saved receipt. Preserve underlying mission/level/permit progression, completion history in saves, tutorial gates, explicit Skip and consent to outside traffic. Remove the historical UI, not the player's earned state. Do not replace it with a renamed archive or move the same clutter into another menu.

Delivery, checks and limitations: [UI-06 cleanup](ui-overhaul/UI-06.md). Completed/skipped disconnected saves keep an explicit current-objective invitation; pending consent keeps a truthful explanation and real road-placement recovery. Current claims and saved receipts remain. All 232 model tests, browser regressions and production build pass.

## UI overhaul completed locally (2026-09-10)

Latest verification scope: require desktop and narrow only to conserve tokens. Add other configurations when a specific need arises; the former six-layout matrix is no longer mandatory.

User prioritizes the entire gameplay layout for clarity and hierarchy before further routing explanations or advanced vehicle behavior. UI-01 is implemented locally: reserved gameplay regions, measured camera/input rectangle, and responsive scrolling. See [UI-01 evidence](ui-overhaul/UI-01.md). UI-02 is implemented locally: six-stat top bar, Heatmap and reserved Dashboard; see [UI-02 evidence](ui-overhaul/UI-02.md). UI-03 is implemented locally: one current mission card with visible title, progress and reward; see [UI-03 evidence](ui-overhaul/UI-03.md). UI-04 is implemented locally: uniform tool grid, responsive composition and verified placement; see [UI-04 evidence](ui-overhaul/UI-04.md). UI-05 is complete for the agreed desktop/narrow browser scope: improved narrow map space, fixed mission/briefing controls, full tutorial and saved-town verification. See [UI-05 evidence and limitations](ui-overhaul/UI-05.md). J4 routing explanations remain the next larger feature after the subsequently requested UI-06 cleanup; they were not implemented by this UI task. Blocking correctness regressions remain first. See [UI overhaul plan](ui-overhaul/PLAN.md) for exact layout, data definitions, phone adaptation, file boundaries and completion gates.

| Order | Item | Gate |
| --- | --- | --- |
| 1 | UI-01: shell, spacing and reserved map rectangle (local complete) | Top/center/bottom regions; no persistent panel overlap; correct map input on resize |
| 2 | UI-02: unified stats bar, Heatmap and Dashboard (local complete) | Funds/Visitors/On Road/Fatalities/Time/Weather have truthful sources and working actions |
| 3 | UI-03: anchored mission card (local complete) | Title, description, progress and reward; preserve tutorials, claims and city link |
| 4 | UI-04: uniform build grid and responsive composition (local complete) | Desktop bottom-right grid; phone adaptation; real selection, guidance and placement |
| 5 | UI-05: whole-interface verification (local complete) | Desktop and narrow checks, saved-town continuity and production build |

Retain the Claude UI / Codex integration ownership preference. UI-01 was delivered by Codex after the bounded installed-Claude attempt returned no files; details are in its evidence record. Weather simulation is absent, and Heatmap initially maps to existing traffic diagnostics; the plan explicitly separates these facts from new mechanics. Desktop mission-left/build-right placement is requested; narrow-screen stacking is a proposed adaptation. No mockups; variations last. J3 is implemented and submitted as RUN1.7.6; J4/J5 remain queued after UI. Earlier lists below retain historical work/status and do not override this priority.

## Previous priority: simple opening mechanics (2026-09-09)

User confirmed clear road-congestion versus store-capacity feedback, and “Keep it simple to start”: no new currencies, upkeep charges or broad upgrade trees in the first slice. [Actual Claude/Grok/Codex roundtable](mechanics-roundtable/README.md) recommends this work order; design discussion is complete, gameplay implementation has not started under these items. This takes priority over earlier speculative crisis-charge/driver expansion work; blocking routing bugs remain first.

| Order | Item | Assigned owner | Gate |
| --- | --- | --- | --- |
| 1 | MECH-01: audit trip intent and diagnostic reasons | Codex | Preserve real goals, queues, reservations and reload behavior outside tutorial; identify access versus capacity failures |
| 2 | MECH-02: clear feedback and one untimed growth objective | Claude UI; Codex integration; Grok economy review | Existing buildings/tools/prices; show affected origins/destinations; two real solutions and successful foresight accepted |
| 3 | MECH-03: capacity puzzle and measured economy tuning proposal | Grok; Codex fixtures | Measure income sources and meaningful build pacing before changing balance |
| Later | MECH-04: bounded outside demand; MECH-05: optional occupancy | Codex simulation; Claude progression; Grok balance | First loop must be understandable and satisfying; future systems remain proposals |

This is dependency ordering and assignment, not a promised calendar date or running background implementation.


Lead-maintained queue, September 9, 2026. The lead owns scheduling, specialist briefs, integration and verification.

## Latest tutorial / manager work

- Delivered locally: final two-expansion tutorial lesson, mayor funding reversal, growth-mission land permits and corrected compass arrangement. Full185-test suite, build and320/390/1440 browser flow pass. See docs/land-progression/README.md. Later playtest target: tune6/9/12-household milestone pacing and land-strip size using real city growth.

- Delivered locally: installed Grok authored the More roads! manager modal; Codex integrated a user-opened objective briefing and verified320/390/1440 layouts, pause, dismissal and unchanged objective progress. Closing it preserves the active objective. No runtime AI or new artwork. See [manager briefing](manager-popup/README.md). Automatic inactivity advice remains queued.
- Delivered locally: new-town H roads with no prebuilt buildings, staged Home/Store, growth, one user-approved scripted impaired-driver crash, road bypass/diversion, real all-crew rescue, junction controls and outside-city invitation. Model/UI tool gates and explicit Skip preserve saved towns. Verified independently with real900 starting funds and finite waivers. See [H tutorial](h-road-tutorial/README.md). Physical-device pacing/playtest feedback remains next; this supersedes the earlier modal-only status.
- Later, after progression: unlock “Not yet / I have a plan” only once the player has leveled up. User clarifies this means defer, not abandon: keep the objective pending and discoverable while the player finishes prerequisites or higher priorities. Never offer it for tutorial objectives. Exact level threshold remains open. Deferring must not award completion/rewards or erase unresolved incidents. Schedule after the guided tutorial arc and progression contract. Manager appearances convey more/bigger enthusiasm and visibility, with worthwhile requests whose timing may be wrong.

## Next scheduled slice: crisis workarounds and later optimization

Status: CRISIS-01's first recovery slice is implemented and verified locally (September 9, 2026) after the user asked to start the next item. The remaining advice/economy/teaching work is queued. This is a development work order, not a background automation or promised calendar delivery. See [recovery verification](emergency-recovery/README.md) for delivered behavior and remaining boundaries.

### Accepted direction and playtest evidence

The user reported a car waiting after a diversion made its shop unreachable, then restored access by looping a road down and around to the shop. The screenshot and account are playtest evidence; the exact simulation state/cause has not been reproduced locally. The user also reports police failing to reach a diverted accident and suspects the same for other services. Verify all three services rather than treating the suspicion as a confirmed diagnosis.

Intended loop: **crisis → understandable problem → quick player-built workaround → immediate relief → growth exposes limitations → deliberate optimization**. Time spent resolving a crisis should cost money, encouraging a practical patch now and a better layout later. The manager favors visible action and prematurely celebrates success, echoing “More roads! (More cones!)” from [What a Jam!](WHAT-A-JAM.md). His advice can help immediately without being the best long-term answer. Players learn to surpass it through actual results.

This is the user's middle-management satire: repeated short-term patches accumulate problems. Preserve creative alternatives and effective foresight; do not force every good design to fail. A detour can restore journeys without treating victims or clearing a wreck. Financial pressure is accepted direction; amounts and detailed rules remain to be designed and tested.

## Schedule and ownership

Latest priority correction: the user tried to restore access to the crash, including removing a stop sign, and still could not get responders there. They explicitly never want resetting the city to be necessary. CRISIS-01 is therefore the first blocking correctness task: recover the existing town before advice or financial pressure is delivered. Do not present a simulation deadlock as intended difficulty or recommend a reset as its solution.

| Order | Item | Owner | Dependency / delivery gate |
| --- | --- | --- | --- |
| Pass 1, first | CRISIS-01: responder access through diversions | ChatGPT / Codex lead | First recovery slice verified locally; exact user-save reproduction and clinic-backup behavior remain open |
| Removal complete locally; proposals queued | TUTORIAL-01: remove Practice construction; mayor proposals | Installed Claude Code UI; Codex tutorial/save integration | Removal and lesson continuity verified; Help/Later proposal flow still needs a concrete design |
| Pass 1, alongside routing | CRISIS-02: manager pop-up advice for stranded journeys and blocked EMS | Installed Claude Code; Codex supplies model reasons and action feasibility | Agree diagnostic contract first; integrate against real outcomes |
| Pass 2, before cost tuning | DRIVER-01: driving-style and conflict-risk prototype | Codex simulation; Grok balance review; Claude readable feedback | Queued experiment after advice foundation; establish incident frequency before activating/tuning ongoing crisis charges |
| Pass 2 | CRISIS-03: ongoing crisis costs and visible relief | Installed Grok Build; Claude presents costs | Access and explanations verified; Codex reviews accounting/saves |
| Pass 3 | CRISIS-04: teach patch-now, improve-later | Installed Claude Code; Codex verifies scenarios | Stable access, feedback and costs; integrated growth playtest |

Grok may draft cost alternatives during Pass 1 once dispatched, but charging remains gated on reliable access and explanations. DRIVER-01 now adds an incident-frequency balance gate before charges are activated/tuned, so two new pressure systems are not balanced blindly together. Before dispatch, assign bounded file ownership and respect existing source-access boundaries. Use text-only briefs; do not send the supplied screenshot. Shared model changes integrate sequentially under Codex. These assignments record planned responsibility, not completed specialist work.

### DRIVER-01 — Different drivers expose road-management weaknesses

Latest user-selected success criterion: it must feel satisfying to finally solve a road problem, with all drivers safe and able to reach their destinations, even if the solution requires hard decisions. Make a genuinely solved state attainable at the tested demand. This qualifies the probabilistic proposal: randomness must not force residual crashes from a conflict the player has eliminated. Tests must demonstrate safe service for every driver style and affected approach, not just lower average crashes or a temporarily empty road. Indefinite waits, disconnected destinations and deleted demand do not count as success. Candidate hard choices include spending earned funds, routing trips farther or rebuilding a constrained junction; these are lead examples, not mandatory user-selected mechanics. Preserve workable creative alternatives and lasting relief until a real change in demand/access calls for further work.

Status: queued design/prototype hypothesis, not implemented or balanced. The user is considering cautious/aggressive driving styles with larger/smaller caution areas, and a likelihood of accidents between aggressive drivers at unmanaged conflicts. The goal remains an efficiency simulation in the spirit of Factorio/Satisfactory, with enough disruption to motivate improvements using roads, signs, lights and later tools. This is an invitation to evaluate balance, not selected driver proportions, collision probabilities or a commitment to copy any real vehicle product.

Owners: Codex for bounded behavior/persistence and reproducible comparisons; installed Grok Build for incident-frequency/economy tradeoffs; installed Claude Code for legible risk feedback and eventual teaching/advice. Read existing specialist source-access boundaries before any external-client assignment. No specialists launched for this recording pass.

Current baseline from source inspection: all civilian drivers share the unsigned-junction priority/gap rules. Real incompatible claims accumulate exposure, with a provisional six-second threshold and three-active-incident cap; controls cancel this mechanism. There are no saved driver styles or probabilistic near-miss outcomes. The prototype should replace/adapt this risk policy coherently, not layer a second independent crash roll over it.

Lead proposal to evaluate:

- Start with cautious, ordinary and aggressive behavior profiles. Caution primarily affects accepted junction gaps/lookahead; following-distance variation is a separate candidate because the present tile/lane occupancy model needs explicit support for it. Keep artwork/body geometry separate from the decision margin. No runtime model calls are needed for these local driving rules.
- Assign a stable style to a driver; persist the chosen behavior and any random-generator state so reloads do not reroll danger. Choose household-driver versus outside-visitor identity explicitly during implementation; do not silently change personality every movement tick.
- Aggressive conflicting drivers create greater exposure to a failed yield, not an automatic crash merely because two aggressive cars are nearby. Cautious drivers usually wait for larger gaps, which can trade throughput for safety. Mixed encounters may also be risky where their actual maneuvers warrant it; exact interactions remain to test.
- If probability is useful, apply a seeded chance to a defined real conflict encounter/exposure interval. Avoid frame-dependent independent rolls or a global accident timer. A close call can end safely. Preserve physical conflict evidence and existing no-overlap movement guarantees outside the explicit incident transition.
- Make a risky location understandable through observable hesitation/conflicting claims and a concise risk/near-miss signal. Distinguish a near miss from a normal safe wait; measure it before labeling it. Manager advice still waits for sustained lack of relevant player response, not each encounter.
- For this first experiment, styles obey installed lights/stops; those controls reliably prevent this failed-yield mechanism. Test throughput and waiting tradeoffs so simply covering every quiet road with lights is not universally optimal. Do not add red-light-running randomness that erases the player's solution.
- Growth increases the number of genuine encounters; it must not secretly increase aggression to punish competent play. A well-designed junction may stay safe indefinitely. Accident pressure is a balance target, not a quota forcing periodic failures.

Validation before adoption: compare identical demand/layout across repeatable driver mixes and multiple seeds, with and without controls and with a creative route alternative. Record conflicts/near misses, crashes per completed-trip volume plus per simulation minute, completed trips, long waits, rescue outcomes and quiet time between interruptions. A controlled/redistributed flow should meaningfully reduce this risk while retaining service to demand. Evaluate small-town and grown-town pacing separately; active-incident caps must not conceal an excessively hazardous underlying model. Check save continuation, frame-partition independence and emergency yielding. Preserve current cities and tutorial skip; provide teaching for style/risk cues before expecting a new player to respond to them. Do not claim these hypotheses are player-tested balance.

### TUTORIAL-01 — Remove Practice; offer city additions through mayor requests

Status: removal implemented and verified locally September 9, 2026. Installed Claude Code removed both UI actions; Codex disabled obsolete commands, removed the runtime builder and preserved historical saves. Generalized safe-crossing acknowledgement and actual bypass detection keep the player-built tutorial completable. 171 tests, build and phone/desktop browser checks pass. [Verification](practice-removal/README.md). The separate Help/Later mayor proposal flow remains queued for design; it is not implemented or implied by removing Practice.

User correction: they dislike Practice placing its architecture on their map. Remove the training Practice button. They do like a mayor asking whether something can be added, with the player choosing to help or delay. This supersedes the prior acceptance of the Practice button as a way to stamp a district onto the player's town.

- Remove both the primary “Practice” action and expanded “Add a practice crossing” entry point, plus equivalent exposed shortcuts. Update lesson copy so it no longer directs players to that removed action. Guard obsolete commands from placing a district accidentally.
- Preserve existing towns, previously placed practice construction and historical learning/save receipts. Removing access to the action is not authorization to delete buildings already in a saved city.
- Keep collision, controls, emergency-response and detour teaching achievable through actual gameplay; avoid a lesson that now requires an unavailable practice flag. Retain skip and recognition of safe solutions. Verify existing and new tutorial progress without reinstating automatic district placement.
- Design a separate mayor proposal: explain the requested addition and let the player choose Help or Later. Delaying preserves the city and leaves the request available; it must not quietly consent, auto-build or force a failure. An accepted request can create authentic new demand that the player helps accommodate.
- Exact request contents, whether Help starts a player-built objective or authorizes a clearly previewed placement, siting, funding, re-offer timing and no-space alternatives remain open. Do not merely rename the old stamp button. Make effects, site and costs reviewable before any authorized automatic placement; preserve player ownership and creative layout choices.
- Keep mayor proposals distinct from stalled-player advice and automatic construction-cost waivers. Advice still requires the existing inactivity condition; a proposal is a request for player choice, not permission inferred from silence.

Acceptance: neither tutorial view exposes Practice; stale actions cannot stamp a district; old saves retain construction/progress; lessons remain completable/skippable. For the subsequent proposal flow, Later leaves layout/funds unchanged and the request recoverable after reload; Help has an explicit understood outcome, honors space/access constraints and never replaces existing construction without a separate player decision. Character copy and final layout remain to design.

### CRISIS-01 — Appropriate responder access through diversions

Priority: correctness prerequisite. Owner: Codex.

Delivered first slice: service-aware diversion routing/movement, alternate scene approaches, congestion detours, longer safely reserved straight passes, persisted waiting lanes and exclusive scene arrival. 170 tests and phone/desktop browser checks pass; fatalities and later clearance survive saves. Historical inspection findings below describe the pre-fix code. The second-clinic assignment limitation remains; resolve it before advice promises backup dispatch. See [implementation and limits](emergency-recovery/README.md).

Required outcome: existing affected saves can continue and incidents remain recoverable through working mechanics, without resetting the town, losing construction/balances/progression, or silently deleting the emergency. Preserve a copy of any available affected save before reproduction/migration. The screenshot alone does not provide the exact save; use synthetic regressions as well and do not claim the user's city is repaired without evidence.

Latest user clarification: prioritize emergency vehicles' ability to get through heavy traffic as the practical solution, rather than relying on duplicate stations. Responders should normally make progress through dense queues, but traffic can be too obstructed for timely access. Serious crashes that cannot be reached before their rescue deadline can result in fatalities; protecting lives is a real reason to improve access. Recoverability means the city can eventually clear the scene and continue, **not** that every victim must be saved. Missing the rescue deadline must not permanently strand the incident or require a reset.

Codex's first-pass scope therefore includes reproducing dense-traffic response and evaluating the existing yielding/opposing-lane passing limits. Derive “too thick” from physical occupancy, usable lanes, junction clearance and safe maneuvers, not an arbitrary traffic-count cutoff. These are implementation criteria to test, not a user-selected density formula. Preserve meaningful travel time, obstructions and rescue deadlines; do not grant guaranteed timely arrival, overlapping vehicles or teleportation. Verify a crowded but traversable route permits response, an actually blocked approach can cause a late rescue/fatality, and later restored access still allows all required crews to clear the scene after a fatality. Keep the medical deadline and subsequent city recovery distinct.

Initial read-only code findings (September 9, 2026; not a reproduction of this particular incident):

- `cityModel.ts` uses the same closure/wreck blocking set in `findPath`; `cityIncidents.ts` uses that pathfinder for responder dispatch and filters scene access through `isBlocked`. There is currently no service-specific diversion exception in these paths.
- `dispatch` skips a service whenever `serviceAssigned` finds an existing matching responder, including a waiting one. A fresh clinic therefore does not by itself replace a stuck assigned ambulance. Verify safe recovery/reassignment before offering that advice.
- Traffic retries a waiting responder's saved target through `retarget`. Review whether a newly reachable different side of the scene is considered, and whether ordinary occupancy can deadlock otherwise connected access. Removing a stop sign changes neither closure filtering nor assignment ownership.

These findings guide regression cases, not a definitive diagnosis of the supplied screenshots. Reproduce valid alternate access after road edits, changed scene approach, queue/passing restrictions and stale service assignment. Add a save/load continuation regression for each confirmed failure. If a recovery mechanism is necessary for irreducible jams, design it explicitly while preserving the town and real rescue/clearance semantics; do not quietly add teleportation or erase incidents.

- Reproduce police dispatch failure near a diverted incident; check EMS/fire and vehicles already responding.
- Distinguish civilian diversion from physical obstruction and incident-specific unsafe access. Responders may pass a diversion when their service can use a physically valid route appropriate to the emergency. Do not grant blanket passage through wrecks or hazardous disaster tiles.
- Define permitted approaches/staging positions for existing incident types before adding new disasters. Retain actual station entrances, occupancy, required scene work and return behavior.
- Explain missing, busy, unreachable and unsafe access truthfully where the model supports the distinction.

Acceptance: civilians remain diverted while each required service reaches a valid scene access position. Physically severed/impassable routes still block access with a clear reason. New connections permit recovery. Cover minor/serious/fire incidents, changing closures, safe occupancy, return routes and save/reload. All required crews still contribute to clearance.

### CRISIS-02 — Manager pops up with situational advice

Priority: same first pass. Owner: Claude Code; Codex owns model diagnostics.

- Distinguish unreachable destination from queues, traffic-control waits, full destinations and emergency yielding. Identify the affected destination and blockage from simulation evidence.
- Give concise nonmodal manager guidance visible while building. A diversion cutting access is a natural “More roads!” moment: explain the need for a connection around the closure to the shop's actual entrance.
- Support inspection/focus and clear feedback when access returns; avoid stale advice and repeated interruptions.
- Suggest a bypass without requiring a prescribed shape or automatically constructing it. Reopening a safe route or another creative valid solution also works; extra roads are not universally optimal.

Candidate copy, not selected mission text: “More roads! Give that driver a way around the closure to the shop.” After actual resumed travel: “Moving again! Another personal triumph.” Crew feedback can reveal the tradeoff without inventing measured results.

Acceptance: reproduce the stranded-shop case, explain the actual reason, and let the player build their own loop and watch the same journey resume safely. Clear advice when its cause changes. Verify phone/desktop readability, simultaneous problems, pause and reload.

#### Additional user example: blocked EMS and another clinic

The user supplied a second screenshot and reports EMS unable to reach the crash. This extends CRISIS-01 reproduction coverage: distinguish a disconnected route, occupied approach, failed emergency passing and dispatch assignment before diagnosing the cause. A still image does not establish which condition applies.

Accepted character behavior: the manager should pop his head up when he thinks he can help and offer advice. In this example, he suggests building another clinic: a potentially inefficient duplicate that gets help to the scene now. This is an intentional short-term workaround, not a mandate to improve the existing clinic's route first. The user explicitly raises the no-space-for-another-clinic case as an unresolved design problem.

Latest user clarification: unsolicited advice appears **only after the player has not responded to the problem for a sustained interval**, not immediately when a problem is detected. Traffic remaining disrupted costs the city money during that opportunity to act; delaying advice does not itself delay or suspend disruption costs. Exact delay and expense rate remain unselected tuning.

Codex/Claude should define problem-specific response evidence: relevant road/access edits, relevant service construction or control/diversion changes can postpone advice; unrelated clicks or camera movement should not count as solving the problem. Actual recovery retires it. Distinguish actively attempting a fix, waiting for a responding crew and sustained inaction before prompting. Use simulated time so pause does not consume the response window. These detection details are lead proposals to validate, not user-selected thresholds. This advice timer is separate from the existing tutorial construction-waiver timer; neither a delayed hint nor its dismissal automatically awards a grant. Passive status/cost readouts may remain visible while the manager waits; preserve the existing first-crash tutorial explanation.

Scheduled in Pass 1 under Claude's CRISIS-02 assignment, with Codex supplying feasibility/dispatch facts. Grok checks affordability and interaction with existing construction waivers as part of Pass 2. Do not limit this advice system to tutorial players or clinics; the manager should react to supported situations throughout play.

Lead-proposed implementation contract, to evaluate before coding:

- Author a bounded advice rule set: observed problem → feasible immediate actions → character line → focus/tool action → real outcome that retires the advice. Keep model diagnosis separate from his opinion about the best solution. No runtime AI service is required by this direction.
- After the inactivity condition above is met, a head/portrait and short speech bubble appear nonmodally; players can dismiss it and continue building. Prioritize urgent rescue among eligible hints, suppress repeats for the same unchanged problem and reconsider when routes, space, funds or incident state change. Urgency does not bypass the user-required opportunity to respond. Cooldowns, placement and animation remain Claude's design choices, subject to phone/desktop review. Any new portrait artwork remains a candidate pending user selection.
- “Build another clinic!” should identify a viable service area: room for the logical footprint and entrance, an existing or feasible player-built road connection to a valid incident approach, and a clear cost. Do not promise rescue merely because an empty rectangle exists or a clinic is closer on screen.
- Verify whether a fresh clinic can actually dispatch to this incident when its current ambulance is already assigned but stuck. Define safe reassignment or backup behavior if needed before claiming a second clinic solves it; avoid duplicate treatment, disappearing responders or overlapping occupancy. This dispatch check belongs to Codex in CRISIS-01.
- When there is no viable clinic site, offer a context-valid alternative: connect a road to the existing clinic, open a safe approach, or consider expansion/reconfiguration where it can actually create access. These are proposals, not selected new mechanics. Never repeatedly instruct an impossible purchase or require automatic demolition. If no immediate solution is known, explain the constraint rather than inventing a guarantee.
- Being shortsighted means favoring a workable expensive patch, not giving mechanically false instructions. Players remain free to choose a more efficient solution. Building a clinic is not itself proof of rescue; celebrate the actual service outcome.

Candidate line, not final copy: “Ambulance stuck? Build another clinic on the side that can reach them! I'll call it expanded coverage.” Candidate no-space fallback: “No room? Give our existing ambulance another way in.” Only use the fallback when an alternative connection is feasible.

Additional acceptance: blocked assigned EMS; a second clinic with real access and successful dispatch; no buildable clinic footprint; empty land without service access; insufficient funds; a route restored without another clinic; resolved incidents; dismiss/repeat behavior; skipped/completed tutorial play. The manager must adapt instead of getting stuck repeating “build another clinic.” Observe whether the proposed fallback is understandable in play; the no-space design remains open until verified.

Timing acceptance: no unsolicited manager pop-up immediately on detection; sustained inaction produces one eligible hint; relevant attempted fixes postpone it; unrelated UI activity does not indefinitely suppress it; recovery cancels it; pause freezes the timer; reload preserves the remaining opportunity without instantly re-prompting. Verify traffic-disruption expense continues under its own rules before and after advice, and stops at actual defined traffic relief rather than on hint display, dismissal or mere construction.

### CRISIS-03 — Crisis duration costs money

Priority: after access and explanation. Owner: Grok Build for economy, Claude for presentation, Codex for integration.

- Add an explicit ongoing crisis expense. Show its rate, accumulated expense and what stops each charge.
- Retain fatalities from late serious-crash response as a distinct human consequence alongside financial disruption pressure. The user's “cost of keeping people alive” does not select an additional per-fatality monetary fine; any such charge would be a separate design proposal.
- Define relief separately for restored traffic, medical response and scene clearance. A bypass may relieve disruption while emergency work remains necessary; it must not silently count as full resolution.
- Preserve saved balances on migration, actual-paid construction refunds, earned income and automatic stalled-objective construction waivers.
- Keep a recoverable path at low funds. Evaluate pressure against the current 900 starting budget through playtests.

Grok proposes, lead evaluates: charged states, rates/grace period, stacking, partial relief, low-funds floor/debt behavior and tutorial introduction. No numeric drain or debt system is selected here.

Acceptance: expense follows simulated time, freezes on pause, survives reload without duplicate/missed accounting and stops at the defined real outcome. Check detours, partial responses, simultaneous incidents and low funds. Fatalities, deletion or reload must not become profitable shortcuts to erasing a crisis. Compare quick patches and permanent improvements in play.

### CRISIS-04 — Outgrow the manager's quick fixes

Priority: follow-up teaching/growth pass. Owner: Claude Code, with Codex simulation verification.

- Teach the blockage, player-built workaround and immediate result through real simulation. Explain the action and expense before introducing financial pressure; retain skip and automatic construction waivers.
- Revisit the same town under growth: the bypass can add travel time, arrival pressure or a bottleneck, giving reasons to improve roads and controls.
- Let the manager celebrate immediate relief and expose his shortsightedness through believable consequences and dry crew feedback. Preserve care for people during rescue.
- Respect successful foresight and alternative layouts; do not trigger failure because the player is doing well. Future buses and wider/one-way roads remain separate scope.

Acceptance: players can build a patch, see appropriate financial relief, retain their town through growth and demonstrate later improvement at comparable demand. A sound initial solution remains valid. Measure served trips and waiting together so deleting demand cannot masquerade as efficiency. Record player observations separately from the hypothesis that the loop is enjoyable.

### Delivered: H tutorial crash pacing (2026-09-09)

Codex: optional Divert with saved-step recovery; services unlocked immediately at the crash; live traffic retained; suggested bypass tiles; manager waits30 simulated seconds without construction progress; explicit compact pause/resume UI. Existing free construction retained.187/187 tests and production build pass;320/390/1440 browser checks cover placement, delayed advice, running traffic, unlocked services, reload and Skip. General main-game contextual advice remains a separate backlog scope. No upload performed.

### Next routing follow-up: preserve intended destinations throughout play

Owner: Codex. Schedule: next routing correctness item, before adding driver-style chaos. User-approved direction: failed access must retain the intended journey rather than substitute an easier activity/destination. Review household purpose fallback, alternate-store selection and in-flight retargeting outside the current H tutorial fix. Distinguish initial demand assignment from changing an already committed destination. Acceptance: blocked shopping never turns into a park trip; alternate routes retain the goal; current return trips finish; restored access resumes demand; save/reload retains intent; capacity and income remain correctly accounted. Define understandable handling of deleted destinations separately so permanent removal cannot strand a town. This is recorded work, not a claim of implementation.

### Post-tutorial mechanics rules — next design task

Owner: Codex lead. Review docs/TRAFFIC-RULES.md with the user after this tutorial pass: classify optional/essential trips, choose the abandonment consequence, establish simulated patience and recovery signals, then define simple and specialist emergency roles. Implement persistent intent before adding abandonment or driver-style chaos. EMS-only tutorial and required-service badge delivered locally; broad incident rebalancing, patience, penalties and general manager alerts remain pending.

### Audio handoff and future radio perk

Next audio integration: receive/audition the two user-selected 96 BPM background songs, preserve masters, establish loop or track transitions and music controls, then verify browser/RUN playback. Files have not yet been supplied here. What a Jam! belongs to ending credits. Later possibility: unlockable radio station offering radio-style songs, including What a Jam!; unlock rules, UI and any physical building remain undecided. Keep this separate from ordinary background music integration.

## Foundation delivered locally (2026-09-09)

User requested modular mission/level structure, toggled diagnostics and a tweakable rules file: first foundation implemented; [details and limits](mechanics-roundtable/IMPLEMENTED.md). Full destination-intent audit and sustained-flow puzzle validation are still outstanding; do not mark MECH-01/02 fully finished solely from UI foundations. Automatic city link now follows confirmed tutorial exit (supersedes manual coordinate selection). Actual Claude park sprite candidate is ready for user selection; no park gameplay changes requested.

Park artwork: user approved Claude candidate; installed locally with four entrance variants. Production build and isolated in-game rendering verified; no gameplay changes.

## Next UI correction: explain building rotation

User reports building rotation is unclear during the v0.2 upload. Make the Rotate control and current entrance direction obvious, show the entrance move in the placement preview, and explain that artwork stays upright while the logical footprint/entrance rotates. Include phone tapping and keyboard R guidance without relying on keyboard-only instructions. Queued after this upload; not included in RUN1.7.0.

Rotation visibility fix implemented locally: selected buildings expose a yellow “Rotate” button with entrance direction; desktop also displays R. Phone control shares the category row to retain map space. Tap/R update the preview through existing rotation state. Build and320/390/1440 browser checks passed. Not included in the earlier RUN1.7.0 upload.

## Pause clarity and future pause music

User clarified missing music was caused by the city being paused and finds the pause state confusing. Make the paused state unmistakable with a clear Resume action; investigate any unexpected automatic pause source before changing simulation behavior. User plans a separate pause music track; none supplied yet. Do not relabel the gameplay track as pause music or silently change its full outro/restart.

Separately, investigation reproduced a lifecycle edge case: onSleep marks music sleeping, while onResume alone clears only store.paused, leaving audio stopped if onAwake did not occur. Queue a bounded lifecycle correction with host-event coverage; this was not the cause of the user's clarified report and is not included in RUN1.7.1.

Pause clarity delivered locally: persistent yellow GAME PAUSED banner with Resume game action and traffic/music explanation, visible for any paused gameplay state, including after tutorial. Header Play label now Resume; redundant tutorial-only pause row removed. Phone/desktop pointer and Space checks passed. Not uploaded with RUN1.7.1.

Pause presentation revised per user: darkened game with centered pause menu replaces banner. Resume game and Main menu, focus containment and Escape resume implemented locally. Future radio controls can extend this component. Build and320/390/1440 browser checks pass. Not uploaded yet.

### Saved-city gridlock follow-up (2026-09-09)

User reports multiple stuck emergency crews and civilian queues that do not respond to added roads. Prioritize working rescue access and automatic rerouting before advice. Main-game manager should offer delayed, situation-specific help for unresolved access/congestion ("MORE roads!" only when a usable alternate route would help). Trip abandonment is not approved as a universal timeout: preserve mandatory destinations; separately design optional leisure cancellation with unmet-demand/city-cost feedback. Never require a city reset to apply routing fixes. Existing congestion recovery work is being verified against saved-state emergency continuations.

### Rich traffic world, delivered affordably (user vision, 2026-09-09)

User supplied broad future direction: varied purposeful vehicles, emergent congestion/spillback, advanced road/control tools, scenario variants, blueprint diagnostics and modular city assets. Requested Grok/agent review and token/cost conservation. Scope and short reusable prompt: docs/traffic-world/README.md and reusable-prompt.txt.

Work order proposal: current real-player responder diagnostics/recovery first; then the routing-cost/adaptive-rerouting plan and one measured junction puzzle with current tools; one-way/roundabout prototype; lane simulation; later buses, pedestrian conflicts and grade separation; scenario and visual variations last. Mockups are removed. This initial proposal defers mass asset generation and a broad upgrade tree. Treat six named scenarios as shared-map data presets with explicit demand rules. New artwork still requires user selection before adoption. Agent suggestions are design proposals, not implemented behavior or playtested balance.


### Advanced routing direction — jam interpretation (latest user addition)

Plan added in docs/traffic-world/routing-plan.md. Priority: real responder diagnosis/recovery; shared cost snapshots; bounded stable weighted rerouting; emergency policy; decision traces in the current live debugger; one measured mission. Preserve goals, hard route constraints, safe occupancy and return paths. Lead proposes the global network observer be advisory in the jam; requested automatic retiming/lane/detour strategies remain later player-enabled tools to resolve, not silently implemented behavior. Rules and narrow typed events keep simulation independent of Pixi. No per-car LLM or new hosted dependency proposed. User explicitly removes mockups entirely and puts variations last; this supersedes the prior first-comparison-sheet assignment. Planning only, no code change in this update.
