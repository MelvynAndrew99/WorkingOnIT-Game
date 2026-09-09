# Traffic flow slice

Historical verification of the initial controls milestone. The approved [destination/emergency slice](../destination-emergency/README.md) supersedes the no-incidents, immediate-roundtrip and trip-cancellation limitations below. Numerical comparisons describe the original scenario and are not current balance guarantees.

The first two mechanics are changing routes and controlling junctions. The playable town remains a free construction sandbox; this slice does not finish the tutorial or introduce outside traffic, incidents, or emergency services.

## Try the controls

1. Build several homes and a store, connecting their entrance arrows. A single home has only one active trip and will not demonstrate a queue by itself.
2. Unsigned intersections give east–west traffic priority; north–south drivers wait for a gap. Make routes meet at a T junction or crossroads. Select **All-way stop** (key 5) and tap the junction. Tap it again to remove it.
3. Select **Traffic lights** (key 6). Tap the junction to install balanced timing. Tap again to favor north–south, then east–west, then balanced. A gold line marks the favored axis; colored approach lights show the current phase. Adjoining junction tiles share one controller, with lights on every external approach. Tap any member to edit that control.
4. Observe **waiting now**, **trips / last 60s**, **average wait**, and **longest stop** together. Average wait measures stopped time among recently completed trips; a car still stuck in a queue is not part of that average. **Free-flow route** measures planned driving distance and excludes queuing.
5. Try a shorter connection or a different signal preset. Allow old trips to finish and the 60-second window to replace the earlier results. Keep the same homes and stores when comparing. Disconnection cancels invalid trips in this slice and must not be interpreted as a traffic improvement.

Stops cost $25 and Lights cost $75 per intersection. Timing changes are free; replacement/removal refunds actual payment (historical free controls refund $0). Joining two intersections retains their first controller and reports any extra controller removed. Remove on a controlled junction removes its control first, preserving the road. Controls and construction remain editable while paused. Pause freezes traffic and the measurement window. Older saves retain their town and funds; any overlapping pre-queue journeys are deferred to their homes on migration without completion credit.

## Current limits

One active roundtrip per home keeps initial demand bounded. New trips choose the shortest road route; equal-length or longer bypasses are not congestion-aware alternatives yet. Existing trips retain their route unless construction invalidates it. All-way stops share access and can restore service to a yielding approach; approach-specific stop priority is a future extension. Not every junction needs a traffic light, and a poorly chosen preset can increase waiting.

At the same ten-home demand over 180 simulation seconds, the regression scenario completes 3 trips from the yielding north arm without a control, 38 with an all-way stop, and 24 with an east–west-favoring signal. These are deterministic model observations, not household playtest results or final balance. Signals do not automatically maximize total throughput; serving both approaches and limiting long stops matter too.

These readouts are diagnostics, not a mission score. A future objective must preserve required demand, include warm-up, and verify service to every required destination so demolition or starvation cannot earn a win.

## Local verification

Run model tests and builds through `nix develop`. The adjacent `browser-check.mjs` accepts `CITY_URL`, `CITY_PLAYWRIGHT_MODULE`, and `CITY_CHROMIUM_PATH`; it uses isolated browser saves and checks touch placement, preset cycling, persistence, control removal, live simulation, and phone/desktop map space. The existing `docs/map-expansion/cold-render-check.mjs` covers first-load terrain independently of camera movement.
