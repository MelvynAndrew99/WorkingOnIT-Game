# Four-lane roads delivered locally

September 11, 2026. User authorized implementation after the Grok gameplay review and acknowledged that the early economy remains unsettled. This delivers physical roads and construction behavior; it does not establish final economic balance or measured traffic-capacity ratios.

## Player interaction

- Roads now offers **2-lane** and **4-lane**. Select **4-lane** (shortcut **9**), use **Rotate / R** for the orientation, and drag or tap to place. The preview shows the exact pair and any temporary approach closures. Rotation sits beside the road shelf on desktop and beneath it on narrow screens.
- New wide roads can be placed on empty land. Placing over ordinary roads converts the selected pair when its full footprint and approaches are clear. Buildings are never automatically demolished. Widening above/left uses the preview anchored on that vacant side; there is no separate widening-side menu.
- Two adjacent tiles carry two lanes each in opposite directions. Ordinary driving speed is retained. Longitudinal end connections now use curved pavement/curbs and joining lane guides, with continuous vehicle display interpolation. A lone section between aligned ordinary roads is a connector, with full lane markings appearing as the run extends; very short offset doglegs and actual junctions retain their full turning apron. See the visual correction below.
- Wide/narrow side junctions and wide/wide crossings share controls. Clicking either half changes the same Stop/Light. Complete wide crossings occupy a 2×2 core. Bends, terminal turnarounds and offset narrow-road connections have legal outward and return routes.
- Existing manual one-way connections touching the conversion footprint must first be restored to two-way. This preserves intentional direction restrictions rather than silently overriding them. Ordinary external one-way routes still work with wide roads elsewhere.

## Provisional construction economy and roadworks

New cross-sections cost **$40**, equal to two ordinary $20 road tiles. Conversion pays **only for missing tiles**: normally $20, or $0 when both ordinary tiles already exist. Previously paid/free road provenance is retained and demolition refunds actual payments. No speed bonus, fares, new upkeep, artificial capacity multiplier or automatic increase in demand was added.

Conversion closes its footprint and immediate approaches for **3 simulated seconds**, including emergency access. The section must be free of bodies, interpolated movement, committed junction/passing reservations and nearby incidents before work starts. These are short, saved physical closures, with visible amber work tiles and approach outlines. Global pause freezes simulation; no offline work is credited. New construction on empty land is immediate.

Bulldoze during construction cancels that order with at most **1 simulated second** of restoration, then refunds its construction charge once. The old road remains the restored road; independent Divert restrictions survive. Completion occurs outside cached simulation topology scopes, so routing, visuals and lane reservations see the same new geometry. The chosen times are implementation defaults, not user-selected balance values. An Arcade/Realistic mode selector remains separate work.

Removing a wide section removes both halves atomically; at perpendicular overlaps it removes the shared overlapping junction footprint rather than leaving half a junction. Occupied or committed edits are refused. **Direct narrowing is not implemented**: clear traffic, remove the paired section, then rebuild an ordinary road. Building relocation is also not implemented; existing demolition/rebuilding remains available with its normal journey guards.

## Physical movement and persistence

Wide metadata owns centre-line connectivity; mere adjacency does not permit crossing the median or turn a whole straight corridor into an intersection. Existing BFS, planned paths, weighted snapshots, household return checks, patrols and transit cache invalidation include the paired topology. Old towns without wide metadata retain their ordinary road behavior.

Both same-direction lanes are physically occupied and reserved, with merges before narrow exits or turns that cannot accept the second lane. Cars can pass a stopped curb bus on the free lane. Shared wide-junction reservations permit compatible parallel/opposing through traffic and conservatively serialize turning conflicts across the core. **This is not two simultaneous turning lanes around every bend.** Existing accident and responder rules remain in force; there is no explicit wide-road crash immunity.

Strict parsing rejects missing half-roads, duplicate/misaligned sections, conflicting manual directions, invalid timers/payments and overlapping work orders. In-motion and in-work reloads preserve actual trips and payments. Representative bus riders still do not remove car trips or earn household service credit.

## Verification

- Full `npm test`: **48/48 test files pass** ([output](four-lane-evidence/model-suite.txt)). The new topology, traffic, integration and roadworks files contain **28 focused tests**; the final added police lifecycle case also passes directly with all 11 integration tests.
- Functional cases include all rotations and both narrow-end offsets; four simultaneous physical lane tracks; actual merge completion; far-exit blockage; shared control/turn exclusion; passing a curb bus; complete household shopping/stay/return through a wide crossing and L bend; physical police dispatch/work/return; in-motion reload; no departure without a return route; costs/refunds, simultaneous work orders, cancellation and corruption rejection.
- `npm run build` passes ([output](four-lane-evidence/build.txt)); Vite retains its bundle-size advisory. No new dependencies.
- Actual isolated browser checks at **1440×900 and 390×900** pass: horizontal/vertical pointer placement, a four-section drag, ordinary-road conversion, visible construction, blocked building placement without mutation, shared Stop-to-Light replacement from different core tiles, and save/reload. [Results](four-lane-evidence/browser-results.json), [script](four-lane-evidence/browser-check.mjs). The script records this environment's temporary paths/browser binary; refresh a frozen source copy and restart its Vite server before rerunning to avoid duplicate HMR module instances.
- Visually inspected [desktop placement](four-lane-evidence/preview-1440.png), [narrow placement](four-lane-evidence/preview-390.png), [desktop signals](four-lane-evidence/signals-1440.png), [narrow signals](four-lane-evidence/signals-390.png), and [roadworks](four-lane-evidence/roadworks-390.png). Art uses code-native composition of the existing Kenney road palette; source packs and raster atlas are not changed by this feature.

No performance profiling, FPS captures, balance benchmarks, mission redesign, player-save edits, publication, Git commit or push. Measured capacity gains, final prices and player-observed fun remain playtest work.

## Road-blending correction (September 11)

The user identified the square protrusion and disconnected markings on an isolated widened tile. The renderer now uses shared horizontal/vertical transition geometry, including widening above/below and left/right. Ordinary rectangular sprites are omitted beneath wide tiles so they cannot show through the tapered corners. Curb colour/thickness and the ordinary centre dash match the existing Kenney-derived road atlas.

A single aligned section has no space between its entry and exit transitions: it draws as a straight connector rather than a pointed bulge or a false four-lane island. The two-tile reservation remains saved. Extending the road reveals the full-width corridor. A single offset dogleg retains a full paved turning area; a narrow S drawn inside that footprint made the fixed-view vehicle tires cross grass in visual testing. Side roads, wide crossings and building access also retain their full apron.

Vehicle presentation smoothly interpolates across terminal cell reservations while preserving simulation progress, direction rules, saves and intersection reservations. This is display geometry, not a new simulation trajectory. Opposing rendered lane centres remain separated by at least the existing 0.32 tiles in the tested transitions. The tests use a planar contact proxy; they do not promise containment of every pixel of the elevated, fixed-view vehicle sprite.

Verification: 49 model test files pass (including seven transition geometry tests); production build passes. Isolated desktop (1440) and narrow (390) Chromium checks cover seven road configurations, nine sampled vehicle positions per layout and save/reload, with no page errors. Screenshots and the fixture are in [blend evidence](four-lane-evidence/blends/). This is functional/visual verification, not performance measurement or economic balancing. No publication or active player-save changes.
