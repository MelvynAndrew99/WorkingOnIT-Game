# Land progression

## Latest direction: finite map and clickable land purchases (2026-09-13)

Implemented locally: 64×48 envelope (saved, so later updates can add land), 16×16 plots in a 4×3 grid, For sale signs on adjacent locked plots, two free unlocks then provisional cash. The H tutorial starts with four plots open (32×32) so the teaching roads fit; an empty factory town starts with one plot. The north/south/east/west expansion dialog is gone. Existing towns keep their land; unused permits become free unlocks. [Discussion](BOUNDED-MAP.md).

September 9, 2026. User requested two free tutorial expansions followed by the mayor requiring missions/levels for more land, plus physically correct direction-button positions. Implemented locally; no publication.

## Rules

- Each town receives two introductory free plot unlocks. Later plots spend a provisional cash price shown on the For sale sign. Existing map geometry is never removed, moved or charged retroactively. Unused earned permits migrate to free unlocks.
- Complete the land growth mission by serving6 distinct households through real shopping visits while they retain shop access. This awards Level1 and one permit automatically. Later targets9,12,... each award one more permit. Targets are lead-selected balance defaults. Ordinary mission cash claims are independent of these receipts.
- Earlier success counts, and later road edits do not revoke a previously earned permit. A repeated visit, reload or cash claim cannot renew it. Missing historical metadata grants two introductory strips; malformed metadata preserves the city but does not refill free permits.
- Direction preview and actual expansion preserve stable coordinates. North appears above, West left, East right and South below. Invalid/max-size attempts never spend permits.
- New/active H tutorials add the expansion lesson after junction controls. Two successful expansions are required before the outside-city invitation. Completed historical tutorials stay complete. Skip releases tutorial gates while retaining the two-free-plus-earned-permits economy.
- The manager boasts about free land in the expansion dialog, then delivers a one-time mayor funding explanation after the second successful strip. The speech pauses traffic; dismissal acknowledges the explanation, not a mission reward. It tells players what to do for their next permit and credits permits already earned.

## Verification

Land/model tests for plot ownership, two free unlocks, cash charges, H tutorial gating, Skip, and save migration pass. on-map-unlock.mjs passes at 320×640, 390×900 and 1440×900: no compass dialog, two real For sale sign taps, mayor cash briefing after the second plot. Screenshots sign-*, on-map-* and mayor-cash-* are actual UI.

Codex lead integrated model/progression and mission rewards with a bounded Codex UI agent and independent test agent. No Claude/Grok implementation is claimed for this slice. Grok authored the earlier road-manager popup only. Physical-device comfort and long-term growth pacing remain untested.
