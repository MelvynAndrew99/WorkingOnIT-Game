# v0.1 traffic simulation

Implementation: `src/game/trafficModel.ts`. Pure TypeScript, no renderer, browser, SDK, timers, or random inputs. A fresh `createTrafficModel()` starts a new shift; instances share no mutable state. The root integrates rendering and control mapping.

## Contract and coordinates

The returned object exposes `state`, `update(dtSeconds)`, `release(resolvedLane)` and `resetContext()`. Actions return whether they succeeded. The state object is stable, but its `vehicles` array may be replaced during updates; renderers must read the current array. Vehicle IDs identify objects within a shift.

Board coordinates are 720 units square. North enters from the top and travels down at x 330; south enters from the bottom and travels up at x 390. East enters from the right and travels left at y 330; west enters from the left and travels right at y 390. Progress increases toward 720 for all approaches. Vehicles are removed only when their rear leaves the board, so entry/exit centers can briefly lie outside its bounds.

Car and ambulance collision footprints are 44 units long by 26 wide; trucks are 68 by 26. Match those footprints visually. Opposing approaches use distinct paths. Perpendicular moving vehicles collide only when their actual axis-aligned footprints overlap, not merely because two releases occurred close together. Queued vehicles and recovering wrecks are excluded from new collision checks. Same-lane vehicles follow slower trucks and wrecks with a 12-unit gap.

One input releases one head vehicle, with spacing protection against repeated taps. Queue heads stop at progress 240. Queues advance behind departing vehicles without overlapping them. Four vehicles maximum wait per lane; arrivals to full queues are skipped, with no hidden token penalty or compulsory failure. These are prototype simplifications, not finalized traffic economics.

## Authored shift

- 120 seconds total, four cars waiting initially.
- Ordinary arrivals begin at 2 seconds, every 1.7 seconds before 45 seconds and 1.35 afterward, cycling lanes deterministically.
- At 25 seconds, a truck is requested on west; introductions retry if that queue is full. Later ordinary arrivals can include trucks. Trucks move at 150 units/second; cars and ambulances at 220.
- At 40 seconds, a persistent warning announces rotation at 45 seconds. The rule changes once from `normal` to `rotate`. The UI must show effective lane labels and resolve rotation before calling `release`; the simulation never remaps a lane itself.
- At 65 seconds, an ambulance is requested on east. Later arrivals can include ambulances. Clearing one earns bonus tokens/score; there is no invisible urgency deadline.
- At 80 seconds, north closure is warned. From 85 to 95 seconds north accepts no spawns or releases; already released cars complete their journeys. Waiting cars remain queued. North reopens at 95 seconds.
- At 120 seconds, state freezes and the shift report becomes available. A restart creates a fresh model.

## Provisional economy and recovery

Start with 20 tokens. A successful ordinary vehicle earns 10 points and 1 token, plus a combo bonus of 1 at 5 clears,2 at 10, and 3 from 15 onward. Each bonus step adds 1 token and 5 points. Ambulances add another 2 tokens and 10 points. A crash costs 6 tokens, floors at 0, and resets the combo. There is no resource-based increase in corruption, no game-over at zero tokens, and no automatic morality ending.

Each crash counts a colliding pair as one event. Its two vehicles remain visible as wrecks for 1.2 seconds, then clear automatically. Wreck removal earns nothing. Surviving ordinary traffic continues to earn tokens, including at zero reserves.

Context reset costs 8 tokens, only when the rule is rotated. Insufficient funds or an already normal mapping leave tokens unchanged. Reset restores normal controls for the rest of the shift, because the authored memo fires only once. The reset is the AI player's action, not a separate human helper. Balance remains a playtest hypothesis.

## Verification and limitations

Run `nix develop --command node --test src/game/trafficModel.test.ts` in WSL. Tests cover both safe opposing axes, actual crossing collision timing and recovery, safely spaced perpendicular releases, truck following, queue spacing, rotation/reset costs and no double mapping, low-token recovery, closure/reopening, combo earnings, frame-delta safety, finished-state freeze, and restart isolation.

`update` rejects invalid deltas, caps each call at 0.25 seconds and substeps at 1/60 second. This prevents resumed-tab jumps and collision tunneling. The host should pass elapsed seconds and pause when appropriate. Very slow devices deliberately run a slower shift rather than fast-forwarding missed simulation time.

Automated checks establish deterministic mechanics, not fun, difficulty, mobile input usability, or final economy balance. The model intentionally lacks turning, pedestrians, queue abandonment, permanent obstructions, persistence, and further jobs.
