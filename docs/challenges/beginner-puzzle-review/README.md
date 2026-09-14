# Beginner review: Levels 1–10

The user's intended progression starts with cars traveling from A to B, then expands to shared networks and more complex road problems that call for different strategies. This pass makes straightforward wording and qualification fixes while leaving larger design work for after the jam.

| Level | Road topic/problem | Jam update |
| --- | --- | --- |
| 1 | Home and shop are disconnected | Goal is actual arrival; entrance arrows explain building access without prescribing a route |
| 2 | Three homes need a shared shopping network | Goal is all three real returns; different branching layouts count; existing 45-second deadline stays visible |
| 3 | Two unfinished street networks | All four households must shop and return; separate or joined working connections count |
| 4 | Uncontrolled crossing; Stops introduction | Explicit stop-controlled crossing outcome retained; no placement recipe; map redesign deferred |
| 5 | Unfinished busy crossing | Safe trips from all ten homes; Stops and Lights both remain verified solutions |
| 6 | Nine homes share a busy crossing | Safe actual returns count with Stops or Lights; no mandatory Lights gate |
| 7 | Connected roads but poor shopping flow | Existing sustained throughput/wait targets and alternative timing/destination strategies retained |
| 8 | Eastbound main street has no way home | Inherited direction stays fixed; a legal two-way return is accepted as well as a directed loop |
| 9 | Roads approach a protected island | Safe connections around the island count without a required recognized roundabout |
| 10 | A gap in a four-lane avenue | A working ordinary-road bridge also counts; no requirement for four newly paid wide sections |

Goals and briefs describe the situation and success outcomes. Available tools still progress through the original road, Stops, Lights, direction and four-lane options. The main panel shows the current outcome; the full criteria remain in Rules & details. Basic tool instructions remain in tool controls, not in the mission solution. The original maps, budgets, building protections, household demand, collision rules and sequential awards stay intact.

Actual successful trips are required. Decorative controls, disconnected pavement or route availability alone do not win. Removed tool gates no longer discard valid trip evidence in Levels 6/8/9. Level 4 preserves its original post-control journey evidence. Existing route metadata, saved attempts and permanent awards remain readable; no revision bump or reset is needed for these relaxed outcomes.

## Limits deliberately left for after the jam

Level 4's uncontrolled baseline can finish a first round of shopping without an accident. Removing its Stops gate would make it win untouched, so this pass retains that explicit topic constraint and records the need for a redesigned map. It is not yet a wholly open road puzzle. We did not force an artificial crash or increase traffic globally just to make Stops necessary.

Level 7's sustained-flow objective is considerably more technical than adjacent connection puzzles. Level 2's early deadline also merits a later pacing review. Neither is retuned in this bounded pass. More distinct or demanding maps can make wider roads, loops and controls necessary through physical traffic conditions later; the jam now accepts working alternatives instead of rejecting them by tool choice alone.

## Verification

- `verify-solutions.mjs`: all ten untouched starts remain incomplete; both verification variants finish within budget without accidents and continue identically across a mid-run reload. Variants are different working layouts/strategies for Levels 2/3/5/6/7/8/9/10. Levels 1 and 4 repeat their simple reference solution rather than claiming two distinct strategies.
- `campaignLessons.test.ts`, `challengeLessons.test.ts`, `jamCampaign.test.ts`, `cityChallenges.test.ts`: existing campaign, pause/reload, original direction/island protection, trip accounting, and new alternative-acceptance coverage.
- `npm run build`: TypeScript and production build.
- `verify-browser.mjs`: fresh isolated desktop 1440×900 and narrow 390×900 sessions complete Levels 1–10 sequentially, unlocking each through real simulation outcomes. Level 1 uses actual pointer road construction. Later levels use verification operations in the browser. Goal visibility, map space, award persistence after reload, Level 11 unlock and unchanged sandbox storage are checked. External requests are blocked.

No publication, active-player-save access or edits, performance measurements, economy rebalance or changes to other mission designs.
