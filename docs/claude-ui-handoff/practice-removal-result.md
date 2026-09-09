# Practice button removal (UI pass)

September 9, 2026. Follow-up to the assigned tutorial UI, not a redesign. The user rejected Practice
stamping its own architecture into their town, so every UI route into the practice district is gone.
Scope was limited to `src/ui`; the model, saves, tests and lesson copy stay with the lead.

## Changed files

- `src/ui/TutorialCoach.tsx` (only file changed)

No other approved `src/ui` file referenced practice. Checked: `ObjectiveBar.tsx`, `TutorialPanel.tsx`,
`MissionBoard.tsx`, `CityDialogs.tsx`, `Hud.tsx`, `MainMenu.tsx`, `BuildPalette.tsx`, `tutorialCoach.css`.
`TutorialPanel.tsx` shows lesson text, but it renders `t.body`/`t.hint` straight from the model, so it
needs no edit here (see the dependency below).

## What changed in TutorialCoach.tsx

1. **Primary Practice action removed.** The `accident-response && t.canPractice → { label: 'Practice' }`
   branch is deleted. That lesson now falls through to the existing Run traffic / Pause primary, which is
   truthful: the player watches their own town. A short comment records why no lesson builds for the player.
2. **Expanded "Add a practice crossing" button removed** from the detail `objective-extras` row. Pause
   traffic, Show lesson area, Keep my safe crossing, Jobs and Exit guide are unchanged and in the same order.
3. **Accident-response instruction generalized** to match the model contract:
   `Watch an unsigned crossing, or keep your crossing controlled.` It offers both real routes without
   suggesting anyone remove a stop or light to produce a crash.
4. **Safety acknowledgement copy rewritten** for player-built controlled crossings and honesty about rescue:
   "A stop or light on your crossing prevents these collisions. Keep it in place and read the crew
   explanation. Acknowledging safe design is not a rescue: a real crash still needs crews with a route to it."

Nothing else moved. No new art, no new CSS, no layout or colour change, and all tools, categories, map
controls and navigation are intact. No mayor-proposal or Help/Later UI was added; that stays queued design.

## Model contract this UI assumes

- `canPractice` is always false and the `practice` action is a no-op. The UI no longer reads `canPractice`
  at all, so the field can stay in `TutorialSnapshot` for legacy metadata without affecting the screen.
- `canAcknowledgeSafety` is generalized to a player-built controlled crossing with no active incident, and
  `acknowledge-safety` still completes the lesson. The Keep my safe crossing button and its explanation are
  written for that generalized case, not for a practice district.
- Rescue and detour instructions are untouched.

## Dependency for the lead

`LESSONS` in `src/game/cityTutorial.ts` still tells players to "add the optional practice district"
(`accident-response` body) and refers to "the practice crossing" (`accident-response` hint, `rescue` hint).
Those strings render verbatim in the coach detail (`t.body`, `t.hint`) and in the TutorialPanel lesson list,
so the button removal is only complete once that copy changes. `tutorialAction`'s practice-branch messages
are likewise still reachable text until the action is neutralized.

## Verification

Not run here: no shell tools were used, per the brief. The change is JSX/copy only, removes one ternary
branch and one button, and adds no imports or identifiers. The lead should run the model suite,
`npx tsc --noEmit` and the browser check at 320/390/1440 wide plus forced portrait, confirming that the
accident-response lesson still completes by observing a real incident and by Keep my safe crossing, and
that the detail row has no practice entry at any width.

## Proposed reusable lesson

- **Task / owner:** Remove the tutorial Practice entry points (Claude Code, UI only).
- **Observation:** A teaching action that writes buildings into the player's map reads as the game taking
  ownership of their town, even when it is free, reversible and placed on vacant land. The objection was
  not cost or safety; it was authorship.
- **Proposed pattern:** Teaching UI should offer observation of the player's own city or acknowledgement of
  what they already built, never a button that constructs a demonstration district. When such an action is
  withdrawn, the lesson needs a second legitimate completion route stated in the visible instruction, so a
  player with a well-designed town is not left waiting for a crash and is never nudged to remove a safety
  control to progress.
- **Evidence:** UI edit only; the model, tests and lesson copy were concurrently owned, so behaviour is
  unverified by this pass. The removal itself is mechanical and complete within `src/ui`.
- **Limits:** Whether the generalized safe-crossing route reads as a real achievement, and whether a future
  mayor request with Help / Later avoids the same authorship objection, still needs player feedback.
- **Status:** proposed.
