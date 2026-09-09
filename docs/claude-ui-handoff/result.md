# Gameplay interface redesign — Claude Code (UI layout owner)

September 9, 2026. Navy/cyan/yellow kept exactly as approved; the composition is new.
The renderer contract and two requests for other owners are in
`docs/claude-ui-handoff/contract.md` — read that first.

## What was actually wrong

Not font sizes. The old screen spent its height on **four stacked panels that all
answered the same question**: the header (funds, counts, incident), the tutorial coach,
the mission strip, and the dock. Three of them said "here is what to do next". The map —
the thing the game is about — got 229px at 320×640 and never got wider on a desktop,
because every element was a full-width horizontal band. Camera controls were behind a
modal, so moving the view meant opening and closing a dialog.

## The layout

**One question, one answer.** Tutorial lesson, emergency, and the manager's paid job are
now a single *objective panel* with a strict priority: crash → claimable reward → lesson
→ current job. Whatever is showing carries an eyebrow (progress), an imperative line, one
accented primary action, and its explanation behind **More**. That is one panel where
there were three, and the reward is not a chip to notice — when a job completes, the
panel itself becomes `Claim $200`.

**Two reserved bands, everything else floats at the edges.** The header and the dock are
still the only elements that take height from the map (the renderer keeps measuring
exactly those two). Camera controls became a 56px rail on the map's right edge, and the
Map dialog is gone entirely.

**Phone (frame < 860px)**

```
┌──────────────────────────────┐
│ $9,800     Pause Report Menu │  ~44px
│ 12 on road · 3 parked · 5 …  │  ~22px
├──────────────────────────────┤
│                        ┌───┐ │
│                        │Pan│ │
│            MAP         │ + │ │  ← rail floats, map is not cut by it
│                        │ − │ │
│                        │…  │ │
├──────────────────────────────┤
│ Step 1 of 7        [Home][More]│  ~58-80px
│ Select Home, then tap land.  │
│ Roads │ Places │ Services    │  44px
│ [Road][Stops][Lights][Divert]↻│ 60px
└──────────────────────────────┘
```

**Desktop (frame ≥ 860px)** — the same content, composed horizontally instead of stacked:
one status row; a 312px left rail holding the objective panel *with its explanation
already open* plus the four jobs with progress and claim buttons; a 152px right rail with
labelled camera controls and a live traffic readout (trips/60s, mean wait, longest stop,
homes linked); and a centred dock showing **all eleven tools at once** with group labels
and no category tabs. Every tool is one tap on desktop, two on a phone.

Estimated reserved heights (design units, scale 1): header ~82px compact / ~56px wide;
dock ~185px compact / ~104px wide. That should put the map near 350px at 320×640 and
~570px at 390×844, against 229/481 measured before. **These are arithmetic from the CSS,
not measurements — see "Not verified".**

## Decisions worth arguing with

- **Merging tutorial and missions into one panel** contradicts the previous brief's
  "missions are a separate visible bottom card". I did it because two adjacent cards both
  reading "do this next, here's your progress" is exactly the stacking the user rejected,
  and it cost ~70px of map on every phone frame. Missions stay fully visible: the panel
  shows the current job when no lesson is active, the reward claim preempts everything but
  a crash, and the desktop rail lists all four jobs permanently.
- **Floating rails occlude a little map instead of shrinking it.** A reserved side band
  would cost width at every size; a rail costs a 56px strip at the edge that the player
  can pan out from under. DOM overlays capture their own pointer events, so no tap under a
  rail can build by accident. Contract §3 asks the lead to inset the viewport if they
  prefer no occlusion at all; the layout is correct either way.
- **Exit guide moved into More.** It is one tap deeper than before. The instruction line
  is 17.6px and a phone row cannot hold text plus three 44px buttons without either
  cramping the text or adding a whole row. Skip also remains on the title screen.
- **The header incident alert now shows for every player**, not only skipped/completed
  ones, and is suppressed exactly when the objective panel is showing the same crash, so
  the rescue countdown never appears twice.
- **Emergency guidance was moved out of the tutorial module.** A player who skipped the
  tutorial used to get an alert with no action; now the same crash objective (missing crew,
  deadline, a button that selects the missing service or focuses the wreck) reaches
  everyone. It triggers on an unacknowledged crash or while paused, so it does not nag for
  the whole life of an incident.
- **The "Build your city" dialog is deleted.** Every building in it is in the dock.
- **The old `.city-header` / `.city-controls` measurement is untouched** so the renderer
  needs no change to work.

## Per the latest user correction, and Grok's economy contract

`docs/economy-rework/contract.md` was published partway through this session, so the UI is
wired to it rather than only proposing a shape:

- **Free Help / worked-example buttons are gone.** `canAssist` is unread;
  `tutorialAction('assist')` and `'accept-waiver'` are never dispatched — the grant
  auto-activates, so there is nothing to press.
- **The optional teaching district is kept and kept distinct**, labelled "Add a practice
  crossing" (it adds real traffic to watch, it does not solve anything for you).
- **The dock reads `toolPrices(getSave().city)`, never the `COSTS` catalog.** A waived tool
  shows **Free** in cyan — visibly different from the grey "Free" on stops, lights,
  closures and Remove — is announced as "…, free right now", and is never greyed as
  unaffordable. This is the whole point of the correction: zero-cost objective
  construction the player still places themselves.
- **The mayor's offer (`waived.reason`) appears on the objective panel** as a highlighted
  line under the instruction, and `waived.tool` becomes the primary action when the lesson
  has no more specific contextual tool.
- **Refund copy corrected**: "Refunds what you paid", not a full catalog refund, since a $0
  assisted tile refunds $0.
- Grok's model rewrote the three "free worked example" strings, so the stopgap sentence
  filter I had added is **deleted** and hints render verbatim.
- Two items stay with the lead (contract.md §5): `store.ts` still initialises
  `funds: 10000`, so the header can flash `$10,000` before the first snapshot; and
  `place()` can now succeed with unchanged funds, so any scene-side funds-delta check
  must become `constructionChanged(before, after)`.

## Changed files

New: `src/ui/ObjectiveBar.tsx`, `src/ui/objectiveBar.css`, `src/ui/useFrameSize.ts`,
`docs/claude-ui-handoff/contract.md`.

Rewritten: `src/ui/Hud.tsx`, `src/ui/TutorialCoach.tsx` (now exports the tutorial
objective builder, not a panel), `src/ui/MissionBoard.tsx` (controlled dialog +
`MissionList` for the rail), `src/ui/MapControls.tsx`, `src/ui/CityDialogs.tsx` (report
only), and all five stylesheets I own plus `gameInterface.css`.

Unchanged: `src/ui/TutorialPanel.tsx`, `src/ui/cityLabels.ts`. Nothing outside `src/ui`
and `docs/claude-ui-handoff` was touched — no model, store, scene, App, app.css, art or
audio edits, no commit, no deploy.

### Selectors the lead's browser harness will need updating for

Removed: `.dispatch-top`, `.dispatch-stats`, `.dispatch-feedback`, `.dispatch-incident`,
`.dispatch-warning`, `.mission-strip`, `.mission-open`, `.mission-claim` (strip),
`.tutorial-coach`, `.tutorial-primary`, `.tutorial-free`, `.tutorial-exit`,
`.map-controls`, `.dispatch-map-dialog`, `.extra-buildings`.

Added: `.city-bar`, `.city-funds`, `.city-quick`, `.city-live`, `.city-alert`,
`.city-warning`, `.city-stage`, `.city-rail-left`, `.city-rail-right`, `.city-toast`,
`.city-readout`, `.objective-bar`, `.objective-eyebrow`, `.objective-instruction`,
`.objective-primary`, `.objective-more`, `.objective-detail`, `.objective-extras`,
`.map-rail`, `.mission-rail`, `.build-groups`, `.build-group`, `.build-group-label`.
`.city-ui` now carries `data-layout="compact" | "wide"`.

Dead rules for the removed classes remain in `src/styles/app.css` (`.city-feedback`,
`.city-tools`, `.city-stats`, `.city-traffic-tools`, `.city-route`, `.traffic-help`) —
lead-owned, harmless, and safe to delete.

## Not verified — please run these

**I had no shell in this session.** I did not run `npx tsc --noEmit`, `npm test`,
`npm run build`, or any browser check, and I am not claiming any of them pass. What I did
do is re-read every changed file, and specifically check:

- import/export wiring after the component split (the TutorialCoach ↔ ObjectiveBar cycle
  is type-only in one direction, so it is erased at build and is not a runtime cycle);
- no unused imports or locals left behind (`noUnusedLocals` is on);
- CSS specificity against the shared `.city-ui.dispatch-ui button` base and against
  `app.css`'s `.city-controls p`, which silently centres and recolours any paragraph
  placed in the footer — every objective paragraph is qualified past it.

Worth attacking first when you do run it:

1. **Map height and 44px targets at 320×640, 390×844 and 1440×900.** My numbers above are
   arithmetic. 320×640 is the tight case: the header's four items and the objective row's
   text-plus-two-buttons are the things most likely to cramp or wrap.
2. **The live display-mode toggle.** Flipping auto/wide/portrait mid-game must re-lay the
   rails, the dock and both reserved bands, and the scene's ResizeObserver must re-measure.
3. **Real construction with the objective panel open**, including the More panel expanded,
   and that a tap on a rail never builds.
4. **Reward claim exactly once** — the claim moved into the objective panel and calls the
   same `claimMissionReward` + `flushSave`; the receipt model is untouched, but the new
   entry point deserves the repeated-click and reload test.
5. **Crash flow for a skipped player**, which is new behaviour.
6. **A live waiver**: stall a lesson for 60 simulation seconds and check the dock flips to
   a cyan Free, the mayor's line appears on the objective panel, placing decrements the
   allowance, and the price returns after the budget is spent. I read Grok's contract; I
   did not observe a grant.

Also unmeasured, as always: physical-device comfort and whether players actually prefer
this. It is a layout proposal backed by reasoning, not a playtest.

## Proposed reusable lessons

- *Count the panels that answer the same question.* Three surfaces each showing "current
  goal + progress + action" is a layout problem no amount of font tuning fixes. Merging
  them behind one priority order recovered more height than every density tweak combined,
  and removed the ambiguity about which instruction the player should follow.
  Status: proposed, not playtested.
- *A responsive game HUD must key off the measured frame, not the viewport.* With a
  user-selectable display mode, `@media (min-width: …)` is simply wrong — a desktop player
  can force a 500px frame. Observe `#app-frame` and drive composition from a `data-layout`
  attribute; measure it in a layout effect, because on first mount the frame is not in the
  document yet and the wrong layout would paint for a frame and make the renderer measure
  its reserved bands twice. Status: proposed, not browser-verified.
- *Overlay panels must be content-sized.* An absolutely positioned rail with
  `pointer-events: auto` and `top/bottom` insets swallows map input across its whole
  transparent area. Size rails to their content with `max-height`, and reserve
  `pointer-events: none` for the layer, not the panel. Status: reasoned from the
  interaction model, not yet observed failing.
- *When a control is removed by user decision, the copy that advertises it is part of the
  removal.* Deleting the Free Help button while the lesson hint still said "the free
  example adds a connected home and store" shipped a contradiction across an ownership
  boundary. Filing it in a contract with the exact strings got it fixed at the source in
  the same session, and the UI stopgap was deleted rather than becoming permanent.
  Status: verified — the inconsistency was real and is now resolved in the model.
- *Prices must come from the live city, not a catalog constant.* `COSTS.home` baked into a
  module-level palette array cannot express "the mayor is covering this one", and a
  cost-waiver feature is invisible until the dock reads `toolPrices(city)` per render.
  The same applies to refund copy: once a tile can be placed at $0, "full refund" is a
  lie. Status: proposed, not yet observed with a live grant.
- *Qualify component CSS past shared bases.* `.city-ui.dispatch-ui button` (0,2,1) beats a
  component's `.build-tool` (0,1,0), so a `border` shorthand in the base silently wins over
  a `border-color` in the component. Where a shared skin and per-component styles coexist,
  every component override needs the shared prefix. Status: verified by inspection; two
  such collisions were found and fixed while writing this.
