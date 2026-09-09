# Economy correction: independent verification plan

September 9, 2026. Read-only review prepared while the actual Grok Build implementation is underway. No production or test changes are made by this plan, and the proposed tuning is not yet verified. Reviewed the current economy brief and explicitly approved source-access scope. No external tools/providers were used for this review.

## Acceptance boundary

The user's latest clarification is objective-specific stalled-progress assistance, not a special Clinic grant: after a sustained lack of meaningful progress, relevant construction becomes free within a finite objective allowance. The player still places their own solution. No Free Help button or automatic worked layout. New towns receive a smaller viable grant; existing saved cash/construction remain intact. Real tutorial visits earn revenue, free construction refunds zero, and purchases refund their actual historical payment. Exact thresholds, amounts and limits are implementation choices to report and test.

## Highest-risk seams in current code

- `place()` currently charges and refunds `COSTS` for every construction. Neither road points nor buildings record their purchase price. Free placements therefore require durable payment provenance, including roads, before demolition can be safe.
- The existing test named “free assistance ... cannot be reclaimed by demolition” checks only that another `assist` action fails. It does **not** assert that demolition of free construction pays zero; the current model refunds the catalog price. Replace that misleading assertion with explicit money conservation.
- `parseCity()` reconstructs buildings/roads through `place()` while temporary funds are `Number.MAX_SAFE_INTEGER`, then restores saved funds and finally tutorial metadata. A new pricing/waiver hook must not consume allowance during reconstruction, invent payment records, or overwrite saved zero prices. A saved free price of zero must survive parsing; truthiness fallback would incorrectly convert it to full price.
- `parseTutorialProgress()` currently treats malformed optional teaching metadata as resettable. If allowances live there, resetting malformed data must not issue the same assistance again. Financial provenance must remain durable independently of a recoverable guide reset.
- `stepCity()` advances fixed simulation ticks and timers, while UI pause simply stops calling it. Assistance must use simulated progress/time, not wall-clock or React report cadence. Frame partitioning must not change grant timing or duplicate issuance.
- `stepVisits()` awards shopping cash before a parked car can depart, guarded by `rewarded`. A blocked return is still one earned visit, not repeated income. Local and outside cars use this boundary; outside leisure must not invent household tax benefits.
- Prior tutorial fixtures rely on old `assist` auto-layouts and the $10,000 grant. Their successful result cannot establish the newly requested ordinary-placement assistance flow.

## Required regression scenarios

| Area | Scenario and required result | Reuse |
| --- | --- | --- |
| New grant versus old cash | New town gets the chosen smaller amount. Saved v1/v2 towns with balances of zero, a modest balance and a large balance reload unchanged, with identical geometry and trips. | `cityModel.test.ts` parser/migration tests |
| Starter viability | Use actual ordinary placement for a home, store and a short connected road. Budget covers this without a grant, debt or pre-awarded visit. Simulate through a completed paid shopping stay; report cost, first earnings and remaining funds. | `connectedCity`, `shopTown`, fixed-step `until` helpers |
| Revenue incentive | Compare equal simulated time in an unserved town and a connected shopping town, separating passive support, shopping, leisure benefits and explicit mission claims. State the arithmetic; do not just assert funds increased. | Model support-income and Visits exact-payment tests |
| Paid refunds | Road and every building kind refund their recorded actual payment; rotation and demolition through non-anchor tiles do not change it. A purchase made before a catalog-price change still refunds its own payment. | Model construction/refund tests |
| Free refunds | Place zero-cost objective road/building at zero cash, save/reload, demolish, repeat. Cash never increases, waiver allocation does not refill, and newly rebuilt paid construction gets its own correct provenance. | New focused economy regression |
| Mixed provenance | In one town, paid and waived roads/buildings coexist. Bulldozing each affects only its own payment. North/west expansion preserves signed road keys and saved prices. | Model expansion and save roundtrip fixtures |
| Invalid placement | Occupied, off-map, invalid rotation/entrance and occupied-vehicle refusals consume neither cash nor waiver allocation. Dragging over the same road twice consumes only successful new placements. | Model placement and Visits demolition guards |
| General stalled objective | Verify at least first-trip, park and rescue objectives. A stalled park should offer its relevant construction, not always a Clinic; unrelated tools retain their price. The grant is tied to the current objective and finite. | Tutorial snapshot/action tests |
| Meaningful progress | A genuinely relevant step resets/advances the stall tracker according to the contract. Tool selection, camera actions, report polling, repeated clicks and unrelated buildings do not indefinitely postpone assistance. Cycling the same construction or reloading cannot renew eligibility. | New tutorial tracker tests |
| Clock boundary | Advance just before and across assistance threshold; compare one large `stepCity` call against 40Hz/60Hz partitions. Save/reload halfway through the wait and immediately after eligibility/consumption. All produce the same saved allowance and funds. | Model frame-partition test |
| Pause and offline | Browser pause freezes the eligibility clock. Reload after real wall time cannot count offline time as stalled play; resumed simulation continues remaining time. | Existing mounted-save browser helpers |
| Skip/resume/completion | Skipping preserves cash, roads, prices and consumed allowances. Resuming or completing/reviewing lessons cannot regenerate a grant. No automatic external connection. Specify whether unspent waivers expire on exit, then test that chosen rule. | Tutorial skip and External explicit-connection tests |
| Legacy assistance actions | Old `assist` callers cannot still inject an automatic district or mint cash. Keep compatibility only as the agreed safe response; UI must use ordinary placement. Explicit optional practice behavior needs a separately stated policy, not an accidental continuation of Free Help. | Existing tutorial integration/action tests |
| Bad saved metadata | Reject malformed financial prices/counts (negative, NaN, oversized or duplicate/orphan records) or handle them under an explicitly safe migration policy. A malformed teaching record must not erase the town or renew consumed cash-equivalent help. | Parser negative tests |
| Visit exactness | Mid-stay, rewarded-but-blocked, returning and post-return reloads never duplicate revenue. Roads/services earn no visit income. Park benefits remain bounded per real household. | `cityVisits.test.ts`, `cityExternal.test.ts` |
| Mission rewards | Completion, snapshot reads and load do not pay. Claim adds the exact reward once; double claim and reload do not repeat it. Waivers and claims are independent. | Existing three mission-claim tests |
| Rescue reality | A waived service is placed by the player; responders originate at that real station and obey shared occupancy. A free building must not directly clear a wreck, stabilize a victim, or fabricate a rescue. | Natural incident/dispatch integration fixtures |

## Harness and fixture adaptations

Run npm/node tests through `nix develop`. First execute the focused new economy/tutorial tests after Grok declares source stable, then the full existing suite and production build. Existing isolated traffic/incident fixtures that build large towns may need an explicit test-only budget; lowering the starter grant should not turn unrelated occupancy tests into construction failures. Preserve separate starter-budget tests using the real new defaults. Do not simply loosen all money assertions or grant every fixture extra funds.

Reuse `run`/`until` helpers from `cityVisits.test.ts` and `cityExternal.test.ts`; they wait for real trip phases. For financial ledgers, count completed paid stays rather than `city.completed`, because the latter counts a later return. Update hard-coded $10,000 and support-payment assumptions only where changed tuning actually applies. Preserve legacy-save expected balances.

Replace the old full tutorial integration's sequence of repeated `tutorialAction('assist')` layout creation with: wait for the current stalled-objective allowance, place the relevant construction through `place()`, observe actual trips/crews, then progress. Retain independent natural-crash and rescue/deadline fixtures; staged placement must not become synthetic incident creation.

For UI integration, reuse the mounted-module URL pattern in `docs/interface-redesign/browser-check.mjs`. Confirm the chosen tool shows its real current price, an available objective waiver allows placement at zero funds, the displayed allowance decreases only after valid placement, and selection alone never builds. Verify no Free Help button remains. Pause/reload tests should inspect the restored mounted city as well as localStorage. Wait for the scene's normal snapshot update before asserting visible progress; the previous half-second reporting delay is not itself an economy failure.

## Delivery evidence to request

Grok's handoff should identify the price/waiver APIs, legacy migration defaults, allowance expiry policy, meaningful-progress definition, provisional timer and quantities, and actual budget arithmetic. Report ordinary successful starter play, stalled recovery, and abuse-resistant refund/save behavior separately. Automated feasibility and accounting do not establish player enjoyment or final balance.
