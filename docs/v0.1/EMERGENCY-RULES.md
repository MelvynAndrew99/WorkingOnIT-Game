# Emergency traffic iteration

User request: ambulances and fire trucks cross automatically, adding pressure to ordinary release decisions. Never create an ambulance/fire-truck collision through automatic scheduling alone.

## Rules and fairness

Edit src/game/trafficRules.ts for the traffic schedule and tuning. Simulation behavior remains in trafficModel.ts; visuals and HUD read its state. Rules are bundled configuration, so restart a shift after changing them.

Emergency requests are serialized. Each gets an approach warning before automatic dispatch. The next request cannot dispatch while an emergency vehicle or its wreck remains. Road closures and occupied entry points can defer dispatch. Waiting ordinary vehicles yield at entry. Once dispatched, the emergency needs no release press; the player manages conflicting ordinary traffic.

The persistent emergency banner identifies vehicle kind, approach and countdown. The road marker identifies the actual approach even when controls rotate. Pause freezes the countdown. Fire trucks have a red body and ladder; ambulances retain their medical marking.

This iteration does not implement lane changes, a physical overtaking simulation, new model progression or final reward balance. Emergency dispatch begins at the warned stop-line entry; ordinary queues yield there. Whether this pressure improves enjoyment needs playtesting.

## Playtest

First watch without pressing anything: automatic traffic should remain safe. Then clear ordinary queues while respecting the warning. Try deliberately crossing the emergency path, recover, and retry. Check whether warning time is sufficient, whether the route is obvious, and whether waiting creates anticipation rather than dead time.