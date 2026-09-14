# In-game credits

Added a Credits button to the main-menu footer and a panel using the existing menu dialog style. It presents the creator's account of Grok, Claude, Codex, Suno, and Gemini contributions, human creative direction, the roughly seven-day jam build, player thanks, and a repository link for source/design docs/contributions. Full repository credits remain in [CREDITS.md](../../CREDITS.md).

The body scrolls while the heading and close controls stay visible. The native dialog supports Escape, focus containment, and return of focus to the trigger. The source link opens separately. No gameplay or save rules changed.

Validation: `npm run build` passes (existing large-bundle advisory). Isolated Chromium sessions at 1440×900 and 390×844 verify all five tool credits, scrolling, viewport fit without horizontal overflow, initial focus, Escape and restored focus, both close buttons, unchanged local storage, and Settings navigation afterward. No page errors. Screenshots were visually inspected. No active-player-save access, performance testing, or publication.

- [Desktop](desktop.png)
- [Phone](phone.png)
