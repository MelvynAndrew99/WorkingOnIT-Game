# Guided H-road tutorial

September 9, 2026. Implemented locally after the user rejected the earlier popup-only delivery. No upload performed.

## Player sequence

1. Fresh tutorial town has43 inherited road tiles forming an H on24×20 land,900 funds, zero buildings. Place the first Home on the upper-left road; its yellow lot and Show lesson area explain where.
2. Place a Store on the lower-right road, keeping its entrance connected.
3. Run a real shopping visit and earn income.
4. Add two Homes and a Park in player-chosen locations; observe a leisure visit.
5. A scripted impaired-driver crash introduces the emergency. The user explicitly approved this cause and forced event. A driver actually at the planned lower junction becomes a crashed trip with an injury; no random distant car is moved there. One persisted incident, not a naturally generated two-car conflict.
6. Roads, optional Divert and all services unlock at the crash. Traffic keeps running so queues can form. Highlighted empty tiles suggest connecting the H; any usable bypass qualifies. The manager waits30 simulated seconds without construction progress before his once-only speech. Opening or closing it preserves the player's pause state.
7. The player places a Clinic with a real road entrance. EMS uses real routing, traffic occupancy, scene work and rescue accounting. The training deadline is held until the bypass lesson is complete and the Clinic has road access, then90 seconds starts. EMS completes scene work and clears the crash.
8. Stops/Lights unlock. Protect the marked junction against ordinary conflicts. This is not a claim that traffic controls prevent impaired driving.
9. Tap two For sale signs on the map. The first two plots are free; the manager then explains that further plots cost money. Completion offers City link; player explicitly connects to a boundary road when ready. See [land progression](../land-progression/README.md).

New tutorial stages gate construction in the model as well as disabled tool/mission buttons. Only the first Home and Store use indicated road regions. After that pair, homes, stores and parks use ordinary placement rules with no prescribed growth lots. Buildings can be removed/repositioned while starter roads remain protected until the bypass lesson. Orientation still changes logical entrances, not artwork. Skip releases gates and preserves construction. Existing saved cities retain their original geometry/tutorial; Continue does not replace them with the H. New game uses the normal existing-town replacement confirmation.

The inherited roads have paid0 and cannot be sold for free cash. Shopping funds growth; a stalled H growth grant includes two homes, while legacy park grants still cover only park/roads. Finite waivers retain actual-paid refunds. No new spending drain, level-deferral feature or player-owned building is silently created.

## Verification and ownership

Codex lead implemented scenario/model, persistence and renderer markers, integrated a bounded Codex UI agent's tool/objective changes and independent Codex simulation tests. Grok authored the previously delivered manager popup; Claude and Grok did not author this tutorial overhaul.

Full model suite190/190 and production build pass. Nine independent starter regressions cover initial roads/no houses, placement/tool locks, Skip, saved progression, alternate home spacing, one-time impaired-driver cause, route/diversion requirements, all three real crew contributions, actual rescue, controls at the relevant junction and completion reload. A full arc uses900 starting funds, earned shopping and finite waivers without a test cash top-up; one rescue, zero fatalities.

browser-check.mjs verifies actual new-game boot, roads-only initial state, locked road controls, pointer placement of Home and Store via the highlighted/focused lots, save reload and Skip at320×640,390×900 and1440×900. A390 incident fixture produced through the real model verifies the automatically opened manager briefing, Road locator after dismissal, and no repeat after reload. Screenshots initial-*, placed-* and crash-briefing-390.png show the actual UI. Additional independent simulation tests establish the later arc; these are not a claim of an end-to-end manual physical-phone playtest.

Physical-device comfort and player-tested pacing remain unverified. Tutorial geometry, stages, timing and costs are implementation defaults. Any later-level “Not yet / I have a plan” action remains separate and cannot defer tutorial objectives.

Latest placement correction: new games start with no build tool selected. The Home button is highlighted, and the player selects it from the menu before placing. Growth guidance has no fixed map target. Regression coverage includes freely positioned upper homes/lower parks, refunding an unconnected building, and reaching the real scripted incident with that alternate layout.

Crash pacing correction: Divert is optional, including for towns saved at the retired diversion step. A paused objective visibly explains that trips and the free-construction timer are stopped, with Run traffic outside the collapsed details. Existing finite assistance remains unchanged. The30-second manager delay is provisional tuning.

Latest browser validation passes at320/390/1440. The390 real incident fixture verifies no immediate speech or auto-pause, all three enabled service tools, delayed advice while traffic stays running, and no repeat on reload. crash-before-advice-390.png shows the unobscured incident and unlocked services. Show lesson area brings the suggested bypass into view. The narrow paused panel retains125px of map height at320×640, with a directly usable Run traffic control.

### Shopping demand during the tutorial crash (2026-09-09)

User correction: after completing their existing journey home, tutorial households should head for shopping rather than substituting an existing park during the crash. Implemented for the active H incident in stages5–7: preserve existing trips, restrict new departures to shopping, and retain unmet shopping at home if no route/capacity exists. A valid bypass releases those departures. Skip, cleared incidents and ordinary play restore normal shopping/leisure selection. Existing demand and incident state provide save continuity without a new save field. Verification:188/188 model tests, including active-trip preservation, blocked shop/reachable park, reload, bypass recovery and Skip.

Latest single-responder update: tutorial injury incidents require only EMS. A saved teaching override retains the historical incident roster for validating any already-dispatched crews; dispatch, objective, clearance and scene badge all use the effective EMS-only requirement. Old active H incidents adopt this on their next simulation tick; their existing crew journeys and construction are preserved. The finite rescue grant now covers a Clinic and roads for new grants.189/189 tests, production build and320/390/1440 browser checks pass. Scene badge uses approved service vehicle artwork, with Build Clinic / en route / waiting / on scene status. Ordinary main-game severity rules remain unchanged pending docs/TRAFFIC-RULES.md design work.

## Both-loop routing correction (2026-09-09)

The earlier bypass check only verified the first Home, so a right-side connection incorrectly advanced while lower-left households were cut off. The lesson now requires every current Home to reach the initial Store and return. Highlight both ends of the H to suggest two loops; if an end lot is occupied, suggest a nearby outer strip when it fits. Accept other working layouts. Old stage7 towns keep progress and still receive route suggestions/access alerts.

Show Divert selects/highlights the actual tool and focuses the optional tile before the wreck; it is not a completion requirement. Show lesson area returns to Road and frames both ends. Road access alerts identify disconnected homes, missing entrance roads, absent stores or blocked return access; clicking the header warning focuses an affected Home, with orange lot outlines and markers on the map. Parking capacity and ordinary congestion are not labeled missing routes. The first Home/Store lesson already teaches the absent-store case and suppresses redundant header warnings.

No crash auto-pauses the city, including legacy guided saves. User pause remains explicit. Manager advice retains the30-second simulated inactivity delay.190/190 model tests pass, including only-right-side failure, both-loop recovery, optional closure preserving all household routes, and actual shopping visits by all non-crashed households while the wreck remains. Browser checks cover optional Divert selection, both-loop focus and phone/desktop gameplay.

## Blocked journeys must produce road queues (2026-09-09 user correction)

Cars must leave home and advance toward their intended destination when an existing road route is temporarily blocked by a crash or diversion. The previous hold-at-home shopping workaround concealed traffic demand and is superseded. Prefer a usable route; if none exists, plan over existing roads through the temporary obstruction, but physical movement still stops before it. Preserve destination, visitor reservation, safe occupancy and saved journey identity. Missing road connections or full visitor reservations can still prevent a departure.

Keep a scene approach clear for emergency work: a civilian approaching a wreck stops before occupying the required working area. Queue followers retain their lane instead of repeatedly reversing toward a distant obstruction with no alternate route. Real alternate routes release the same queued trips. This behavior applies to civilian journeys generally, including the H tutorial; emergency response retains its dedicated rules.191/191 tests and production build pass, covering new departures, visible forward progress, no crossing the wreck, stable queue, save/reload, same-trip bypass recovery, diversion approach and real legacy multi-service clearance.
