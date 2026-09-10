**Yes — duration/recovery is a real first distinction** if it changes *when* a blocked tile is survivable, not how vehicles fake through it. Both modes keep the same physics: occupied-tile safety, workzones block **all** vehicles (including outbound responders), real detours, access previews, genuine completion, pause freezes sim **and** work. No second engine.

## First contract (shared engine, two presets)

**Always true**
- Work occupies tiles; no clipping, teleports, auto-city-build, restored fatalities, crash quotas, new upkeep, or paid skips.
- Only **road-upgrade** jobs get timers. Other construction stays instant until separately authorized.
- Preview is a commit gate: show blocked tiles, remaining access, and whether any station/store/park loses a path.
- **No reset-required stranding:** refuse or force a recoverable plan if the order would leave zero path to a unique station, unique road, or the whole map with no detour.
- Mode is **per town**, pause-menu, no city wipe, no tutorial restart. Default **Arcade** on fresh play. Existing cities unchanged until the player places optional roadworks. Geometry/receipts on old saves stay as-is.

**Scheduling vs migration**
- Changing mode is **immediate for future quotes** (next order uses the new duration/assistance).
- **Active jobs keep the quoted duration and restoration rules.** No timer reset, no skip, no mid-job rule swap.

**Arcade (default)**  
Shorter work + restoration; explicit assistance (why this blocks, which Divert/road still serves the station, restore-complete cue). Fun first.

**Realistic**  
Same rules, longer work + restoration, thinner assistance (preview still honest, fewer “do this next” cues). Demanding planning, **not** certified training.

**Provisional ratios (unselected):** Arcade work `1.0`, restore `0.75`; Realistic work `2.5`, restore `2.0`. Tune only after the existing-tools prototype is playable. Do not ship numbers as balance gospel.

## Exact pause copy

**Title:** Simulation preference  

**Arcade (recommended for new towns)**  
Shorter road upgrades and restoration. Work still blocks every vehicle, including emergency crews. You get clear access warnings and detour hints. Pause freezes the city and the work clock.

**Realistic**  
Same roads and the same blocks — longer upgrades and restoration, less hand-holding. Plan detours before you dig. This is a harder puzzle, not professional training.

**Note:** Changing this applies to **new** roadwork orders. Jobs already underway keep their quoted time and restore rules. Your city is not reset.

**Disabled until roadworks exist:** “Available when you start a road upgrade.”

## Idle-wait and hard recoveries

Timers are idle waits if the player can AFK with no routing choice. Make the clock **pressure on a blocked graph**: preview + Divert must be the play, not a progress bar. Arcade assistance names the detour; Realistic expects the player to place it.

Hardest cases (sole station, sole road, full-map work, zero funds): **preview refuse** if no remaining path to the unique station or if the map would be cut with no detour. Zero funds: do not start a job the player cannot restore; never auto-complete or skip. Full-map: cap concurrent occupied tiles or require a live corridor. Frustration is accepted; unrecoverable save-wipe is not.

## Ship mode UI only with functional roadworks

An empty Arcade/Realistic toggle is a fake. Mode UI ships in the same slice as: occupy tiles, block all vehicles, preview, Divert detours, pause-freeze, persist quoted jobs.

## Implementation order (existing-tools first)

1. **Prototype with current tools:** Divert + junction controls + preview of a *proposed* occupied zone (no new geometry). Prove responders are blocked and detours work.  
2. **Functional upgrade occupancy** on existing roads (block, complete, restore, receipts). Still no extra lanes.  
3. **Timers on road upgrades only** + pause freeze + quoted-duration lock.  
4. **Arcade/Realistic** as duration + assistance presets on that engine; persist per town.  
5. **Later (not this contract):** real extra lanes, merges, junction geometry, saved vehicle continuity. Responder pass-through, other construction timers, and any extra sim knobs stay **future**.

No publication. One engine; two scheduling skins.
