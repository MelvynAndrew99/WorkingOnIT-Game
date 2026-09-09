# Graphics pass: local verification screenshots

September 8, 2026. Real Chromium captures of the running game after the Kenney art pass, not
concept art or proposed cover art. Tile mapping and asset choices: `docs/ASSET-MAPPING.md`.

| File | What it shows |
| --- | --- |
| `desktop-entrances-need-roads.png` | Five homes and three stores placed, no roads yet: every entrance shows an amber marker on the exact tile that needs a road |
| `desktop-connected-trips.png` | The same town after roads: green access markers, autotiled corners/T-junctions/crossroads, cars mid-trip |
| `desktop-valid-placement.png` | Store preview on free land: translucent building, bright footprint edge, highlighted access tile |
| `desktop-invalid-placement.png` | Store preview over occupied land: faded building, red edge and a cross over the whole footprint |
| `orientations-all-eight.png` | Home and store in all four rotations, each with a road on its access tile — doors only on south-facing entrances, aprons and arrows elsewhere |
| `phone-390-connected-trips.png` | 390×844 |
| `phone-320-connected-trips.png` | 320×640, the smallest supported size |

Vehicles use one of four fixed-viewpoint views rather than a rotated sprite: side-on when
crossing the screen, front or rear when driving towards or away from the player.
`desktop-connected-trips.png` and the phone captures show both axes at once.

Captured against `npm run dev`; the same flows were re-run against the production
`vite preview` build. The scripted check in `docs/city-milestone/browser-check.mjs` passed
against both (touch placement, road drag, rejected placement, route feedback, moving and
completed trips, income, pause, refunds, disconnection/reconnection, rotation, menu teardown,
reload, legacy-save preservation, 320 px and desktop layouts, no browser errors).

Household playtesting still has not happened. These images show that the town is legible, not
that it is enjoyable.
