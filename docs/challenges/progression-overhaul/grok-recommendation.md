# Civic Works Corridor — Mission Select

Treat the map as a **vertical construction corridor**: one arterial being built through five city districts. Candy Crush winding-path rhythm, city-works materials (asphalt, hazard tape, gold inspection plaques, teal civic enamel). Mission names never appear on the map. Stable IDs `1–4` (plus existing save stars) unchanged; **1–4 always selectable**; **5–25 never launch**. Sandbox stays off-map in the header.

## Layout
**390×844:** sticky header 56px; full-bleed vertical scroll; path occupies a 72px center gutter; nodes 56px (hit 44px min) sit on the path; district art in the side margins.  
**1440×900:** same vertical scroll, journey column **720px** centered; extra width is district murals only. Path, nodes, avatar, CTA are **live DOM/SVG** — never baked into art. Corridor is a repeating **5-node district band**; appending districts past 25 is layout-only.

## Header (sticky, navy enamel `#0B1F33`)
Left: **Main Menu** (text button, 44px). Center: enamel wordmark **Working ON IT!** + small hardhat mark. Right: real **★ count** (sum of earned stars only) and **Sandbox** (text button, gold outline). No lives, currency, or fake locks.

## Path
Code-native SVG: 8px asphalt ribbon (`#2A3340`) with dashed gold lane ticks, orange cone clusters at district seams. Snake: L-center → R-offset → L-offset, ~140px vertical pitch per node (desktop 160px). Reduced-motion: static dashes, no shimmer.

## Five districts (mood shifts; 5 nodes each)
| Band | IDs | Mood (art only) |
|---|---|---|
| **Civic Core** | 1–5 | Daylit teal canals, brick halls, wet cobble |
| **Gridlock Belt** | 6–10 | Hot noon, orange cones, signal glow, glass canyon |
| **Riverside Works** | 11–15 | Dusk steel, cranes, barge wakes, rust |
| **Ridge Estates** | 16–20 | Golden-hour hills, quiet roofs, long shadows |
| **Skyline Frontier** | 21–25 | Night navy, scaffold, weld sparks, unfinished towers |

Level **5** is the **construction frontier** (scaffolded node, not a playable level).

## Nodes (not circles)
Rounded **hex work-sites**, 56px, 3px gold bevel, inner well.

- **Completed:** filled teal enamel `#0E7C7B`, **one ★** (existing save: 1 or 0) stamped top-right, faint check rivet. Dimensional, not flat.
- **Playable (1–4, not current):** navy well, gold ring, empty star slot if unearned.
- **Current suggested:** orange–white **hazard collar**, 2px gold inner ring, idle pulse (respect `prefers-reduced-motion`).
- **Upcoming (5–25):** 40% opacity, dashed blueprint stroke `#7AA8A8`, no star, `aria-disabled`, **no Play**. Optional tap: toast “Crews still surveying this site.” Never start a fabricated level.

All **1–4** remain tappable regardless of order.

## Marker
Hardhat city-manager sprite (teal vest, gold helmet) stands **on the path just below** the suggested node. Suggested stop = first uncompleted among playable **1–4**; if all four complete, marker sits at **level 5 frontier**. No fake skips.

## Scroll + CTA
On enter, scroll so the suggested node sits **~42% from the top**. Floating **Continue** / **Work this site** chip (orange fill, navy type, 48×44) docks to that node; activating it opens the same briefing as the node. After completing 1–4, chip becomes **Crews assembling…** and is non-launching.

## Briefing modal (keep flow)
Node 1–4 → existing objective/budget sheet (names/objectives live **here only**) → **Play** / **Continue**. Dimensional navy card, gold rule, orange primary. No map titles.

## Art-gen brief (background plates only)
Five **tall mural strips** (mobile 390×1400; desktop 1440×1600), one per district, same vanishing-point down a **clear 120px (mobile) / 280px (desktop) center void** — no roads, signs, numbers, UI, or characters in that void (live path draws there). Painterly, dimensional, palette teal/navy + gold/orange roadworks. Seam each plate at a **roadworks gate** (cones, barrier, crane) for stitch. Export without text.

## Identity & a11y
Materials: enamel, asphalt, rivets, hazard tape — a **job-site pilgrimage**, not candy. Contrast ≥4.5:1 on nodes/type. Focus rings gold 3px. Keyboard: nodes in ID order. Extensible: add district plate + 5 nodes + path waypoints.
