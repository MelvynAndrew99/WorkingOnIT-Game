## One-way streets delivered locally (September 11, 2026)

[Implementation](transit-and-one-way/IMPLEMENTED.md) delivers direction selection, ring flows and arrows through shared route/physical/save rules. Existing roads remain two-way until edited; direction changes preserve real trips and require occupied/reserved space to clear. Existing Stop/Light controls still govern ring entrances; circular geometry does not automatically establish roundabout priority. Buses and coordinated signal offsets remain queued, and the user still owns mission structure. No upload in this implementation pass.

## Bus infrastructure, walking and one-way streets (September 11, 2026)

The user is preparing the mission plan and requests parallel design/delegation of a physical bus station with parking, one-square bus stops, real buses that trade localized queues for fewer cars per traveler, and one-way roads for circular/dense layouts. Neighborhood walking and coordinated signals are intended teaching opportunities. [Design package and assignments](transit-and-one-way/README.md) supplies source-grounded transit, directed-road and art handoffs. Three Codex design agents were launched; implementation is still queued. Preserve existing missions, saves and the smooth-frame-pacing constraint. Dimensions/capacities/prices are provisional; traffic direction, roundabout entry priority and signal phase offsets must each work in the model before being taught. This new work takes precedence over the older generic widening-next sequence for the current requested design pass; widening remains queued.

## Outside connection remains an edge (September 11, 2026)

The connected side is fixed: expand elsewhere. Existing interior connectors move to a free outer-edge tile, with a highlighted prompt to build the road connection. Preserve the town and visitors; relocating an exit never teleports a car or completes a rescue. See [implementation](land-progression/connected-edge/README.md).

Manager correction: he should sound sincerely helpful, not conceited. His motives are self-serving but he does not announce that through a credit-taking punchline after every suggestion. User proposes: “Oh, another crash! Here is what I would do, build more roads!” His priority choices and eagerness carry the underlying motive. Delayed advice is still separate work.

## Title-screen character clarification (September 11, 2026)

The manager’s worn MANAGER label reads strongly as MAN because AGER has faded/rubbed off through use. He is kind and knowledgeable, but out of touch. The title uses “Good as new!” over his visibly obvious road patch: the visual mismatch lands without prior gameplay context. Reserve the more-roads joke and credit-taking theme for gameplay; do not use happy-accident wording on the title, which could imply players should cause crashes. This supersedes the peeled-off-lettering explanation.

## Intersection danger as a core optimization mechanic (2026-09-11)

Latest user priority is shared intersection balancing, including danger with unsuitable controls as traffic use grows. Preserve the current Level 2/3 maps. Poor Flow ratings alone do not cause crashes; repeated local conflicting arrivals do. Quiet traffic can remain safe unsigned. Moderate crossings can use stops; overloaded stops can need lights or route separation. Signals protect perpendicular traffic, while heavy opposing left turns sharing green can need different timing or separated routes. This supersedes older blanket-control-immunity descriptions below.

Implemented locally with distinct encounter history, area-wide exposure and gradual cooling, a warning lead time, and actionable warnings in both modes. Correct controls/routes must still serve every household; waiting forever or deleting demand is not success. Saved diagnostic measurements support a safety heatmap later. [Measured delivery](traffic-safety-balance/IMPLEMENTED.md): 272 tests, build and desktop/narrow verification pass. Incident severity cycling and physical pile-up response remain separate follow-up work. No publication or mission-map changes.

## Approved map, sparse starter town and later growth (latest user direction)

The user approves the modern top-down map, The Man's identity, DKC-inspired progression and portrait/ribbon awards. They envision future cities, locations or changes as the town grows. For levels1–25, they prefer a less-dense starting town if Grok supports it. Actual installed Grok recommends a sparse starter plate: ordinary modest buildings, open parcels, gravel shoulders and unfinished dirt stubs around a useful paved network. The approved dense-city artwork remains valuable for a later destination or grown-up version after25, outside current scope.

A new sparse backdrop is implemented locally; all25sites keep one coherent theme,1–4 remain playable and existing missions/saves are unchanged. Dirt is decorative, not a new road mechanic. No automatic growth, map-swap trigger or future-city unlock has been implemented. [Starter town delivery](challenges/starter-town/README.md). No publication.

## Mission map revision: one town and The Man's awards (latest user decision)

The user rejects the fantasy scenery and five short themed sections from the first progression overhaul. Use the approved title-screen modern city, viewed from above, as one continuous theme for levels1–25. A second theme/map only belongs beyond25 and is outside the jam scope. DKC1/2 references inform connected waypoints, an NPC progressing through the world and character heads marking finished levels; do not import their art or fantasy setting.

Completed site numbers become The Man's recognizable face, with a decorative award ribbon in the corner. A small replay number may remain on the ribbon tail and in accessible labels/briefings. Use the title character's swept hair, tie, reflective vest and clipboard, not a generic hardhat replacement. His awards express eager self-credit for real useful work. Optional comedic map hints should derive from the game's sincere-help/poor-priorities/recognition tone and teach sound access/return/service concepts.

Actual installed Grok received the rejection and revised the design; Codex implemented the single pannable city, referenced character art, portrait/ribbon presentation and optional landmark dialogue. Levels1–4 retain their real maps and saves;5 awaits user authoring and5–25 remain upcoming. [Delivery and verification](challenges/commute-map/README.md). No publication.

## Challenges mode, The Man and the radio (September 10, 2026)

## First 25 missions: latest direction for the next discussion

The first ten missions will focus on placing roads, connecting homes to stores and reducing commute time across different intersection layouts. This supersedes the planned early crash/control lesson order, but does not change published maps or saved progress yet. [Mission requirements: Levels 1–25](challenges/MISSIONS.md) records the confirmed direction and a proposed sequence expanding into congestion, destination capacity, crashes, emergency access and diversion. Individual maps, targets, budgets, star criteria and later-level ordering await discussion/playtesting. The user reports 46 unique players and hopes short challenges encourage return visits; retention is a hypothesis, not a measured result. Documentation only in this pass; no implementation, publication or agent discussion scheduled automatically.


## Learn it, earn it, use it in your town (confirmed progression direction)

User confirms a mobile-first progression built around small, quick, predetermined challenge quests. Like Chess.com puzzles, they teach pattern recognition and strategy; like a Candy Crush-style level path, they introduce ideas in a curated sequence with clear objectives, completion rewards and increasing combinations of learned skills. Introduce one idea, let the player practice it, then build on it before introducing another mechanic. Exact session lengths, level counts and reward thresholds still need playtesting.

**Meet it → practice it → solve with it → unlock it for your town.** Challenge quests become the intended route for learning and earning new sandbox tools, buildings or mechanics. The player gets access to the mechanic inside its teaching challenge, demonstrates understanding, earns the unlock, and can then use it freely in their persistent town. Unlocking availability does not imply a free placed building. Exact feature-to-quest mappings remain to design; examples such as a crossing lesson unlocking traffic lights or a capacity lesson unlocking wider roads are illustrative, not an implemented unlock tree.

**The sandbox remains the main game**, including its story and monetization direction below. Challenges are its learning path and a curated showcase for new content, developed alongside the sandbox rather than replacing or postponing it. Players bring what they earn into their own towns, where they can combine mechanics and optimize systems freely. Challenge attempts stay disposable; earned progress and the sandbox town stay persistent.

This also defines a repeatable development and release approach: build a mechanic in the shared simulation, author a few focused challenges that demonstrate it, test valid solutions and alternatives automatically, observe whether players understand and enjoy it, then make it earnable for sandbox use. Later features can extend the challenge path with new lessons and unlocks. Automated correctness does not establish fun. Curated level progression does not imply lives, energy, paid retries or timer skips.

Implementation recommendations, not yet selected reward rules: grant the functional unlock for lesson completion, with extra stars rewarding mastery rather than blocking basic access; retain existing towns' tools and earned unlocks; ensure players already have essential recovery tools before exposing their town to the corresponding problem. Do not require leaving an active emergency to unlock its rescue service. Define save migration, new-town starting tools and the relationship to the H-road tutorial/Skip before enabling gates. Existing tutorial behavior and access remain unchanged until that transition is implemented.

Status: design direction recorded, **challenge-earned sandbox unlocks are not implemented yet**. The current four playable challenges, fixed budgets and saved stars remain as documented in [challenge delivery](challenges/IMPLEMENTED.md). This update does not authorize runtime gating, payments or publication.

## Mobile challenge map and completion flow (September 10)

Use a scrollable numbered route map, inspired by the clarity of Candy Crush's level path, with this game's own visual identity. Tap a level for a concise objective, enter a disposable town, solve it, then celebrate with a saved star and **Retry / Next / Level map**. Keep a Main menu exit and the persistent sandbox separate. Small focused lessons should introduce mechanics, combine familiar ideas and provide curated showcases as the game grows; challenge-earned sandbox unlocks remain the intended future progression described above.

The opening sequence now teaches: **1. connect a home and store, winning immediately when the car arrives; 2. connect vertically separated homes and complete their shopping round trips within a stated time; 3. rebuild a missing crossing and serve everyone without an accident, learning traffic management.** A preinstalled winning light would defeat the third lesson. The older sustained-flow puzzle remains a fourth bonus with its saved progress intact. Current Level 2 uses a provisional 45 simulated seconds from running traffic; pause freezes it. Retry never removes earned stars. This timed disposable lesson does not introduce a sandbox failure countdown.

Implemented route/results and four lessons are documented in [challenge delivery](challenges/IMPLEMENTED.md). One completion star is saved today; additional star criteria and feature unlock mappings still need design and playtesting. Fixed challenge budgets have no income. Do not infer energy, paid retries or timer skips from the reference images.

## Challenge lessons alongside the sandbox: latest clarification

Begin with connecting one home to a store, then roads for a group of homes; the traffic-flow puzzle follows. Challenges currently have fixed construction budgets with no town-support or visit income. Normal refunds remain useful for experimentation. The sandbox economy and main-game story/monetization direction remain unchanged. Main-menu Challenges shares the main Continue styling, and levels provide a direct Main menu exit. See [implementation](challenges/IMPLEMENTED.md).


## Sandbox remains the main game (September 10, 2026, corrected)

User corrects the earlier challenges-first interpretation: build the sandbox as the main game, including the story and monetization direction below, while using small predetermined challenge levels to teach pattern recognition and test the lessons/mechanics being built. These develop together; sandbox work is not deferred until after a challenge release. Bounded challenges can provide completed jam content without replacing the main game. Add a main-menu Challenges entry and make the existing flow puzzle's objective explicit. Challenge retries and progress stay separate from the sandbox town. Challenge-earned sandbox unlocks are now the confirmed direction above; exact mappings, later stars and level count remain open. No publication is authorized.


User direction from a monetization and character discussion. All of it needs people playing before it counts as good design.

**Challenges (puzzle section).** The user wants Chess.com-style puzzles that teach the rules gradually and grow harder under the same game rules, with the sandbox for free experimentation. The first puzzle: get a car from A to B in this city in under 1 minute, with limited supplies. Maps can be exported and simulated in advance, so puzzles can ask the player to add to or update an existing map, as civil engineers do. Implementation starts September 11. See [challenges plan](challenges/PLAN.md) for the proposed contract, pre-simulation checks, first puzzle set and open questions. "Challenges" is a working label chosen to avoid confusion with the existing mission card.

**The Man.** The manager is referred to as **The Man** for now; a later change is possible. The "AGER" on his worn MANAGER sign has peeled off, so people call him The Man and he cheerfully adopts it. It is an inverted Doctor Who nod: nobody knows his name because he isn't important enough to remember. Players learn about him gradually, including his mayoral aspirations and over-enthusiasm. A real-name reveal at the finale is a lead proposal, not a decision.

**His catchphrase.** The user wants a Bob Ross-inspired "no mistakes, just happy little accidents" philosophy. The irony is that traffic engineering treats crashes as preventable, and he doesn't understand that. User research (September 10): the phrase "happy little accidents" can be used in this comedy context, but never pair it with Bob Ross's name, face or branding, or imply that he is saying it. The Man says it as his own philosophy. Twists such as "No mistakes, just happy little detours" remain optional variants. A crew reply such as "We call them crashes now, sir" is candidate copy. Final wording is not selected.

**Deaths are a player mechanic.** Fatalities are a game mechanic for the player, not a portrayal of The Man.

**Good advice, wrong order.** His help is actually good but poorly prioritized, like most managers, and it often needs yak shaving: prerequisite work before it can be carried out. Players learn to choose between doing what he says immediately and fixing the consequences later, or adding it to their to-do list and working toward it. This becomes obvious as the levels progress. It builds on the queued "Not yet / I have a plan" deferral in [BACKLOG.md](BACKLOG.md).

**Radio station.** Suno-made songs, including kids' songs and What a Jam!, unlock on beating the game or after a number of hours played. Lead proposals: count active unpaused play time, unlock on whichever comes first, keep it unlocked when later updates extend the ending, and verify Suno commercial-use rights before any paid song content. The ending is not defined yet because mechanics are still being built. Hours-played can ship before the finale exists.

**Scope and monetization.** The user now expects v1 to take a few months beyond the jam and plans YouTube Shorts devlogs of development. Favored monetization directions are the radio (an optional RunBucks early unlock on top of the free earned path) and vanity items that play on the manager's ego, such as statues and plaques. All of it is deferred until playtesting shows people enjoy the game. Lead recommends avoiding paid timer skips, energy systems, pay-to-rescue, and selling funds, land permits or solutions. Nothing is implemented. RUN's options are documented in `node_modules/@series-inc/rundot-game-sdk/docs/rundot-developer-platform/api/` (PURCHASES, SHOP, ENTITLEMENTS, ADS).

## Latest roadworks decision (September 10, 2026)

Upgrade areas initially block all vehicles, including emergency responders. The user expects short downtime and requests a pause-menu Arcade/Realistic simulation preference. Actual Grok reviewed the shared-engine mode contract: [roadworks modes](roadworks/MODES.md). Proposed first distinction is shorter upgrade/restoration time in Arcade, with shared physical safety and clear access information. Neither mode silently permits responders through active works. Exact timing and any additional rescue protection are not yet selected. Installed Claude is assigned the sprite generation; rendering must remain independent of logical road geometry.

## Whole-game service through change (September 10, 2026)

Flow/service objectives are the game's continuing core, not a single lesson. The user wants road and destination single-point-of-failure challenges, real widening and timed road upgrades that require traffic detours while emergency access remains meaningful. Fun-first direction and player-owned cities remain. See [roadworks/resilience discussion](roadworks/PLAN.md) for terminology, sequencing, timer/recovery proposals, actual Grok review and the unresolved work-zone emergency-passage policy. Upgrade timers are now selected in principle; this does not add timers to ordinary construction. No runtime changes in this discussion.

## Latest direction: fun-first flow puzzles (September 10, 2026)

The user wants transportation-engineering-inspired problems to emerge in their own growing towns after the tutorial. Fun takes precedence over technical accuracy; exaggeration is welcome when causes and the payoff remain understandable. Civic goals should ask for useful service/growth, allowing road layout, controls and destination placement as alternatives. They selected existing tools for the first puzzle, with actual four-lane widening afterward. The A–F LOS metaphor is inspiration rather than a requirement for professional calculations or a mandatory widen-to-win lesson.

See [the Grok-informed flow-puzzle plan](flow-puzzles/PLAN.md) for the first untimed service puzzle, prototype gates and widening sequence. Busy destinations mean customers served and able to return, not permanently full parking. Existing cities/tutorials and saved receipts remain. No new runtime implementation or publication in this design discussion.

# City building and traffic optimization

## Modular missions, views and automatic city link (2026-09-09)

Latest user authorizes implementation of a mission structure carrying learned patterns into growth/levels, switchable diagnostics, and modular tweakable rules. Park request is explicitly appearance-only: actual Claude authored a candidate SVG; adoption awaits user selection. The user now wants automatic external connection after asking whether they want to end the tutorial, superseding manual edge selection. Confirmed exit/Skip arranges a free vacant-land access road if needed; ordinary saved towns do not silently connect. Pending consent persists when no safe corridor exists.

Implemented locally: data-driven mission patterns/dependencies, current growth level/land progress, an all-households access outcome, and mission links to Normal/Traffic/Access/Visitors views. Diagnostic module only reads simulation; central cityRules.ts tunes first-slice targets, rewards and stopped-vehicle threshold. No new currency, upkeep or broad upgrades. Existing completion receipts remain earned. See [implementation and tuning](mechanics-roundtable/IMPLEMENTED.md).

## Simple opening efficiency loop (2026-09-09, latest user confirmation)

The user explicitly agrees: distinguish a road that cannot carry enough traffic from a store that cannot serve enough visitors, with clear feedback that makes the manager's advice understandable and funny. Keep the first slice simple: no new currencies, upkeep charges or broad upgrade trees. Ample early space permits inefficient solutions; chosen growth and density create later road puzzles without making ordinary play feel rushed. Preserve successful foresight and existing cities.

Actual Claude Code, Grok Build and Codex researched and cross-reviewed economy, buildings and road puzzles. Their recommendation is to audit trip intent, expose congestion/access versus visitor-capacity reasons, and test one untimed growth objective using existing tools before adding systems. Future occupancy, economy rebalancing and specific mission targets remain proposals. See [roundtable and incremental work order](mechanics-roundtable/README.md), including withdrawn specialist ideas and the distinction between user decisions and recommendations. Earlier crisis-charge ordering does not authorize adding ordinary upkeep/pressure to this first slice.


## Expansion teaches progression (2026-09-09)

The tutorial now ends by demonstrating two map expansions. The manager promises more land for more roads, “free,” then clarifies after the second that the mayor funds further expansions through completed missions and levels. Preserve his enthusiasm and embellishment; useful growth does not have to be a mistake.

Implementation defaults: two introductory strips, then one saved permit for each growth level. First target6 distinct households that have completed shopping and still reach a shop; next9,12,... . These targets are lead-selected tuning. Earned permits remain earned through later edits; earlier completed growth counts. Progress is tied to real household visits, so a single looping driver cannot count as multiple households. No cash fee is charged to use an earned permit. Full city progress and land remain intact.

The compass uses a real spatial layout: North top, West left, East right, South bottom. Preview and actual expansion use the same fixed-camera coordinates. Final tutorial stage and menu show remaining free strips, permits, level and the next mission. The later objective-deferral feature is separate.

## Guided H-road arc and manager briefings (2026-09-09)

Implementation update: the H tutorial is now delivered locally for fresh towns. The user explicitly permits a scripted impaired-driver accident, so it no longer depends on synchronizing two cars or causing an uncontrolled-junction crash. It fires once at the planned lower junction using a driver actually on its approach. Teach ordinary junction controls after real crew clearance without claiming they prevent impaired driving. See docs/h-road-tutorial/README.md for implemented stages and checks. Earlier natural-collision timing proposals below are superseded for this tutorial event; main-game ordinary conflict rules remain.

User proposes a new-town H-shaped starter road with staged tool access: place Home and Store using inherited infrastructure, add homes/Park to grow traffic, encounter a legible real collision, unlock roads/diversion to restore journeys, introduce crews to clear the scene, then prevent repeat conflicts and offer the outside-city connection. Lead recommends verified tutorial collision timing and no fatality countdown while rescue tools are withheld. Those timing details remain implementation proposals. Do not stamp this layout into existing towns. The complete scenario is not implemented by the manager popup assignment.

The user assigns Grok a reusable manager briefing: “We need more roads! I knew this town had potential.” Keep actionable directions in objectives after closing the speech. Tutorial objectives cannot be ignored; “I have a plan” becomes a later option only after leveling up, with the threshold still to design. Closing dialogue never completes or ignores an objective; explicit tutorial Skip remains separate.

Manager tone correction: he does not always fumble. Useful competent work can still be funny because of misplaced priorities, embellishment, or a request designed to make his competence visible. His sincere helpfulness and desire for an audience coexist. Avoid making every suggestion wrong or following every line with a crew put-down.

User clarifies “Ignore” means doing the objective later, after other work, rather than dropping it. Use deferral language such as “Not yet,” retain the pending objective and actual completion requirements, and unlock this ordering freedom only after leveling up, outside tutorial. Manager appearances should express more/bigger ambition and conspicuous improvements, not a constant mistake routine.

## Guided control discovery (2026-09-09, user request)

Implemented locally: a yellow callout above the objective and an outlined/pulsing dock target teach category → tool → placement. Shared first-visit targeting follows Home/Store/Road and retires at connectivity; bounded Park/control/detour targets also exist. Guidance is dismissible, leaves other tools usable and uses static outlines for reduced motion. Codex delivered after the assigned Claude client hit its session limit. See [behavior and browser verification](tutorial-highlights/README.md). This does not implement manager crisis advice or mayor proposals.

The user wants prominent mobile-game-style guidance: a toast-like instruction above the objective and an unmistakable highlight on the actual next selectable control, starting with Home $200. If a category hides the tool, guide the player through that category to the tool. Show how to use the dock rather than relying solely on the objective's duplicate selection button. Follow Home → Store → Road → placement/traffic feedback as the current lesson changes, using actual model progress and live prices. This explicit onboarding request is distinct from the inactivity-gated manager crisis advice. Preserve player construction, other controls, skip, reduced-motion accessibility and map input; do not add a Practice district or forced scenario. Installed Claude Code is implementing the UI under lead verification.

## Tutorial practice correction and mayor proposals (2026-09-09)

Implementation update: Practice entry points and runtime district construction are removed locally; old saves retain their existing construction. Controlled player-built crossings can acknowledge the safety explanation, and a real bypass around the relevant crossing can complete detour learning without a practice flag. Natural incidents/response remain observable and active incidents cannot be acknowledged away. 171 tests and phone/desktop checks pass. See [verification](practice-removal/README.md). The Help/Later proposal system remains design work.

The user rejects the Practice button adding its own architecture to their map and explicitly requests its removal in the backlog. They favor the mayor asking whether something can be added, with a choice to help or delay. TUTORIAL-01 in [BACKLOG.md](BACKLOG.md) schedules Claude's UI removal first in the next interface pass and Codex's teaching/save integration, before a separately designed mayor-request flow. Preserve existing construction and learning receipts; do not delete previously placed districts. Keep lessons attainable through real play and safe solutions. Request content, placement versus player construction, costs and no-space handling remain undecided; do not silently relabel the existing automatic practice stamp. Recorded, not implemented.

## Driving styles and manageable disruption: new hypothesis (2026-09-09)

Latest explicit success requirement: the user wants the satisfaction of finally solving a road problem so all driving styles can travel safely and reach their destinations, even when doing so requires hard decisions. A genuinely solved configuration must be attainable and remain effective under the demand it was designed to serve. Driving-style variation must not impose unavoidable accidents after the player has correctly resolved the modeled conflicts. Safety alone is insufficient if traffic is permanently held, destinations disconnected or demand deleted. Evaluate safe arrivals and service to every affected approach together. Growth can require revisiting capacity, but must not retroactively negate a working solution through hidden aggression or an accident quota. Specific difficult tradeoffs remain to design; the user has not selected demolition, penalties or any particular sacrifice as mandatory.

The user proposes cautious/aggressive drivers with different caution margins and a likelihood of crashes at unmanaged conflicts, aiming for an efficiency simulation with disruptive but controllable traffic variation. Evaluate this as a bounded gameplay prototype, not approved numeric balance. The lead proposes local behavior rules, stable saved styles, and any randomness tied to real conflicting encounters; two aggressive drivers need not automatically crash. Roads, signs and lights should produce dependable improvements, and effective foresight must remain valuable. Growth can increase encounter exposure without a hidden accident quota or aggression escalation. See DRIVER-01 in [BACKLOG.md](BACKLOG.md) for owners, implementation alternatives and comparison metrics. Queued after the advice foundation and before incident-cost tuning; no driving-style implementation is claimed by this update.

Latest implementation, September 9: the first emergency recovery slice is verified locally. Outbound responders cross diversions, reconsider scene access, detour around stopped bodies and pass longer straight queues where opposing space is clear. Stranded trips preserve their lane geometry; scene work reserves full arrival space. Missed deadlines still cause fatalities, with later clearance/recovery in the saved city. See [verification and remaining limits](emergency-recovery/README.md). Manager advice, crisis charges and replacement dispatch from another clinic remain unfinished; older planning-only labels below are historical.

## Latest playtest direction: crisis patches and later efficiency (2026-09-09)

Latest emergency-access clarification: the user favors emergency vehicles working through heavy traffic as the practical fix, with sufficiently obstructed traffic still able to delay them. Serious crashes reached too late can cause fatalities as already intended. “No reset required” means eventual scene clearance and continued town play, not guaranteed survival or arrival before every deadline. Prioritize testing/improving current yielding and emergency passing; preserve physical access constraints and real rescue timing. Exact limits for excessive congestion remain to evaluate. Financial disruption costs and the human consequence of a missed rescue are distinct; no additional per-fatality fine is selected.

Latest correctness requirement: the user reports attempts to restore emergency access, including removing a stop sign, did not work and explicitly rejects ever needing to reset their city. Prioritize CRISIS-01 recovery of existing towns ahead of advice and added crisis charges. A dispatch/routing deadlock is a defect, not the intended pressure loop. Preserve construction, balances and progression, and verify continued rescue/clearance on saved incidents. Current read-only findings and unresolved reproduction cases are recorded in the backlog; no repair is claimed yet.

Latest timing clarification: the manager's unsolicited advice waits until the player has not responded to the problem for a sustained interval. Give players an opportunity to act; do not pop him up immediately on detection. Unresolved traffic disruption costs the city money while that opportunity passes. Advice timing and disruption charging are separate; showing/dismissing advice is not financial relief. Delay, response-detection rules and rates remain tuning/design work. Relevant attempted solutions should postpone advice; actual recovery should retire it. See CRISIS-02 timing acceptance in the backlog.

Follow-up user example: EMS cannot reach a crash, and the manager should suggest another clinic as a quick, inefficient but useful workaround. The user wants his head to pop up when he thinks he can help, offering situational advice during gameplay. A lack of space for another clinic needs an alternative; that solution remains design work. Scheduled under CRISIS-02 in [BACKLOG.md](BACKLOG.md): Claude owns the character presentation/advice, Codex verifies actionable routing and dispatch (including an already-assigned stuck ambulance), and Grok evaluates affordability. Advice may be shortsighted but must be mechanically truthful. No new portrait, runtime AI system or automatic construction is selected by this request. This follow-up is recorded, not implemented.

The user wants unresolved crises to cost money over time, pushing players to restore service with a quick road workaround and optimize it later as the city grows. A reported car stranded by a diversion, restored by looping a road around to its shop, is the motivating example. The manager should explain the actual unreachable destination and suggest more roads in the spirit of “What a Jam!”, then take excessive credit for immediate relief. His short-term advice is not always the best long-term solution; discovering that through learned efficiencies is part of the intended middle-management satire. Preserve creative alternatives and foresight rather than forcing every layout to fail.

The user also reports police unable to reach an accident behind a diversion and suspects all responders. Appropriate services should have access through civilian diversions according to the emergency and actual physical access; this is not permission to drive through wrecks or universally unsafe roads. A detour restores traffic, not medical rescue or full incident clearance.

Recorded and scheduled, not implemented or locally reproduced by this update. [BACKLOG.md](BACKLOG.md) owns the work order, agent assignments and acceptance checks: Codex emergency access, Claude stranded-driver guidance, Grok crisis costs, then Claude teaching with Codex verification. Cost rates, relief conditions and balance remain design work. This is the next queued gameplay slice; financial pressure follows reliable access and explanations.

Current design brief, September 8, 2026. Approved title: **Working ON IT!** Tagline: **Fix the commute. Take the credit.** The user selected the supplied city-worker/commute artwork for the title screen.

## User-directed pivot

Build a city, observe its movement, make an improvement, and watch the result. Factorio/Satisfactory inform that feedback loop, SimCity informs growth, and Minecraft informs creative ownership. The first playable should give the player something understandable to build and revise, with visible consequences and room to experiment.

This replaces AI Overlord's traffic-cop shifts, AI identity, instruction mutations, token economy, and deliberate-chaos progression. Original work and design notes are preserved in Git and archive/ai-overlord/source-before-pivot.tar (commit 84eac54). The old artwork is historical, not an approved visual direction for the new game. The user has since supplied a module map and described accident/hospital behavior from the earlier project. That supplied context can inform design; importing the old implementation is not required.

## Tone: cheerful competence, inflated self-importance

Accepted user direction, September 9, 2026. Working ON IT! is a warm, upbeat satire of the daily commute. Everyone else dreads going to work; our city manager cannot wait. Jams, detours, potholes and growing infrastructure demands give him opportunities to help—and opportunities to be admired. He sincerely wants a better commute, but his pride runs ahead of his competence. His enthusiasm conceals a quiet ambition to become mayor.

Helping people is the real gameplay achievement; his appetite for credit at the expense of other people's pain is the joke. Other people experience a miserable commute or an urgent emergency; he sees an opportunity to be needed, admired and credited. He can sincerely help while welcoming the suffering that makes his victory speech possible, without recognizing that selfishness. This tension is central to the satire, not merely harmless boasting. His selfishness is a lack of self-awareness, not malicious or villainous: he cannot read the room and does not notice how his excitement about being needed lands with people in pain. He does not wish them harm or deliberately create suffering for credit. Give players recognizable commuting frustrations and satisfying, visible improvements. Let fixes create new complications through believable interactions between roads, traffic, construction and services. Pair his grand self-congratulation with understated reality checks from crews and commuters. Small accomplishments, enormous pride, and the next problem arriving right on cue define the rhythm of the comedy.

He can be clumsy, vain and opportunistic while still caring about getting an ambulance through. Objectives should recognize improvements to people's journeys and emergency access; the manager's victory speech provides the comic interpretation. Deliberately harming commuters is not the progression loop. Keep operational feedback clear enough to act on even when character commentary is playful.

The user-supplied theme/credits song, **“What a Jam!”**, is his personal victory speech about the player's experiences. Its central line is “If it all ran smoothly, who would know my name?” Preserve the complete lyrics and musical style in [WHAT-A-JAM.md](WHAT-A-JAM.md). References to future civic systems and the mayor's office are creative direction, not additions to the current implementation scope. See [AUDIO-BRIEF.md](AUDIO-BRIEF.md) for recording and integration context.

## Soundtrack roles and tempo (2026-09-09 user correction)

Normal in-game background music uses the originally agreed **96 BPM**, suited to sustained building and traffic observation. The user has two background songs intended for this role; their files, titles and playback/loop characteristics have not yet been supplied or verified here. Preserve space for traffic, interface and emergency feedback. Do not retime gameplay music to 116 BPM merely to match the vocal song.

**What a Jam!** is intended for **ending credits**, with its original supplied 116 BPM vocal-song brief preserved. It is the manager's self-congratulatory victory speech, not the default repeating gameplay background. A future unlockable **radio station perk** could offer this and other radio-style songs during play. Record the perk as a later possibility; unlock conditions, playlist controls and whether it has a physical building remain undecided. No radio feature or credits trigger is implemented by this design update.

See [AUDIO-BRIEF.md](AUDIO-BRIEF.md) for the original 96 BPM prompts and recording guidance, and [AUDIO-CUE-LIST.md](AUDIO-CUE-LIST.md) for the production handoff. The user's Suno skill is at `T:\Business\songwriter\skills\suno.txt`, accessible here as `/mnt/t/Business/songwriter/skills/suno.txt`. Use its style paragraph plus project-specific bracketed composition instructions, under 1000 characters per prompt. Its identity-conflict/corruption examples are templates, not this game's musical direction. Preserve user-supplied lyrics verbatim.

## Objectives: recognition on the road to City Hall

Accepted user direction, September 9, 2026: objectives should help the player character become recognized in pursuit of his desire to be mayor. A silly civic ambition can cause a believable problem that the player learns to fix later. Mayoral recognition is now progression direction, superseding its earlier status as song characterization alone. An election simulation is not implied.

Keep the traffic optimization loop at the center: accept a civic objective, change the city, observe the consequences, improve the flow, and earn recognition. The manager sees a triumph and a step toward City Hall; commuters and crews experience the practical result. Complications should follow understandable changes to demand, access or road capacity. Let players anticipate and solve them creatively instead of making every successful layout fail through an arbitrary scripted penalty.

User clarification: the loop is completing tasks whose initial solutions do not scale, then revisiting and optimizing them as the city grows. Develop the player's understanding and toolset so they can solve more complex problems; do not interpret this as detecting player skill and escalating difficulty in response. Growth and changed use of the infrastructure cause the challenge.

Concrete user-proposed example: encourage many homes along a road to generate visits to a store. That layout works for the small disconnected town. Later, connecting to the external city makes the same road a through route, mixing local trips with outside traffic until its original capacity/layout is inadequate. The player can apply tools and ideas learned along the way to redesign the network. The user compared this to Planet Crafter's initial base becoming submerged as terraforming changes the world; this is their design analogy, not a request for flooding mechanics here.

This is a hypothesis for discussion with the agents when the user returns tomorrow, not a tested claim of fun or an instruction to start that discussion overnight. Review how to make the change understandable, preserve creative alternatives, and let a player who planned sufficient capacity benefit from that foresight. Do not force congestion or invalidate a good design merely to satisfy a mission script. Exact external demand, teaching order, objective targets and available solutions remain unresolved.

Proposed initial objective chain, for implementation and playtesting rather than user-selected mission wording or balance:

| Civic ambition | Player objective | Consequence that creates the next challenge |
| --- | --- | --- |
| “A shopping destination. Thanks to me.” | Get residents to a store and complete visits. | More homes bring more shopping demand and pressure on the shared approach. |
| “A park worthy of my opening speech.” | Open a reachable park and serve leisure visits. | Shopping and leisure trips share the same junction; improve its layout or controls to serve both. |
| “The town's most indispensable man.” | Keep that growing district moving while maintaining emergency access. | A blocked route tests the alternate roads and station access the player has learned to plan. |

Proposed completion policy: use actual served demand, completed visits, road waiting and response outcomes; show the target and progress clearly. Do not award optimization by deleting demand or ignoring a stranded approach. Recognition rewards, thresholds and the exact role of recognition in unlocks remain to be tuned. Keep cash and recognition conceptually distinct: existing visit income funds construction, while recognition expresses civic standing. Objectives and their completion/rewards must survive saves without repeat payouts; new missions should extend the same city after updates.

The five-day jam target is a short, satisfying objective arc and an expandable, skippable tutorial over the existing systems. The user intends to continue developing after the jam if people enjoy playing. Treat post-launch updates as an extension of retained cities and progress. Their interest in RUN monetization and an emerging platform is business motivation, not evidence of audience demand or approval of a specific monetization mechanic. First evaluate whether players understand the objectives, enjoy improving traffic, and want to continue; later updates can respond to actual play and feedback.

## First playable milestone

- Build on a bounded map with placeable homes, stores, and roads.
- Make a building's footprint, orientation, and road entrance visible before placement. Reject occupied or out-of-bounds construction without charging funds.
- Show whether homes can reach stores through connected roads. Place trips on that actual route so the player can understand what a connection changed.
- Let the player remove and rebuild construction with full refunds. Use generous funds and predictable baseline income so experimenting cannot trap the player in an unrecoverable economy.
- Preserve local and RUN save behavior, SDK-less browser play, lifecycle cleanup, and the Nix workflow. Verify locally before release. Latest user authorization permits public release on run.world through rundot inside nix develop once a user-selected Working ON IT! thumbnail is ready. This supersedes the earlier prohibition on publication; the historical AI Overlord cover is not the new thumbnail.

## Next progression: disconnected tutorial to connected city

Accepted user direction, following the completed construction/graphics/map milestones. Collision, road-optimization, and ambulance mechanics must be designed and verified before these lessons are authored. The current build has no collision response, tutorial progression, skip option, external-city traffic, or connection unlocks yet.

### Learning and transition

Start the tutorial in a town disconnected from the external city. Local homes, stores, roads, and trips provide a forgiving place to learn. Expand this learning experience as mechanics are introduced; do not bake in a permanent two-building checklist as the entire tutorial.

Once the player has a home and store, ask whether they want to connect to the neighbouring city. Connecting ends the tutorial and progresses the same town into the main game. Let players defer the connection and continue experimenting without outside traffic. A home/store connection is the first learning step. The earlier first-trip-only completion proposal is superseded: onboarding also needs collision, vehicle-response, and hospital-response lessons. The precise ordering of the connection invitation and those lessons remains to be set; do not silently end the tutorial after the first trip.

Expose **Skip tutorial** at the start and during the tutorial. Skipping enters the main-game progression without requiring lesson completion, a first trip, or the connection invitation's tutorial prerequisites. Grant access to the external connection and the same connection-stage building/customization options as normal completion. Preserve any construction already made when skipping partway through. How an empty skipped town is initially laid out is unresolved; it must not leave the player stuck behind tutorial requirements.

### The connected game

The external-city connection introduces outside traffic that grows dynamically with the town, making road layout and capacity increasingly important. It also opens additional building/architecture options and customization. Specific unlocks and growth-to-traffic tuning are not selected yet.

Proposed foundation: represent the external connection as an explicit road gateway at the map boundary. Outside vehicles should use real routes and destinations. Add basic queuing and junction behavior so increased traffic creates understandable road-management decisions; simply spawning overlapping cars is insufficient. Gateway location, initial traffic rate, and control rules remain implementation choices, not approved balance.

### Keep the tutorial expandable

Use the same city simulation and construction rules in tutorial and main play. The disconnected town limits outside pressure while lessons introduce mechanics. Each new mechanic should come with an appropriate tutorial lesson or an explicit decision about when it is taught. Not every future mechanic must be mandatory before the first connection.

Implementation guidance: give lessons stable identities, prerequisites, observable completion conditions, and concise feedback. Keep lesson progress, whether the tutorial was completed or skipped, external connection state, and unlock state separate from renderer assets. Save and restore those states alongside the town. Adding lessons later must not force completed or skipped players back into a tutorial or remove their unlocks. Treat these as requirements for the upcoming implementation, not verified engineering patterns.

Acceptance checks for that implementation:

- The disconnected tutorial has local trips but no outside traffic.
- Completing lessons offers a clear choice to connect; declining leaves the town playable and the invitation available later.
- Accepting progresses the existing town and enables the connection-stage options.
- Skipping from a fresh or partially built town enters main play without tutorial gates or lost construction.
- Reload preserves lesson progress, completion/skip choice, connection, and unlocks.
- Adding a lesson does not restart onboarding for existing main-game saves.
- Outside traffic scales with growth, follows valid roads, and responds understandably to a disconnected or congested gateway.

## First optimization slice: latest scope decision

The user narrowed the initial phase to one or two core mechanics. Implement **shape routes** and **control intersections** first: observe a queue, revise roads or a junction control, then compare completed journeys and waiting. That initial slice is established. Latest approval moves destination demand, collisions, fire/police/EMS response and diversion into active implementation; disconnected-town tutorial lessons follow the working mechanics.

The initial control implementation uses an all-way stop at a junction and traffic lights with balanced, north–south, and east–west presets. This is a bounded lead-selected starting point; approach-specific stop signs remain an extension. Keep construction forgiving. Control changes are initially free. Repeated stop placement toggles the stop; repeated signal placement cycles presets. Removing a control should preserve its road; removing adjoining roads retires invalid controls.

Adjoining junction tiles form one intersection with one shared controller. Tapping any member edits or removes that controller; lights appear on every external approach. Joining two controlled intersections retains the first controller and reports removal of the extra one. Cars reserve their route through the intersection and its first exit before entering, then clear without obeying an internal red phase.

Provisional default right of way: unsigned intersections give east–west traffic priority. North–south drivers accept a three-tile approach gap (1.5 seconds at current speed). All-way stops replace priority with waiting-order arbitration; signals allocate green time to each axis. This is a visible, lead-selected starting rule, not user-approved balance. Balanced greens last 10 seconds each; favored-axis greens last 14 seconds versus 7, with one second of all-red clearance between phases. Stop dwell is 0.8 seconds. These values need playtesting.

Expose current waiting cars, longest current stop, completed trips in the last 60 simulation seconds, and mean stopped time for those completed trips. Label planned free-flow route time separately. These are diagnostics, not a mission score: completed-only waiting can hide a stuck queue, and fewer connected homes can lower waiting by destroying demand. Evaluate throughput and current queues together at fixed demand. Do not award a mission for deleting a destination or cancelling its traffic.

The model, HUD, operational controls, saves, and local checks for this slice are implemented. The first slice does not activate outside-city traffic or mark the tutorial complete. Future objective comparisons need a stable demand scenario, a warm-up window, and checks that required homes/destinations remain served. Playtesting, including phone interaction, must establish whether road/control choices are rewarding before adding a mission catalog.

## Proposed next slice: destinations, visits, and earned growth

User playtest feedback: one home keeps visiting the same store, adding another store seems pointless, and visits should include parking/time at the destination and building capacity. The user proposes a park next, with a city economy that earns further construction. The pre-visit implementation confirmed the limitation: `destination()` picks the shortest reachable store route, ties retain the first store, and trips immediately reverse at the store. That initial income rewarded connectivity rather than successful visits.

The user has approved the following implementation direction. Numerical balance and the detailed selection strategy remain provisional:

- Homes generate bounded shopping and leisure needs over time. A trip satisfies a real need rather than endlessly earning by driving. Missing leisure access must not prevent shopping or make the starter town unusable.
- Stores satisfy shopping; parks satisfy leisure. Choose among reachable destinations using available/reserved capacity and estimated travel time, with modest stable household preferences or least-recently-used tie-breaking where choices are comparable. A distant duplicate should not get compulsory visits just because it exists. Growing demand, a busy nearby store, or a better connection should make another store useful.
- Reserve a visitor slot before departure, counting inbound reservations and occupied slots against capacity so simultaneous departures do not overbook the same destination. If all suitable places are full, retain the need at home and show unmet demand. Avoid endless circling or cars vanishing when capacity runs out. Detailed curbside queues and separately buildable parking lots can follow later.
- Give trips explicit outbound, visiting/parked, and returning phases. During a visit the car leaves the travel lane and occupies destination capacity; display occupancy and remaining visit time. Rejoin the road only when it is safe, then route home over the current network. Keep the parked/ready-to-leave vehicle accounted for until it can leave. First-version visitor slots can combine parking and activity capacity, while keeping their data independent of artwork and preserving room to split them later.
- Distinguish home population capacity from destination visitor capacity. A store with four visitor slots and a park with eight longer stays are illustrative starting values only; choose actual numbers by testing their impact on visible traffic. Adding long stays while retaining one car per home can empty the roads, so tune visit duration and staggered household demand together before raising population/car limits.
- Tie store income to a completed shopping visit, paid once. Recommended park role: completed leisure supports a bounded household tax/growth benefit, so a public park contributes economically without becoming another shop. Paid park admissions are an alternative, not a selected requirement. Cap benefits by actual household needs served; building duplicate parks or repeatedly routing the same car must not multiply income without demand.
- Provide an initial budget sufficient to establish homes, a store, and their roads. Let successful activity fund expansion, retaining full construction refunds and a recovery path from a stalled economy. The current large unconditional support payment should be reconsidered when this earned-income loop works. No final grant, payment, maintenance, or penalty values are chosen yet.

Acceptance should show a second store receiving legitimate overflow demand, stores remaining under capacity including inbound trips, visible visits off the carriageway, safe return departures, parks generating a distinct trip purpose, and successful service funding further construction. Persist needs, visit timers, reservations, and one-time payouts; pause must freeze them. Road edits, building removal, and reload must not duplicate income or strand visitors without a defined recovery rule. Add disconnected-town tutorial lessons after these mechanics work; preserve skipping and the player's existing town.

Genre references inform the proposal, rather than specifying this game's implementation: [Cities: Skylines II's city-services diary](https://www.paradoxinteractive.com/games/cities-skylines-ii/features/city-services-districts-policies) describes shopping/leisure needs and park attractiveness; [Transport Fever 2's town manual](https://www.wiki.transportfever2.com/doku.php?id=gamemanual:towns) describes residential/commercial/industrial roles and reachable destinations supporting growth. The user has approved implementing this bounded adaptation; numerical balance remains provisional.

## Collision and road-optimization design before tutorial authoring

### Accepted requirements

Collisions and distinct vehicle responses are part of the game and must be taught. Hospitals dispatch ambulances from their real locations to accidents. Severe accidents have a time limit: victims can die if an ambulance arrives too late. Ordinary traffic needs diversion around an incident. Placeable stop signs and traffic lights are required player tools for optimizing road throughput. The user identifies the observe–adjust–watch-results process as a central source of enjoyment; validate the implementation through playtesting. The disconnected tutorial should demonstrate these working systems. These mechanics take priority over mission scripting; the first optimization slice establishes queues and controls; incident behavior is now explicitly approved for the destination/emergency slice, including fire and police alongside EMS.

### Proposed first traffic rules

The following is a design proposal to implement and evaluate, not established balance or user-selected vehicle specifications.

| Vehicle | Ordinary traffic behavior | Incident / emergency behavior |
| --- | --- | --- |
| Car | Follows the vehicle ahead, waits for a usable junction gap, uses an actual destination route | Brakes for a visible hazard; queues or takes a valid detour; yields to an approaching ambulance when space permits |
| Bus or truck (choose one initially) | Longer body, slower acceleration, occupies a junction longer | Needs a larger stopping gap; takes longer to clear the ambulance's path; cannot overlap queued cars to make room |
| Ambulance | Starts at its hospital entrance and remains subject to road geometry and occupancy | Dispatch priority and siren make ordinary vehicles yield; it still waits if the road is physically blocked and reroutes where possible |

Model vehicle length, speed, braking distance, lane occupancy, and junction conflicts in simulation units. The artwork reflects those rules. Safe operation should be the default at controlled junctions; vehicle variety alone must not produce unexplained random crashes. Proposed accident sources are visibly risky uncontrolled conflicts and announced braking hazards. Select one reproducible cause for the first collision scenario; avoid adding random driver personalities before the baseline is understandable.

A queued vehicle must not stop inside a junction when its exit has no room. An emergency request must not grant two vehicles the same space. Where there is no safe yield manoeuvre or detour, vehicles wait and the game explains the blockage.

### Stop signs and traffic lights: core optimization tools

The player places, removes, and adjusts traffic controls around the city. This is a central gameplay loop: observe queue formation, choose a control/layout change, and watch how completed journeys, waiting, and safety change. A visually larger city or more vehicles is not a substitute for those decisions.

Proposed initial control contract:

| Control | Player action | Simulation promise and tradeoff |
| --- | --- | --- |
| Stop sign | Place/remove on a specific junction approach | Vehicles stop before the conflict area, then enter a safe gap. Stops reduce conflicting entries but add delay; visible arrival-order arbitration resolves ties and prevents starvation |
| Traffic lights | Place/remove a controller at a junction; select a timing preset | Compatible approaches share green, conflicting approaches wait. Split green time between directions to serve uneven demand; long greens help one queue while increasing waits elsewhere |
| Temporary closure | Close/reopen an approach to divert vehicles | Stops new entries and prompts safe rerouting; an alternate route must actually exist |

Start signal tuning with a few readable presets, such as balanced, favour north–south, and favour east–west. Exact cycle lengths remain provisional. Show the active phase and upcoming switch; use measured green utilization and approach queues to explain whether the setting helped. Detailed signal programming, synchronized corridors, and turn phases can follow after the basic loop works.

Controls are logical road/junction data, independent of sprite placement. Stop signs belong to approaches; signal timing belongs to a junction controller. Restrict placement to valid road connections and preview which approaches it affects. Do not allow an ambiguous active stop sign and traffic light to compete for authority on the same approach. Preserve or explicitly retire control state when a junction is rebuilt; do not leave orphan controls in saves.

Stop lines and occupied junction areas must match the movement model. A green light allows entry only when downstream space is available. Never release conflicting phases while a vehicle, including a longer bus/truck, still occupies the conflict area. Clearing the junction is more important than blindly advancing a fixed timer. Select a visible default right-of-way policy for uncontrolled junctions; collisions need a defined, understandable cause rather than hidden probability rolls.

Ambulance priority must be explicit. Proposed first rule: ordinary traffic yields where physically possible; a signal can request an emergency phase, but only after conflicting vehicles have cleared. Neither a siren nor a green phase permits teleportation through a queue or wreck. Poor control placement, long queues, or a missing detour should visibly explain delayed response.

Retain inexpensive experimentation and full construction refunds. Stop signs should remain useful on quiet approaches; signals should help where conflicting demand justifies them. Avoid making one control automatically superior everywhere. Evaluate actual completed trips and waiting across the same demand period, not merely vehicle speed or shortened path length. These operational details are proposed design choices; placeable signs/lights and the optimization focus are explicit user requirements.

### Incident and rescue lifecycle

1. A modeled conflict creates one incident at the actual road location. Show the affected lane/tiles, severity, cause, and whether injuries require dispatch. Keep outcomes readable and non-graphic.
2. A minor incident delays traffic and clears through a recovery timer. A serious incident also starts a visible rescue deadline. Exact severity rules and times need playtesting.
3. Dispatch an available ambulance from a reachable hospital, choosing by estimated travel time as a starting policy. Show its hospital, route, and estimated arrival. If no hospital, vehicle, or route is available, show that condition explicitly.
4. The ambulance approaches a reachable access position beside the blocked incident, never through the wreck itself. Successful arrival before the deadline stabilizes the victims and stops that deadline. Return transport and availability recovery can follow without silently adding a second fatality deadline.
5. If the deadline expires first, record the fatality outcome once. The town remains playable; distinguish rescue failure from later road clearance.
6. Clear wreckage through a separate recovery step, then restore road capacity. An ambulance is not an automatic tow truck; treatment alone must not erase the traffic blockage.

Proposed initial simplification: one ambulance per hospital, one emergency per ambulance, with visible busy/unreachable states. Multiple incidents, hospital relocation/removal, save/reload, and pause need explicit state transitions. Pause freezes incident timers. Removing a road or building must not teleport an active responder or erase an incident/deadline; constrain occupied demolition or defer it with clear feedback.

### Player decisions and traffic diversion

The first useful decisions are where to place the hospital, how to provide alternate routes, and how to divert traffic around a blocked approach. Required core tools are placeable stop signs and traffic lights; proposed supporting tools are temporary road closure/reopening and ordinary road construction/removal with the existing refund policy. Implement their movement rules before asking the tutorial or missions to depend on them.

Closures stop new entries, let vehicles already on the affected road reach a safe point where possible, and cause route replanning at safe decision points. Newly built detours should become usable promptly. If all routes are blocked, keep the demand and queued vehicles visible; do not make congestion disappear by deleting trips. Route choice should account for closures and eventually measured delay, rather than only geometric distance.

Measure completed journeys, waiting time, rescue arrival time, and resolved incidents. Compare improvements over a consistent demand window. Removing destinations or cancelling trips must not masquerade as improved traffic performance. Let the player see why a bypass helped the ambulance or reduced a queue.

### Tutorial sequence after these mechanics work

Teach local home/store trips first, then following/queuing and the chosen larger vehicle. Have the player place stop signs, observe stopping and queue formation, then introduce traffic lights and a timing adjustment under uneven demand. Show the resulting change in completed trips and waiting. Demonstrate a clearly announced, reproducible minor collision and its road blockage. Introduce the hospital and a controlled serious-accident scenario: watch an ambulance leave that hospital, see traffic yield, and observe treatment on arrival. Follow with a guided diversion/access problem so the player learns how road design affects response time, rather than only watching an ambulance animation.

Proposed teaching policy: provide a reachable hospital, adequate response time, and pause/retry support during the first demonstration. Do not introduce an unexplained fatality before explaining the warning and available actions. The tutorial uses the same routing, collision, occupancy, and dispatch rules as main play. Keep Skip tutorial available and preserve the town on progression.

### Implementation order and acceptance

1. Following, vehicle footprints, exit capacity, and junction arbitration, including placeable stop signs and traffic lights; deterministic checks for stopping, right of way, phase clearance, fairness, and different vehicle sizes/speeds.
2. One explainable collision cause, incident occupancy, temporary closures, and safe detour routing. Verify that blocked traffic neither overlaps nor disappears.
3. Hospital placement/entrances, ambulance dispatch and yielding, serious-incident deadlines, and independent road recovery. Verify reachable/unreachable/busy states and both timely/late arrival outcomes.
4. Save and pause checks during queues, rerouting, rescue, and recovery; no duplicate dispatch or outcomes on reload.
5. Disconnected tutorial demonstrations, guided optimization objectives, skip, and external-city progression. Only then expand the mission catalog and tune demand.

A successful first scenario should show a visible queue or response delay, let the player make a road change, and produce a measurable improvement using the same demand. Unit tests establish rules; playtesting establishes whether the decision is enjoyable.

## Growing map: next objective

The user wants room for creative road layouts as the city grows, with traffic optimization remaining the focus. Mobile and browser play both matter. Expand a bounded city incrementally, and let the camera explore it without reducing every tile to an untappable dot.

Provisional implementation choices: keep the initial 16×14 town; extend one selected edge by up to 8 tiles per expansion; cap each dimension at 64 tiles (640 m at the current scale). North/west expansion adds negative world coordinates, preserving all existing building, road, and trip positions. Expansion is initially free to preserve experimentation; pricing/unlocks are not settled. These are initial engineering and tuning choices, not user-approved limits or a claim of mobile performance validation.

The logical bounds, save migration, renderer/camera, and expansion controls are implemented against Claude's completed graphics pass. Expand opens an edge preview; Add land expands the town without moving existing construction or camera focus. Pan mode supports dragging; pinch/wheel and +/− zoom preserve world targeting; Town recenters on construction at a useful tile scale. Existing saves without bounds load as the original 16×14 map.

Implemented controls include an explicit expansion action with a boundary preview, pan and zoom for touch and mouse, a way to return to the town, and separate camera/construction gestures. Keep UI text readable and tile targeting usable when zoomed in. Preserve the player's camera focus when adding land, especially on the north/west sides. Measure populated-city routing and rendering on target devices before increasing limits or adding large external traffic volumes; bounded land alone does not bound simulation cost.

Map expansion is distinct from connecting to the external city. It must not silently finish the tutorial, activate outside traffic, or bypass the player's connection choice. Teach expansion in the disconnected tutorial as appropriate and retain skip access to main play. The future gateway needs an explicit policy when its edge expands; do not move existing gateway coordinates or trips as an accidental consequence of resizing the map.

## Spatial contract: provisional implementation choices

These values establish one coherent first implementation. They are lead-selected defaults, not user-approved balance or permanent map limits.

| Concept | Initial definition |
| --- | --- |
| Map | Initially 16 columns × 14 rows; player-controlled edge expansion up to a provisional 64×64 maximum |
| Tile scale | 10 m × 10 m of simulation space |
| Road | One tile; cardinal adjacency only, no diagonal connections |
| Home | 2×2 tile footprint |
| Store | 3×2 tile footprint before rotation |
| Orientation | Four quarter-turn orientations; rotate footprint and entrance together; building artwork stays upright from the fixed player view |
| Entrance | One explicit building entrance with an adjacent road access tile; touching another wall does not connect the building |
| Connectivity | A home's entrance road must share a traversable road route with a store's entrance road |
| Route visualization | Vehicles follow the connected road path; renderer coordinates derive from model tile positions |

Building definitions own footprint and entrance geometry. Instances own type, position, orientation, and stable identity. Roads, occupied tiles, connection status, and routes are simulation concepts. Sprites, textures, colors, screen coordinates, and decorative offsets belong to rendering. New artwork must fit this contract without rewriting connectivity or save data.

The same explicit entrance/location model should later allow service vehicles to originate at their service building rather than appear at an arbitrary map edge. Hospital access is now part of the next collision/response milestone; retain that location contract rather than introducing arbitrary ambulance spawn points.

## Forgiving economy: initial defaults

Start with 10,000 funds. Roads cost 20, homes 200, stores 400. The original 200-per-10-second grant plus connected-home bonuses is superseded: use a small recovery allowance, completed-shopping income, and bounded recent-recreation benefits. Full construction refunds support redesign. Display costs, funds, and income clearly. These are provisional tuning values; reliable feedback and freedom to experiment matter more than difficult financial optimization in this milestone.

## Deferred systems

Building upgrades will support greater density. Fire, police, and EMS now belong to the approved collision slice and must dispatch from their actual stations. Density upgrades and weather remain deferred. Author emergency tutorial lessons after the real dispatch, recovery, and diversion mechanics work.

The HUD reports average planned roundtrip driving time for connected homes, excluding departure waiting. New trips take shortest routes; existing trips finish their chosen routes unless construction invalidates them. A shorter connection therefore improves the next trip.

The next external-city milestone needs basic traffic capacity/queuing; more advanced congestion tuning remains subsequent work. A visible routed trip demonstrates connectivity; it does not by itself prove a satisfying traffic-optimization game.

## Verification and playtest questions

- Can a new player place a home and store, identify their entrances, connect them, and see trips?
- Do rotated footprints, placement previews, occupied-tile checks, and actual connectivity agree?
- Does removing a road update reachability and prevent trips from continuing across a missing connection?
- Can the player redesign freely and predict the effect on funds and income?
- Does a saved city survive a reload, while the old save remains untouched for the archived game?
- Is the map readable and operable at desktop and phone sizes?
- Does an improvement feel rewarding to watch? This requires playtesting, not just passing model tests.

Implementation and automated checks should establish rules and persistence. Household observation should guide later balance, pacing, and visual choices. Do not present untested predictions about player enjoyment as findings.

## Approved implementation contract: visits and emergency recovery

The latest user approval supersedes proposal-only labels for destination capacity, parked visits, parks, earned growth, accidents, fire/police/EMS response, and diversion. Exact numbers below are implementation defaults to evaluate, not settled balance.

Keep one simulation loop and logical map geometry independent of Kenney textures. Parks occupy 3×3 tiles; hospital/fire/police buildings occupy 3×2, with an explicit entrance that rotates with the logical footprint while artwork stays upright. Reserve visitor slots before dispatch. Visiting cars leave the road and retain their slot until safe departure; road edits must not teleport them home or duplicate rewards.

Uncontrolled incompatible junction claims accumulate visible local risk before a failed-yield collision. Quiet roads and ordinary same-lane queues do not roll random accidents. Controls prevent this collision mechanism. A wreck blocks its road tile; ordinary trips recalculate routes at safe tile boundaries and wait visibly when no alternative exists. Players can build bypasses and toggle road closures to divert arrivals. Existing occupants may leave a closure. Protect occupied construction from demolition.

Minor accidents require police recovery; serious accidents require police and EMS; burning accidents additionally require fire response. Each station dispatches its own vehicle through the road network to a reachable adjacent access tile. EMS arrival before the rescue deadline stabilizes victims; missing the deadline records losses once. Fire crews address the fire, and police provide recovery. The wreck remains until all required work is complete, then crews return to their stations. Missing, busy, and unreachable services must be visible. Pause and save/reload preserve timers, work, outcomes, and returning crews.

The expandable disconnected tutorial should later teach destination demand/capacity, safe controls, collision warnings, all required services, and a real diversion/access problem. This slice does not silently introduce outside traffic, complete the tutorial, or remove the future Skip tutorial option.

Implemented tuning for local play: initial funds 10,000; road/home/store/park costs 20/200/400/300; hospital/fire/police costs 800/700/600. Stores reserve 4 slots and parks 8; visits last 5s/10s. Shopping pays 100 once; a completed park visit enables 15 extra household income per 10s for 60s, refreshed rather than stacked. Base support is 20 per 10s. Household demand and one active civilian car per home bound this income. Values remain provisional.

Uncontrolled conflict exposure currently takes 6s of qualifying claims with a 1s cooling gap; severity cycles minor/serious/fire, with at most 3 active incidents. Serious/fire rescue deadlines are 90s. Police/EMS work lasts 6s; fire work 10s. Responders travel at 3 tiles/s versus ordinary cars at 2 and may take a controlled junction against its signal only when the entire reserved junction/exit is empty. They do not ignore occupied space. Working crews reserve their road access tile, so service access can itself require a bypass.

New saves use schema version 2 in the existing city storage namespace and migrate version 1 construction/funds/legacy journeys. Save validation restores the simulation clock before checking expiring recreation benefits. Planned routes may reference a road removed ahead of the car, but the physical body must remain on an existing road; movement recalculates before entering missing/blocked tiles. Route changes preserve position and wait for space in the new lane; when a closure appears immediately ahead, the car reverses within its occupied tile at driving speed before turning.

## Emergency vehicle driving clarification (2026-09-09)

User requests distinct police/EMS/fire response logic: responding vehicles should not normally stop for traffic lights and can use all lanes, including opposing lanes, to reach their destination. Dispatch and scene work cover all three services. User approved dedicated police, EMS and fire vehicle art, now installed. Outbound trips can pass a red signal or stop when the reserved intersection/exit is empty.

Implemented after the user requested this pass: outbound response privileges, civilian yielding, opposing-lane passing with checked clear space and a safe merge, visible lane transitions, and ordinary return driving after duty. Lane use affects real occupancy/reservations and persistence as well as drawing. Passing reserves at most six straight tiles, including an empty junction and its full adjoining area when needed, with both lanes held at the lane-change/merge tiles. It does not pass around bends or through occupied opposing lanes. The 0.4-second lateral shifts and six-tile limit are conservative provisional defaults. Conflicting road edits briefly wait for a committed pass to finish. Tests cover real red-light queues, oncoming traffic, multiple responders, controlled/adjoining junctions, road edits and save continuation; see `docs/emergency-driving/README.md`.

## Traffic optimization is the main game (user correction, 2026-09-09)

The disconnected opening town teaches local trip generation and construction. Its present one-car-per-home cap, cheap roads, lack of outside traffic and parked visits do not define the ultimate demand ceiling. External cities connect and supply growing traffic, responding to town growth and the capacity/design supported by the network. Stores and parks hold visitors off-road while attracting arrival/departure traffic; parked visitors create room for additional traffic rather than permanently reducing the challenge. The user’s “8 parked + map size” is a conceptual capacity relationship, not a chosen arithmetic cap.

Prioritize road optimization over expanding city-building systems. User-named future tools include bus stops, wider roads and one-way roads. Early missions encourage growth and thrift; subsequent goals should incentivize efficiently and safely supporting the larger demand. Exact external demand scaling, how efficiency permits more growth, road-tool semantics and later goal thresholds require design and verification. Good foresight should retain its value rather than triggering arbitrary failure. This supersedes reviewer claims that cheap roads or parking prevent congestion, and any interpretation of today’s local simulation as the finished main-game balance.

## Staged tutorial and free assistance (user clarification, 2026-09-09)

Tutorial scenarios may deliberately create small, legible traffic problems so players learn to recognize them and experiment with tools. Provide an optional free worked solution when a player gets stuck; assistance should explain the change and let the real simulation demonstrate its result. This supersedes any blanket prohibition on staged tutorial problems. Preserve creative alternative solutions and successful foresight. Main-game pressure still comes from growth; do not force every successful layout to fail. Exact scenarios and the assistance interaction remain to be implemented and verified. The current optional growth mission board is a foundation, not the completed tutorial, external-city transition, or free solution system.

### Implemented opening mission foundation

The direct building/traffic palette and optional manager list now track four distinct-household visit goals: one shopping, three shopping, three leisure, six shopping. Recognition persists and honors work ahead of sequence. There are no efficiency/time gates or rewards for omitting services. The list can be hidden/reopened; accident advice distinguishes a bypass from actual rescue and reports real service needs/deadlines. Construction spending is visible without changing prices or income. These are provisional opening jobs, not the complete tutorial or verified main-game balance. See docs/interface-missions/README.md for evidence.

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

## Two-loop tutorial access correction (2026-09-09)

User requires the crash tutorial to keep running, highlight alternate roads at both ends of the H (two loops / infinity shape), show optional Divert selection and placement before the wreck, and retain delayed manager advice. Verify every Home can reach its shopping destination and return; the first Home alone is insufficient. The prior right-side-only bypass acceptance left lower-left homes blocked. Model now checks all current homes against the first Store, with both-end suggestions and ordinary alternative solutions allowed. General visible roadway alerts identify homes without shop/return access, with a focus action and map markers. Show Divert remains optional. No automatic crash pause, including legacy guided towns. Player construction and saved progress are preserved.

## Blocked journeys must produce road queues (2026-09-09 user correction)

Cars must leave home and advance toward their intended destination when an existing road route is temporarily blocked by a crash or diversion. The previous hold-at-home shopping workaround concealed traffic demand and is superseded. Prefer a usable route; if none exists, plan over existing roads through the temporary obstruction, but physical movement still stops before it. Preserve destination, visitor reservation, safe occupancy and saved journey identity. Missing road connections or full visitor reservations can still prevent a departure.

Keep a scene approach clear for emergency work: a civilian approaching a wreck stops before occupying the required working area. Queue followers retain their lane instead of repeatedly reversing toward a distant obstruction with no alternate route. Real alternate routes release the same queued trips. This behavior applies to civilian journeys generally, including the H tutorial; emergency response retains its dedicated rules.191/191 tests and production build pass, covering new departures, visible forward progress, no crossing the wreck, stable queue, save/reload, same-trip bypass recovery, diversion approach and real legacy multi-service clearance.

## Modest traffic-control prices (2026-09-09 user correction)

Stops and Lights must cost money, but remain inexpensive. Lead-selected initial prices: Stops $25 and Lights $75 per governed intersection. This supersedes all earlier free-control defaults. Repeated signal taps only adjust timing and are free. Changing control type refunds its actual purchase before charging the replacement; removal and controls retired by road edits refund actual payment once. Invalid/unaffordable placement changes nothing. Historical controls without payment provenance were free and refund $0. Prices appear in the tool dock. Existing tutorial earnings cover the control lesson; no new control waiver is introduced.

### Park artwork approval and adoption

User approved Claude's park sprite. Installed locally with upright fountain/benches/trees and entrance-specific paving variants, preserving source and original preview. Actual logical footprint, visitor capacity and gameplay are unchanged. See docs/artwork/park/README.md for exports and visual verification.

### Pause menu presentation (latest user correction)

User prefers darkened canvas with Resume over a pause banner, providing a future home for the radio station. Implemented locally: modal dark backdrop and centered Paused / Resume game / Main menu panel. Independent PauseMenu component has an extension slot for later controls; no radio feature or pause recording has been added. Existing paused simulation/music behavior remains. Supersedes the earlier yellow pause banner design.

### Local police patrols (2026-09-09)

User requested visible police cars staying within a radius of their station. Implemented one real road patrol per station, using the approved police artwork. Lead-selected initial tuning in `src/game/cityRules.ts`: six tiles (60 m) from the road entrance and four seconds at the station between outings. All patrol route tiles stay within that circle; disconnected roads do not count. Placement and station inspection display the circle. Routine patrols obey normal lanes and controls, generate no visitor income and do not create incidents.

The same car can take an incident assignment from its current position, using the existing occupancy-safe routing and emergency driving rules. Emergency response and subsequent return may leave the patrol circle. Saves preserve patrol assignment and station rest. Road closures can strand a patrol until access is restored; no teleportation or free replacement vehicle bypasses the road puzzle. Station removal waits until its vehicle returns. Patrols are not a crime or crash-prevention mechanic in this slice.

### Congestion recovery clarification (2026-09-09)

A newly built connected bypass must be usable without toggling Divert. Long-stopped civilian vehicles now reconsider the same destination around stationary traffic after a provisional eight seconds (`CITY_RULES.routing.civilianReplanSeconds`). Emergency vehicles retry sooner. Only an actual alternative triggers a reversing maneuver; absent one, remain visibly queued rather than repeatedly backing up and creeping forward. Emergency stop/red exceptions require a clear junction, while ordinary lane compatibility determines whether its exit is usable; an opposing exit lane alone must not deadlock a yielding car and responder.

User floated eventually going home after a longer delay, but expressed uncertainty. This update preserves trip intent. Optional trip cancellation and delayed main-game manager advice remain separate follow-up work; do not conceal broken rescue routing by deleting demand or vehicles.

Available emergency stations can replace an outbound responder stopped for ten seconds when a real replacement route avoids stationary bodies. This provisional delay is in `CITY_RULES.routing.emergencyBackupSeconds`. The old crew retains its physical position and saves a cancelled assignment while returning; it cannot duplicate scene work. Moving or working crews are not replaced. Congested physical road layouts still need usable road/scene access.

### Scene parking and completed responder returns (2026-09-09)

User clarified responders remained after the wreck cleared, and approved closer parking at scenes. New arrivals still reserve clear approach space, then park in distinct compact service slots at the scene, outside driving occupancy. Completed crews stay parked until a real road route and clear merge space permit their ordinary return. No crew waits across the entire approach while another is trying to work; multiple services can use the same access point sequentially for arrival and departure. Scene parking persists, completed work is credited once, and parked departures use normal controls and return speed.

Existing working saves adopt parking. A completed returning crew stuck at an adjacent scene tile for eight seconds can back to its tile centre physically and recover via scene parking. This is limited to the actual scene, not a teleport from arbitrary traffic. The delay is tweakable in CITY_RULES.routing. Road access is still required. This supersedes the historical rule that working crews always occupy both travel lanes.

### Live vehicle debug inspector (2026-09-09)

User requested a Debug button to diagnose stuck ambulances and police waiting in traffic. Header Debug opens a nonmodal inspector; tap a car or choose from a service-first vehicle list, view its current route and exact model state, and inspect conflicting vehicle IDs. Reports distinguish outbound emergency rules from routine return, scene work versus blocked return access/merge, and lane reservation conflicts. Copy captures vehicle and incident diagnostics locally to clipboard with a selectable text fallback. No credentials or account information are included; nothing is sent automatically. Diagnostics read the movement system's current reservations and gates; they are a current snapshot, not a complete event history or a guarantee of future movement. Debug map taps inspect instead of building; closing it returns normal tool use. No save schema change.


### Routing-intelligence vision and jam scope (latest user direction)

User added dynamic cost maps, congestion-aware/predictive routing, lane/intersection policy, a global optimizer, scenario conditions, debugging overlays and modular tuning/events to the long-term traffic world. Latest explicit correction: mockups are removed entirely; variations come last. See docs/traffic-world/routing-plan.md for the proposed jam subset and acceptance gates. Mechanics-first order supersedes the earlier comparison-sheet-first brief. Lead recommendation is deterministic bounded route costs/replans and an advisory network observer first, retaining player control and existing safe physical movement; full prediction, lane reassignment and automatic signal/detour optimization remain later proposals. This records direction and interpretation, not implementation or user acceptance of every tradeoff.

### Emergency yielding correction

Cars must not yield in place when their existing reservation is what prevents the approaching responder from entering its junction or scene approach. Such vehicles continue under ordinary lane/control admission rules; this does not grant collision immunity or override a committed opposing-lane pass. Confirmed by the user reporting reciprocal wait reasons in the live debugger and a matching local scene-approach regression for EMS/police/fire. Existing trip state needs no migration.


### Gameplay UI overhaul priority (2026-09-10)

User requests one global stats top bar with Heatmap/Dashboard actions, anchored bottom-left mission title/description/progress/reward, a uniform bottom-right build grid, and a reserved center map with responsive non-overlapping containers. This is the next feature priority ahead of J4/J5 and advanced driver behavior; correctness regressions remain first. See docs/ui-overhaul/PLAN.md and UI-01 through UI-05 in docs/BACKLOG.md. Phone stacking and precise stat meanings are documented implementation proposals; weather is not currently simulated. Preserve functioning tutorials, saved towns, view controls and real map placement. This entry records planning only, no UI changes or release.

## FLOW-01 implementation evidence (2026-09-10)

The existing-tool flow prototype is implemented locally; [FLOW-01 results](flow-puzzles/FLOW-01.md) distinguish verified mechanics from observed fun. The same queued nine-home demand supports a useful signal-retiming solution and nearby destination placement, and good initial timing qualifies without manufactured failure. Read-only measurements attribute actual visits and returns, retain unmet needs and current waiting, and distinguish access/capacity/traffic. Equal-urgency departure purposes alternate to prevent leisure monopolizing a household car. No existing mission/land/cash receipts are redefined. FLOW-02 visible integration and FLOW-03 player observation remain next; the raw 60-second qualification and nine-home fixture are prototype parameters, not selected campaign balance. No publication or widening/roadworks/modes implementation.

## FLOW-02 visible service integration (2026-09-10)

[FLOW-02](flow-puzzles/flow02/README.md) is implemented locally. A neighborhood worth visiting adds a recognition objective to the existing progression, with a visible six-home/current-population target and saved growth high-water mark until earned. Every home must have a real recent shopping return, preserved access and acceptable current waiting; one return per60seconds with4-second stabilization is the lead's forgiving civic default after Grok review, while FLOW-01 retains its stricter comparison. Recognition never revokes, and successful service does not add demand. Compact neighborhood Flow and existing Details/Dashboard distinguish current service, unmet needs, full destinations, route failures and selected-road approach waiting. Actual Claude UI, Codex implementation/verification and Grok review are documented.253 tests, build and desktop/narrow browser checks pass; no publication. FLOW-03 still needs observed player enjoyment and tuning.
