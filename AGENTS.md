# Project instructions: city building and traffic optimization

Read docs/DESIGN.md for current gameplay direction, docs/IMPLEMENTATION-LESSONS.md before relevant work, and CLAUDE.md for the inherited RUN architecture.

## Current user decisions (2026-09-08)

- The repository has pivoted from AI Overlord to a city-building and traffic optimization game. This explicitly supersedes the old traffic-cop, player-as-AI, token, mutation, chaos, and takeover gameplay direction.
- Inspiration: Factorio/Satisfactory's observe–improve–watch-results loop, SimCity's growth, and Minecraft's creative ownership. The player builds a city, sees how trips work, and improves it.
- First playable milestone: a buildable map, placeable homes and stores, connected roads, visible trips, and a forgiving economy supporting experimentation. Generous starting funds, predictable income, and full construction refunds are reasonable initial defaults.
- Establish tile scale, building footprints, road entrances, and connectivity before adding features. Keep simulation data separate from artwork. The user reports that an earlier switch to Kenney's Roguelike Modern City assets caused a difficult refactor; asset dimensions must not define simulation geometry.
- Later scope includes upgrades for greater density, hospitals dispatching ambulances from their actual locations, fire and police responses, and weather affecting driving. These inform the foundation but are not first-milestone requirements.
- Do not reference or request the user's previous RUN AI-builder prototype.
- Preserve existing work before replacing gameplay. The pre-pivot source at commit 84eac54 is retained in archive/ai-overlord/source-before-pivot.tar and Git history.
- Keep useful RUN integration, saves, and Nix tooling. Run npm and rundot inside nix develop. npm run dev starts the game.
- Implement and verify locally. Public publication is not authorized; this milestone does not include a private deployment either.
- Approved game title: Working ON IT! Tagline: “Fix the commute. Take the credit.” The user selected the supplied city-worker/commute image as the title screen, installed at public/images/title/working-on-it.png. Use its visible title and tagline, with live menu controls replacing the baked-in controls; preserve the source image. “City Workshop” is a superseded working label. Preserve the existing RUN identity and old save data. City saves use a separate namespace to avoid overwriting historical progress.
- The father-and-son project and YouTube development context remain useful background; the old AI-replacement premise no longer defines the game.

- Rotation clarification: keep building artwork upright from the fixed player perspective. Rotate the logical footprint and entrance placement, not the sprite. This supersedes the earlier request to rotate sprites.

## Tutorial and external-city progression (user decision)

- Teach mechanics in a town disconnected from the external city. Keep the tutorial expandable as new mechanics are added, rather than hard-coding it as only home/store placement.
- Once the player has a home and store, offer the external-city connection as the transition out of the tutorial into the main game. The player chooses to connect; do not silently introduce outside traffic while they are learning.
- Provide an explicit Skip tutorial option so players can enter the main game immediately without completing tutorial objectives. Skipping must bypass tutorial gates, including access to the external connection and its progression unlocks.
- Connection introduces outside traffic that increases as the town grows, creating road-management decisions, and opens further building/architecture options and customization. Exact unlock content and traffic scaling remain to be designed.
- Preserve the player's town when progressing. Future mechanics must include a plan for teaching them in the disconnected tutorial; keep learning progress separate from artwork and persist it safely.
- This is accepted design direction, not a claim that tutorial, skip, external traffic, or unlocks are implemented. Establish this progression before the planned graphical overhaul. See docs/DESIGN.md for scope, proposed implementation guidance, and acceptance checks.

## Growing map and concurrent graphics work

- User's next objective: expand the map to support creative road layouts in a growing city, keeping traffic optimization as the focus. Design for both phone and browser play; avoid turning scope into an unbounded city simulator.
- Claude completed the graphics pass. Map expansion is now integrated with its renderer; preserve its atlas/building/vehicle artwork when extending the camera or controls.
- Expansion foundation is implemented in cityMap.ts and cityModel.ts: saved bounds, stable world coordinates, and expansion in any cardinal direction. Provisional choices are 8-tile strips, a 64×64 maximum, and free expansion. These are not user-approved balance or verified phone performance limits.
- Expansion is player-accessible through Expand: preview/select an edge, then Add land. Pan mode, pinch/wheel and +/− zoom, and Town recentering support browsing the map without shrinking it to fit. Expansion preserves camera focus and saved construction. See docs/MAP-EXPANSION-HANDOFF.md for verification and remaining limits.

## Provisional implementation defaults

The lead selected a 16×14 map with 10 m tiles, 1×1 road tiles, 2×2 homes, and 3×2 stores; four building orientations with explicit single road entrances; and cardinal road connectivity. Initial construction costs are 20/200/400 for roads/homes/stores, starting funds are 10,000, and baseline income is 200 every 10 seconds plus a connected-home bonus. Construction receives a full refund on removal. These are first-milestone implementation choices, not user-approved balance or fixed long-term design. See docs/DESIGN.md for the spatial contract.

## Historical artwork and approval boundaries

- AI Overlord / Context Collapse gameplay and cover decisions are historical. The pre-pivot snapshot preserves the original instructions and work, including accepted and rejected candidates and their rationale. Do not inherit its robot, catastrophe, meme, or console-era cover brief as current city-game direction.
- Preserve public/thumbnail.jpg and existing source artwork until the user selects a replacement. Its previous acceptance applied to AI Overlord, not this pivot.
- New artwork remains a candidate until the user explicitly selects it. Agent review is not approval. Save alternatives separately, show actual output, and preserve editable/high-resolution sources. RUN thumbnail export remains 512×512 JPG.
- Do not send source images to external tools without explicit authorization; text-only briefs are sufficient. Be honest about which tool made artwork.

## Working agreement: lead agent represents the user

User explicitly authorizes delegation to Codex subagents, installed Grok Build, and Claude Code according to demonstrated task performance. The lead owns coordination, integration, verification, and faithful representation of user intent; do not make the user manage specialist execution.

- Maintain durable notes about accepted decisions, rejected approaches and WHY, unresolved hypotheses, and explicit approval boundaries. Read these notes before briefing new specialists. New user corrections supersede earlier interpretations.
- Distinguish explicit user preferences from lead inferences. Do not claim to know unstated preferences. Clarify only consequential uncertainty; handle routine implementation autonomously.
- Brief experts with goals, relevant evidence, constraints, and acceptance criteria, but avoid leading them toward the lead's preferred answer. Ask for disagreement, alternatives, and failure modes. Independent expertise does not mean ignoring user constraints, and no model is guaranteed unbiased.
- Keep the user's intent distinct from specialist advice. Synthesize disagreements and exercise judgment; do not use majority vote as a substitute for reasoning.
- Route by observed quality rather than brand reputation. Grok Imagine produced the accepted historical AI Overlord cover after iteration, making Grok a useful visual collaborator. This does not establish the new game's art direction. Claude provided a useful independent cover critique. Codex has handled implementation, Nix/RUN setup, integration, and verification. These are observations from this project, not universal rankings.
- Give delegated tasks concrete scope, permitted file areas, and expected deliverables. Avoid overlapping writes and unnecessary agents. Honor restrictions on sending source files externally; text-only briefs are sufficient unless sharing is explicitly authorized.
- Complete authorized work and verify outputs before reporting success. Progress updates should emphasize results, decisions and blockers, not ask the user to manage mechanics of delegation.
- User wants to focus on people-facing systems, player feedback and creative direction rather than implementation. Bring back playable/visible work and concise consequential tradeoffs.
- Artwork adoption still needs user selection. The AI Overlord cover is preserved historical work, not approved cover art for the new game. This milestone is local implementation and verification only; do not deploy or publish.
- Do not imply awareness of the zpet project's details without inspecting user-provided context. This working agreement applies here and does not imply automatic memory across unrelated projects.

## Specialist learning and shared patterns
All specialists must read docs/IMPLEMENTATION-LESSONS.md before relevant work and include proposed reusable lessons in their handoff afterward. The lead verifies and merges notes into that shared record, avoiding concurrent writes and competing copies of the vision. Separate proposed hypotheses from verified patterns; preserve evidence and mark superseded lessons. Implementation convergence must not suppress independent criticism. Do not create a new architecture or revise product intent silently.
