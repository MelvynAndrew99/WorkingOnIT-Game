# Weather system

User requested installed Grok implementation and explicitly approved sharing game source with Grok on 2026-09-12. [Assignment](grok-brief.txt) was sent through the installed Grok Build client in `/tmp/ai-overlord-weather-grok`, an isolated source snapshot. Images, credentials, private saves and unrelated files are excluded from the assignment.

Lead-selected first scope: visual clear/cloudy/rain cycles, map-only rendering, pause/reload continuity, reduced motion and a saved on/off preference. Traffic effects were not selected. Preserve ongoing audio changes, missions, town saves and publication boundaries. No performance measurements requested.

Status: implemented by actual installed Grok Build, reviewed/corrected and integrated locally by Codex. [Grok handoff](HANDOFF.md) records the original delivery; the integration corrections below supersede its limitations where verified. No publication or active player-save edits.

## Delivered behavior

**Superseded 2026-09-12 by the visibility pass below.** The original delivery is kept in [the Grok handoff](HANDOFF.md); its cycle table, 80-dash cap and 0.16 shade ceiling no longer describe the code.

- Saved Weather checkbox in title Settings and sandbox Pause; weather off immediately removes effects, including while paused. Reduced-motion preference keeps static rain and shading and responds to OS preference changes.
- HUD and Dashboard describe actual visual weather. Title artwork has no weather overlay. Challenge scenes use their own elapsed clock and the shared visual preference; traffic, budgets and stars retain their existing rules. Challenge-specific browser interaction was not separately checked.
- Vehicles stay above shading; construction previews and emergency labels stay above rain.

## Visibility pass (2026-09-12)

User report: the weather cycle did not feel natural, the condition was hard to see on the canvas, and rain fell far too slowly to read as rain.

### Cycle

An 18-phase, 1220-second (~20 minute) authored schedule replaces the 4-phase 360-second loop. Phase lengths and intensities are uneven, so no two build-ups read the same; three consecutive rain phases let a shower swell into a downpour and ease off again. Clear holds 43% of the clock, rain 23%. The first shower arrives about 4.5 minutes into a new town. Crossfades are eased (smoothstep), capped at 22 seconds and at 40% of the outgoing phase.

Phase intensity now drives a continuous `cloudCover`/`rainIntensity` sky rather than three fixed states, so `Clear`, `Cloudy`, `Overcast`, `Showers`, `Rain` and `Storm` are read off the sky and reported in the HUD. Determinism from `city.elapsed` is unchanged: pause and reload still restore the same sky, and weather is still not a city-save field.

### Visibility

- Map shade rises to 0.34 alpha at full overcast (was 0.16), tinted from slate blue toward near-black as rain builds. Measured mean map brightness: clear 116.5, cloudy 108.4, overcast 100.6, showers 96.5, storm 89.3 (a 23% drop clear to storm).
- Up to 8 drifting cloud-shadow patches give broken cloud a moving, patchy read instead of a flat tint (measured ~5% column-to-column variation under overcast). They fade out above rain intensity 0.5, where the sky is uniformly overcast.
- Rain falls at 700-1220 screen pixels per second (was 52 world pixels per second, roughly 15-20x slower), in two depth layers with different speed, length, width and brightness. Up to 260 dashes, scaled by visible map area.
- Rain is sized and driven in **screen** pixels and converted to world pixels, so it keeps the same apparent size and density at every zoom level.

### Rendering

Rain and cloud shadow are now static tiles plus a scroll offset: geometry is built once per camera/condition change and animated by moving the container, so a downpour costs a few transforms per frame instead of re-tessellating hundreds of shapes. Each pattern is drawn twice, one tile apart, and scrolled within one tile so the seam never enters view; a rectangle mask trims the overhang to the town.

Cloud patches are the entire overdraw budget (they are large translucent fills), which is why the count is capped at 8, rings cut to 2, and patches dropped entirely in heavy rain.

### Verification

- `npm test`: 433 tests pass, zero failures. Weather-specific coverage is 16 model tests and 7 renderer tests, including cycle unevenness, condition labels, fall speed, zoom invariance, scroll direction, tile-seam coverage, clip rect, reduced motion and preference round-trip.
- `npx tsc --noEmit` passes for all weather files. `npx vite build` passes.
- Browser check against the production preview build at 1440×900: all six sampled conditions render and report the expected HUD label with zero page errors; zoomed-out and narrow layouts verified; rain stays clipped to the town.

### Limits and open questions

- **Frame cost is unmeasured on real hardware.** The only numbers available here come from headless SwiftShader software rendering, which exaggerates fill-rate cost enormously. There, weather costs about 1.7x a frame in a storm and 2.9x under overcast against a ~1.4x measurement noise floor. Cloud patches are roughly one extra screen of translucent fill, which should be inexpensive on any real GPU but has not been confirmed on a phone.
- Cycle lengths and intensities are still author-selected, not playtested.
- No lightning, no wet-road physics, no traffic, audio or economy effect. Weather remains visual only.

The installed client's first two headless write attempts were canceled by its internal permission handling; unattended execution completed the authorized task on the third attempt. Session: `01a093e3-7b2a-72b0-a109-a447a4fed5c7`. Existing audio changes were preserved by comparing every integration target with the pre-assignment snapshot before copying.
