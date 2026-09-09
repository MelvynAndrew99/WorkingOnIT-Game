# UI responsive polish — follow-up

Bounded fixes to the delivered layout. No architecture change, no new panels, same
composition and colours. Model, store, scene and art untouched.

## Fixes

**1. Header funds truncating to "$9,…" at 320px.** Funds plus three actions did not fit at
compact spacing. Added a third layout value, `data-layout="narrow"` (frame < 380px), which
tightens the header's inline padding, the bar gap, the action gap and the action buttons'
horizontal padding. That returns roughly 35px to the funds figure — enough for `$99,999`
before `compactFunds` switches to `99k`. **No type was shrunk**: the figure stays 23px,
body stays 17.6px, every button stays 44px tall.

**2. Claim objective squeezed to a ~70px column wrapping seven lines.** On a narrow frame
the objective row now stacks — eyebrow and instruction full width, then the primary and
More side by side beneath. The instruction gets ~292px instead of ~70px, so a claim reads
in two lines. Stacking adds a row but removes five wrapped lines: the panel goes from
roughly 181px to 128px. At 390px the side-by-side row is still shorter, so it is kept
there; 380px is the switch point.

**3. Places shelf clipping "Remove".** Rotate was a fifth member of the shelf row, so the
four-tool categories were dividing ~254px four ways (~60px per tool) while "Remove" needs
~58px plus padding. Rotate is now a **sibling** of the shelves rather than a member: the
dock is a two-row grid with the category tabs and rotate on row 1, and the shelves
spanning the full width on row 2. Tool columns go from ~60px to ~72px. Rotate is 44×44 on
a phone and, on wide frames, moves to the end of the tool row at 92×60 with its facing
label, via flex `order`. Reachability and the keyboard/objective reveal are unchanged.

**4. Right rail could spill over the dock on a short frame.** Added
`max-height: calc(100% - 16px)` with hidden-scrollbar overflow. With the height recovered
above it should not scroll in practice (~248px of rail against ~300px of stage at
320×640); it is a guard, not a feature.

**5. Mayor's waiver during a wreck (lead request).** `emergencyObjective` now carries
`s.tutorial?.waived?.reason` as its note. The emergency objective outranks the lesson, so
a rescue grant was invisible in exactly the case it matters most — a live wreck with a
waived clinic, fire or police station.

## Estimated effect at 320×640

Map height should go from the measured 241px to roughly 300px: ~53px from the objective
row, ~5px from narrow dock padding. Width is unchanged at ~243px — that is the right rail
plus the lead's inset, not something this pass touched. 390 and 1440 keep their current
composition; only the dock's rotate placement changes there, and at 1440 the tool row
still fits on one line.

**These are arithmetic from the CSS. I still have no shell** — no typecheck, no tests, no
browser run, and I am not claiming any. Worth checking: the funds figure with a large
balance at 320; that the dock's two-row grid did not disturb the wide single-row dock at
1440; and that rotate still reads as a control now that it sits beside the tabs rather
than beside the tools.

## Changed files

`src/ui/Hud.tsx`, `src/ui/BuildPalette.tsx`, `src/ui/ObjectiveBar.tsx`,
`src/ui/useFrameSize.ts`, `src/ui/buildPalette.css`, `src/ui/objectiveBar.css`,
`src/ui/gameInterface.css`. New selector value to be aware of: `.city-ui` now carries
`data-layout="narrow" | "compact" | "wide"`; `.build-rotate` is no longer inside
`.build-groups`.

## Lesson

*A shared row is a hidden budget.* Rotate cost the four-tool shelves a full column even
though it is not a tool, and the symptom appeared only in one category on one screen
width. When an auxiliary control sits in a row sized by content count, give it its own
row or grid track rather than letting it compete with the content. Same shape as the
objective row: two 44px buttons beside text is fine at 390px and destroys the text column
at 320px — decide by measured frame width, not by assuming the compact case scales down.
Status: proposed, not yet browser-verified.
