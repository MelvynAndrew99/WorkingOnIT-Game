Done. Four files, no model/store/scene edits.

## What I implemented

**`src/ui/FlowFeedback.tsx`** (new)
- `FlowSnapshot` / `FlowRoad` types matching your contract exactly, `FLOW_MISSION_ID = 'neighborhood-flow'`.
- `readFlow(s: AppState)` reads `s.flow` through a documented cast (`as unknown as { flow?: FlowSnapshot | null }`). **This is the one thing to revisit:** I can't edit `store.ts`, so the cast keeps the UI compiling before your field lands. Once `AppState.flow: FlowSnapshot | null` exists, `readFlow` can become a plain property read; the shape is identical so nothing else changes.
- `FlowSummaryLine` renders the compact one-line reading: `label · qualified/target homes served · N visits, N returns in 60s · N drivers waiting` (waiting clause omitted at zero).
- Default export `FlowFeedback({ flow, place })` renders the shared detail: model `label` + `reason` verbatim, an eight-row count table (homes served, visits/returns over 60 simulated seconds, pending needs, waiting drivers, access-limited, capacity-limited, homes without a return), the selected-road block, and hints covering the 60-second window, alternatives (roads / a stop sign or light at the queuing crossing / a nearer store), and an explicit "no countdown" line. Returns `null` when `flow` is null.
- `place="dashboard"` + `earned` adds a separate yellow line saying recognition is recorded and stays theirs, and that the numbers are current service, not a promise it holds. The counts render regardless of `earned`.
- No `aria-live`/`role=status` anywhere; only a static `aria-label` on the section.

**`src/ui/flowFeedback.css`** (new) — every selector scoped to `.flow-*` under `.city-ui.dispatch-ui`, so no other objective or report section shifts. Navy panel, cyan heading/summary line/selected-road rule, yellow only for earned recognition. All text 17.6px or larger (headings 19px). Two-column counts on the wide rail and the Dashboard, single column narrow.

**`src/ui/ObjectiveBar.tsx`** — `Objective.note` widened from `string` to `ReactNode`. In `jobObjective` only, and only when `job.id === 'neighborhood-flow'` with a non-null snapshot: `note` becomes the summary line, `primary` becomes **Inspect traffic** → `{ diagnosticView:'traffic', tool:'road', panning:false, toolSelection+1 }` with `pressed` when all three match, and Details renders `FlowFeedback` in place of the redundant "Show traffic view" button (the primary already does that). Manager quote, crew line and reward copy are unchanged. Precedence (`tutorial → emergency → claim → lesson → job`) untouched, so claim/emergency/outside-invitation cards are unaffected. Other jobs take the untouched branch, keep an empty note slot, and gain no height; the flow line lands inside the already-scrollable `.objective-copy`.

**`src/ui/CityDialogs.tsx`** — `<FlowFeedback flow={readFlow(s)} place="dashboard" />` directly after the Dashboard heading, above Map views.

Not done, per scope: no Jobs/history page, no modal, no countdown, no revoked receipts, no solution button, no simulation change. I did not run build, tests or npm, and did not touch docs, model files or uncommitted work elsewhere.

## Proposed lesson

- **Task / owner:** FLOW-02 UI (delegate), model/store/scene with the lead.
- **Problem:** A delegate restricted to `src/ui` needed to consume a store field the lead had not written yet, and had to add job-specific feedback to a shared objective card whose height budget is tuned for every other job.
- **Proposed pattern:** Let the UI own a typed reader (`readFlow`) that casts once at the boundary, with the agreed contract written as an exported interface beside it. That keeps ownership clean, compiles in both orders, and leaves a single line to simplify after integration. For per-mission feedback, branch inside the existing objective builder on the mission id and reuse the existing note/detail slots rather than adding rows: an empty slot costs nothing for other jobs, and slots already inside a scrolling region absorb the extra text without changing the card's reserved height.
- **Evidence:** Source-level only. Text is 17.6px minimum, buttons inherit the existing 44px rule, all new CSS is `.flow-*`-scoped, and no live region wraps polled counts. **Nothing was compiled, rendered or measured** by me.
- **Limits:** Needs the lead's `npx tsc --noEmit`, plus desktop and narrow browser checks of the flow job card height versus another job, the Details scroll, and the Dashboard insertion. If the lead's `AppState.flow` type differs structurally from the interface here, the cast will need updating rather than silently misreading.
- **Status:** proposed.
