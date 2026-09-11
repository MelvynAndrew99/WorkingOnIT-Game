# Shared intersection balancing assignment

## Latest: intersection mechanics delivered locally

User made this today's gameplay priority and clarified that unsuitable controls must also become dangerous under heavy conflicting use. Codex implemented distinct encounter exposure, gradual cooling, overloaded-stop and shared-green left-turn danger, warnings in both modes, and saved per-area diagnostics. Current Level 2/3 maps remain unchanged; safety heatmap comes later. **272 tests, production build and desktop/narrow browser checks pass.** See [implementation, measured comparisons and remaining severity/pile-up work](IMPLEMENTED.md). No publication. The assignment/review below is historical; the blanket control-immunity proposal is superseded by this latest user direction.

2026-09-11. User explicitly assigned installed Grok a balance review of uncontrolled intersections, using the current third mission as a reference and applying eventual rules to the sandbox too. Clarification: the current level is fine; preserve its map and focus on shared game mechanics. No level redesign or reorder requested.

Consider local traffic density and poor flow as possible accident-risk inputs while keeping light traffic safe and controls effective. Review fender benders (police), injury/serious collisions (police and EMS), and actual multi-car pile-ups (all three, including fire scene protection). Resolve the overlap between a two-car fender bender and a two-car injury collision through severity, rather than vehicle count alone. Keep completed service and every household's return central; permanent waiting or disconnected demand cannot qualify as good flow.

## Assignment status

Actual installed Grok completed the [prepared brief](grok-brief.txt); its unedited response is saved in [grok-review.txt](grok-review.txt). The first client attempt failed under restricted session/network access, and automatic approval review initially blocked the external payload. The user then approved sending the prepared brief, and the normal-access run completed successfully. This is an actual Grok design review, not model verification or implementation.

## Lead findings and verification

- Current risk requires six seconds of actual incompatible claims; gaps over one second remove it. Intermittent exposure and per-point storage versus intersection-area reporting deserve measurement, not an assumed global threshold reduction.
- Existing natural severity cycles minor/serious/fire by global accident count. Existing responder rosters already match those tiers, but there is no true pile-up type or physical participant-based severity.
- Lead preference for review: local conflicting arrivals drive risk; flow ratings explain performance. Slow orderly queues and high safe throughput should not independently cause crashes. This is a proposal, not a delivered rebalance.
- `nix develop -c node --experimental-strip-types --test src/game/challengeLessons.test.ts`: 5/5 pass. The unchanged Level 3 repair crashes unsigned; Stop and Light each let all ten households return without an accident. Baseline only, not evidence about the user's particular layout or observed fun.

## Lead synthesis of Grok's review

Accept the design direction: repeated local conflicting arrivals at an uncontrolled intersection should drive danger. Density is relevant when it produces those encounters; a citywide density or poor Flow label is not a crash trigger. Current Flow also reflects missing access and full destinations, which are separate problems. Quiet traffic, safe yielding, orderly queues, and properly controlled crossings must remain safe. All approaches still need real service; starvation is not a safe solution that qualifies for success.

Aggregate exposure consistently across a logical intersection area, with a readable warning and gradual cooling between encounters. Grok proposed intensity 1 plus 0.4 per extra conflicting participant (cap 2.2), decay 0.45 units/s after a 0.8-second gap, warning 2.4, and trigger 5.0. These are untested candidate values, not accepted balance constants. Compare them with current behavior before selecting any. Keep Level 3's authored map, budget and objective unchanged.

Replace global crash-count severity cycling with incident evidence. Target game roster:

| Incident | Required services |
| --- | --- |
| Fender bender, including a minor two-car impact | Police |
| Injury/serious two-car collision | Police and EMS |
| Actual multi-car pile-up | Police, EMS and Fire for scene protection |
| Existing vehicle fire | Preserve all three services and saved semantics |

### Corrections required before a prototype is acceptable

1. **Intent to enter is not actual contact.** Current detection can report a blocked driver's repeated attempted entry. Merely changing the accumulator retains the stationary-wait-to-crash problem. Define distinct encounter observations and an explicit failed-yield movement/contact event. Neither elapsed waiting nor repeated reports of one stationary pair can alone justify a crash. Physical occupancy remains enforced outside the actual collision event. Verify both live movement and incident provenance.
2. **Severity needs reachable evidence.** Grok's proposed overlap-depth/core-occupancy classifier assumes simultaneous incompatible occupancy the normal movement engine prevents. Define and capture impact evidence before converting trips into wrecks: approach geometry, actual movement/commitment and participants. Demonstrate that both minor and serious cases are reachable and understandable. Do not use the accumulated warning meter as impact severity, or claim the classifier is ready to implement as written.
3. **Pile-ups need real participants.** Grok proposes three or four already committed vehicles, capped at four. This is provisional and needs a reachable physical trigger, not collecting nearby queued cars. Introduce a distinct pile-up classification without renaming or reinterpreting old saved vehicle fires. Do not temporarily remove fires or force all new accidents to minor as a shipped shortcut.
4. **Fire protection needs a full response lifecycle test.** Physical civilian exclusion must preserve feasible sequential access/work/departure for every crew, including blocked returns and rerouting. Fire cannot barricade the only approach before EMS can work. No teleporting through wrecks; missed rescue deadlines and eventual clearance remain separate outcomes.
5. **Keep shared behavior shared.** Grok's Stage C wording says sandbox/later lessons only; interpret this as where recovery is taught, not different collision physics by game mode. Level 3 uses the same engine and still ends on any crash. Preserve the existing explicit H-tutorial exception. Existing sandbox serious/fire incidents already exist; the new stages do not introduce those categories for the first time.
6. **Do not bundle unrelated tuning.** Grok's proposed four-second police work for fenders is not adopted; retain existing six-second work and 90-second serious/fire deadlines for this initial comparison. No new fines or mandatory unlock changes.

## Bounded implementation handoff

Codex owns the next implementation/verification pass. First instrument isolated unchanged Level 3 and sandbox fixtures to count distinct encounters, qualifying exposure, warnings, actual contact, all household returns and unfinished journeys. Compare quiet unsigned, busy unsigned, Stop, Light, safe alternative routes, stationary yielding, same-axis queues and multi-tile junctions at identical demand. Use the same shared simulation for every comparison.

Prototype the area-level risk/decay and explicit failed-yield contract together; do not ship a meter that punishes compliant waiting. Then implement incident-based two-car severity and real pile-up participation/scene protection, with legacy incident parsing and save round trips. Cover mid-warning reload, area changes after road/control edits, fixed-frame equivalence, real dispatch through work and return, late clearance, H-tutorial preservation, and permanent challenge receipts. Broaden baseline tests to repeatable demand and phase variations; one 180-second quiet run (Grok's proposal) does not prove sustained safety. Desktop/narrow verification is required when warning or scene UI changes.

No runtime edits or publication in this assignment pass. Grok's balancing assignment is complete; numeric tuning, implementation and observed enjoyment remain unverified.
