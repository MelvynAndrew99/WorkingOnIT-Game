# Weather first slice — Grok handoff

Visual atmosphere only. No traffic, economy, demand, mission, save-serialization, audio, publication or performance work.

## Implementation

Deterministic sky from saved `city.elapsed`, not wall clock. A paused city keeps its sky; a reload at the same elapsed second restores the same blend. Weather is not a city-save field.

Provisional cycle (lead-selected, not playtested):

| Phase | Hold | Notes |
| --- | --- | --- |
| Clear | 120s | Longest, so a new or freshly continued town looks like the familiar art. |
| Cloudy | 80s | Inbound to rain. |
| Rain | 80s | Minority of the loop. |
| Cloudy | 80s | Outbound so rain does not slam back to bright. |

20-second linear blends at each boundary. Full period 360 seconds. Limitation: this is not season, time-of-day, growth, or wet-road physics. Challenge maps use the same formula on their own elapsed clock (usually starting clear). There is no lightning.

Rendering is two reused Pixi `Graphics` objects inside the existing map root (so camera pan/zoom, the viewport mask, and canvas `clipPath` already clip weather off HUD/dialogs):

- Shade: one rectangle over `city.map` in world pixels, after roads/buildings and **before** cars, so vehicles stay full-brightness.
- Rain: at most 80 one-pixel diagonal dashes hashed into the visible∩map rectangle, after cars and **before** construction ghosts and emergency labels.

No tile scans, no per-frame textures, no `cacheAsTexture` invalidation of ground/world. Weather off (`enabled: false`) clears both graphics immediately, including when the ticker is stopped; the scene subscribes to the store and calls the existing paused `paint()`.

Preference: `working-on-it:weather` in `localStorage`, default on, same pattern as tips/display-mode. Title Settings checkbox plus a Pause checkbox so it can be removed without unpausing traffic.

Reduced motion: `prefers-reduced-motion: reduce` keeps shade and static rain; the fall offset is zero.

### Title and challenges (deliberate)

- **Title:** the Pixi city scene is not mounted. No weather overlay on the poster. The Settings toggle still persists for later play.
- **Challenges:** the shared city scene draws the same visual weather from that challenge city’s elapsed time. Puzzle rules, budgets and stars are unchanged. Most lessons finish while still Clear. There is no in-challenge weather control; use title Settings. Sandbox Pause is the in-map off switch.

## Validation

Focused (not the full suite, not profiling):

```
node --experimental-strip-types --test src/game/cityWeather.test.ts src/game/cityWeatherView.test.ts
npx tsc --noEmit
```

Covered: t=0 clear, determinism/reload/`elapsed+period`, wrap of negative clocks, unit-sum blends, no lightning-sized shade steps, pause is elapsed-only, off empties a raining frame, reduced motion freezes dashes, preference default/round-trip, shade is the map rect, rain ≤80 and clipped to visible∩map, pan/zoom coverage uses existing camera math.

Not verified here: browser/desktop/narrow play, physical-device rain readability, challenge UI chrome, or Codex integration review.

## Concerns / disagreement

- HUD/Dashboard still said “not simulated”. CityStats, Hud, CityDialogs and PauseMenu were updated so the live label is not a lie. That is slightly beyond the original file list; leaving the old copy would contradict the map.
- Rain is a viewport-anchored dash field clipped to the map, not world-glued particles. Pan keeps rain in the view. If later weather should stick to tiles, hash into world cells instead; keep the 80-dash cap.
- Shade under cars / rain under ghosts is a readability choice, not a lighting simulation. Markings on the pavement do receive the restrained shade (α ≤ 0.16).
- Challenges share atmosphere rather than forcing a clear puzzle map. Easy to gate later with `session`.
- No multiply blend mode (predictable with cached ground/world). No audio, no wet friction.

## Proposed reusable lesson

- Task / owner: visual weather first slice / Grok
- Problem: atmosphere that survives pause and reload without touching traffic or city saves, and that can disappear while the Pixi ticker is stopped.
- Proposed pattern: derive visuals from saved simulation elapsed; keep the preference next to other display flags, not in the city envelope; draw with a bounded Graphics pool on the clipped map root, never by scanning tiles or rebuilding textures; preference-off must `hide()` and `paint()` because pause stops the ticker.
- Evidence: focused weather tests and `tsc --noEmit` in this snapshot.
- Limits: no browser check in this pass; cycle lengths are provisional.
- Status: proposed

## Changed files

- `src/game/cityWeather.ts` (new)
- `src/game/cityWeatherView.ts` (new)
- `src/game/cityWeather.test.ts` (new)
- `src/game/cityWeatherView.test.ts` (new)
- `src/game/cityScene.ts`
- `src/state/store.ts`
- `src/ui/MainMenu.tsx`
- `src/ui/PauseMenu.tsx`
- `src/ui/pauseMenu.css`
- `src/ui/CityStats.tsx`
- `src/ui/Hud.tsx`
- `src/ui/CityDialogs.tsx`
- `docs/weather/HANDOFF.md`
