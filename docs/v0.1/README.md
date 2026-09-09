# v0.1: first playable traffic shift

Baseline `00ee247` is preserved on main at MelvynAndrew99/AI-Overlord. Integration uses `codex/v0.1`; specialists own separate files on that branch to avoid merge overhead during the two-week jam.

## What is implemented

A two-minute deterministic traffic shift with touch and keyboard releases, crossing collisions, automatic debris removal, trucks, ambulances, an announced control remapping, temporary north closure, token-funded context reset, pause, results and retry. The player supplies the intelligence; no live model requests are required. Economy values are test hypotheses, not a completed progression system. Additional jobs and deliberate domination remain future design work.

## Specialist contributions

- Codex gameplay specialist: pure simulation, 12 behavioral tests, GAMEPLAY.md.
- Codex level/visual implementation specialist: authored escalation proposal in LEVEL.md and readable Pixi city/vehicle graphics. Lead integrated the schedule selected for this first shift.
- Claude Code: independent story draft from STORY-BRIEF.txt, preserved in STORY-CLAUDE.json. Lead selected and edited copy into src/content/story.ts, removing claims about outcomes the simulation does not measure.
- Grok Build/Imagine: grok-asset-concept-candidate.jpg, a candidate palette and shape sheet. It is not an approved sprite atlas. Its mixed perspectives, baked labels and medical emblem need treatment before runtime use. The executable prototype uses separate code-drawn shapes; the accepted cover is unchanged.
- Codex music specialist: four instrumental Suno prompts and listening guidance in SUNO-PROMPTS.md. No music has been generated or integrated yet.
- Lead: shared direction, integration, UI, verification, GitHub baseline, and COVER-ART-VIDEO-SCRIPT.md.

## Household playtest

Play once without coaching. Ask what each button does, what caused the first crash, whether the player understood the changed mapping, and what made them want another shift. Observe before explaining. Then try a second shift and compare confidence and recovery, not only score. Test on a phone as well as keyboard. Note where the game becomes boring or confusing and whether humor survives repeated mistakes.

## Checks and limitations

Run `nix develop`, then `npm run dev`; `npm test` checks the model and `npm run build` checks TypeScript and production bundling. Browser smoke checks cover menu entry, rendering and successful opposing releases. These checks do not establish that the game is fun. Waiting queues are capped, overflow arrivals are skipped, and ambulances have a reward bonus rather than an urgency system. Difficulty, audio and long-term progression need further iteration.

The package/deployment revision is independent of the gameplay milestone label v0.1. Keep RUN uploads private until public release is requested.