# One-town commute map — revised after rejection

User rejected the fantasy city art, short five-level district sections, generic hardhat character and star-on-number presentation. The rejection was sent back to the actual installed Grok session with the new requirements and relevant game-design excerpts. Grok's revised plan and original brief are preserved here. Codex implemented it and generated reference-based assets using the approved title-screen artwork. User-supplied DKC1/2 screenshots inform path/character/completed-head navigation only; no Nintendo artwork is used.

## Current design

One continuous top-down modern town for all 25 sites. No five-level theme breaks, palette changes or additional biome. A second map/theme belongs beyond25 and is outside this task. Grey streets, ordinary cream roofs, sidewalks, crosswalks, homes, shops, a school/playground, a narrow canal/bridge, clinic and town hall connect the educational traffic context to the title screen. An oversized dedication plaque beside a tiny repair supplies the visual joke. The inspection route follows painted streets, returning to the central avenue where an outer north/south connection is absent.

The map supports mouse drag, native touch scrolling, keyboard navigation and Find The Man recentering. Compact navigation replaces the large introductory banner. Only levels1–4 launch. All four remain selectable, regardless of order.5–25 are clearly upcoming; clicking them provides a survey notice, not a fake level.5 remains pending user authoring.

The Man's title-screen face replaces the number after completion. A teal/gold rosette ribbon sits on the corner with a small level number on its tail; the accessible label and briefing retain the full level number. The header and result screen use awards instead of star graphics. Existing completion/star save fields and stable IDs are unchanged; no new scoring tier or reward currency exists.

A generated full-figure The Man uses the title-screen hair, grin, vest, tie and clipboard, with no hardhat. He marks the first unfinished playable site, then the Level5 frontier when all four are complete. Returning after progress animates him along the connecting route; reduced-motion skips the movement. Existing receipts remain authoritative after reload and retry.

Optional landmark signs reveal short The Man/crew exchanges in the footer. Codex adapted Grok's hints around real access, round trips, road prerequisites and emergency access. They are flavor, not mission requirements or authored future-level objectives. They do not reveal his entire backstory or promise unimplemented mechanics. No giant dialogue cards obstruct the city.

## Assets

- `public/images/challenges/commute-town.png`: one1024×1536 top-down city plate, used throughout the map.
- `the-man-portrait.png`: title-reference portrait for completed sites.
- `the-man-walker.png`: title-reference full-figure marker, with alpha.
- `ChallengeAwards.tsx`: code-native rosette, including the replay number on its tail.

The approved title image is unchanged. Generated originals remain in the image tool's storage. The rejected fantasy plate was moved out of public runtime assets into the historical progression-overhaul directory. Decorative art has no baked-in level controls/numbers.

## Verification

Production build/type-check passes. `verify-progression.mjs` passes desktop1440×900 and mobile390×844: one city /25 sites /4 playable, mouse drag/recenter, explicit native touch-event scrolling, optional dialogue, actual Level1 simulation completion and result award, completed portrait replacing the number, ribbons and suggested-marker advance, reload, all-completed Level5 frontier fixture, blocked upcoming launch, reduced-motion CSS and byte-identical sandbox storage. Screenshots inspected.

Updated `verify-route.mjs` passes both layouts through real construction/control input, completion, Next, Retry, Reset, reload, three preserved completion receipts and legacy layout/star migration. Visual star queries were updated to ribbon queries; save assertions retain the existing format. No simulation/economy changes and no new playable lessons in this revision.

Local only; no publication. Automated checks do not establish observed enjoyment or physical-device performance.
