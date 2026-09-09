# Building interface and opening missions

Implemented locally September 9, 2026. Claude Code implemented the direct tool palette/compact HUD; Codex integrated saved mission tracking, manager/crew copy, accident advice and phone fixes. Grok Build and Claude supplied independent reviews and explicit corrections after the user's traffic-first clarification. Original responses and decisions are preserved in this folder.

All construction tools have direct buttons and prices. Traffic controls remain available; Report holds detailed traffic/income/response data. Clinic is the visible EMS building label. Four optional jobs count distinct current households completing shopping/leisure visits (1 shopping, 3 shopping, 3 park, 6 shopping). Recognition persists, including out-of-order completion. No cash rewards, time limits, efficiency gates, or service-absence bonuses. Existing cities gain progress from newly observed visits, without invented history. Hiding guidance persists and can be reversed.

Accidents bring budget-aware detour advice and real required crews/deadlines. A detour does not clear a wreck or count as rescue. Construction prices, income and full refunds remain unchanged.

## Evidence and limits

- 111 simulation tests passed, including nine new mission tests for actual completed visits, repeat-household exclusion, demolition/disconnection, save/reload, exactly-once income, malformed ancillary data, hidden guidance and foresight.
- TypeScript and production build passed; existing bundle-size advisory remains.
- `balance-check.mjs` is a prebuilt local feasibility fixture, not a player pacing or main-game balance study. Six homes plus two stores and a park can complete all jobs; one store leaves a household unserved in that fixture. Costs leave ample starter funds. This supports a capacity experiment, not a claim that outside demand is unnecessary.
- `browser-check.mjs` checks real-module UI at 320×640, 390×844 and 1440×900. See the final evidence below. Historical destination/emergency and building-art browser selectors were adapted to direct tools; those older suites were not rerun in this pass.

The full staged tutorial, free worked solutions, skip/connection flow and outside traffic are not implemented here. Accepted direction: teach observable problems with optional free help, then let growth produce main-game traffic challenges. Bus stops, wider roads, one-way roads and later efficiency goals remain future work. No release uploaded in this pass.

Final browser evidence: all checks passed at all three sizes with no page errors. Usable map heights were 213 / 386 / 442px respectively; visible buttons met 44px targets and text met 17.6px. Screenshots confirm readable header and budget, working mission/dialog layout and direct tools. Physical-device usability and human pacing remain untested. See interface-320.png, missions-390.png, budget-320.png and accident-advice-390.png.
