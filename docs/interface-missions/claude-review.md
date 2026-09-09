## Independent review: interface + growth-first objectives

Read: AGENTS.md, DESIGN.md, IMPLEMENTATION-LESSONS.md, CLAUDE.md, `Hud.tsx`, `CityDialogs.tsx`, `store.ts`, `cityVisits.ts`, `cityTraffic.ts:571`, `cityModel.ts:63-183`. No files written.

### 1. The economic challenge (most important finding)

`SHOP_INCOME` is 100 per completed visit and `SHOP_INTERVAL` is 8s with `SHOP_CAP` 3 (`cityVisits.ts:20-29`). One served household earns ~100 per 12-15s roundtrip, so a $200 home repays in about half a minute and ten homes earn roughly $400/10s against `BASE_SUPPORT` 20. Against that, police+hospital ($1,400) is under a minute of a small town's income, and the $10,000 start is spent-proof. **"Save money, buy services later" has no financial bite today, and no bonus payout you attach to missions will change that.**

Do not fix this by cutting funds. The truthful scarce resource is already in the simulation: **time**. A serious incident carries a 90s deadline, and a station bought after the crash still has to be placed, connected, and driven from. That is exactly the manager's shortsightedness, made real without a nerf, a penalty, or a forced wreck. Recommendation:

- Leave `COSTS`, `BASE_SUPPORT`, `SHOP_INCOME` and the 10,000 start unchanged for the first playable (save compatibility, forgiveness, user's stated stance).
- Pay mission rewards in **recognition only** (a named-recognition counter plus a quote card). Cash bonuses would be noise. This matches DESIGN.md's "keep cash and recognition conceptually distinct."
- If the lead still wants money to matter later, the honest lever is a *smaller opening grant for new cities only* (e.g. 2,500) declared in the UI, never a retroactive change to existing saves. I recommend deferring that until missions are playtested; changing two variables at once will make the arc unreadable.

### 2. Where the cheap-start → later-congestion hypothesis fails

1. **Roads are effectively free.** At $20 with unlimited money, a player widens any bottleneck instantly. Congestion never accumulates.
2. **Demand is capped per household** (`SHOP_CAP` 3, `LEISURE_CAP` 1, one car per home), so cars scale linearly with homes the player chooses to build. A player who stops building homes never meets the challenge.
3. **Parked visits remove cars from the road.** 8 park slots × 10s stays actively empties the carriageway, which fights "as many cars as possible."
4. **No external traffic**, so nothing arrives uninvited.

Remedies that do not force failure: drive density through mission *targets* (completions per window) rather than scripted breakdowns; rely on destination capacity (4 store slots) to concentrate many homes onto few entrances, which produces real queuing at the store approach without any new mechanic; and keep the later "connect to the outside city" step as the actual congestion event, as already designed. A player who over-built capacity should simply clear these objectives immediately, and the manager should praise himself for their foresight.

### 3. Metrics that cannot be gamed by stuck cars

Never use "cars on the road" as a predicate; gridlock maximizes it. Use, all available today:

- `trafficMetrics(city).throughput` (completions in last 60s) as the growth measure. A jammed car completes nothing.
- `connectedHomes(city)` as a floor so throughput cannot be met by deleting homes.
- Distinct households with `leisureUntil > elapsed` for park objectives (bounded by households, not parks).
- `visitorSlots()` occupancy for "second destination is genuinely used."
- Reachability via `findPath` from a station entrance for readiness objectives.

Guard every objective with "target met **and** homes connected ≥ N," so demolition never completes a mission.

### 4. Recommended objective arc (6 steps, growth-first, all optional/dismissible)

| # | Objective | Predicate (existing API) |
|---|---|---|
| 1 | Get 3 homes and 1 store trading | `connectedHomes ≥ 3` and 3 shopping visits completed |
| 2 | Make the road busy | `throughput ≥ 6` while `connectedHomes ≥ 5` |
| 3 | Open the park | park placed, 4 distinct households with a live leisure benefit |
| 4 | A second destination that earns its keep | both destinations show `occupied > 0` in the same window, `throughput ≥ 8` |
| 5 | Crews standing by (**foresight, no crash required**) | police + hospital built and both route to every destination entrance |
| 6 | Appears only after the first real accident | active incidents return to 0 with all required crews having worked, `throughput` back to its pre-incident level |

Steps 1-4 never mention waiting time. Congestion and fatality objectives belong after step 6. No objective may award anything for a casualty.

### 5. Interface

Delete the "More buildings" modal. Replace the two tool rows with **three fixed rows of 44px targets**, all seven buildings always visible:

- Row 1 (build): Home $200 · Store $400 · Park $300 · Road $20
- Row 2 (services + edit): Police $600 · Fire $700 · Clinic $800 · Remove
- Row 3 (operate): Stops · Lights · Closure · Rotate S/W/N/E · Pause

Use the existing atlas building art as icons so labels can shrink to one word while staying at the 1.1rem floor. Show the selected tool's name, cost and rotation in the existing `.city-feedback` line (it is already a live region), so the current selection is unmissable. Services stay fully enabled from the start; the manager's line discourages them, the UI never does. Keep the panel inside `.city-controls` so the existing ResizeObserver bounds still exclude it, and check that no road can be placed beneath the strip.

Cost: roughly 150px of rows, close to today's 240px once the tips paragraph is collapsed into the selection line. On a 320×640 phone the map stays around today's size.

### 6. Suggested lines (no em dashes)

- Objective 2 offer: **Manager:** "Full roads mean a working city, and a working city means a working city manager." **Crew:** "It means we are late."
- Objective 5 offer: **Manager:** "Buy the police station now? Nothing has happened yet." **Crew:** "That is usually when we buy it."
- After the first accident: **Manager:** "Build around it. Keep the traffic moving while we save for the crews." **Feedback line (must be literally true):** "A detour keeps other cars moving. It does not clear the wreck or treat anyone. Police and EMS are required. Rescue deadline 90s."
- On a rescue: **Manager:** "Ninety seconds. You are welcome, everyone." **Crew:** "Thank the driver who braked."

### 7. Acceptance checks

Objectives survive reload with no repeat recognition; dismissing an objective never blocks any tool; bulldozing homes cannot complete an objective; existing v2 saves open with the arc at step 1 and no forced onboarding; all seven buildings reachable in one tap at 320×640; a road tap under the tool strip is rejected, not silently placed; a player who builds all services before step 5 completes it instantly.

### 8. Reusable lessons (proposed)

Locate difficulty in a resource the simulation actually meters (here, the 90s deadline), not in a currency the loop already floods. Mission predicates need a demand floor beside every performance target, or demolition reads as improvement. Character voice may be wrong about the game; the operational feedback line next to it must not be.
