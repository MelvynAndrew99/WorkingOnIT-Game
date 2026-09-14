# Existing Kenney artwork first

September 10, 2026 correction: the user pointed out the supplied packs in `src/assets/source/kenny`. Lead inspected both full sheets and enlarged labeled crops. The earlier custom-sprite request was premature; use the existing pack and atlas composition workflow first. Source files remain untouched. The subsequent authorized integration is delivered locally below.

[Selected Modern City candidates](kenney-candidates.png). Coordinates below are zero-based column,row in the spaced `Tilemap/tilemap.png` (16px tile, 17px stride).

| Needed element | Roguelike Modern City source | Finding |
| --- | --- | --- |
| Cone | 14,18 | Already exported as `cone` in the runtime atlas |
| Orange/white barrier | 24,5 | Ready-made horizontal road barrier |
| Orange barrier with warning lights | 25,5 and 24,6 | Ready-made variants |
| Yellow/black barrier | 24,7 | Ready-made variant; lighted variants also nearby |
| Dirt | 4,24 | Already exported as `dirt`; useful work-surface composition base |
| Worn paving | 1,21 | Already exported as `plotWorn`; visible wear, not by itself excavation |
| Direction arrows N/E/S/W | 19,21 / 19,24 / 19,22 / 19,23 | Already exported as directional access arrows; can reuse markings for detour guidance |

The RPG Urban Pack also has barriers at 5,8 / 6,8 / 5,9 / 6,9, sign/board candidates at 7,8 / 7,9, construction barrels at 8,9 through 10,9 and a cone at 10,11. Prefer Modern City for the current established palette/viewpoint; RPG props are alternatives, not an automatic style change.

Initial composition questions (before integration): a matching barrier for a vertical road approach, a particularly clear excavation surface, and a detour sign combining an arrow with a board. No complete ready-made excavation or four-direction upright detour-sign set was positively identified in this inspection. Try existing pieces before commissioning only the specific missing variants. Road markings/width still follow logical geometry; art never defines passability.

## Delivered locally

Codex reused the Modern City cone and three barrier variants, composed an asphalt/dirt work surface and four upright arrow boards, and integrated the warning barrier plus cones into existing Divert rendering. [Asset preview](kenney-derived.png). Furniture remains beneath vehicles with a small amber overview outline; the existing procedural fallback remains available while the atlas loads. Road direction selects the barrier view: north/south roads use the original front view, east/west roads use a composed side view with upright posts and lamps, and bends/junctions show both. Cone positions also follow road direction.

Nine new atlas frames supplement the existing cone. All 127 pre-existing frames retain identical dimensions and RGBA pixels; source packs are untouched. `tools/build-city-atlas.mjs` owns the compositions. `export.mjs` exports native PNGs and the labeled sheet from the generated atlas; `kenney/frames.json` records atlas coordinates.

The work surface and arrow boards are prepared assets, not active worksite or detour-routing features. Timed upgrades, widening and simulation modes remain planned in [the roadworks plan](../../roadworks/PLAN.md). Divert retains its existing civilian restriction and responder passage rules; no gameplay/save rules changed.

Verification: production build passed, 17 emergency-recovery/tutorial integration tests passed, and `verify.mjs` passed desktop 1440×900 and narrow 390×844. Real pointer placement/removal covered horizontal, vertical, corner and junction roads; reload retained restrictions and geometry, Dashboard closure retained map input, and Pause blocked map input/time. Assertions checked civilian blockage and responder passage rules. Screenshots and logs are in [evidence](evidence/). This checks existing access rules, not a new timed-worksite simulation. No publication.

Rebuild using `nix develop --command node tools/build-city-atlas.mjs`. Run the exporter and browser verification inside Nix with `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` pointing to the installed Playwright module and Chromium executable. The verifier targets the isolated development app at port 5188 by default.

The Claude brief below remains historical preparation; no Claude-authored artwork was delivered.

---

# Roadworks sprite assignment

User explicitly assigned sprites to installed Claude on September 10, 2026. The lead supplied a text-only brief, isolated from the repository and player data. Sprite authoring uses the project's established crisp pixel/SVG-to-PNG workflow; no new road geometry is inferred from artwork.

Requested atlas: 128×64 pixels, eight 32×32 frames. Row 0: cone, horizontal barrier, vertical barrier, work surface. Row 1: north/east/south/west detour signs. Signs remain upright; only their arrows change. The work surface represents a physical closure, distinct from a navigational detour sign. Full four-lane road artwork waits for the logical widening geometry.

`claude-brief.txt` records the supplied prompt. `export.mjs` originally targeted the requested SVG but has now been replaced by the delivered Kenney atlas exporter described above.

Historical Claude delivery status: **no sprites delivered by Claude**. The first installed-Claude Write-only invocation timed out after 180 seconds; the second used the client's supported safe mode, disabled tools and requested SVG text only, but timed out after 150 seconds. Both returned only “Execution error” after termination. A separate auth-status check reported logged in. This does not establish the underlying cause. No Claude-authored SVG or PNG exists, and that original exporter was never run. That attempt did not change artwork or runtime. No substitute generation is attributed to Claude.

Orientation correction: `barrierWarningVertical` is a code-composed side view using the established palette, not a rotated source sprite. Production build and desktop/narrow placement, removal and reload checks passed on the isolated local server; the initial test on the existing server timed out during game startup. Corrected screenshots are in [orientation evidence](evidence-orientation/). No publication.
