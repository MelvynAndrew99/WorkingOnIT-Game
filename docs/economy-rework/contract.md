# Economy rework contract (Grok model → Claude UI / lead scene)

Provisional model APIs for the tutorial economy correction. Balance is not player-verified. Claude owns UI copy and layout. Lead owns scene/store integration. This is not approval to auto-build layouts or to make every building free forever.

## Ownership

- Model (this work): `src/game/cityEconomy.ts`, `cityModel.ts`, `cityTutorial.ts`, `cityVisits.ts`, `cityMissions.ts` and their tests.
- UI: Claude reads snapshots only. No model writes.
- Scene/store: lead patches snapshots into the existing store on discrete updates. `store.ts` still initializes `funds: 10000`; the live city uses `STARTING_FUNDS` (900). Until the lead changes that default, the HUD may flash 10,000 before the first snapshot.

## Player-facing rules

1. New towns start with `STARTING_FUNDS` (900). Old saves keep stored `funds` and buildings.
2. Shopping visits still pay `SHOP_INCOME` (100) once per completed stay. Parks still grant the bounded household tax bonus. No new money ticks. No service upkeep.
3. After `STALL_SECONDS` (60) of simulation time without meaningful progress on the current tutorial lesson, the mayor automatically waives a **finite** number of that lesson's relevant constructions. The player still places them through ordinary `place()`. No Free Help auto-layout.
4. Refunds return the amount actually charged. A $0 assisted tile refunds $0. Demolition does not refill the allowance.
5. One grant per lesson, saved on `city.economy` (independent of tutorial metadata). Reload does not reset it. Skip/complete turn prices back to catalog; consumed lesson ids stay consumed.

## Callable price / grant APIs

From `src/game/cityEconomy.ts`, re-exported by `cityModel.ts`:

```ts
STARTING_FUNDS // 900; createCity() only
COSTS          // catalog prices, unchanged
STALL_SECONDS  // 60 simulation seconds; provisional
WAIVER_BUDGET  // lesson id -> remaining free placements per tool

constructionPrice(tool, allowance): number
constructionPriceForCity(city, tool): number
toolPrices(city): Record<PricedTool, number>
paidForBuilding(building): number   // missing paid => catalog; paid: 0 is zero
paidForRoad(city, point): number
constructionChanged(before, after): boolean
```

HUD / palette must display `toolPrices(city)[tool]` or `snapshot.prices[tool]`, not raw `COSTS`. Otherwise waived tools still look like they cost money.

`place()` already charges that price. Failed placement charges nothing and does not consume allowance.

## Required scene integration (lead)

`place()` can succeed with **unchanged funds** (waiver, or already-free controls). A funds-delta check will drop valid $0 homes, stores, parks, stations and roads.

Use `constructionChanged(before, after)` or compare buildings, roads, `nextId`, controls and closures, plus the returned message. Do not require `funds` to change.

Claude's dock can show a `Free` badge when `snapshot.prices[tool] === 0`.

## TutorialSnapshot additions (optional, backward compatible)

Existing fields stay. Legacy actions `'assist'` and `'practice'` stay until consumers migrate.

| Field | Meaning |
| --- | --- |
| `canAssist` | **Deprecated, always false.** Do not show Free Help. Claude already ignores this. |
| `canPractice` | Optional teaching district still available. Distinct from the waiver. |
| `prices` | Current charged catalog-tool prices. Use this for the dock. |
| `waived` | Present only while a grant is **active**. Matches Claude's requested shape, with `tools` for multi-tool lessons. |
| `waiver` | Full stall/grant status, or `null` when the current lesson has nothing to waive. |

```ts
waived?: {
  tool: Tool;          // primary tool (lesson.tool, else first currently-free tool)
  tools: Tool[];       // every tool whose current price is $0
  reason: string;      // one mayor line for the objective panel
}

waiver: {
  status: 'waiting' | 'active';
  lessonId: string;
  tools: Tool[];       // currently $0
  remaining: Partial<Record<'road'|'home'|'store'|'park'|'hospital'|'fireStation'|'policeStation', number>>;
  stallSeconds: number;
  stallLimit: number;  // STALL_SECONDS
  mayor: string;
} | null
```

The grant auto-activates when stall time elapses. UI can ignore `waiver` and only read `waived` + `prices`.

## TutorialAction additions

Keep: `'start' | 'skip' | 'resume' | 'assist' | 'practice' | 'acknowledge-drivers' | 'acknowledge-safety'`.

Add: `'accept-waiver'`. The grant auto-activates, so this action (and legacy `'assist'`) does not change the city. Safe responses:

- grant already active: “The mayor already waived those construction costs. Place the buildings yourself.”
- otherwise: “Keep building. The mayor steps in if you stay stuck on this objective.”

`'assist'` **never** places a worked layout and **never** mints cash.

`'practice'` still places the optional teaching district in vacant land, funds-neutral, with `paid: 0` on new tiles. Do not label it Free Help.

## Saved state

`TutorialProgress.version` stays `1`. Grant accounting is **not** stored there, so a malformed teaching record cannot refill free construction.

Optional `City.economy`:

```ts
{
  version: 1;
  waived: string[];
  allowance?: Partial<Record<PricedTool, number>>;
  stallLesson?: string;
  stallAt?: number;
  stallMark?: number;
}
```

Missing `economy` migrates to empty waived (legacy towns). Malformed `economy` or `paid` rejects the save rather than renewing grants.

Optional `Building.paid` and `City.roadPaid[x,y]`. Missing means catalog price (legacy). `0` must survive parse; do not use truthiness.

## Meaningful progress (not button clicks)

Stall time uses `city.elapsed`. Pause does not call `stepCity`, so pause does not mature the offer. Wall-clock and reloads do not count. Reloads restore `stallAt` / `waived` / `allowance`.

Progress that **resets** the stall window is an increase in a lesson-specific mark:

- `first-visit`: homes, stores, connected homes, completed shoppers
- `park-visit`: parks, completed park visitors
- `junction-control`: control count
- `accident-response`: seen/actual incidents
- `rescue`: stations and observed crews
- `detour`: roads plus a real bypass becoming true

Not progress: start/resume/skip, failed placement, pan/zoom, report polling, tool selection, unrelated buildings, demolish/rebuild cycles that do not raise the mark.

Skip/resume clears the stall window but not `waived`. Unspent waiting time does not become an instant grant on resume. Already-consumed lessons are never granted again.

## Waiver budgets by lesson (provisional)

| Lesson | Free placements | Notes |
| --- | --- | --- |
| `first-visit` | 1 home, 1 store, 12 roads | Clinic is not special. |
| `park-visit` | 1 park, 8 roads | A stalled park is not a Clinic. |
| `driver-rules` | none | Acknowledge only. |
| `junction-control` | none | Stops/lights are already free. |
| `accident-response` | 2 homes, 1 store, 16 roads | Player may build a crossing. Practice district is separate. |
| `rescue` | 1 hospital, 1 fire station, 1 police station, 16 roads | The “free clinic” example, generalized. |
| `detour` | 16 roads | A free road is not a rescue. |

Allowance decrements only after a successful `place()` of that tool at $0. Invalid tiles consume nothing. Completing the lesson expires leftovers. New paid rebuilds get their own `paid` record.

## Mission snapshot

`neededServiceCost` uses `constructionPriceForCity`, so a waived clinic/police/fire reports $0 while that rescue allowance remains. Catalog `COSTS` are unchanged. Claimable mission rewards are unchanged (100/200/200/400, exactly-once).

## What UI should do

- Keep Free Help / worked-example buttons removed.
- While `waived` is present, show `waived.reason` on the objective panel and a `Free` badge on each `waived.tools` entry (or any tool with `prices[tool] === 0`).
- Keep Skip, Understood, and optional practice district distinct.
- Palette costs: `snapshot.prices`.
- Do not auto-pause or auto-place.

## What UI / scene must not do

- Auto-build a home/store/hospital layout.
- Grant a Clinic-only exception.
- Reset `economy.waived` on reload.
- Refund catalog price for a $0 building.
- Start outside traffic or fabricate accidents to force progress.

## Copy the model already changed

These no longer mention a free example (Claude can drop the `/free (worked )?example|free help/i` filter):

- `first-visit` hint
- `detour` hint
- `start` / `resume` result message

## Reviewed integration correction

The lead's independent review added `City.economy.allowanceLesson?: GrantLessonId`. Active pricing/consumption require this owner to match the current active lesson and its saved grant receipt. Parsing validates allowances against that objective's actual budget; pre-owner records infer only their final grant and must fit it. Paid/free provenance remains independent. This supersedes the earlier unowned-allowance description above.
