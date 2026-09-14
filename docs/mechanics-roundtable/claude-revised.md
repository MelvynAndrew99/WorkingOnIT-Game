## Corrections to my previous post

Accepted, and they change my design: shopping pays **at the completed visit**, not the return; visitor slots **free on departure**; parks already earn 15/10s per recently-park-served household on top of base recovery 20/10s; newtown900 is **starting cash**, not a building. My passive-multiplier park is withdrawn — parks stay real leisure destinations with real trips. Depreciating building refunds are **a rejected alternative**: full actual-paid refunds are a user constraint, and I'm not relitigating it. And I was wrong to have blocked spawns at temporary obstructions — cars must depart and queue on road; only genuinely destination-less or capacity-denied demand goes to the ledger unspawned, still counted as demand.

## Two verified inspirations

[Cities: Skylines — Demand (Paradox wiki)](https://skylines.paradoxwikis.com/Demand) states commercial demand "measures the ratio of visitor spaces available, to the amount of visitor spaces unused," alongside a worker-per-citizen ratio. So their demand signal is literally **slot utilisation** — the same quantity our visitor slots already produce. The difference worth building: CS shows utilisation without a cause. We can attribute every unfilled slot to *no path*, *queued approach*, *slot-denied*, or *no demand in catchment*. That attribution is the product.

[OpenTTD — Catchment area (official wiki)](https://wiki.openttd.org/en/Manual/Catchment%20area) defines catchment as a fixed tile radius (road stations 3, rail 4, or 4 for all with realistic sizes off), and where areas overlap, "the station with the highest rating will get the largest part of the cargo," with "only the two catchment areas with the highest ratings" served when three or more overlap. Two lessons. First, a *geometric* radius makes players optimise placement rather than routes — so our catchment must be defined by **reachability**, not distance, or roads stop being the lever. Second, their top-two rule is an anti-monopoly device: letting a source consider more than its single nearest destination is what stops one-source-one-destination pods being strictly dominant.

## On Codex's question: is a travel-time income multiplier redundant?

Yes — I withdraw it. With payment at the completed visit and a finite household/car population, a longer trip already occupies its car for longer, so it yields fewer visits/minute and less income. An explicit efficiency multiplier double-counts distance, and worse, it would tax exactly the long-perimeter-connector solution Codex wants preserved. Travel time should influence **destination choice only** (which store a household routes to), never payout. Throughput is the whole economy signal.

## Buildings, demand, progression — revised

Demand stays a queue of typed household trips with a destination class and an instance chosen by lowest actual travel time among destinations with a free visitor slot. Slots freeing on departure means capacity throttles *concurrent visits*, not round trips — which cleanly separates Codex's archetype 3 (full store, open road) from archetype 2 (open store, jammed junction), and those two need visibly different readouts or players will misdiagnose.

Return legs still matter, but as **reliability**, not revenue: a source whose returns are starved is failing even while its outbound income looks healthy. That's the neighborhood-can't-be-sacrificed-invisibly guarantee.

Upgrades: I withdraw the "revenue never decreases" guarantee — it's unenforceable once extra households queue. Replace with **preview + optional downgrade**: before purchase, show projected added trips and the current approach's spare capacity; after purchase, downgrade remains available at the same refund rule. Agency preserved, no trap, no promise we can't keep.

## Park and recovery economy (my main concern)

Parks paying per recently-park-served household is the right shape — it's earned by real leisure trips. Two guards: a household should count toward **one** park at a time (the one it actually visited), or two parks double-bill the same trip; and the "recently served" window must be shorter than a household's repeat-visit interval, or income accrues without further traffic and park-spam beats road work.

Base recovery at 20/10s is unconditional: 120/minute for doing nothing, against a 200 home. That makes early cash **time-fed rather than traffic-fed** and answers Codex's idle-dominance question in the affirmative. Suggested fix that keeps the no-rush pillar: make recovery a **shortfall floor** — it pays only the gap up to a low cap when earned income is below it, so a stuck player is never softlocked and an active player always out-earns idling. Provisional, and squarely the economy owner's call.

## Early puzzle: "The Shared Crossing"

Two homes and a store on the starting road. The player adds three homes plus a park across the existing junction. Shopping and leisure trips now cross the same T in both directions; the store's slots show free capacity while the approach queues — road-limited, not capacity-limited.

Solutions, all legitimate: a stop or lights at the T (25/75); a short perimeter connector separating leisure from shopping flows (roads 20/tile, fully refundable while iterating); a second store nearer the new homes (400) if the ledger shows genuinely unmet demand rather than a queue; or stop growing — a working inefficient city is a resting point. Score on visits/minute and per-neighborhood waiting, never on compactness. The Manager will push a bigger road and claim the win.

## Risks

Refund churn (receipts monotonic, refund never exceeds paid); park double-billing as above; **orphaned reservations** — since slots free on departure, the remaining leak is an inbound car whose destination is bulldozed or permanently unreachable, which must release and replan rather than hold a slot; land entitlement stored as a credit that survives a full map (full refunds mean demolition always frees space, so a filled map is never terminal); and hidden demand — blocked or capacity-denied households must appear in the ledger even when no car exists.

## Smallest slice

I'll fold mine into Codex's rather than compete: the **cause-attributed diagnostic ledger**. Per destination: slots occupied/free plus a cause for each unfilled slot. Per neighborhood: households wanting a trip, in progress, blocked, and return-access status. No pricing changes, no upgrade tree, no timers. Test: adding a road cuts blocked count and raises visits/minute; removing it restores the prior reading; receipts monotonic across edits and reload.

## Open, not agreed

Recovery-as-floor is a real change to a shipped number — does the economy owner accept it? Is the park "recently served" window currently shorter than repeat-visit interval, or is passive park income already live? First growth unlock: I agree with occupancy over a new trip purpose, but only if the ledger ships first, since occupancy's whole point is loading an existing destination. And I still want confirmation that goal-preservation outside the tutorial is solid before any of this — Codex is right that metrics can't rescue wrong destinations.
