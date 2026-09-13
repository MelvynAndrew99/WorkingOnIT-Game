# Bounded town and on-map land purchases

Design discussion, September 12, 2026. Runtime implemented September 13, 2026: 64×48 envelope, 16×16 plots, on-map For sale signs, cash after two free unlocks. Envelope size is saved so later updates can add land. Existing towns keep their construction. Prices remain provisional.

**Later timing clarification:** economy balancing is deferred until after the jam and tracked in [the backlog](../BACKLOG.md). Land prices/progression belong in that pass. The finite-map and on-map interaction discussion can continue without completing economic tuning; any interim price remains provisional. The proposed map size is still unselected.

## User direction

The sandbox should have a proper finite map size and stop expanding at that boundary. The boundary can be extended in a later update if needed. Replace the expansion menu with clickable map sprites that spend money to open land. Favor visible spatial interactions over menus because the user finds them less confusing. Discuss the required size before implementation.

This changes the intended future interaction and payment model: current expansion uses two free introductory strips, then earned permits with no cash charge. Do not silently add a cash charge on top of permits. Tutorial/free-land treatment and conversion of existing earned permits must be settled when implementing; preserve existing land and earned progress.

## Current source-grounded reference

- `src/game/cityMap.ts`: initial map 16×14; expansion extends a selected edge by up to eight tiles; each dimension is capped at 64.
- The supplied roundabout town is 64×44 (2,816 tiles), with 394 road tiles, 46 homes, four stores, five parks and its emergency/transit buildings. This is evidence of the user's current town scale, not proof of maximum playable density.
- The outside-city connection side is fixed and cannot expand. Preserve that access rule and the player's saved coordinates.
- Apartments and busy-store lessons will add concentrated demand, so land area alone does not determine traffic volume or performance. No performance measurement is requested here.

## Lead proposal: 64×48 final boundary

Use **64×48 tiles** (3,072 tiles) as the first fixed sandbox envelope. That is 256 more tiles than the supplied 64×44 town and 75% of the current 64×64 maximum area. It is a starting design proposal, not a user-selected size or a validated capacity/performance claim. It gives a finite land budget for wider roads, alternate entrances, services and transit while making reuse of existing land relevant. Larger updates can add land later deliberately.

For **new towns**, a possible layout is four columns by three rows of **16×16 land plots**: 12 plots total, one initially open and up to 11 purchases. This would change the new-town starter from 16×14 to 16×16, so it needs an intentional tutorial/layout check. Plot size, starting plot and price are proposals. Keep the initial outside-facing plot on the chosen external boundary; additional unlocked plots must connect to already owned land.

Existing towns are not cropped, relocated or charged again. A town already larger than the proposed envelope keeps its land. Exact legacy envelope/plot ownership migration remains design work; a dimension cap does not choose where a town's fixed north/west edges belong.

## Proposed map interaction

- Show locked land inside the final boundary as subdued terrain with clear plot borders.
- Put a small **For sale · $price** sprite/sign on each purchasable adjacent plot. The visible border establishes exactly what that price opens.
- Tap/click the sign to buy that plot and open its land. Panning across it must not purchase it; normal pointer-release/drag discrimination applies.
- An unaffordable plot still shows its price but does not spend money or open. Deeper plots become purchasable as connected land opens.
- The final outer border is visually distinct and has no purchase sign beyond it. Owning all available plots ends expansion for this version; the sandbox continues.

Prefer existing Kenney artwork/compositions before commissioning missing sign art. Prices, any price scaling, tutorial/free purchase handling and permit migration remain unselected. Do not introduce another purchase dialog by default; the on-map border and visible price supply the context.

## Implementation implications, deferred

The current save describes one buildable rectangle. Independently buying rectangular plots can make owned land nonrectangular, so this proposal requires saved land ownership separate from the fixed outer map bounds; changing only the menu would be insufficient. Construction, camera, outside access, tutorial guidance and saved expansion rewards must agree on ownership. Merely opening the whole bounding rectangle around a purchased plot would grant unpurchased land.

Keep challenge fixtures independently sized; a proposed sandbox boundary does not require every mission to use the full map. Apartment/store/bus gameplay remains the preceding implementation discussion, not something this map note implements.
