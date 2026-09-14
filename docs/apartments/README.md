# Offices and apartment complexes

2026-09-13. Local gameplay implementation. No publication or active player-save edits.

## Buildings and access

**Apartment:**4×4 lot, four residents with up to four concurrent car journeys. Upgrade to six residents, higher bounded shopping/park/work demand and a player-chosen second entrance. Each block remains a distinct physical building with real journeys.

**Office:**4×4 destination for real work trips from homes and apartments. Eight work spaces, upgraded to16 with a chosen second entrance. Workers physically arrive, stay10 simulated seconds, and drive home. Work records retain their own purpose; they do not grant shopping income or shopping/leisure mission credit. No individual schedules, salaries, payroll or economy rebalance were added.

The fixed first driveway follows the home-corner rule. Relative to the lot top-left: rotation0 south `(0,4)`,1 west `(-1,0)`,2 north `(3,-1)`,3 east `(4,3)`.

Select a building, choose **Upgrade**, then tap a highlighted cardinal edge tile. Any of the15 other perimeter tiles is eligible if it is in bounds and clear of buildings. A road may already occupy it. This supports same-side, corner and opposite-side access. The original driveway and footprint never move. Invalid selection and Cancel/Escape/tool changes spend nothing; the valid selection atomically pays and upgrades.

Provisional costs: apartment$800, office$600, either upgrade$200. Refunds include only recorded upgrade payments, once. Demolition waits for residents/workers and incident-linked crews.

## Editing existing entrances

Click an apartment or office with Inspect, then **Edit entrances**. Choose **First entrance** or, on an upgraded building, **Second entrance**, and tap a highlighted tile. The first entrance uses the four supported corner positions (one per side); the second may use any other cardinal perimeter tile. Exactly the selected entrance moves and its sprite updates. Cancel edit, Escape or selecting a construction tool cancels without changing the building.

Edits are free and preserve population/work capacity, footprint, upgrade payment and complex membership. Existing rotation/second-entrance save fields retain the result without migration. A live journey booked to/from the building, a building emergency or its returning crews prevents relocation; occupied/committed old and new road tiles and active road incidents must also clear. Re-selecting the current tile is a harmless no-op. These checks run again when the player taps, not only when the editor opens.

Verification: new entrance-edit model tests plus apartment construction, office work, building emergency and community integration tests pass; production build/typecheck passes. Fresh isolated browser checks at1440 and390 pixels cover both inspectors, actual map-click edits to first/second entrances and Escape. [Phone editor](evidence/entrance-edit-Office-390.png). No active save edits, performance tests or publication.

## Automatic private lanes and shared access

The apartment join UI now builds the internal connections. Inspect an apartment → **Join complex** → tap another nearby block → review the highlighted route and cost → **Build lanes & join**. Groups can merge, and existing groups can use the same flow to adopt/reconnect their lanes. Cancel, Escape and changing tools discard the preview without payment. On narrow screens the camera frames the proposed community.

Private lanes look visibly narrower than public roads: light unmarked pavement, grass shoulders and short connections to the original building driveways. Existing building/house artwork is unchanged. The manual **Community** road button has been removed. Clicking an owned lane with Inspect selects its complex; construction, demolition, Divert, controls, widening and direction tools cannot edit owned lane tiles. Public approach roads remain editable. Entrance relocation within a managed community is limited to its existing lanes, so an edit cannot strand a block.

The planner uses owned, unobstructed space within a two-tile margin around the member lots, with at most 24 steps for each added block connection. It connects an enabled entrance of every block, preserving buildings and public streets. Existing public pavement is usable only at building entrance endpoints, not as an internal through route. New connections wait for adjacent occupied/committed traffic, incidents and roadworks to clear. No buildings are demolished, public road directions changed or land bought automatically.

New lane tiles retain the provisional $20 road price and actual payment provenance. Reused community pavement costs nothing. Planning is read-only; Apply validates again and rejects a changed route or price rather than silently building a different preview. Insufficient funds or a blocked route changes nothing.

Lanes are real road tiles with the existing 1 tile/second community limit (ordinary civilian roads use 2). Residents and responders physically travel along them, obeying occupancy, incident and one-way rules. A single two-way public connection supplies shared entry/exit; players may add another public connection. Joining does not guarantee a legal outbound and return route through the surrounding city. There is no resident-only traffic gate or vehicle teleportation.

Saved `apartmentComplexes[].privateLanes` identifies managed pavement and rejects duplicate, absent or non-community tiles. Old saves load without edits; their community pavement gets the narrow appearance, while legacy membership remains valid. Existing public roads are not reclassified. Groups below two members still dissolve on building removal, retaining road pavement/payment and any traffic rather than automatically demolishing occupied access. Retained unowned lanes can be removed with the usual safe road-removal rules.

Parks, gyms, value bonuses, density growth and more elaborate community layouts remain post-jam work.

## Demand and emergency rules

Shopping/leisure demand scales with apartment capacity. Work demand is added only in towns with offices, bounded to one pending work request per resident with a provisional32-second cadence per resident. Existing no-office towns keep their prior demand behavior. Apartments and work commuters currently use cars; linked apartment walking/transit coupling is separate.

`createBuildingIncident(city, buildingId, severity)` authors a saved off-road scene for an apartment or office; narrower `createApartmentIncident` and `createOfficeIncident` wrappers are available. `minor` needs police; serious/fire use the existing service rosters. No automatic building incident frequency or campaign changes were introduced.

Crews must physically reach an enabled driveway and perform normal timed work. Existing abstract scene parking represents entry into the lot. They obey one-way directions, occupancy, community speed and wrecks; their existing responding-service exception to civilian Divert remains. A placed station or a route alone does not clear the scene.

## Integration APIs and saved data

- `entrances(building)` returns actual primary/selected second road tiles.
- `apartmentEntranceOptions(city, building)` supports apartment and office perimeter choices.
- `upgradeApartment`, `upgradeOffice`, or generic `upgradeBuildingEntrance(city,id,point)` validate and pay only after a valid choice.
- `residentialCarCapacity` returns home1/apartment4/6; `officeVisitorCapacity` returns8/16.
- `planPrivateLanes` previews an automatic network; `buildPrivateComplex` validates and builds it atomically. `joinApartmentComplex` remains the legacy prebuilt-road API and delegates managed-group merges to the planner. `apartmentComplexSummary` and `pruneApartmentComplexes` retain aggregate membership.
- Building fields: `entranceCount`, `secondEntrance`, `entranceUpgradePaid`.
- City fields: `communityRoads` and `apartmentComplexes`. Complex IDs are the lowest member building ID, in their own namespace. Groups below two members dissolve on demolition.
- Household `work`/`workClock` are optional and saved only after work demand exists. Trips/history support purpose`work`.
- Malformed doors, payment, demand reservations, membership, community pavement and service ownership reject loading rather than silently inventing state.

Grok's UI work is preserved. Additive hooks live in the build palette, `ApartmentPanel`, `ApartmentComplexPanel`, `OfficePanel`, store fields and scene commands. Join previews change no money or saves until **Build lanes & join** is applied.

## Artwork status

Claude completed the office adaptation and distinct residential block after the session reset. The user approved installation on2026-09-13. Both sets are now packed unchanged into the runtime city atlas:64 variants each, with fixed primary entrances and all15 selectable second entrances per rotation. The renderer selects the saved level and world-axis entrance offset for placed buildings and construction previews. No save migration or gameplay changes are needed.

Source and previews: [offices](../artwork/offices/README.md), [residential apartments](../artwork/housing/residential-apartment/README.md). Original house pixels are preserved. The atlas builder copies the approved source pixels and can reproduce the runtime assets.

Sprite verification: both Claude pixel/manifest verifiers pass; all128 runtime frame selections match the model's actual entrance coordinates. Production typecheck/build passes. Fresh isolated browser checks at1440 and390 pixels show both levels, corner/opposite-side driveway arrows and office labels; all four selected textures load at64×64 with no page errors. [Desktop](evidence/sprites-1440.png) · [Phone](evidence/sprites-390.png). No active player save was used.

## Private-lane verification (2026-09-13)

Production build/typecheck passes. 53 focused model/regression tests pass, including nine new private-lane tests: read-only previews, payment/reload, tool guards, blocked/public-street routing, real resident returns, public one-way preservation, group merges, saved metadata rejection, stale previews/occupied approaches, all 16 pairs of first-entrance orientations, and actual responder arrival/work through the shared entrance. The existing community speed tests cover cars, buses and responders.

The isolated [browser check](private-lanes-browser-check.mjs) covers 1440px and 390px: actual pointer placement/joining, preview before payment, Escape, seven automatic lanes with one public approach, no manual Community button, protection against road conversion and save/reload. Screenshots and results are under `evidence/private-lanes/`. No active player save, publication or performance testing.

## Earlier verification

Focused tests cover all15 entrance choices for all4 rotations,4→6 actual resident trips, work arrivals/stays/returns, office8→16 capacity, pending-demand conservation, exact reload, same-trip rerouting, congestion-aware route preservation, real responder arrival/work at chosen doors, blocked sole approaches, community speed/route costs, paid construction/conversion/refund, complex joining/merging/disconnection/removal, and joined blocks' real work journeys.

The integrated64-file model suite reports62 passing files and the two known baseline failures; the production build passes. Results are recorded in `evidence/`. The two pre-existing failing files are reproduced on isolated`git HEAD`: `cityFlow.test.ts:58` improvement threshold, `cityIntersectionSafety.test.ts:26` collision time49.32499999999798 rather than none, and`:51` zero accidents rather than one. No balance values or tests were changed to mask these three assertions. An existing no-office town also matches original full state at ten functional checkpoints.

Browser verification uses a frozen source snapshot and fresh isolated browser towns at1440 and390 pixels, never an active user save. No CPU/FPS profiling, timing benchmarks or performance comparisons were run.
