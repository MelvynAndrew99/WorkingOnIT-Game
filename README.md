# Working ON IT!

**Fix the commute. Take the credit.**

A local city-building and traffic optimization milestone. Place homes and stores, connect their entrances, watch trips, and shorten routes. Inspired by the observe–improve–watch-results loop and creative ownership. Balance remains provisional.

## Run locally

Use Ubuntu/WSL with Nix flakes. Run npm and rundot inside the shell:

```bash
nix develop
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

## Play

- Select Home, Store, or Road, then tap/click the map. Drag to paint roads.
- Rotate buildings with the Rotate button or R. Keys 1–4 select tools.
- Entrance arrows mark the road tiles buildings use. Roads connect cardinally. A home's arrow turns green when it can reach a store.
- Cars make trips to stores and return home. Average roundtrip shows planned driving time; shorter roads can reduce it. Current traffic has no congestion or collisions.
- Start with $10,000. Receive $200 plus $100 per connected home every 10 simulated seconds. Roads cost $20, homes $200, and stores $400. Removal refunds 100%.
- **Expand** previews free land on the selected edge; **Add land** extends the town, up to 64×64 tiles.
- Select **Pan** and drag to explore. Pinch, use the mouse wheel, or press +/− to zoom. **Town** returns to your construction. Selecting a build tool exits Pan mode.
- Pause freezes time while allowing construction. Space also pauses. Menu and reload preserve your city. There is no offline income.

The map starts at 16×14 logical tiles, each 10 m, and expands without relocating existing construction. Homes occupy 2×2 tiles; stores occupy 3×2 before rotation. Artwork does not determine footprints, entrances, paths, or saves.

## Verify

Inside `nix develop`:

```bash
npm test              # Spatial rules, routes, economy, saves
npm run build         # TypeScript and RUN-integrated production bundle
npm run build:bundled # Standalone production bundle
npm run preview       # Serve the most recent build locally
```

See docs/DEVLOG.md for browser verification evidence and limitations.

## Preservation and platform

The clean pre-pivot game at commit `84eac54` is preserved in [archive/ai-overlord](archive/ai-overlord/README.md), including a complete tracked-source archive. Existing artwork remains on disk; the old cover is not new-game branding. The old `ai-overlord:traffic:v1` save is untouched. City saves use `city-workshop:city:v1`, mirrored locally and to RUN when available.

The existing RUN game identity, jam kit metadata, SDK boot/lifecycles, and Nix tooling remain. The user approved the Working ON IT! thumbnail and authorized public release on run.world. See docs/DEVLOG.md for release status. Do not run `rundot init` again. Live text generation stays disabled.

Current direction: [AGENTS.md](AGENTS.md), [docs/DESIGN.md](docs/DESIGN.md). Architecture: [CLAUDE.md](CLAUDE.md). Shared evidence: [docs/IMPLEMENTATION-LESSONS.md](docs/IMPLEMENTATION-LESSONS.md). Original starter reference: [docs/RUN-TEMPLATE.md](docs/RUN-TEMPLATE.md).

## Building tools and optional missions

The bottom palette exposes homes, stores, parks, roads, Police, Fire, Clinic and removal directly, with construction prices. Stops, lights, diversion, entrance rotation and pause stay alongside them. Report contains detailed traffic, income and emergency information.

Open Missions for four growth jobs, saved recognition, construction spending and accident-specific detour/service advice. Hide guidance to free build; reopen it whenever you want. Goals count completed visits from distinct households, allow early completion, and do not gate tools or punish early services. Open the Tutorial page for guided lessons, optional free worked solutions, Skip tutorial and the explicit outside-city connection. See [tutorial and outside drivers](docs/tutorial/README.md). See [verification and collaboration notes](docs/interface-missions/README.md).

Latest interface: the tutorial now stays on the gameplay screen, missions show claimable rewards, and the dock groups Roads/Places/Services. Map holds camera/expansion/report controls. See [interface screenshots and verification](docs/interface-redesign/README.md) and the [audio production handoff](docs/AUDIO-CUE-LIST.md).
