# Outside-city road sign — 2026-09-17

The user rejected the initial sign-only change because the solid road-edge curb still made the gateway look closed. The correction opens the outward curb and draws matching pavement, side curbs and centre dashes across the map rim, fading beyond the boundary. The continuation is display-only: it adds no roads to the model. Missing gateway tiles stay visibly missing. Automatic gateway creation refreshes the cached road artwork.

Replaced the empty CITY circle with a navy/cyan direction sign beside the gateway, with cream lettering and an outward arrow. A short leader identifies its road tile. Fixed screen sizing keeps it readable while zooming; placement shifts inward at corners. A disconnected gateway adds yellow CONNECT text and outlines the road tile to rebuild.

Installed Claude Code supplied a text-only highway-sign design consultation. Codex adapted it to the existing Pixi activity layer and bounded map placement; no raster sprite was needed. No traffic, save or gateway behavior changes.

Verification: TypeScript and production build pass. Isolated browser contexts at 1440×900 and 390×900 show both connected and disconnected states without page errors. Additional narrow checks cover north, west and south edges at closer zoom. No player saves were accessed or publication performed.

- [Connected, desktop](connected-desktop.png)
- [Connected, phone](connected-phone.png)
- [Disconnected, phone](disconnected-phone.png)

Reusable design lesson: a label cannot communicate a connection when the underlying road geometry says dead end. Open the curb and continue the road across the boundary; use the sign as supporting information. Keep the sign readable independently of map zoom.
