# First post-tutorial flow puzzle

Status: design discussion and implementation plan, September 10, 2026. No runtime changes or publication in this discussion. User requested actual Grok consultation, planning and eventual implementation. The [installed Grok response](grok-review.md) and [text-only brief](grok-brief.txt) are preserved; recommendations below are the lead's synthesis, not blanket adoption of that draft.

## Confirmed direction

- **Fun is greater than accuracy.** Exaggeration is welcome: visible buildup, understandable causes and satisfying relief take priority over textbook calculations.
- Transportation-engineering concepts should become puzzles in the player's own growing town after the existing tutorial. Do not stamp a scenario onto their land or restart teaching.
- Give civic outcomes such as a thriving neighborhood and useful shopping/leisure service, not an instruction to widen a particular road or achieve a mandated grade.
- The user's initial example is LOS A–F, rising demand on a two-lane road and widening to four lanes. Their subsequent choice is **start with existing tools, develop widening next**. Four-lane roads are a later implementation step, not silently dropped.
- Preserve creative alternatives, foresight, chosen growth, saved cities and receipts. A good initial layout succeeds; success does not secretly create more traffic. Existing financial/refund and recovery rules remain.

## Recommended first playable arc

Working title: **A neighborhood worth visiting**. The manager wants a thriving neighborhood; people need to shop and get home. The player chooses further homes in their existing town. Shops and the existing park create understandable destinations. Shared approaches may become busy as demand grows. The task evaluates useful service, not whether the player produced a jam or obeyed a recommended construction method.

Start with shopping as the scored service; leisure remains real and visible, and a subsequent park-focused variation can reuse the foundation. Do not require every household to visit every store or park. A possible task reads: “Help the growing neighborhood shop and get home reliably.” Exact household count, observation interval, delay tolerance and reward remain prototype parameters. Reuse existing growth thresholds where suitable; do not retroactively redefine completed cash or land missions.

The desired moment: a queue clearly accumulates, the player sees usable destination space and identifies the approach as the restriction, then a change produces visible movement and more completed service. Exaggerate the contrast through calibrated demand timing and feedback, not fabricated trip success, speed boosts on upgraded art, or an arbitrary failure quota.

Two solutions to demonstrate under the same demand:

1. Improve the actual junction or provide a useful alternative road so existing journeys can move.
2. Place an additional destination nearer unmet demand so future journeys need less of the overloaded approach. This must follow real destination choice and genuine demand; it must not retarget committed journeys arbitrarily.

These are alternatives to verify, not promises that every control, bypass or duplicate store improves every town. Two adjacent road rows do not constitute an implemented four-lane road. Wider roads will later offer a third option with real lane choice, merges, exits, junction movement and emergency access.

## Feedback and success

Use a small **Flow** indicator inspired by A–F, with plain labels such as Smooth, Busy, Crawling and Jammed. Exact grade mapping is a design parameter. Keep it contextual to a road/approach or selected neighborhood; do not describe a citywide arbitrary score as professional LOS. A is a pleasing result, not a universal mandatory civic goal. No useful traffic samples means Quiet/Measuring, not an automatic A.

Keep the current objective and optional Details/Heatmap/Dashboard; do not restore the removed Jobs/history UI. Show the limiting condition in plain language: traffic waiting, destination full (including inbound reservations), or no usable route. Do not infer road failure solely from unused parking or high occupancy. Busy destinations should mean customers served, not parked cars immobilized at the exit.

Evaluate a rolling sample of actual service and return journeys, including unmet demand and cars still waiting. Averages of completed trips alone conceal starvation. Use a stable demand target during each evaluation, and prevent deleting homes/disconnecting roads from improving the score. Allow legitimate rearrangement and recovery; do not permanently bind success to a demolished building ID. Pause freezes the observation. The interval is measurement, **not a failure countdown**. No irreversible loss when the player needs longer. Once earned, the receipt remains earned.

A traffic grade can improve quickly enough to make an edit satisfying, while completion requires enough actual journeys to distinguish real improvement from a momentarily empty road. Avoid flashing grades between individual departures. Prototype the smallest measurement needed, not a broad analytics redesign.

## Current source findings

- `cityDiagnostics.ts` distinguishes access, current stopped traffic and destination capacity, and exposes inbound/occupied slots. These are observations, not a calibrated sustained-flow score.
- `cityMissions.ts` records distinct households at completed visits and checks connectivity both ways. It does not prove sustained actual returns; do not relabel these permanent historical receipts as a new flow test.
- `cityTraffic.ts` records completed return/legacy journeys in a rolling history of time and wait, but lacks the household/purpose attribution needed for a neighborhood service window. Service trips are separate. Add bounded attribution only where needed and preserve old-save parsing.
- One car per home and destination reservations bound local traffic. External demand is bounded by town size and destination availability; missed arrivals are not an infinite queue. A straight road is not guaranteed to saturate. The initial prototype should test an actual shared-approach bottleneck using existing controls before promising the original straight-road example.
- Route shaping, controls, destination placement, visits/returns and congestion-aware rerouting exist. Actual multilane widening does not.

## Implementation sequence and gates

| Order | Bounded work | Acceptance |
| --- | --- | --- |
| FLOW-01 | Codex demand/measurement prototype with current tools; audit committed purposes and comparison fixtures | Reproducible road-limited case with spare destination capacity; two working solutions at identical demand; preplanned good layout passes; full destination and disconnection remain distinct |
| FLOW-02 | Current-objective integration and compact feedback; installed Claude UI preference, Codex integration, Grok bounded balance review | Untimed outcome is legible; actual returns/unserved demand matter; selected roads show causal improvement; no new permanent history screen; desktop/narrow interaction and screenshots |
| FLOW-03 | Small observed playtest and tuning | Player identifies the restriction without being told the tool, tries an alternative, and enjoys watching traffic recover. If the queue never forms or the fix has little payoff, tune before shipping |
| FLOW-04 | Real four-lane road design and implementation | Geometry independent of art; affordable physical widening, entrances, lane choice, merges, junctions, opposing flows, responders, road edits and save continuation; solves demonstrated segment capacity, not every downstream restriction |

FLOW-01/02 refine and make concrete the unfinished sustained-flow part of MECH-01/02; do not implement a competing second mission/diagnostic architecture. This is the next proposed gameplay slice after UI cleanup, before additional routing explanation polish and unrelated mechanics. Reproducible blocking correctness bugs remain first. No instruction to deploy the new puzzle is inferred from the previous UI-release authorization.

Prototype checks: same fixed demand before/after, enough cycles after warmup, every affected approach gets service, actual returns, no stalled-trip omission, preservation across queued-save reload, pause/resume, zero-money/full-map recovery and no revoked cash/land receipts. Automated checks establish mechanics; observation establishes fun. Existing tutorial expansion/outside consent remains unchanged.

## Grok discussion and lead decisions

Grok proposed a busy shopping strip, a finite demand pulse, round-trip outcomes, alternative routes or nearby destinations, visible queue relief and eventual widening. Adopt the causal/visual payoff, distinguish road and destination capacity, and test bounded timing exaggeration if ordinary chosen growth produces too little pressure.

Do **not** adopt its timed Saturday pass/fail window, suggested 80% target, new school/market systems, visitor tickets, slow-motion claim, or jokes dismissing pedestrians. Those are unselected proposals or unsupported current features. Our first task is untimed, uses existing shopping/leisure purposes, and requires fair service rather than quietly abandoning the slowest households. The user selected existing tools after the brief was sent; Grok's immediate-widening route is no longer the selected first slice.

## Engineering reference, used lightly

FHWA explains that signalized-intersection LOS uses control delay and examines movements/approaches as well as the intersection. Flow, queues, demand and capacity answer related but different questions. A bottleneck appears when demand exceeds the available capacity; widening upstream need not solve a restriction downstream. Those causal ideas support puzzle design without imposing textbook thresholds or a claim of HCM compliance.

- [FHWA Traffic Signal Timing Manual, Chapter 3](https://ops.fhwa.dot.gov/publications/fhwahop08024/chapter3.htm)
- [FHWA Bottleneck Mitigation Concepts](https://www.fhwa.dot.gov/publications/research/operations/16064/004.cfm)

The A–F metaphor is an approachable game abstraction. Fun-first exaggeration is expressly authorized; mathematically accurate professional LOS grading is not the deliverable.


## Subsequent whole-game direction

The user confirms these service goals are the whole-game core and requests single-point-of-failure challenges plus timed road widening with detours. See [roadworks/resilience](../roadworks/PLAN.md). Existing-tool prototype first remains; widening now needs a designed construction/disruption phase as part of its eventual delivery. Earlier untimed objective language still applies to civic failure deadlines, while road-upgrade duration is explicitly wanted.
