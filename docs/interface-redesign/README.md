# Gameplay interface redesign

September 9, 2026. User rejected hiding tutorial instructions behind a mission menu and asked for a dedicated gameplay window, distinct rewarded missions and a cleaner interface. The supplied screenshot establishes the useful on-screen instruction/reward pattern; its crowded dashboards are not the layout to reproduce. Navy surfaces, cyan guidance/selection and yellow actions/rewards are lead-selected styling under the user's redesign authority. Existing approved sprites remain in place; no new raster artwork was adopted.

## Implemented layout

- Small top bar: funds, pause/play, Map and Menu, with on-road/parked/waiting counts underneath. Detailed metrics and expansion sit under Map. The redundant map-size caption was removed from the canvas; dimensions remain in Map.
- Dedicated nonmodal tutorial coach above the bottom controls. It remains visible during construction, updates with actual learning progress, and exits through its explicit Exit control or lesson completion. Existing towns receive the opt-in guide. Help expands inside the coach; the main action never requires a mission dialog.
- Contextual first lesson: Build a home → Open a destination → Join the entrances → Watch a visit. The primary button selects the relevant tool or runs traffic. Selecting a tool from the coach reveals its category, including when the same tool was already selected while browsing a different category.
- First active incident still pauses the real simulation, but its explanation stays in the coach. The urgent action selects a missing required service or focuses the scene. Unrelated house/park assistance is not offered as the immediate crash action. Duplicate first-crash toast is suppressed. Emergency alerts remain visible for skipped/completed players, with a route to the response report.
- Persistent mission card shows the current job, progress and reward. Completed missions offer a claim button. The full mission list and optional city-link/reference guide remain available separately.
- A 109px tool dock has Roads, Places and Services categories, one visible shelf with prices, and a direct rotation button. Remove is in Places. Every tool is within two taps; keyboard and coach selections reveal the corresponding shelf. Category browsing does not change the selected tool.
- Routine construction feedback is transient. The tutorial instruction and current mission remain stable on-screen.

## Rewards and persistence

User's request for rewarded missions supersedes the prior recognition-only implementation choice. Provisional rewards are $100/$200/$200/$400, totaling $900. Existing visit income, costs, thresholds and full refunds are unchanged. Completion and claiming are separate. Explicit collection saves the receipt and wallet together; repeating a claim or reloading cannot duplicate payment. Old completed missions migrate as eligible unclaimed rewards without automatic money grants. Future valid mission IDs are preserved.

## Verification

138 simulation tests pass, including new exactly-once claim/migration tests. Final TypeScript and production build pass, with the existing bundle-size advisory.

Browser flow passed at 320×640, 390×844 and 1440×900. Measured map heights with normal tutorial: 229/425/481px; dock109px. All measured initial visible controls meet44px targets and17.6px text. Verified real canvas construction while the coach stays visible, free assistance, actual visit-driven lesson advance, reward claim/reload, all tool categories, keyboard/same-tool coach reveal, map pan/zoom/expansion/report, tutorial exit and city connection access, and natural crash pause/inline response. Final narrow regression at all three sizes verifies no duplicate toast or modal and a Police action that selects Services without building through the UI.

Screenshots: initial-{width}.png, next-lesson-{width}.png (populated town and reward ready), services-{width}.png, urgent-coach-{width}.png and city-link-{width}.png. browser-check.mjs is the current canonical interface check; older browser harnesses document earlier layouts. Physical-device comfort, visual taste and reward/pacing balance still need player feedback.

## Parallel work and audio

Codex specialists handled the coach, compact dock and saved reward model/tests; the lead integrated the layout/theme, contextual actions, map viewport and audio handoff, then reviewed real screenshots. Independent browser verification caught timing assumptions in the harness and confirmed the final behavior.

The user is generating music and layering Splice effects. docs/AUDIO-CUE-LIST.md provides priorities, filenames, durations, a gameplay-loop prompt and delivery/integration notes. No new audio recording or effect mixer was installed in this pass. Existing music is preserved. This update is local and has not been uploaded to RUN.
