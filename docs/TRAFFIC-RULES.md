# Trip intent and emergency rules

Working draft, 2026-09-09. User decisions are distinguished from proposed tuning. This is the next mechanics design after the guided tutorial, not a claim that all systems exist.

## Accepted direction

The core loop is to observe intended journeys, restore access, then improve the network as growth and incidents increase complexity. A route failure must remain visible. Drivers do not instantly swap shopping for a reachable park. Optional leisure can eventually be abandoned after excessive waiting, with a player consequence and a manager warning identifying the problem as a real priority. Essential trips should retain their purpose; work is a user example, not an implemented destination type.

Keep the first emergency simple: EMS from a player-built Clinic responds to the tutorial injury crash. Show the required service at the scene. More involved incident rules should follow deliberate design, rather than requiring three departments by default in every lesson.

## Proposed rules for the next slice

| Situation | Driver / responder behavior | Feedback and consequence |
| --- | --- | --- |
| Route becomes blocked | Keep the assigned goal; find a different legal route to it. Wait if none exists. | Mark the affected goal and reason: blocked route, full destination, or traffic delay. |
| An optional leisure trip stalls | Allow a bounded patience period, then cancel the visit and return home using real roads. | Count a lost visit once; no successful-visit benefit. Show which access problem caused it. |
| A committed essential trip stalls | Retain the goal; do not convert it into leisure. | Persistent unmet demand. Exact essential purpose roster remains to choose. |
| Simple injury crash | One EMS crew reaches an accessible scene approach, treats the injury, completes scene work, and returns. | Ambulance badge: Build Clinic / en route / waiting / on scene. Clear the blockage after the required work. |
| Repeated abandoned visits | Keep a location-specific failure record rather than treating cancellation as traffic optimization success. | Manager warns after sustained unresolved failures; relevant improvement postpones advice and verified recovery retires it. |
| More complex emergency | Determine a distinct gameplay reason before adding a specialist or additional crew. | Show every requirement from the start; do not reveal a surprise department after another crew leaves. |

Proposed first abandonment penalty: the lost visit earns no benefit, and a visible reliability measure records the failure. This avoids an unexplained extra fine. The user has requested a meaningful penalty, but has not selected money, satisfaction/reputation, scoring, amounts, or thresholds. Reliability scoring is not implemented. Decide the penalty before implementing abandonment.

Use simulated time for patience, deadlines and warnings. Pausing freezes them. Do not count one cancelled visit repeatedly, refresh patience on every route retry, cancel a journey as a way to award income, teleport a returning car, or erase failures on reload. Changing a destination and cancelling a trip are different outcomes. Building removal and permanent disconnection need explicit recovery rules so a save cannot become unrecoverable.

## Questions to resolve in order

1. Which existing purposes are optional? Leisure is agreed; classify shopping before applying abandonment to it. Work remains later scope.
2. What consequence makes lost visits matter and remains recoverable? Select the feedback measure before tuning its severity.
3. Does patience measure all travel time or only excess waiting? Recommended starting hypothesis: excess waiting, so a long but flowing route is not treated like a blockage.
4. What evidence counts as recovery? Prefer actual resumed journeys and improved completion over merely placing road tiles.
5. What distinct emergencies justify Police and Fire? For example, a fire could require suppression, while a non-injury obstruction could require a different clearance crew. These are proposals, not an approved roster.

## Current implementation boundary

The H tutorial uses an EMS-only injury response. Saved older tutorial incidents adopt the same clearance requirement while already-dispatched crews retain their real journeys. Ordinary main-game incident severity rules still use the existing Police / Police+EMS / Police+EMS+Fire mapping pending the broader rules review. The current tutorial shopping safeguard retains shopping demand during the active incident; it is not yet a general persistent destination/patience system. No abandonment penalty or general warning system has been silently added.
