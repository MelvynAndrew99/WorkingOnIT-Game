**Note on sources:** WebFetch and WebSearch were denied in this session (don't-ask mode), so I consulted no primary sources. Everything below labelled as inspiration is **recalled, unverified**: OpenTTD/Transport Tycoon station catchment and cargo acceptance; Cities: Skylines RCI demand and "not enough customers" abandonment; Clash of Clans per-building upgrade levels; Factorio/Satisfactory throughput dashboards. If you want any of these load-bearing, I need browsing permission to verify.

## 1. Demand should be trips, not a bar

Recommend we never implement an abstract RCI-style demand meter. Demand is a queue of **typed household trips** (shop, leisure, later work/school), each with an origin, a destination *class*, a chosen destination instance, and a mandatory return leg. Revenue accrues only on a completed round trip against a real capacity reservation — which the baseline already has. This gives us the Factorio property directly: the number on screen is caused by the road you just drew, not by a hidden scalar.

Destination choice: among buildings of the right class with free capacity, pick lowest **actual travel time**, not distance. That single rule is what makes road puzzles economically legible — a store's catchment is a travel-time isochrone the player reshapes with roads, so *fixing routes* and *building another store* become genuinely alternative solutions to the same revenue problem. (Catchment-as-reachability is the OpenTTD-ish recalled inspiration; travel-time weighting is our twist.)

Strong preference: catchment should be a **soft decay**, not a hard cutoff. Spend per visit tapers with travel time rather than dropping to zero at a threshold. A cutoff creates an invisible fail line and would punish a working-but-long route; decay makes long routes merely less profitable, which is feedback, not punishment.

## 2. Persistent upgrade paths (the Clash-like spine)

Buildings get **levels the player chooses to buy**, and a level raises trip generation and revenue *together*. Level 1 store: small capacity, small catchment, tolerant. Level 3 store: many more inbound trips per day, larger catchment, and it will absolutely jam a single T-junction. This is how "player chooses growth, density makes puzzles harder" becomes a mechanic rather than a slogan — difficulty is opt-in and purchased, so nothing feels rushed. Long-term visible progression comes from a level ladder and a skyline that visibly thickens, not from timers.

Two invariants I'd hold: a level-2 building's revenue must never fall below what level 1 would have earned on the same road network (otherwise upgrading is a trap and we've punished ambition), and every upgrade must be **downgradeable** under the same refund rule as construction, so a player who over-densifies has an exit that isn't bulldozing.

**Parks are the piece I think is currently mispriced.** At 300 against a store's 400, a park costs nearly as much and returns nothing. Make a park a **multiplier on reachable homes** — households within its travel-time catchment generate more trips and spend more — so parks are an amplifier the player places to intensify existing traffic, never a substitute destination. That also mechanically enforces the standing rule: a blocked shopping trip stays an unserved *shopping* trip; a park can never absorb it.

## 3. One early puzzle, several honest solutions

**"The Second Street."** Four homes on a dead-end spur, one level-1 store, a single T-junction onto the outside connection. The player buys three more homes (their choice, no prompt). The store saturates, and returning cars now meet arriving cars at the T; round trips per day plateau while homes idle.

Legitimate solutions, all viable:
- **Second store** on the far side (~400) — splits demand, costs cash and land.
- **Control the T** (stop 25 or lights 75) plus a ~2-tile link road (~40) closing the spur into a loop, so returns and arrivals stop conflicting.
- **Re-plan the spur** into a loop using only refundable road edits — cheapest in cash, most in thought, and the answer I'd want the game to quietly reward with the best throughput.
- **Grow slower.** Lower income, no failure, no nag. This has to remain a real option or "no rush" is a lie.

Scoring is *completed round trips/day* and store utilisation. No timer, no deadline. The Manager will loudly recommend the second store and a wider road, and take credit; the elegant answer is the loop.

## 4. Exploits and softlocks I'd guard now

- **Refund churn.** If any refund path can exceed what was paid, or a building can earn before being refunded, place/sell becomes an income pump. Receipts must be monotonic across edits and reload (same discipline as the land-expansion receipts lesson).
- **Silent zero demand.** If an unreachable store simply generates no trips, the unserved counter reads zero and the player concludes all is well. Per the departures lesson: plan the full goal path independent of physical permission, and record the *reason* (no path / no capacity / too far).
- **Reservation leak.** A car that never completes its return holds a parking slot forever; the store reads full and demand stalls permanently. This needs a completion invariant, not a timeout that teleports cars home.
- **Orphaned trips** on bulldozing a store with cars en route — replan or refuse; never delete the destination out from under a journey.
- **Entitlement double-spend** on land, already flagged: keep entitlement separate from geometry.

## 5. Smallest next slice

One thing only: **travel-time catchment + a visible unserved-trip ledger.** (a) Home shopping trips target the lowest-travel-time store with free capacity; (b) if none is reachable or free, log an unserved trip with its reason instead of spawning; (c) per-store panel showing completed round trips, revenue, utilisation, plus a city-wide unserved list. No new building types, no levels, no timers. Testable: adding a road must reduce unserved count, receipts stay monotonic across road edits and reload.

## 6. Disagreements and questions (not agreement)

- **Full paid-construction refunds:** right for roads and controls, wrong for buildings. I'd propose full refund until a building's first completed visit, then decaying to roughly half — provisional. Placement should carry weight; iteration should be free where we want iteration.
- **newtown 900 < clinic 800+?** If newtown is the headline progression beat, being barely above a clinic feels wrong. What does it actually grant — land, population cap, or a second demand pool?
- **Timers:** I'd like an explicit rule that any countdown must be incident-triggered, locally scoped, and recoverable via the existing allowance. Does the crisis-loss design survive that constraint, or does it need a global clock somewhere?
- **Police/fire severity:** do these generate trips (demand) or only costs? If EMS response is the only timer, the other two need a non-timer failure surface.
- **Levels per building or per district?** Per building is more legible; per district is fewer clicks late. I lean per building.
