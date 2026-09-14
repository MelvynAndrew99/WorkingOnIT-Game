# FLOW-03 observed playtest

Prepared locally September 10, 2026. **Awaiting player observations; not a completed fun test.** Codex owns this item while installed Grok works on the bounded FLOW-04 foundation in parallel. No publication.

## Try it

The current disposable server is http://127.0.0.1:5191. Choose **Continue commute**. Help residents shop and get home using whichever approach you prefer. At http://127.0.0.1:5191/?trial=2, the same starting town is available for another approach. Each trial saves independently. New game restarts only the selected disposable trial.

Tell the observer what seems to restrict service before changing anything; say what you expect your change to accomplish. After trying it, describe what changed visibly and whether watching the result was satisfying. Try an alternative only if you want to continue. Do not turn this into a speed test or tell the player which tool to use. The two known solutions in FLOW-01 are observer material, not player instructions.

**Recognition may already be earned.** The baseline serves all nine homes under the forgiving civic policy, even though FLOW-01 demonstrates substantial room for improvement. Do not revoke its receipt or secretly increase demand. Observe whether optional improvement is compelling, whether the early receipt obscures the opportunity, and whether the narrow map gives enough context to diagnose it. If not, reconsider feedback or a visibly chosen growth step; do not automatically tighten the quota to manufacture failure.

## Isolation and reproduction

Run `python3 docs/flow-puzzles/flow03/prepare.py` from the repository. It prints a new temporary directory. Then run `nix develop -c npm --prefix PRINTED_DIRECTORY run dev -- --host 127.0.0.1 --port 5191 --strictPort`. Stop an existing test server first if the port is occupied. No existing directories or production source are replaced.

The generator copies the current app locally, disables RUN initialization/storage/lifecycle/analytics in that copy, and replaces persistence with the separate `working-on-it:flow03-playtest:v1:1` and `:2` keys. Production save code is untouched. The fixture uses nine homes and three stores, 120 simulated seconds of warmup, historical tutorial/mission receipts, and generous construction funds. An isolated edge gateway supplies fixture consent without outside arrivals; deliberately joining it changes demand and should be recorded. This is a focused development playtest, not a shipped scenario or Challenges mode, and not evidence about the full economy or natural growth arc.

Desktop 1440×900 and narrow 390×844 Chromium checks pass: real objective/Inspect traffic controls, pause freeze, independent identical starting trials, trial reload, untouched normal-save sentinel, no page errors and **no external network requests**. Screenshots were visually inspected. Narrow map height is 158px in Traffic view; usable controls and map remain, but spatial comprehension still needs human feedback. Production build passed with the existing chunk-size advisory. The prior full model suite remains 253 passing; this harness changes no production model.

`verify.mjs` runs with `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, optional `UI_BASE_URL` and `UI_EVIDENCE_DIR`, using `nix develop -c node docs/flow-puzzles/flow03/verify.mjs`. Evidence is in `evidence/`.

## Observation record

- Player's first explanation of restriction: pending.
- First change and expected effect: pending.
- Actual visible result and perceived payoff: pending.
- Alternative attempted and outcome: pending.
- Enjoyment / confusion / desire to keep improving: pending.
- Balance changes justified by observation: none yet.

Automated checks establish functionality and isolation. They cannot establish enjoyment or complete FLOW-03.
