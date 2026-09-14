# Approved Claude bus artwork

2026-09-11. User rejected the flat geometric bus as inconsistent with the game and asked installed Claude Code to inspect the included Kenney packs, reusing a bus if present or using the packs as inspiration.

Actual installed Claude Code inspected isolated copies of the Modern City and RPG Urban tile sheets and returned the pixel-art generator in `claude-original.mjs`. Claude reported no ready-made bus in those two sheets. Codex also visually checked both sheets. This cream/muted-teal minibus is new candidate pixel art, not a discovered Kenney bus.

`generate.mjs` preserves Claude's artwork code, changing only temporary input paths to repository source paths for reproducibility. Run from the repository root:

```sh
node docs/artwork/transit/claude-bus/generate.mjs
node docs/artwork/transit/claude-bus/compare.mjs
```

Exports: E/W 36×24 PNGs, N/S 22×29 PNGs, transparent margins, four fixed-camera views. All four exports were generated and visually inspected. `comparison.png` is Claude's original arrangement; `comparison-matched.png` is Codex's comparison of unchanged Claude sprites with actual existing civilian/approved EMS sprites at identical 3× nearest-neighbor scale, plus native side views. `review.html` is a local gallery.

Source-finding corrections: Claude's comments incorrectly call Modern City 640×480; the actual sheet is 628×475, and Urban is 458×305. Urban car content sits near the bottom (roughly y250 onward), not the upper y140 crop in Claude's original comparison. Use the matched comparison for reliable vehicle-scale/style review. Raw Claude comments remain preserved for attribution, not treated as verified metadata. Canvas dimensions do not define simulation occupancy; any adoption must retain the current compact one-tile bus collider and fixed-view renderer.

The broader first external launch was rejected by automatic approval review because it included repository source beyond the explicitly authorized asset packs. The successful narrowed run permitted only the two isolated Kenney PNG reads; no repository source, player saves or credentials were supplied as artwork inputs. Claude returned code as text; Codex saved, inspected and executed it locally. No external image generator was used.

Status: **approved after wheel correction and adopted locally**, September 11, 2026. User instruction: “Have claude fix the bus wheels then approve.” No additional selection prompt was required.

Actual installed Claude returned the wheel replacement blocks preserved in `wheel-correction.json`. Its image reread failed because the brief's relative image names did not match the isolated working directory; Claude explicitly reported that and based this correction on the supplied exact wheel geometry. Codex inserted the unchanged returned snippets, rendered all four views and inspected the corrected result at matched and native scale before adopting. The correction gives each side two round tires with one centered hub each, and front/rear views thin tire edges flush with the bumper. `before-wheels.mjs` and `before-wheels.png` preserve the original candidate.

The atlas builder now packs validated `bus_N/E/S/W` exports. Moving buses use the shared vehicle Sprite pool; actual parked fleet uses the same artwork. The geometric placeholder is removed. Existing direction-specific vehicle sizing, lane position, crash tint, passenger labels and simulation remain unchanged. Production build passes. Desktop/narrow isolated pointer/route/start/reload visual checks verify deployed bus sprites; evidence is in `verification/`. No publication or performance testing.
