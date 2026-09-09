# City building and traffic optimization

Current design brief, September 8, 2026. Approved title: **Working ON IT!** Tagline: **Fix the commute. Take the credit.** The user selected the supplied city-worker/commute artwork for the title screen.

## User-directed pivot

Build a city, observe its movement, make an improvement, and watch the result. Factorio/Satisfactory inform that feedback loop, SimCity informs growth, and Minecraft informs creative ownership. The first playable should give the player something understandable to build and revise, with visible consequences and room to experiment.

This replaces AI Overlord's traffic-cop shifts, AI identity, instruction mutations, token economy, and deliberate-chaos progression. Original work and design notes are preserved in Git and archive/ai-overlord/source-before-pivot.tar (commit 84eac54). The old artwork is historical, not an approved visual direction for the new game. Do not reference or request the user's previous RUN AI-builder prototype.

## First playable milestone

- Build on a bounded map with placeable homes, stores, and roads.
- Make a building's footprint, orientation, and road entrance visible before placement. Reject occupied or out-of-bounds construction without charging funds.
- Show whether homes can reach stores through connected roads. Place trips on that actual route so the player can understand what a connection changed.
- Let the player remove and rebuild construction with full refunds. Use generous funds and predictable baseline income so experimenting cannot trap the player in an unrecoverable economy.
- Preserve local and RUN save behavior, SDK-less browser play, lifecycle cleanup, and the Nix workflow. Verify the milestone locally; deployment and publication are outside this task.

## Next progression: disconnected tutorial to connected city

Accepted user direction, following the first local milestone. This section describes work to implement before the graphical overhaul; the current build has no tutorial progression, skip option, external-city traffic, or connection unlocks yet.

### Learning and transition

Start the tutorial in a town disconnected from the external city. Local homes, stores, roads, and trips provide a forgiving place to learn. Expand this learning experience as mechanics are introduced; do not bake in a permanent two-building checklist as the entire tutorial.

Once the player has a home and store, ask whether they want to connect to the neighbouring city. Connecting ends the tutorial and progresses the same town into the main game. Let players defer the connection and continue experimenting without outside traffic. A suggested initial readiness check is a connected home/store pair and a completed local trip, so the invitation follows demonstrated connectivity; the exact lesson sequence and trigger are still implementation choices.

Expose **Skip tutorial** at the start and during the tutorial. Skipping enters the main-game progression without requiring lesson completion, a first trip, or the connection invitation's tutorial prerequisites. Grant access to the external connection and the same connection-stage building/customization options as normal completion. Preserve any construction already made when skipping partway through. How an empty skipped town is initially laid out is unresolved; it must not leave the player stuck behind tutorial requirements.

### The connected game

The external-city connection introduces outside traffic that grows dynamically with the town, making road layout and capacity increasingly important. It also opens additional building/architecture options and customization. Specific unlocks and growth-to-traffic tuning are not selected yet.

Proposed foundation: represent the external connection as an explicit road gateway at the map boundary. Outside vehicles should use real routes and destinations. Add basic queuing and junction behavior so increased traffic creates understandable road-management decisions; simply spawning overlapping cars is insufficient. Gateway location, initial traffic rate, and control rules remain implementation choices, not approved balance.

### Keep the tutorial expandable

Use the same city simulation and construction rules in tutorial and main play. The disconnected town limits outside pressure while lessons introduce mechanics. Each new mechanic should come with an appropriate tutorial lesson or an explicit decision about when it is taught. Not every future mechanic must be mandatory before the first connection.

Implementation guidance: give lessons stable identities, prerequisites, observable completion conditions, and concise feedback. Keep lesson progress, whether the tutorial was completed or skipped, external connection state, and unlock state separate from renderer assets. Save and restore those states alongside the town. Adding lessons later must not force completed or skipped players back into a tutorial or remove their unlocks. Treat these as requirements for the upcoming implementation, not verified engineering patterns.

Acceptance checks for that implementation:

- The disconnected tutorial has local trips but no outside traffic.
- Completing lessons offers a clear choice to connect; declining leaves the town playable and the invitation available later.
- Accepting progresses the existing town and enables the connection-stage options.
- Skipping from a fresh or partially built town enters main play without tutorial gates or lost construction.
- Reload preserves lesson progress, completion/skip choice, connection, and unlocks.
- Adding a lesson does not restart onboarding for existing main-game saves.
- Outside traffic scales with growth, follows valid roads, and responds understandably to a disconnected or congested gateway.

## Growing map: next objective

The user wants room for creative road layouts as the city grows, with traffic optimization remaining the focus. Mobile and browser play both matter. Expand a bounded city incrementally, and let the camera explore it without reducing every tile to an untappable dot.

Provisional implementation choices: keep the initial 16×14 town; extend one selected edge by up to 8 tiles per expansion; cap each dimension at 64 tiles (640 m at the current scale). North/west expansion adds negative world coordinates, preserving all existing building, road, and trip positions. Expansion is initially free to preserve experimentation; pricing/unlocks are not settled. These are initial engineering and tuning choices, not user-approved limits or a claim of mobile performance validation.

The logical bounds, save migration, renderer/camera, and expansion controls are implemented against Claude's completed graphics pass. Expand opens an edge preview; Add land expands the town without moving existing construction or camera focus. Pan mode supports dragging; pinch/wheel and +/− zoom preserve world targeting; Town recenters on construction at a useful tile scale. Existing saves without bounds load as the original 16×14 map.

Implemented controls include an explicit expansion action with a boundary preview, pan and zoom for touch and mouse, a way to return to the town, and separate camera/construction gestures. Keep UI text readable and tile targeting usable when zoomed in. Preserve the player's camera focus when adding land, especially on the north/west sides. Measure populated-city routing and rendering on target devices before increasing limits or adding large external traffic volumes; bounded land alone does not bound simulation cost.

Map expansion is distinct from connecting to the external city. It must not silently finish the tutorial, activate outside traffic, or bypass the player's connection choice. Teach expansion in the disconnected tutorial as appropriate and retain skip access to main play. The future gateway needs an explicit policy when its edge expands; do not move existing gateway coordinates or trips as an accidental consequence of resizing the map.

## Spatial contract: provisional implementation choices

These values establish one coherent first implementation. They are lead-selected defaults, not user-approved balance or permanent map limits.

| Concept | Initial definition |
| --- | --- |
| Map | Initially 16 columns × 14 rows; player-controlled edge expansion up to a provisional 64×64 maximum |
| Tile scale | 10 m × 10 m of simulation space |
| Road | One tile; cardinal adjacency only, no diagonal connections |
| Home | 2×2 tile footprint |
| Store | 3×2 tile footprint before rotation |
| Orientation | Four quarter-turn orientations; rotate footprint and entrance together; building artwork stays upright from the fixed player view |
| Entrance | One explicit building entrance with an adjacent road access tile; touching another wall does not connect the building |
| Connectivity | A home's entrance road must share a traversable road route with a store's entrance road |
| Route visualization | Vehicles follow the connected road path; renderer coordinates derive from model tile positions |

Building definitions own footprint and entrance geometry. Instances own type, position, orientation, and stable identity. Roads, occupied tiles, connection status, and routes are simulation concepts. Sprites, textures, colors, screen coordinates, and decorative offsets belong to rendering. New artwork must fit this contract without rewriting connectivity or save data.

The same explicit entrance/location model should later allow service vehicles to originate at their service building rather than appear at an arbitrary map edge. Do not add hospitals or other deferred systems just to demonstrate this extension.

## Forgiving economy: initial defaults

Start with 10,000 funds. Roads cost 20, homes 200, stores 400. Baseline income is 200 every 10 seconds, plus 100 per connected home. Full construction refunds support redesign. Display costs, funds, and income clearly. These are provisional tuning values; reliable feedback and freedom to experiment matter more than difficult financial optimization in this milestone.

## Deferred systems

Building upgrades will support greater density. Hospitals should dispatch ambulances from their actual locations; fire and police responses should also operate within the city's spatial model. Weather may affect driving. Preserve a clean foundation for these systems without implementing them in the first milestone.

The HUD reports average planned roundtrip driving time for connected homes, excluding departure waiting. New trips take shortest routes; existing trips finish their chosen routes unless construction invalidates them. A shorter connection therefore improves the next trip.

The next external-city milestone needs basic traffic capacity/queuing; more advanced congestion tuning remains subsequent work. A visible routed trip demonstrates connectivity; it does not by itself prove a satisfying traffic-optimization game.

## Verification and playtest questions

- Can a new player place a home and store, identify their entrances, connect them, and see trips?
- Do rotated footprints, placement previews, occupied-tile checks, and actual connectivity agree?
- Does removing a road update reachability and prevent trips from continuing across a missing connection?
- Can the player redesign freely and predict the effect on funds and income?
- Does a saved city survive a reload, while the old save remains untouched for the archived game?
- Is the map readable and operable at desktop and phone sizes?
- Does an improvement feel rewarding to watch? This requires playtesting, not just passing model tests.

Implementation and automated checks should establish rules and persistence. Household observation should guide later balance, pacing, and visual choices. Do not present untested predictions about player enjoyment as findings.
