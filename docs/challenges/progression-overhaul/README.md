> Rejected/superseded by the user: fantasy art, five short themes and star-on-number presentation. See [the one-town revision](../commute-map/README.md). The old image is archived as `rejected-city-journey.png` and no longer ships under public assets.

# Mission progression map overhaul

September 10, 2026. User requested installed Grok to overhaul the mission selection scene into a professional mobile progression journey, drop map-level mission names, and show the first 25 sites with only 1–4 playable. Grok's completed art-direction response and exact text-only brief are preserved here. Codex implemented the design and generated decorative background art.

## Delivered

- Full-width enamel header with Main menu, real earned-star count and Sandbox. Centered 720px journey on desktop; edge-to-edge map on narrow screens.
- Numbered beveled job-site buttons instead of named circles; gold stars for actual saved completions. Briefings retain objectives, budget and existing lesson names.
- Hardhat manager marker and contextual Work this site / Continue button at the first uncompleted playable level. After all four stars, marker reaches the non-playable Level 5 frontier. No new unlock gates: every existing level remains selectable.
- Five five-level districts, with changing color/light treatments: Civic Core, Gridlock Belt, Riverside Works, Ridge Estates and Skyline Frontier. Each uses the same generated city mural with different palette treatments and positioning; five separate illustrations are not claimed. Add another district entry and authored level definitions to extend the route.
- Levels 5–25 are labeled upcoming and cannot launch, including by keyboard. Level 5 has a roadworks notice. No new mission simulation content was authored.
- Auto-position at the current suggested site; first entry retains the complete headline. Reduced-motion support, visible keyboard focus and actual DOM buttons.

`public/images/challenges/city-journey.png` is a new generated 1024×1536 decorative asset. Original retained under the image tool's generated-images directory. Artwork contains no live controls, level numbers or score. Road, nodes, manager and stars are code-native. Existing source art, simulation, saved IDs, stars and sandbox saves are preserved.

## Verification

Production build/type-check passes. `verify-progression.mjs` passes 1440×900 and 390×844: 25 sites / 4 playable, real Level 1 simulation completion, star and marker advance, persistence across reload, completed-all fixture at Level 5, all five districts, blocked upcoming sites, reduced motion, no browser errors or page overflow, and byte-identical sandbox storage. Screenshots inspected including start, briefing, progress and frontier.

Updated `verify-route.mjs` passes both layouts through actual road/control input, completion, Reset, Next, Retry, three saved stars, reload and legacy archive/star preservation. Its old rightmost-Play assertion was updated for the separately delivered 2× button. `verify-reset.mjs` now uses the new numbered level label.

Local implementation only. No publication. Player-observed enjoyment and actual-device performance remain unmeasured.
