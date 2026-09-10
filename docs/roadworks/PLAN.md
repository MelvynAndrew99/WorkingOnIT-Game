# Keep the town running through roadworks

Status: design discussion, September 10, 2026. No runtime implementation or publication. This extends the flow-puzzle plan: useful service is the whole-game core, with later field-inspired challenges, rather than a one-off Level 1 objective.

## User decisions

- Fun exceeds technical accuracy, with readable cause/effect and satisfying improvement.
- Single points of failure can be roads serving neighborhoods, the only usable store, or the only usable park.
- Real road widening is wanted. Traffic should detour around upgrades, and upgrades should take time.
- Emergency responders must still physically reach affected parts of town; a sole access road makes upgrading difficult.
- Latest terminology question: can Detour and Divert serve different purposes? The distinction below is a proposed game vocabulary, not a claim that these words have mutually exclusive professional definitions.
- Existing-tool flow prototype first remains selected; prepare disruption/closure behavior before shipping timed widening. Ordinary construction timers, building-upgrade timers, random facility breakdowns and mandatory duplicate buildings are not authorized by this discussion.

## Proposed player vocabulary

| Concept | Meaning in this game | Emergency treatment |
| --- | --- | --- |
| Divert | Keep ordinary traffic away from selected usable road; reroute using the existing network | Current code allows responding crews through; routine returns obey the restriction |
| Detour | The alternative road route around a disruption, built or chosen by the player | Must be physically usable by the relevant trip, with access back out |
| Roadworks closure | Road section unavailable while being rebuilt | Physical closure applies to all vehicles; no siren exception through excavation |

Initially retain one Divert restriction tool. A detour can be ordinary player-built roads plus a highlighted route preview, without adding a second similar toggle. Explicit signed detour routing could later add a different choice, but would require actual routing semantics rather than relabeling the current tool. Do not make the preview promise every driver will follow one fixed route when weighted rerouting can choose another.

`cityModel.ts` currently stores civilian closures; `isBlocked`/`blockedTiles` exempt responses. `cityTraffic.ts` permits existing traffic to leave and preserves movement/occupancy. This is a useful preparation mechanism, not a construction-zone model. Add separate saved works state and shared physical blocking for routing, dispatch, passing and movement. Preserve old diversion saves rather than changing all old signs into excavations.

## Proposed loop

1. Select a stretch and preview its future footprint, cost, duration and affected access. Show homes/destinations at risk and actual station reachability. Separate “a path exists” from “it has sufficient capacity”; do not promise a rescue deadline from reachability alone.
2. Build or retain an alternative route. A sensible permanent bypass or an existing loop is a valid solution; a bespoke temporary-road economy is unnecessary initially.
3. Divert new arrivals and let vehicles already inside clear the work area. Do not begin over vehicles, working emergency crews or committed passing reservations. If it cannot empty, keep it in preparation and explain what is holding it.
4. Explicitly start works. That section becomes physically unavailable, and a visible timer advances in simulation time. Global pause freezes it. Save/reload preserves progress. Offline progress is undecided, not assumed.
5. Keep the town served while work continues. Detour congestion, a store entrance left on the wrong side, or responder access create useful decisions. No guaranteed crash spawned to punish a closure.
6. Reopen the upgraded stretch after real construction completion and safe admission. Retire only restrictions owned by that work order; retain independent player diversions. The player chooses whether to keep or remove a useful bypass.

The timer exists to make the temporary road network matter, not to make the player stare at a bar. Short, visible construction with useful concurrent work is the first prototype direction; exact duration/cost and completion reward remain unselected. No paid skips, new upkeep or mandatory failure countdown.

## Resilience without mandatory duplication

Road redundancy means the neighborhood has another usable way in/out when the sole approach closes. Destination redundancy means households can obtain the same service elsewhere, with available capacity and usable routes. Two stores beyond the same closed road still share an access failure; two full stores offer no spare capacity. A store cannot replace a park's purpose, and a park cannot satisfy shopping.

A healthy simple town is allowed. Dependency warnings become useful when planning growth/works; do not penalize every cul-de-sac or sole shop merely for existing. Later challenges can explore destination outages, but no new random closures/failures are selected now. Preserve intentional destinations already committed by active journeys; don't make a road detour silently change shopping into leisure.

## Recovery and sequencing

Proposed first scope: one short work section at a time; this limits accidental district-wide closure and keeps the result readable. It is a design proposal, not a selected universal restriction. Before excavation, cancellation removes only the pending order and its own restrictions. After excavation, cancelling must not instantly restore asphalt or erase consequences. A bounded make-safe/reopen action or finishing the section should restore access; exact time/refund semantics must be designed before implementation. Restoring a safe route must remain possible at zero funds and on a full map, without resetting the town.

Construction completion should not require the road access that construction itself removed. If future physical construction crews are added, provide an explicit recovery plan; they are not part of this initial timer proposal. Service access concerns include station exits, incident approaches, work space and real returns, not simply ambulance arrival.

## Implementation order and acceptance

1. Complete the existing-tool flow/service prototype and demonstrate alternative routes at fixed demand.
2. Specify/test saved preparation, physical closure, clear-before-start, completion and recovery states; add work preview using current Divert and normal roads.
3. Implement true widening: logical geometry, entrances, lane choice, merges, junction capacity, responder traversal and safe conversion of existing journeys. Do not ship a cosmetic wide-road capacity bonus as physical lanes.
4. Combine with short timed upgrades and current-objective/UI guidance; verify desktop and narrow only by default.

Test sole-access and already-redundant towns, alternate destinations behind the same access point, full destinations, active/returning responders, occupied work sections, interrupted/reloaded works, independent player diversions, save compatibility, zero funds/full map and no duplication of charges/refunds/completion receipts. Compare pre-work, temporary-detour and upgraded service. Observe whether managing the disruption is fun; automated correctness alone is insufficient.

Engineering inspiration: [FHWA work-zone impact strategies](https://ops.fhwa.dot.gov/wz/resources/publications/trans_mgmt_plans/sec4.htm) includes detours, staged work and maintaining resident/business access. [FHWA incident management in work zones](https://ops.fhwa.dot.gov/wz/traffic_mgmt/imwz.htm) covers incident response on work zones and detour routes. These support the causal design, not a commitment to professional compliance modeling.

## Actual Grok review and open difference

[Installed Grok review](grok-review.md), based only on the [supplied brief](grok-brief.txt), agrees that planned disruption is a strong whole-game loop and distinguishes route redundancy, destination redundancy and spare capacity. It recommends simulation-time upgrades, preparation/draining, real widening before shipping timers and bounded restoration when cancelling.

Grok recommends initially retaining emergency passage through works and avoiding physical closure, arguing this reduces stranding risk. The lead favors supporting a genuine physical closure as a meaningful single-access-road challenge, with advance access information and bounded safe restoration. **This is not consensus or a user-selected closure policy.** The physical-closure sequence above is the lead proposal. Another future option is explicitly maintained emergency passage; never show an excavated/unusable road while secretly allowing emergency vehicles to pass. No-reset recovery means access can be restored, not that every road must always remain passable or every rescue succeed.

The user's subsequent Detour-versus-Divert question prompted the lead's distinction between the alternative route and a restriction. Separate buttons, signed mandatory routes and work-zone passage policy remain design choices. Do not attribute those exact UI choices to Grok's completed review.


## Subsequent user resolution and mode request

The user chose **no responder entry in upgrade areas initially**, expecting short downtime. The emergency-pass-through alternative above is superseded for active works. They requested an Arcade/Realistic preference in the pause menu and actual Grok collaboration; [mode contract](MODES.md) records the returned review and lead decisions. Both modes keep physical blockage; first proposed distinction is construction/restoration timing. Changes to rescue-deadline consequences remain unselected. They also requested installed Claude generate sprites; the art is being produced separately from simulation geometry and must not silently become a claim that widening exists.


## Artwork source correction

User reminded the lead of the supplied Kenney packs. Inspection confirmed usable cones, barriers, arrows and surface pieces; reuse these before commissioning custom replacements. [Verified tile coordinates and preview](../artwork/roadworks/README.md). The prior generic Claude sprite brief is superseded as the preferred starting point. No runtime art changed in the inspection pass.

## Local artwork delivery (2026-09-10)

The authorized Kenney reuse pass is implemented: existing Divert tiles use warning barriers/cones, and composed work surfaces/directional boards are packed for later use. [Artwork and verification](../artwork/roadworks/README.md). This delivery changes rendering only; the timed works, widening and mode mechanics above remain planned. Desktop/narrow, production build and 17 focused regressions passed. No publication.
