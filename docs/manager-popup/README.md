# Manager briefing

September 9, 2026. User assigned the popup to installed Grok; Codex integrated and verified it locally. No publication or new artwork.

## Delivered

“Manager's plan” appears on the current objective during active incidents and the detour lesson. It opens a navy/cyan/yellow dialogue with “We need more roads! I knew this town had potential.” The manager wants useful, visible improvements; the crew reminds the player to preserve emergency access. A safe tutorial with no active crash explicitly labels this as a future-blockage plan.

Opening pauses traffic. Escape or Back to my city closes the speech and leaves the city paused for planning. Plan a route closes it and selects/reveals the Road tool. Neither action places construction, spends funds, advances a lesson, claims rewards or defers an objective. Route guidance remains in the emergency objective details; the detour lesson keeps its existing bypass instruction. Native dialogue handles focus trapping; Escape restores focus to the launcher.

This is a user-opened briefing, not the later inactivity-triggered manager advice. The H-road starter and staged tool unlocks remain a separate tutorial task. No Ignore option is implemented: the user's later “Not yet / I have a plan” means defer a pending request until other work is done, available only after leveling up and never for tutorial objectives. The existing explicit Skip tutorial is separate.

## Attribution and verification

Grok's initial file-edit run exited without files. The recovery run returned complete TSX/CSS directly; preserved in grok-code-response.txt, with recovery-brief.txt. Codex saved the actual code, wired objectives/pause/tool selection, shortened the safe-example preface and replaced a generic disclaimer with a concrete crew-access explanation. Do not attribute integration or testing to Grok.

TypeScript/production build passed. browser-check.mjs passed320×640,390×844 and1440×900: real mounted game, safe detour and active-crash contexts, paused clock, unchanged city/tutorial through read/dismiss/road selection, Escape focus return, no Ignore action and no page errors. Screenshots manager-320.png, manager-390.png, manager-1440.png. Physical-device comfort remains untested. Model code was unchanged, so this task used targeted browser checks rather than repeating the unrelated model suite.

## Reusable lesson

Provider process success is not delivery: verify files or recover exact returned code. Keep character-dialogue closure separate from tutorial/mission completion, and distinguish a real incident from a hypothetical briefing so preserved safe layouts are not described as broken. Parent-owned pause and tool actions keep the presentation component free of simulation mutations. These patterns are verified by the checks above.
