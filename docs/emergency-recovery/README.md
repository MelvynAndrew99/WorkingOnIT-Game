# Emergency access and saved-city recovery

Implemented locally September 9, 2026 for CRISIS-01. Codex implemented the model/traffic changes; separate Codex agents authored nine recovery regressions and reviewed occupancy safety. This is not a published release or a claim that the user's exact screenshot/save has been reproduced.

## Behavior

- Outbound police, EMS and fire can cross civilian diversions, including station entrances. Active wrecks and removed roads still block them. Routine returns retain ordinary road rules.
- When routes break, responders reconsider reachable sides of the incident instead of remaining bound to the originally selected approach. Stalled outbound vehicles can seek an alternate route around stopped bodies. Routing changes still acquire the actual lane/junction space before moving.
- Opposing-lane passes can span a longer straight queue; the previous arbitrary six-tile cap is removed. The whole corridor, lane changes and safe merge must be reservable. Occupied opposing space, bends, junction occupancy and blocked exits can still prevent passing. No changes to the 0.4-second lane transitions or responder speed.
- A newly stranded vehicle retains its local approach/departure geometry while waiting, so it holds its actual lane instead of both lanes. This persists across saves and lets a responder pass where the opposing lane is free. Old one-point waiting records lack heading information and remain conservative until a safe route restores their geometry; no guessed lane migration or dropped vehicle.
- Arrival reserves the full scene-work tile before entering it, throughout final approach and reconstructed occupancy. A responder cannot start working over an opposing vehicle.
- Rescue deadlines and fatalities remain. Reconnecting a town after a missed deadline allows crews to finish clearing the incident without resetting the city or undoing the fatality.

## Verification

- `nix develop -c npm test`: 170/170 pass, including nine independent recovery regressions.
- `nix develop -c npm run build`: TypeScript and production build pass; existing large-bundle advisory remains.
- [Browser check](browser-check.mjs) passes at 390×844 and 1440×900. Isolated contexts boot/reload an exact saved mid-pass town, preserve approved textures, pass a stranded civilian and diversion in the real mounted game, and reach the scene during the red phase with no page errors. The fixture skips guidance to isolate movement from the intentional first-crash tutorial pause. No personal save is read or modified.
- Model cases cover all three services, station-entrance closures, a physical wreck barrier, a changed scene approach after road removal/reload, late fatality followed by saved-town recovery, a nine-car stationary queue with a pass longer than six tiles, returning-junction clearance, saved stranded-customer passage/recovery, and exclusive scene arrival.

## Remaining boundaries and next work

This is a verified recovery slice, not a guarantee that every arbitrary jam clears unaided. A completed crew whose sole return route is diverted may occupy the only scene access; the regression proves reopening that route resumes clearance in the saved town. Preserve space for crews to leave as well as arrive. Curved opposing-lane passing is not implemented.

A new clinic still does not replace an already-assigned ambulance. The next advice work must not recommend that as a working fix for a stuck assignment until explicit backup/reassignment semantics are implemented and verified. Delayed manager advice and ongoing crisis charges remain queued. The user's exact affected town has not been available for verification; do not describe it as repaired or require a reset.
