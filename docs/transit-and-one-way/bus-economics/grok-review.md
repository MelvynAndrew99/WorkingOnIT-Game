**Recommendation:** Ship **stop demand pools + discrete rider tokens** now. Physical buses, capacity, dwell, closures, and actual stop visits remain the only clocks. Synthetic riders are display/load only. Do not retune household mode choice, shop $100, park tax, mission returns, cars, or fatalities. No new player toggle: today a synthetic spawner writes the same queues tomorrow households will write.

---

**1. Provisional rules**

**Catchment (connected, not Euclidean).** A building is served by a stop if a directed-road + existing ≤6-tile sidewalk path reaches that curb. Gaps/lots do not count. Each building binds to **one** nearest served stop (tie: lowest stop id). Duplicate stops on one route do not double catchment.

**Valid service.** Tokens spawn only while a depot route has ≥2 distinct stops, mandatory depot/interchange return, and the origin stop can reach a **destination building** (store > park > gateway) later on that trip. Home-only or empty-land routes print **zero**.

**What creates riders**
- **Home:** 1 outbound token / 20s, cap **2 pending per home** (queued, not yet boarded). Dest = highest attraction on a remaining trip from that stop: store, else park, else gateway. If several of one type, nearest along the route.
- **Store / park:** do not spawn origins. Alighters start a stay (store 5s, park 10s) then become **return tokens** at that stop, dest = original home stop. Return queue cap **8 per store building**, **8 per park**. Over-cap completed stays vanish (gave up). Alighting is never blocked.
- **Gateway building (if any):** 1 visitor / 20s, cap 2, dest = first store/park on the trip; alight and despawn (no shop pay, no return). Gateway with no attraction: 0.
- **Depot / idle bay:** not a demand stop. No spawn, no board in the bay. Tokens whose dest is still on the **next** loop **stay seated** through the depot (returners Home←Store via depot). Trip-end leftovers with no remaining dest vanish at depot.

**Opening queue.** On route-valid, seed **1 token per served home** into its origin stop (not on load). Visible before the first 12s headway pull-out.

**Visit physics (actual stop-to-stop).** On curb dwell: **alight dest==this stop first**, then **FIFO board** anyone whose dest is a later stop on **this** bus’s remaining trip, until empty seats, empty eligible queue, or dwell cap. Existing dwell: 1 + 0.25s / person-event, cap 4s (max 12 events). Leftover queue waits. Full bus: skip rest. Closures that skip a stop: no board/alight; queues keep.

**Sharing / edits / save**
- One queue per stop. Two routes share it; each bus takes FIFO it can serve. Spawn is per building, **not** per route.
- Remove building: delete its tokens (queues + onboard). Remove stop / invalidate route: discard queues at unserved stops; onboard dump at depot. No ghosts.
- Save: queues, onboard seats, stay timers, per-building spawn cooldowns. **Do not re-seed** (reload exploit). Rebuild catchment from buildings+stops.
- Tokens are **not** agents for crash fatalities.

**Household quota vs synthetic.** Quota is **worse now**: cars already win estimated roundtrip; forcing bus use would fabricate car cuts and shop/mission coupling. **Immediate deliverable:** synthetic tokens + existing dwell/capacity. **Boundary:** `StopPool` / `RiderToken`. Swap `SyntheticSpawner` for `HouseholdJourney` (token gains `household_id`, then and only then cars/shop/tax). Same UX.

---

**2. Economics**

Keep **Depot $1000, stop $50, minibus $400** (starter two-stop one-bus **$1500**, two bays). **No fare, no upkeep** in this prototype.

Why no-drain: fun is **seeing 5/8**, not a second ledger; synthetic cash on a 20s spawn is unbounded passive profit; upkeep punishes parked experiments; board/alight loops, duplicate stops, place/delete/reload must pay **$0**; fixed-budget challenges and missions stay untouched. Do **not** pay shop $100 or park tax for tokens.

If money is ever attached before household link: a separate capped **`transit_income`** (e.g. $1 / completed home alight, city cap $10/10s), never shop reward. **Prefer defer** until household-authored tokens.

**Worked example (assumed 60s cycle, not measured).** 4 homes + 1 store. Route Depot→HomeStop→StoreStop→Depot. 1 bus; 12s min headway does not bind (cycle 60s). Capital −$1500. City base support $20/10s unchanged. Transit $0.

| t (sim s) | Event | Queue H / S | Load |
|---|---|---|---|
| 0 | route valid, seed | 4 / 0 | 0/8 |
| ~20 | board 4 at homes | 0 / 0 | 4/8 |
| ~35 | alight 4 at store | 0 / 0 | 0/8 |
| ~40 | 4 returners after 5s stay | 0 / 4 | 0/8 depot |
| ~80 | board ~3–4 new origins; alight them; board 4 returners | small / 0 | ~4/8 through depot; alight at homes |

Warm full-looking both directions by lap 2. 8 homes seed 8 → first bus **8/8**. Metrics: occupancy, queue, optional `synthetic_alighted` (not “shoppers”). Cars still 1 journey/home.

Exploits: dest-locked tokens cannot ping-pong; idle bays earn nothing; duplicate stops share catchment; reload does not re-seed; no rider cash ⇒ no profit.

---

**3. Feedback / UX**

No new menus or timetables. Stop glyph: **queue integer**. Bus: existing **n/8** bound to onboard tokens. Optional dwell ±. Copy: “4 waiting”, “5/8” — never household addresses.

**Poor route** (no served buildings / no dest): 0 waiting, 0/8, 1s empty dwell, forever. **Useful route:** numbers on validate (~0s), movement on first visit. Underserved: queue grows (cap 2/home). Growing service adds spawn linearly; **do not** suppress demand because a bus exists; **do not** delete cars.

---

**4. Acceptance**

| Setup | Expect |
|---|---|
| Stops+bus, no buildings | 0 queue, 0/8, no printed riders |
| 4 homes + store, both served | seed 4; first visit boards; store unloads; return wave later; $0 shop from tokens; cars unchanged |
| More homes + store+park | dest split by attraction; both dest unload/return; 20 homes → up to 40 origin waiting, 8-seat throttle, queues persist |
| Two routes, same stops | shared queue, split load, **same** spawn |
| Break route / delete stop | queues gone; depot dump; spawn stops |
| Store return cap 8 | still alight; board 8; extras vanish; queue shows 8 not ∞ |

Scale = more served homes ⇒ more tokens ⇒ fuller buses and longer queues. Physical capacity/dwell/headway throttle. Household receipts stay off this path until the spawner is replaced.
