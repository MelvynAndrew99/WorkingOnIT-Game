I'll review the current HUD, economy, and design notes first, then give an independent recommendation with no code changes.I have the design brief. Next I’ll inspect the HUD layout, costs, and available metrics so the UI and mission advice stay grounded in the current build.I have the HUD, costs, and metrics. Next I’ll write the independent review: UI, growth missions, and economy, with no code changes.**Independent review. No code. User decisions vs my proposals are marked.**

User decided: growth and saving first; stores/parks attract driving; services when needed; after a wreck, build around it until police/EMS; no efficiency/fatality goals yet; optional dismissible missions; all tools from the start; existing saves unchanged; no forced crash, no foresight punishment, no outside-traffic gates; detours must not be described as rescue; opaque More modal is the discovery problem.

I propose the layout, mission numbers, predicates, and copy below.

## UI

Do not keep Park/Hospital/Fire/Police behind a full-screen dialog. The backdrop hides the map, so players cannot compare footprints while choosing a tool.

**Recommendation: three labeled categories, one four-slot tray, one selected-tool chip.**

1. Chip always visible: `Store · $400` plus **Rotate E**. Selection and cost stay on screen while placing. Rotate is never only inside a closed modal.
2. Tabs: **Town | Civic | Traffic**.
3. Tray:
   - Town: Home $200, Store $400, Road $20, Remove
   - Civic: Park $300, Police $600, Fire $700, Hospital $800
   - Traffic: Stops, Lights, Closure, Pan

Pause and City report stay in the header. Expand can stay with camera. Missions use the existing message slot plus a **Hide jobs** control, never a blocking dialog.

This replaces construction + traffic + Buildings/Rotate/Pause with tabs + tray + chip, so Traffic is one tap, not a missing row. Civic is how the last four buildings are found. Map height should not fall below the current 194px at 320×640; dropping the always-on traffic row is the pixel source.

**Reject:** always-on 7-building grid (another row, smaller map); icon-only palette (breaks the 17.6px floor or hides names); peek sheet over the map (covers the tiles you are about to tap); locking Civic until a mission (user: tools from the start); putting construction in the header (header is already ~250px).

Desktop can keep the same tabs. Do not add a second layout that places roads under an open drawer.

## Growth arc (optional)

Need a persisted **unique-home served set**. Lifetime `completed` is one looping car. `activeTrips` already ignores parked and crashed cars; still require completions so a jam is not a win. Do not score wait, throughput, or demolition.

| # | Job | Predicate (current sim) |
| --- | --- | --- |
| 1 | Open for business | ≥3 homes still connected to ≥1 store; ≥3 distinct homes finished a shopping visit |
| 2 | Make them drive to a park | ≥1 park still connected; ≥3 distinct leisure completions; the store still exists |
| 3 | Fill the streets | ≥8 connected homes, ≥1 store, ≥1 park; peak `activeTrips` ≥6; ≥8 distinct shopping completions |
| 4 | Keep the till fat | Snapshot when #3 first becomes true: funds ≥ $6500. Optional **Thrifty** recognition if no police/fire/hospital yet. Still complete #3 if they already built stations |
| 5 | A way around | Player closes one approach; ≥1 home still completes a visit within 60s on another route. No spawned wreck |
| 6 | If a wreck already exists | Show real `needs` + remaining deadline. Never complete on “cars went around.” Complete only if every required crew finished on-scene work, or the player dismisses |

No efficiency cap, no fatality quota, no external gateway. Hide/dismiss persists. Old saves get empty mission state, same funds, same town.

## Economy (challenge)

$10,000 plus $100/visit plus $20/10s makes $2,100 of stations a rounding error. 21 shopping visits buy the whole department. I would **not** cut existing treasuries or add maintenance.

**Bounded first playable (proposal):** keep $10,000, full refunds, current prices. Tension is opportunity cost, not insolvency: $2,100 is ~10 homes you did not place. Mission #4’s cash snapshot is the “don’t buy badges yet” beat. Rewards are recognition stamps, not cash (cash would fund the stations the manager wanted to defer).

If playtests show everyone buys all three stations before the first store, **ask** before a new-game-only start around $4,500. Do not silently change old saves.

## Cheap-now, jam-later: how it fails

1. **One car per home never jams a 16×14 grid.** This arc can only promise more driving. Congestion belongs after outside traffic or density, not in job #3.
2. **Parked visits empty the street.** 5s/10s off-road fights “cars on the road.” Keep visit times; score outbound/return + completions, not occupancy.
3. **Foresight players never suffer.** Treat extra roads and an early hospital as success. Do not fail a finished job when they later connect.
4. **Refunds plus $10,000 erase poverty.** Fine. The joke is what he *wants* to buy, not a bankrupt player.
5. **Visit income paves the whole map.** Later pressure should be demand, not a road tax.
6. **Unsigned crossings already crash (~38s in the busy fixture).** Keep Stops/Lights/Closure available. Do not fail growth jobs on a death. Do not spawn a wreck for content.

Remedy without forced failure: player-chosen connection later; preview that a local road will become a through road; keep completed jobs completed.

## Detour vs rescue

User advice to keep: loop a road around the mess and save for crews. Truth the UI must keep: a closure only stops new entries; the wreck still occupies the tile; police / police+EMS / all three still have to finish; 90s still runs.

**Manager:** “More homes, more engines, more people who need me.” / “Stations are pricey. Pavement is cheap. Fill the streets; buy the badges when we have to look official.” / “Loop a road around that mess. Keep them driving. Medics when the till looks healthier.” / “If it all ran smoothly, who would know my name?”

**Crew:** “A detour is not a rescue.” / “That wreck stays until every required crew finishes. Bypass does not clear it.” / “Serious: police and EMS. Fire if it’s burning. Ninety seconds if anyone is hurt.” / “We can roll now. He said wait for a sale.”

Header/report copy must match `incidentInfo.details` (needs + deadline). Never “handled” because cars used another street.

## Acceptance

- 320×640 and 390×844: all seven buildings without an opaque modal; selected tool, cost, rotate visible; traffic tools from minute one; map height not worse than 194px; type ≥1.1rem; 44px targets where possible.
- Old save: same funds and city; jobs optional; dismiss survives reload.
- Jobs 1–5 completable with zero accidents. Closing a road does not complete a rescue. A town with only stuck cars and no distinct completions fails #1–#3. Deleting the store fails #1. Early hospital still allows #3.
- No wait/throughput target on this arc. No cash payout for jobs in v1.

## Lessons (proposed)

- Phone construction: category tray, not an opaque catalog over the board.
- Growth predicates: unique still-standing homes served + peak on-road trips; never raw `completed` or waiting.
- “Save money” here is opportunity cost and a snapshot, not a silent treasury cut.
- Bypass and rescue are different predicates; character lines cannot merge them.
- Optional jobs need default-empty save fields so old towns are not re-onboarded.

**Lead call:** I would ship the tray and jobs 1–4 first, with 5–6 as copy + existing closure/incident data. I would not touch starting funds until a playtest shows the cash snapshot has no bite.
