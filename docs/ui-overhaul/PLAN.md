# UI overhaul: clarity, hierarchy and usable map space

Status: UI-01 implemented and verified locally on 2026-09-10 under the subsequent implementation request; see [UI-01 evidence and limitations](UI-01.md). UI-02 is also implemented and verified locally; see [UI-02 evidence](UI-02.md). UI-03 is implemented and verified locally; see [UI-03 evidence](UI-03.md). UI-04 is implemented and verified locally; see [UI-04 evidence](UI-04.md). UI-05 is complete for the agreed desktop/narrow browser scope; see [UI-05 fixes, acceptance and limitations](UI-05.md). The UI overhaul is complete locally; routing J4/J5 and advanced vehicle behavior remain separate work. Blocking correctness regressions still take precedence. Existing uncommitted work is preserved; no mockups, variations or publication were performed.

Subsequent user request: [UI-06](UI-06.md) removes the Jobs & city link entry and completed-job/tutorial reference screens. Implemented and verified locally on desktop and narrow; see its delivery evidence. No publication. It explicitly supersedes the historical preservation requirements for those screens below, while retaining current objectives, unclaimed rewards, saved progress and explicit tutorial/outside-traffic transitions.

## Requested outcome

One top bar contains Funds, Visitors, On Road, Fatalities, Time and Weather, using consistent spacing and left-aligned labels. Small Heatmap and Dashboard buttons sit at its right. A stable bottom-left mission card shows title, description, progress and reward. A bottom-right build grid uses uniform buttons, padding and clear icons. The playable map fills the remaining center area with margins. Layout containers own space so persistent controls never cover the map, cover the mission, or drift independently.

The desktop arrangement is user direction. The following phone adaptation and data definitions are implementation proposals, recorded explicitly rather than treating them as user-selected details.

## Layout contract

- React owns a gameplay shell with explicit top-bar, center-map and bottom-dock regions. Use CSS Grid for these regions and Flex/Grid within them. Preserve the existing navy/cyan/yellow palette and approved artwork.
- Desktop: stats group on the left, Heatmap/Dashboard and necessary global controls on the right. Bottom dock has the mission card left and build grid right. The mission is fixed in its allocated region, not positioned over the canvas. Reclaim the current side-rail space for the map.
- Narrow frames: the same top-bar container wraps into aligned rows. Stack the mission above a category-based uniform build grid in the bottom dock; forcing both into tiny side-by-side columns would undermine readable labels and map use. Keep the current mission summary/progress/reward visible while selecting tools. Longer descriptions and secondary lists may scroll within bounded regions without removing the current task.
- Use actual app-frame width and height, including saved Automatic/Desktop wide/Mobile portrait modes. Height constraints matter as much as width. Define shared spacing, padding, surface and button tokens; start with a 4/8/12/16/24px spacing scale. Keep existing minimum 44px interaction targets and 17.6px player-facing text.
- Camera buttons, map-mode legends, incident alerts, tutorial guidance, feedback and the vehicle inspector must each have an allocated location. Put legends/alerts in bounded shell regions; open persistent inspectors/dashboard in a reserved panel that shrinks the playable map. Never position a new persistent panel over the mission/build dock. Diagnostic marks drawn on roads remain intentional map content.
- Explicit Pause/Menu/confirmation dialogs retain modal behavior, focus management and construction blocking. Their deliberate temporary backdrop is distinct from persistent gameplay chrome. Routine teaching stays visible without requiring a dialog to build.
- Derive one usable map rectangle from the layout and feed it to the existing Pixi camera/viewport and pointer conversion. Observe actual region size changes. Preserve camera world focus on resize, panel open/close and display-mode changes; do not reset town geometry or zoom just to fit the new chrome.

## Data and action definitions

| Requested item | Existing source / planned interpretation |
| --- | --- |
| Funds | Existing saved funds, with exact accessible value if the display abbreviates large numbers |
| Visitors | Proposed: current parked shopping/leisure visitors (`demand.visits`), with an explicit explanation; not cumulative arrivals or reserved inbound slots |
| On Road | Existing `activeTrips` currently counts civilian journeys excluding visiting/crashed phases; keep that definition visible in Dashboard rather than silently counting emergency crews too |
| Fatalities | Existing cumulative city fatalities; no new casualty rules |
| Time | Proposed: saved simulation elapsed time, exposed through the normal HUD snapshot; pause freezes it. Not wall-clock time or an invented day/night schedule |
| Weather | No weather simulation exists. Retain the requested field with honest unavailable state (for example, “Not simulated”) until that separate mechanic exists; do not fabricate clear/rain effects |
| Heatmap | A working toggle for the existing traffic/wait diagnostic view, with visible active state and truthful legend. Preserve access/capacity modes in its controls. A new continuous congestion heatmap is separate scope |
| Dashboard | Reuse existing report/diagnostic information in a consistently laid-out panel; retain route/access, visitor capacity, rescue requirements, and current Debug access |

An implementation pass should resolve any user corrections to these proposals before binding labels. Missing weather and predicted routing data must not become invented UI metrics or hidden new simulation work.

## Backlog and implementation order

| Order / ID | Deliverable and file boundary | Acceptance gate |
| --- | --- | --- |
| 1 — UI-01 (local complete) | Gameplay shell, spacing tokens and map rectangle. `Hud.tsx`, `gameInterface.css`, `useFrameSize.ts`, viewport integration in `cityScene.ts` | Mount existing functional components into allocated regions; map and chrome bounds are disjoint; actual road/building placement remains accurate after resize and display-mode switches |
| 2 — UI-02 (local complete) | Unified top bar and global actions. Extract a focused stats component; narrow additions to store/scene HUD snapshot for elapsed time; adapt `DiagnosticViews.tsx` and report entry | All six labels appear with defined truthful values; counts/clock update and pause correctly; Heatmap/Dashboard work and expose state; Menu/Pause/Debug remain reachable |
| 3 — UI-03 (local complete) | Bottom-left current mission card. Recompose `ObjectiveBar.tsx`, `MissionBoard.tsx` and tutorial guidance | Title, description, accessible progress and accurate reward remain visible; claim is exactly once; tutorial stays non-deferrable with explicit Skip; no duplicate competing task cards; full jobs/city-link controls remain reachable |
| 4 — UI-04 (local complete) | Bottom-right uniform build grid and complete responsive composition. `BuildPalette.tsx`, its CSS, `MapControls.tsx`, guidance anchor integration | Clear icon plus label, live price, selected/locked/disabled states; equal button geometry within each grid; working category switching, rotation, removal, expansion, pan/zoom; preserve the directly visible Debug toggle ([fix evidence](DEBUG-FIX.md)); guidance highlights the actual selectable control without blocking map input |
| 5 — UI-05 (local complete) | Integrated real-game verification, visual inspection and documentation | All checks below pass, build passes, material limitations recorded; release is a subsequent verified delivery step, not part of this plan |

Ownership: preserve the user's earlier preference for installed Claude Code to implement interface work; Codex owns source review, map/camera/store integration and verification. These are planned roles, not a claim that a specialist has been launched or delivered work. Use bounded assignments and sequential integration where file ownership overlaps. No economy or routing redesign is needed for this overhaul.

UI-01 establishes the geometry before styling each component. UI-02/03/04 are integrated against that shell, not separate competing full-layout rewrites. UI-05 completed the whole-overhaul browser acceptance gate. J4 follows with richer routing explanations inside the resulting diagnostic surfaces; J5 and advanced mechanics remain queued. Scenario and visual variations stay last.

## Verification and completion

- Required browser coverage: desktop and narrow only (latest user decision, 2026-09-10), to conserve token usage. Representative defaults are 1440×900 desktop and 390×844 narrow; these dimensions are implementation defaults. Add tablet, smaller phone, short landscape or forced-portrait checks only when a specific issue or task warrants them, with a brief reason. This replaces the previous mandatory six-layout matrix, including for UI-05. Within the two required layouts, verify relevant resizing, reload, bounds and real interaction; do not hide the mission or shrink targets to conceal a layout failure.
- Measure non-overlap between map viewport, top bar, mission, build region and open persistent panels. Check horizontal/text overflow and visible focus. Inspect full-game screenshots as well as bounds; a positive map height alone is not proof of usability. Record playable map dimensions for every configuration and demonstrate practical road drawing and building placement.
- Exercise fresh tutorial Home/Store selection and placement, tool highlights, crash objective/alerts, service response, control lesson, expansion and city connection. Confirm no tool is auto-selected or construction auto-placed by the layout.
- Exercise ongoing saved town with active trips and incidents, mission claim/reload, paused and running time, view toggles, inspector, Dashboard, rotation, zoom/pan, Menu and display-mode changes. Changes of view cannot mutate journeys, reset simulation or claim missions. A deliberate modal blocks click-through and restores focus.
- Preserve service assignments, fractional positions, passing reservations, scene work and real returns. Run the existing model suite if store/model boundaries change, along with the required production TypeScript/build checks and meaningful UI interaction regressions. Do not create tests that merely repeat CSS constants.
- Reduced motion keeps tutorial highlights usable; keyboard controls and visible labels supplement icons; progress has an accessible name/value. Rapidly updating statistics do not spam screen-reader announcements.
- Deliver actual working UI and evidence, not mockups. Do not call this implemented, player-approved or published until those events occur.

## Source findings behind this plan

`Hud.tsx` currently splits information among header rows, absolute side rails and the footer. `cityScene.ts` measures `.city-header`, `.city-controls` and both rails to reserve camera space, so moving DOM panels alone is insufficient. `DiagnosticViews.tsx` already exposes Traffic/Access/Visitors and Debug, and `MissionBoard.tsx` has progress/reward/claim behavior worth retaining. `useFrameSize.ts` already follows actual app-frame width rather than just browser viewport width.

Read AGENTS.md, docs/IMPLEMENTATION-LESSONS.md and this plan before implementation. In particular retain the lessons about measured frame bounds, ResizeObserver, real pointer placement, tutorial tool locators, exactly-once mission claims and screenshots catching problems that geometry assertions miss.
