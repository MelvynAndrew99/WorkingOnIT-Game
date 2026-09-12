# Transition visual checks

Final frozen source served locally on port 5254. `check.mjs` records environment-specific Chromium/Playwright and temporary snapshot paths; adapt those when rerunning. Fixtures are disposable towns, never the player's active save.

- Desktop 1440×900 and narrow 390×900: both widening offsets in each axis, longer H/V corridors, and the short offset turning apron.
- Nine exact vehicle display samples per layout: three positions on each of H/V transitions and the short offset apron. The isolated simulation is paused and the pause overlay hidden for these screenshots; a one-pixel viewport-height change triggers rendering. These samples verify presentation, not vehicle throughput.
- Save/reload preserves wide-road metadata; no page errors. Full functional suite and build logs are included separately. The model runner reports 49 passing test files; the new transition file contains seven individual cases with exhaustive sampled loops.
- Single aligned wide sections intentionally render as ordinary-width connectors until extended. Their saved two-tile reservation remains. Short offset doglegs retain their turning pavement after a narrow S experiment visibly put tires on grass.

Useful views: [horizontal blend](horizontal-long-1440.png), [vertical blend](vertical-long-390.png), [single connector](horizontal-above-1440.png), [horizontal vehicle](horizontal-motion-0.5-1440.png), [vertical vehicle](vertical-motion-0.5-1440.png), [short offset apron](shifted-motion-0.5-1440.png).

No performance tests or publication.
