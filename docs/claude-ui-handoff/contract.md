# UI ↔ renderer contract (Claude Code, UI layout owner)

Written before implementation, per the handoff brief. Status of each item is marked
**required** (the layout depends on it) or **requested** (improves the result; the layout
is correct without it).

## 1. Preserved, unchanged (required)

The renderer keeps measuring the two wrappers it already measures:

- `header.city-header` — top reserved band. Still the only element at the top of `.city-ui`.
- `footer.city-controls` — bottom reserved band. Still the only element at the bottom.

Both keep their class names, keep their position as first/last children of `.city-ui`,
and stay in normal flow so `getBoundingClientRect().height` remains meaningful.
`cityScene.ts:394-402` needs no change for the layout to work, and the existing
`ResizeObserver` registration at `cityScene.ts:544` stays valid.

Heights change with layout, and both bands now change height *live* when the display
mode toggles. The existing `ResizeObserver` already covers that.

Approximate measured heights after the redesign (design units at scale 1):

| band | compact frame (< 860px) | wide frame (>= 860px) |
| --- | --- | --- |
| `.city-header` | ~82px (~126px while an incident alert shows) | ~56px (~100px with alert) |
| `.city-controls` | ~185px | ~104px |

## 2. New middle layer (informational)

A new `div.city-stage` sits between the header and the footer. It is
`flex: 1; pointer-events: none; position: relative` and never affects the two measured
bands. Everything inside it is an overlay above the canvas:

| class | present | position | pointer-events |
| --- | --- | --- | --- |
| `aside.city-rail.city-rail-right` | always while playing | absolute, right edge, top-anchored | `auto` |
| `aside.city-rail.city-rail-left` | wide frames only | absolute, left edge, full height of the stage | `auto` |
| `div.city-toast` | transient (6s) | absolute, bottom centre | `none` |

The rails are real DOM buttons/panels above the canvas, so the browser routes their
pointer events to the DOM and the canvas never sees them. No false construction can
occur under a rail, with or without item 3.

## 3. Requested viewport side insets (requested, non-blocking)

Without this change the map still renders and behaves correctly; it simply extends
*underneath* the rails, so the visible centre of the town is offset and the far edges of
the map sit behind a panel.

Requested change in `cityScene.ts:layout()`:

```ts
const scale = stage.scale();
const px = (selector: string) => (document.querySelector(selector)?.getBoundingClientRect().width ?? 0) / scale;
const top = (document.querySelector('.city-header')?.getBoundingClientRect().height ?? 160) / scale + 6 / scale;
const bottom = (document.querySelector('.city-controls')?.getBoundingClientRect().height ?? 255) / scale + 6 / scale;
const left = 14 + (px('.city-rail-left') ? px('.city-rail-left') + 8 : 0);
const right = 14 + (px('.city-rail-right') ? px('.city-rail-right') + 8 : 0);
viewport = { x: left, y: top, width: Math.max(1, stage.width - left - right), height: Math.max(1, stage.designHeight() - top - bottom) };
```

and adding both rail selectors to the existing `ResizeObserver` loop
(`cityScene.ts:544`). `querySelector` returning `null` must keep the current
`14`-unit inset, because the left rail does not exist on compact frames.

Approximate rail widths: right rail 56px compact / 152px wide; left rail 312px, wide
frames only.

Known simplification: the rails do not span the full stage height (the right rail is
~240px tall, top-anchored). A full-height side inset is intentionally conservative — it
loses a little map width beside the short rail, and it is far simpler than a non-rectangular
viewport. If that loss is unwelcome, leaving item 3 unimplemented is also fine.

## 4. Free Help copy — resolved

Originally filed here as an open problem: three model strings still advertised the Free
Help control the user asked us to remove. `docs/economy-rework/contract.md` was published
during this session and reports all three rewritten (`first-visit` hint, `detour` hint,
`start`/`resume` result message). The stopgap sentence filter has been **deleted** from
`TutorialCoach.tsx`; hints render verbatim again. If any "free worked example" wording
survives in the model, it will now be visible in the panel — please flag it rather than
re-adding a UI filter.

`TutorialSnapshot.canAssist` is deprecated and unread. `tutorialAction('assist')` and
`'accept-waiver'` are never dispatched from the UI: the grant auto-activates, so there is
nothing for the player to press.

The optional **practice district** (`tutorialAction('practice')`) is kept and presented as
"Add a practice crossing" — a teaching area with real traffic, deliberately distinct from
cost waiving.

## 5. Mayor's cost waiver — wired

Built against `docs/economy-rework/contract.md` as published:

- The dock reads `toolPrices(getSave().city)` per render, never the `COSTS` catalog. A
  waived tool shows **Free** in cyan (distinct from the plain grey "Free" on stops,
  lights, closures and Remove), is announced as "…, free right now", and is never marked
  unaffordable.
- The objective panel shows `TutorialSnapshot.waived.reason` as a highlighted line under
  the instruction, and falls back to `waived.tool` for its primary action when the lesson
  has no more specific contextual tool.
- Remove's copy now reads "Refunds what you paid", and the jobs dialog says "Removing
  construction refunds what you paid for it", instead of promising a full catalog refund.

Two items still belong to the lead, per Grok's §Ownership:

- `store.ts` still initialises `funds: 10000`, so the header can flash `$10,000` before
  the first snapshot patch. The header renders whatever `AppState.funds` holds; no UI
  change can fix it.
- `place()` can now succeed with **unchanged funds**. Any scene-side funds-delta check
  must move to `constructionChanged(before, after)`.
