# Contributing to Working ON IT!

Help make traffic problems understandable and satisfying to solve. Playtest reports, documentation fixes, accessibility feedback, art, and code are all useful contributions. AI tools are optional.

## Start with shared context

Read [AGENTS.md](AGENTS.md) for current decisions and boundaries, [the design](docs/DESIGN.md) for intent, and [implementation lessons](docs/IMPLEMENTATION-LESSONS.md) for verified patterns. Then read the delivery record for the feature you want to change. The [README](README.md) maps the main systems and explains local setup.

These records preserve the reasoning behind the implementation. They also retain history: a dated proposal is not proof that a feature shipped. Newer explicit corrections supersede earlier decisions; check the source and linked verification when status is unclear.

For a substantial feature, open an issue describing the player problem, proposed behavior, relevant design constraints, and how success could be observed. Small documentation corrections and focused bug fixes can go straight to a PR. Economy balancing is deferred until after the jam. Performance testing requires an explicit maintainer request under the current project instructions.

## Report a bug or playtest finding

Describe what you expected, what actually happened, steps to reproduce, the build or commit if known, and browser/device details. A screenshot can explain a visual issue; a traffic blockage usually also needs the road layout and actual journey state.

For saved-town bugs, follow [the saved-city debugging workflow](docs/SAVED-CITY-DEBUGGING.md). Work on an isolated copy and preserve the original. Do not reset or edit an active player save to make a reproduction pass. Review any attached saves or logs for personal information before sharing them.

## Make a focused change

Fork the repository, clone your fork, and create a branch:

```bash
git switch -c fix/describe-the-problem
nix develop
npm ci
npm run dev
```

Keep each PR small enough to review as one coherent change. Preserve the separation between model rules, rendering, and UI. Cars and responders must obey physical occupancy and legal directions; a UI counter or graph connection must not substitute for a completed journey.

For coordinated work, agree on file ownership and bounded deliverables before starting. A useful handoff includes the requirement, files changed, design decisions, checks performed, and unresolved concerns. Update the relevant design or delivery record when behavior changes, and propose reusable lessons with evidence.

If using an assistant, give it the issue, relevant documents, allowed scope, and acceptance criteria. Review its actual diff and verify the result. Do not submit unexamined generated code or claim a check passed because an assistant said it did. Respect the existing source-sharing and artwork ownership instructions; do not assume every task authorizes sending project material to another provider.

## Verify the behavior

Run commands inside `nix develop`. For a targeted model change, start with its relevant test file, for example:

```bash
node --experimental-strip-types --test src/game/cityTraffic.test.ts
```

For code changes, run `npm test` and `npm run build`, and report the actual results. For UI changes, check real interactions at desktop and narrow widths and include screenshots. For save or movement fixes, include regression evidence for reload and preservation of existing journeys or awards. Documentation-only edits normally need link, command, and content checks rather than a full simulation run.

There are recorded baseline test failures: the [integrated verification record](docs/performance-integrated/README.md) reports four assertions in the Flow/IntersectionSafety files reproducing on its baseline. This is historical evidence, not a blanket exemption for future failures. If a check fails, compare against the unchanged base, report the exact failure, and distinguish new regressions. Do not weaken tests or change traffic balance merely to obtain green output.

The release workflow runs on pushes to `main` and manual dispatch, not on PRs. Include local results for review; do not assume opening a PR will run CI. A passing release build is also not proof of correct gameplay or good balance.

## Open and review a pull request

Lead with the concrete problem and resulting behavior. Include a before/after example when useful. This outline is a starting point:

```markdown
## Problem and change
What player or contributor problem does this solve? What happens now?

## Design
Relevant issue/design links and any important tradeoff.

## Validation
Commands and actual results; screenshots or reproduction evidence.
Known failures, unverified behavior, or remaining limitations.

## Collaboration
Meaningful AI/tool assistance, if used, and what you personally reviewed.
```

Review is part of the work. Ask whether the change meets the intended behavior, respects saves and existing rules, and has convincing evidence. Explain disagreements and respond to feedback with code, evidence, or a documented tradeoff. Human contributors remain accountable for correctness, asset provenance, and the claims in the PR regardless of which tools helped produce it.

A maintainer handles merging and publication. Do not run `make publish`, `npm run deploy`, or the manual publish workflow as a contribution check. See [release documentation](docs/releases/PIPELINE.md) for how reviewed builds reach RUN.
