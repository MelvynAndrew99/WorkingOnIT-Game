# Approved service vehicles

Status: **user approved September 9, 2026**. All twelve directional service sprites are installed in the game atlas.

Created locally by the Codex vehicle-art subagent on 2026-09-09 as editable JavaScript pixel artwork. No image-generation service, Grok or Claude was used; no source images were uploaded externally. The comparison's civilian car is copied from the existing Kenney Roguelike Modern City atlas (CC0, original pack and license preserved in `src/assets/source/kenny/`). New sprites are original rectangle/pixel compositions using the repository's `tools/png.mjs` utility, with colours and density chosen against that existing art.

- Police: compact blue/white patrol car, gold door badge, roof lightbar.
- EMS: pale box ambulance, teal medical cross and belt, split rear doors.
- Fire: red cab-and-equipment body, silver shutters, roof ladder.

## Review

Open `review.html` locally to compare all four views at selectable magnification. `comparison.png` provides labeled enlarged views and a native-scale row. `native-strip.png` has the east-facing civilian, police, EMS, and fire sprites at original resolution.

Every service has `police-N.png`, `police-E.png`, `police-S.png`, `police-W.png` (likewise `ems` and `fire`). North is the rear, south the front, east/west are side elevations; the artwork stays upright under a fixed camera. West is a horizontal reflection of the symmetrical east elevation, not a rotated sprite. No words are embedded in the vehicles, so reflection does not reverse lettering.

All east/west exports use the same 36×24 canvas as the current civilian side view. North/south exports use its 22×29 canvas. Opaque contents remain within those frames. Fire's ladder and EMS's box give distinct silhouettes within the existing visual envelope. These dimensions do not change simulation body length or road occupancy. Full transparency outside the vehicle allows the existing road shadows and scene rendering to remain separate.

## Rebuild

From the repository root:

```sh
nix develop -c node docs/artwork/service-vehicles/generate.mjs
```

This rebuilds only this candidate folder. `generate.mjs` owns the palette, views, reference extraction, and comparisons. It reads the current atlas plus generated frame map to locate civilian reference cars; it does not mutate either. Nearest-neighbour enlargement retains the original pixels.

The atlas builder packs these twelve exports as `car_{police,ems,fire}_{N,E,S,W}`. `vehicleView` maps service and facing to these frames, retaining normal car selection for civilian trips. Continue using the renderer's existing view-specific widths and physical movement for placement; never rotate vehicle textures. Lights in these sprites are unlit hardware colours. Retain response-state-controlled flashing effects in the scene; disable flashes on ordinary return duty. Do not infer emergency privilege from artwork colour or flashing alone.

## Verification and remaining limits

The local generator completed successfully under Nix. All twelve exports were inspected in the generated comparison, alongside actual civilian reference frames and at native scale. Silhouettes remain contained and there are no rotated front elevations or baked road backgrounds. These pixel-art checks are separate from gameplay checks. The lead integrated the approved art and response-state flashing; real game checks are recorded in `docs/emergency-driving/`.

Proposed reusable lesson for lead review: When replacing emergency placeholder tints, prepare all four fixed-camera views and compare them beside actual civilian atlas content at both enlargement and native scale. Different body silhouettes and broad colour blocks survive reduction better than text. Preserve canvas dimensions/renderer sizing independently of logical occupancy, and separate siren animation from the static sprite so ordinary return duty does not inherit emergency flashes.
