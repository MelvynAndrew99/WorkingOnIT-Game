# FLOW-02: neighborhood service in play

Implemented locally September 10, 2026. No publication. The existing objective card, its Details and the Dashboard now expose useful shopping service and current road-approach conditions.

## What the player gets

- **A neighborhood worth visiting**, a new definition and completion receipt inside the existing mission system. Earlier missions keep their IDs, conditions, claims and land receipts. No second mission system or new history screen.
- It becomes eligible after finishing/skipping the tutorial and earning Word on the street. Existing tutorial, emergency, reward-claim and outside-city-invitation precedence stays intact. It can credit real foresight before becoming the currently displayed job.
- The visible target starts at six homes or the current home count, whichever is larger. Chosen growth raises the saved target before earning; demolition cannot lower it. Replacement homes can qualify through their own real journeys. Six is a lead-selected starting balance aligned with the existing neighborhood growth threshold, not a new user-selected number.
- A compact **Flow** label and served-home count in the objective. **Inspect traffic** activates the existing Traffic view and Road tool. It does not build or demand a specific solution.
- Details and Dashboard show recent completed shopping visits **and returns**, outstanding needs, current waiting, homes without returns, missing access and homes awaiting visitor capacity. Current returns from every household matter; a good completed-trip average alone cannot hide an unserved home.
- Tap an existing road with Road selected to inspect its approach, without construction or cost. The tile is outlined; its current vehicle/wait counts and longest stop appear in Flow details. Waiting and longest stop also stay directly above the map in Traffic view. Scope is roads connected within two road tiles, excluding nearby but disconnected roads. Empty traffic reads Quiet, diversions read Diverted, and wrecks are not labelled Moving. These local readings are current occupancy, not invented local throughput or professional LOS.
- Recognition stays earned after later traffic problems and reload. The Dashboard distinguishes the permanent recognition receipt from current service. No cash reward or land-rule change accompanies this job.

## Qualification and balance decisions

The civic objective requires **at least one actual shopping return from every current household in the recent 60 simulated seconds**, usable shopping/return routes, no current stop beyond 20 seconds and no known unfinished trip older than 60 seconds. Eligibility must persist across four simulated seconds of observations before a permanent receipt is recorded. The UI shows no countdown, failure deadline or penalty. Queries and pause cannot advance observation time. Existing demand, outside-traffic consent and construction prices remain unchanged.

The existing FLOW-01 two-return comparison remains unchanged by default. FLOW-02 supplies a separate small policy to the same measurement function. Label changes settle over four simulated seconds; counts and limiting reasons stay current. Labels describe this game's neighborhood service, not a transportation-engineering grade. The timing/target choices remain balance defaults requiring observed play.

[Installed Grok's review](grok-review.md) challenged the original proposal's two-shopping-return quota plus ten-second stabilization, particularly for towns with real park journeys. Adopted: one shopping return and the same four-second stabilization used for labels. An independent six-home test retains the park and active leisure trips, reloads, then earns shopping-service recognition. A slower original layout may also earn if it really serves every household; we do not force it to fail merely to require an edit.

Not adopted: replacing shopping with any-purpose returns (would allow leisure to hide unmet shopping), a one-home target (this is a visible growth/service objective using the existing six-home scale), and a speculative 30-second stop threshold. Grok's suggestion that the existing 20-second game threshold was “textbook LOS” was not accepted as a sourced fact. No new spare-capacity success gate, timed event or automatic demand escalation was added.

## Implementation and authorship

- **Installed Claude Code** delivered FlowFeedback/CSS and integration in ObjectiveBar and CityDialogs. [Assignment](claude-brief.txt), [actual handoff](claude-handoff.md). The lead replaced the temporary type cast with the real store type, shortened copy, corrected “waiting on road” to include blocked shop exits, and refined narrow Dashboard reading space after inspecting screenshots.
- **Codex lead** implemented model/mission persistence, existing receipt integration, sampling and policy selection, the store/scene bridge and physical road selection and the always-readable selected-approach map legend. Existing tests for the original mission arc still assert its original five outcomes while separately allowing the new definition.
- **Independent Codex test agent** delivered eight behavior regressions in cityFlowProgress.test.ts; the lead added the connected-approach/quiet-road regression and ran the full suite and browser checks.
- **Installed Grok Build** returned a bounded text-only balance review. Its advice was evaluated, not treated as a vote or as observed fun.

Saved Flow state is optional within MissionProgress and contains the fixed target and observation/label timestamps. Missing or malformed optional Flow state cannot erase valid existing mission receipts. Ordinary city parsing restores simulation time before validating observation timestamps. Completion is added to the same `missions.completed` list and is never removed by evaluation.

## Verification and reproduction

- **253/253 model tests passed**, including nine FLOW-02 regressions and the prior FLOW-01, police/EMS saved-city recovery, tutorial, economy and land tests. [Output](evidence/model-tests.txt).
- **Production build and TypeScript passed.** The existing Vite large-chunk advisory remains. [Output](evidence/build.txt).
- **Desktop 1440×900 and narrow 390×844** real Chromium interactions and inspected screenshots. The script loads isolated full-city fixtures, checks the current objective/Details, uses Inspect traffic, taps a real road, verifies unchanged geometry, opens Dashboard, pauses/resumes through real buttons, retimes the light through a map click, observes real simulation service, earns once and reloads with old receipts/consent preserved. It checks minimum type size, horizontal text fit, retained map space, objective action containment and absence of a Jobs/history screen. [Measurements](evidence/results.json).
- The narrow Dashboard remains a scrollable reserved pane beside the map. Shorter summary/detail copy and a single-row heading retain reading space; all data is not simultaneously visible. No mobile modal or extra display-mode matrix was introduced.
- Browser fixtures seed historical receipts and explicit outside consent in a disposable browser context. They do not access or modify a personal save. Model comparisons remain at identical demand; the UI test's outside connection is only for existing invitation precedence and save compatibility.
- The prior diversion art/orientation, emergency fixes, FLOW-01 implementation and all other pre-existing work were retained. No deploy command was run.

```sh
nix develop -c npm test
nix develop -c npm run build
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
CHROMIUM_PATH=/path/to/chromium \
UI_BASE_URL=http://localhost:5190 \
UI_EVIDENCE_DIR=/tmp/flow02-browser \
nix develop -c node docs/flow-puzzles/flow02/verify.mjs
```

Final browser verification uses an isolated copy of the current src/public/config plus a shared node_modules symlink and Vite on port 5190. Keep screenshot output outside that watched tree. The test defaults to localhost:5190 and blocks nonlocal network requests.

## What remains

FLOW-03 is the player-observed playtest: can a player identify the restriction without being told the solution, choose an alternative and enjoy seeing service recover? Automated checks and browser interaction prove behavior and layout, not fun. Observe how easily the baseline earns, whether six homes is an appropriate starting target, and whether the four-second label/receipt stabilization feels responsive. Large-town report performance and physical-device comfort remain unmeasured. Widening, worksite timers, modes and a separate mission system were not added.
