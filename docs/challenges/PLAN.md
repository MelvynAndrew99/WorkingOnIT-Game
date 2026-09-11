# Challenges: Chess.com-style traffic puzzles

## First 25 missions: latest direction for the next discussion

The first ten missions will focus on placing roads, connecting homes to stores and reducing commute time across different intersection layouts. This supersedes the planned early crash/control lesson order, but does not change published maps or saved progress yet. [Mission requirements: Levels 1–25](MISSIONS.md) records the confirmed direction and a proposed sequence expanding into congestion, destination capacity, crashes, emergency access and diversion. Individual maps, targets, budgets, star criteria and later-level ordering await discussion/playtesting. The user reports 46 unique players and hopes short challenges encourage return visits; retention is a hypothesis, not a measured result. Documentation only in this pass; no implementation, publication or agent discussion scheduled automatically.


## Latest implemented route and opening sequence

Latest direction supersedes the earlier three-level order/return-only opening: numbered road-map selection, victory Retry/Next, Level 1 actual store arrival, Level 2 vertically spaced homes returning within a provisional 45 simulated seconds, Level 3 missing roads/no control with real collision avoidance. Original Room to move is a fourth bonus; old stars and neighborhood layouts are preserved. Fixed budgets, separate sandbox, main-menu exit and future learn/earn/sandbox unlock direction remain.262 model tests, build and desktop/narrow verification pass locally; observed fun remains unverified. See [delivery](IMPLEMENTED.md). No publication.


## Opening order and income correction

Implemented locally: one-home road connection first, three-home road connection second, Room to move third. All require real shopping return journeys; beginner tools are Road/Clear. Challenge budgets do not receive support or visit income. Existing FLOW progress migrates without loss; runs/stars are per level. Gold main-menu entry and direct in-level Main menu exit are delivered. See [current implementation](IMPLEMENTED.md). Earlier five-level order, timed A-to-B/inventory and scoring proposals below remain future work.


## Confirmed relationship to the sandbox (September 10, 2026, corrected)

The sandbox is the main game, including the story and monetization direction in DESIGN.md. Challenges develop alongside it: small predetermined objective-based levels teach pattern recognition and provide tests for sandbox lessons, like Chess.com puzzles. They can provide bounded jam content; this is not a challenges-first pivot or a delay of sandbox development. User now requests a main-menu entry and the existing FLOW puzzle with a clear objective. Shared simulation, separate saves and disposable retries remain essential. Later star thresholds, level count and unlocks are open. No publication is authorized.


Status: the user requested and Codex implemented the main-menu entry and first FLOW challenge locally on September 10. See [delivery and verification](IMPLEMENTED.md). A-to-B, inventory, broader level authoring and the proposed set below remain queued. Whether it is fun still needs player observation.

## User direction

- Add a missions/puzzle section inspired by Chess.com puzzles, which teach placement, defense, offense and tactics gradually. Puzzles teach the game's rules one step at a time and grow harder while following the same rules as the sandbox. The sandbox remains the place to experiment freely with what was learned.
- The first puzzle type: **get a car from A to B in this city in under 1 minute, with limited supplies.**
- Puzzle maps can be exported and simulated in advance. Generate puzzles that ask the player to **add to or update an existing map**, as real civil engineers do daily, rather than building on empty land.
- The user said "missions section". The game already has a mission card for growth objectives in the player's city, so this plan uses **Challenges** as a working label to avoid confusing the two. Final naming is open.

## Why it fits (lead assessment, unverified)

- Gives the game a finite, beatable arc while the sandbox stays open-ended. Completing the set is a candidate trigger for the finale, credits and the radio unlock.
- Bounded, handcrafted content suits the time available better than tuning open-ended growth.
- One puzzle is a complete short session, and "can you solve this with 3 roads?" suits YouTube Shorts.

## Proposed contract

These are lead proposals to evaluate during implementation, not user-selected rules.

1. **Same simulation.** Challenges run the real `cityModel.ts` / `cityTraffic.ts` / `cityIncidents.ts` rules. No puzzle-only physics. What a player learns must transfer to the sandbox.
2. **Existing map as the starting point.** A challenge starts from a city snapshot validated by `parseCity`. Existing construction can be marked fixed (cannot be removed) or editable per challenge, so "update an existing map" includes limited removals where the puzzle intends it.
3. **Limited supplies.** Each challenge grants an inventory (for example 4 roads, 1 stop) instead of, or alongside, a budget. Prices and the city economy do not apply unless the challenge says so.
4. **Timed goal in simulated time.** "Under 1 minute" counts simulated seconds from Go. Pause freezes it. The goal is a specific journey arriving, not aggregate throughput.
5. **Plan, then run.** The player places pieces, presses Go and watches. Reset/retry is expected here, unlike the sandbox city, which must never require a reset.
6. **Any valid solution counts.** Chess puzzles have one answer, but this game values creative alternatives. Proposed scoring is golf-style par: solve it any way, earn stars for fewer pieces or a faster arrival.
7. **Reproducible.** The same placement must produce the same result every run and at any frame rate. Use a fixed seed per challenge for any randomness, including future driver styles.
8. **Separate progress.** Challenge progress, stars and completion receipts persist separately from the city save namespace (`city-workshop:city:v1`). Playing a challenge never modifies the player's town.
9. **Levels as data.** One data file per challenge: id, title, map snapshot, fixed/editable construction, inventory, goal, time limit, par and seed. Adding a challenge should not need new code. This enables later packs, a daily puzzle and possibly a level editor.

## Pre-simulation (the user's export idea)

The debugging workflow already loads a real city with `parseCity` and runs it headlessly with `stepCity` (see [SAVED-CITY-DEBUGGING.md](../SAVED-CITY-DEBUGGING.md)); `src/game/fixtures/police-junction-jam.json` came from a real player save. Reuse that path to author and verify challenges in tests:

- The untouched map must **fail** the goal, so the puzzle actually requires a change.
- At least one reference solution within the inventory must **pass**. Record its arrival time and piece count to set par.
- Results must match across repeated runs and different step sizes.
- Candidate generation: take exported maps, remove or block a connection, run the simulation, and keep the cases where a small inventory can restore the journey within the time limit. Every generated challenge still needs a human check that its cause and fix are understandable.

## Proposed first set (one new idea each)

| # | Lesson | Setup |
|---|---|---|
| 1 | Connect | Car at A, store at B, a gap in the road; 4 roads; arrive within 60 s |
| 2 | Route around | Blocked tile between A and B; build a way around it |
| 3 | Right of way | Two cars cross paths; 1 stop sign; both arrive safely |
| 4 | Emergency access | Ambulance must reach a crash before the deadline |
| 5 | Divert | Only usable route must be built while traffic is diverted |

Exact maps, inventories and time limits are open and need playtesting.

## Open questions

- How the A-to-B car is represented: a specific real household trip, or a challenge-defined journey injected into the same movement system.
- Whether challenges replace, precede or sit alongside the H-road tutorial. The tutorial and its Skip behavior remain unchanged until decided.
- The first playable challenge now reuses FLOW measurement in a separate scene/save session; sandbox civic recognition stays unchanged. Further level types remain to implement.
- Menu entry point, star thresholds and whether The Man introduces challenges as his "assignments".
