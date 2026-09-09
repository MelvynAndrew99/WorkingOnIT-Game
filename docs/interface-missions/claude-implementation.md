Files are written. I could not run any commands in this session (no shell tool available), so nothing below is compile- or browser-verified.

## Deliverables

**`src/ui/BuildPalette.tsx`** (new) — three rows, every tool always selectable:
- Home $200 · Store $400 · Park $300 · Road $20
- Police $600 · Fire $700 · Hospital $800 · Remove (Refund)
- Stops · Lights · Divert · `↻ S` · Pause/Play

Prices read from `COSTS`; accessible names from `LABELS` (`"Fire station, $700"`, visible label `Fire`). `aria-pressed` on the selected tool (false while panning), `title` carries the existing 1–7 / R / Space shortcuts, all buttons `min-height:44px`. Nothing is disabled: an unaffordable tool still selects and patches `"Hospital costs $800. You have $150 right now."`, and the model's own placement rejection still lands in the feedback line afterwards. Rotate is always live and reports the new facing; when a non-building tool is selected it says so instead of pretending.

**`src/ui/buildPalette.css`** (new) — palette grid plus the compact header classes. All new text is 1.1rem; the short-screen block trims padding/margins only. Adds `pointer-events:auto` + `touch-action:manipulation` to both measured panels so taps never reach the map.

**`src/ui/Hud.tsx`** (rewritten) — header: funds + income + Report + Menu on one row, then a status line, then `<MissionBoard />`, then `<MapControls />`. Footer: feedback line, `<BuildPalette />`, then the tip paragraphs. `s.showTips` gating and both `<p>` tips stay **direct children of `.city-controls`** (`.hide-gameplay-tips .city-controls>p` and the ≤700px rules are child selectors, so they cannot move into the palette).

## Layout tradeoffs (arithmetic from the CSS, not measured)

- **320×640:** header ≈ 179px, footer ≈ 198px → map ≈ **227px**, dropping to ≈205px while a three-line message shows. **390×844:** map ≈ **390px** before optional tip lines.
- **Trimmed into City report:** `connected/homes`, `completed trips`, `parked · needs waiting`, `mean wait`. All four are already in the report; nothing was deleted from the game.
- **Header status line** shows `N cars · N waiting · N trips/60s`, replaced by the accident/warning text (gold, 2-line clamp) when either is live. Traffic numbers no longer sit in a live region: they change twice a second and would spam screen readers. A permanently mounted empty `role="status"` span carries only the emergency text.
- **Feedback line** is 2 lines minimum, growing to 3 (`max-height`) so the longest model strings (94 chars, e.g. the traffic-light placement message) are not clipped. The cost is a one-line map resize when a long message appears; I chose that over hiding failed placement.
- **"YOUR TOWN"** hides below 370px wide or 700px tall.
- `Hospital` is the widest label (~65px in ~69px at 320px). If it clips on a real device, change `label` to `Clinic` in `BuildPalette.tsx:19` — the accessible name stays `Hospital`.
- I did not use atlas icons; labels fit without them, and icons would couple the HUD to atlas frame coordinates.

## Needs the lead's attention

1. **Not typechecked.** `MissionBoard.tsx`, `cityMissions.ts` and `store.missions` all exist, so `npx tsc --noEmit` inside `nix develop` should be runnable now.
2. **Three browser checks will fail** — they click `getByRole('button', {name:'More buildings'})`, which no longer exists: `docs/destination-emergency/browser-check.mjs:107,118` and `docs/artwork/service-buildings/browser-check.mjs:66`. Replace with `{name:'Hospital, $800'}`, `{name:'Police station, $600'}`, `{name:'Fire station, $700'}`, `{name:'Park, $300'}`. `'Road closure'` and `'City report'` still resolve — I kept those accessible names deliberately (the Report button is labelled `City report` though it reads `Report`).
3. **Dead code/CSS now unreachable from the HUD:** `CityDialogs` `panel==='buildings'` branch + `extraBuildings`; in `app.css` the `.city-tools`, `.city-traffic-tools`, `.city-actions`, `.connection-metrics`, `.traffic-metrics` rules; in `cityDialogs.css` the `.city-status-row` and `.connection-metrics` rules. I did not touch those files.
4. `buildPalette.css` sets padding/margin on `.city-header`/`.city-controls`/`.map-controls`/`.mission-launch` inside a `max-height:700px` block, scoped via `.hud-panel`. That is my file reaching into three owners' visuals to buy map height; revert that block if you disagree.

## Proposed lessons

- **Budget HUD rows against the scene's own viewport formula first.** `cityScene.ts:387` gives `map = screen − header − footer − 36px`; at 320×640 that is a ~394px total panel budget, which decides how many rows exist before any copy is written. Counting rows beats tuning pixels afterwards.
- **Never put continuously updating metrics in a live region.** Mount one empty `role="status"` for the exceptional message and render the polled numbers in a plain sibling; the region still announces because it exists from mount.
- **When you own one stylesheet, add classes to the elements you render and win on specificity.** Equal-specificity overrides across files depend on bundler order and silently flip; `.city-ui .x .y` is a deterministic override, editing the shared sheet is not.
- **Accessible names are test selectors.** Shortening a visible label breaks `getByRole` checks in another owner's files; keeping the old string as `aria-label` preserves both the check and WCAG label-in-name.
- **Explain instead of gating.** An unaffordable tool that still selects and states price-versus-funds keeps the model's placement message authoritative, so the UI never has to duplicate simulation rules to decide what is legal.
