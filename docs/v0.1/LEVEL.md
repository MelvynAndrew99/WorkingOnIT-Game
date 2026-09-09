# AI Overlord v0.1: first shift

Status: authored prototype proposal, pending playtest. This does not settle token balance or artwork approval. Player is the AI; no separate human rescue mechanic.

## Board and readability contract

One square board, 720 by 720 design units. Intersection center (360,360). Asphalt spans x=260..460 vertically and y=260..460 horizontally. Inbound paths: north x330 travels down; south x390 travels up; east y330 travels left; west y390 travels right. Straight-through movement only. Opposing lanes may cross simultaneously; perpendicular travel requires attention to actual occupancy. Releasing a lane dispatches one vehicle, never an entire queue.

Use a fixed top-down camera. Keep the middle 200-square visually empty except for actual traffic and feedback. Buildings sit in the four corners; their detail must not resemble interactive controls. The static board arrows indicate travel direction, not permission to release. Scene-owned signals, queue counts and current effective controls are separate from the base artwork. Avoid static green lights that might falsely promise safety.

On the 720-wide portrait stage, budget roughly 180 design units above the board for timer/tokens and one short notice. Place board near y180, then reserve y920..1200 for large four-lane controls and the context reset. Adapt anchors to stage.designHeight(); do not crop the board to force a layout. At a 360px CSS viewport, 720 units scale to 360px, so lane prompts/HUD belong in the readable React layer rather than tiny in-world text. Touch targets should remain at least 44 CSS pixels. Keep effective controls adjacent to directional labels, using shape/text as well as color. Make no critical information depend on scenery.

## Authored 120-second sequence

Times are active-play seconds; pausing freezes this schedule. Same introductory order on each retry so learning can transfer. Spawn rates below are starting hypotheses, not validated balance.

| Time | Beat | Player learning and proposed pacing |
| --- | --- | --- |
| 0..8 | First day | Spawn north only, then south. Prompt: "Release one car." Show both safely passing. No instant penalty while the player learns the first action. |
| 8..25 | Ordinary work | Add east, then west, then rotate through lanes. Approx. one arrival every 2.0 seconds overall. "Wait until crossing traffic clears." Make urgency gradual and visible. |
| 25..40 | Long vehicle | Announce before the first truck reaches its stop bar: "New vehicle class: longer car." One truck at a time initially, other arrivals remain at the established rate. Player learns a longer body occupies the conflict area longer. |
| 40..45 | Mutation warning | "Manual updated. Controls rotate in 5." Preview the new effective labels. Avoid introducing another event here. Queue urgency should not expire during the first mapping demonstration. |
| 45..65 | One visible remap | Activate exactly one deterministic rotation. Keep the mapping visible and stable afterward. Do not change the escape/reset control. Give roughly 20 seconds to adapt before introducing emergency traffic. |
| 65..80 | Priority vehicle | First ambulance announces arrival and shows a distinct urgency indicator. Use one ambulance, with other vehicle pressure steady. Copy: "Priority request received. All requests remain urgent." |
| 80..85 | Closure warning | "North entry closes in 5." Flash the incoming north boundary, not the north exit. No second mutation. |
| 85..95 | Incoming north closure | Stop north arrivals and prevent north release while closed. Already-dispatched vehicles finish crossing normally. Hold any queued north vehicles and suspend their delay penalty. Southbound entry remains open; the opposite exit is never blocked. Reopen visibly at 95. |
| 95..110 | Workload surge | All four entries reopen. Approx. one arrival every 1.3 seconds overall. Reuse learned vehicles and mapping. No additional rule tutorial. |
| 110..120 | Last ten seconds | Increase urgency/audio gently, keep traffic readable. Optional second ambulance only if playtests show enough decision space. At 120 stop accepting input and present the review without letting invisible post-shift penalties accrue. |

Recommended first-run reduction: one truck introduction and one ambulance introduction are enough. If new players cannot describe their first post-mutation mistake, lower arrivals or extend adaptation time before removing clarity cues. Difficulty should come from choosing and executing under pressure, not from interpreting surprise input failures.

The 85..95 closure needs explicit queue semantics. Do not simply hide the north lane or leave its queued vehicles accumulating unavoidable delay costs. If the simulation cannot suspend those penalties yet, use a no-new-arrivals event with continued release and describe it as an approach diversion, not a closed lane. Root/simulation author chooses the implemented contract and updates this note if different.

## Comic chaos and recovery

A collision has one obvious contact point, a short squash/spin, two or three lightweight debris shapes, a comic sound and quick removal (target about one second). Keep other queues visible throughout. Stopbars and active lane labels must survive the visual effect. Do not chain permanent wreck blockers in v0.1; those transform one understandable error into an unrecoverable traffic puzzle.

Use brief detached reports after the player can see the cause: "Two vehicles successfully became one incident." A truck mistake can use "Length was not requested." Reserve the biggest line for the shift review: "Human labor eliminated. Please continue operating manually." Avoid repeating a toast for every vehicle or masking a mutation announcement with a joke.

Keep successful work satisfying: clear exit pop, short combo feedback, and token surplus visibly growing. Funny failure is a spectacle, not proof that the player has become evil. Deliberate havoc and accidental mistakes remain distinguishable through player choice, not an alignment meter. Reset cost and token values stay provisional; a learner must still be able to finish/retry the shift after exhausting tokens.

## Prototype art contract

src/game/trafficArt.ts exports drawTrafficBoard() and drawVehicle(kind,color), both Pixi Containers with no ticker or store dependency. Board uses cream city blocks, plum asphalt, muted teal roofs/trees and coral accents. It is functional prototype illustration, not a replacement cover or approved final art. Vehicle origin is its center, default nose upward: car 28x46, truck 32x70, ambulance 28x54 body dimensions. Shadows/wheels extend beyond these bodies. These visual sizes do not define simulation collision geometry. Ambulance uses a teal medical plus and roof lights for recognition.

## Household playtest questions

1. Without explanation, which lane will the next press release before and after 45 seconds?
2. Can the player identify the two vehicles and decision that caused a collision?
3. Does the truck look meaningfully different from a car at phone size?
4. Can the player tell that only incoming north closes, while south can still leave through the north exit?
5. Does a collision invite a recoverable next decision within a second or two?
6. Is the second shift noticeably more controlled, and does that control create more tokens?

Record observations separately from predictions. The first test can use this full schedule, but diagnose trouble by testing stable controls, then remap alone, then events alone before increasing difficulty.

Integration correction: runtime body dimensions are 26x44 for car/ambulance and 26x68 for truck. Earlier dimensions above are superseded.
