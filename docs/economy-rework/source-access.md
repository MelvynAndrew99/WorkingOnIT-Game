# Requested specialist source access

Purpose: Claude implements the user-assigned interface redesign; Grok implements the user-assigned tutorial economy correction. They use the installed Claude Code and Grok Build clients and existing accounts. Reading code through these clients sends its contents to their respective model providers, Anthropic and xAI.

Requested shared text context: AGENTS.md, CLAUDE.md, docs/DESIGN.md, docs/IMPLEMENTATION-LESSONS.md, package.json, docs/claude-ui-handoff/brief.txt, docs/economy-rework/brief.txt and each specialist's contract/result notes.

Claude's requested source context: the TypeScript/TSX/CSS files in src/ui; src/styles/app.css; src/state/store.ts; src/state/save.ts; src/game/cityControls.ts; src/game/cityTutorial.ts; src/game/cityMissions.ts; src/game/cityModel.ts; src/game/stage.ts; src/game/cityScene.ts; docs/interface-redesign/README.md; docs/tutorial/README.md. Claude may edit only the UI files permitted by its brief.

Grok's requested source context: src/game/cityModel.ts, cityTutorial.ts, cityVisits.ts, cityMissions.ts, cityTraffic.ts, cityIncidents.ts, cityExternal.ts, cityMap.ts and their corresponding .test.ts files; cityTutorial.integration.test.ts; src/state/store.ts; src/state/save.ts; docs/tutorial/README.md. Grok may edit only the model/tests permitted by its brief.

Exclude images, audio, credentials, environment files, private saves, unrelated projects and other repository files. No publication or messages to people are requested. The lead reviews edits and tests locally. The user explicitly approved this source access: “I approve Claude and Grok accessing the specified source files through their installed clients”.
