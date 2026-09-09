# Land progression

September 9, 2026. User requested two free tutorial expansions followed by the mayor requiring missions/levels for more land, plus physically correct direction-button positions. Implemented locally; no publication.

## Rules

- Each town receives two introductory free strips. Later expansion consumes one earned permit and no money. Existing map geometry is never removed, moved or charged retroactively.
- Complete the land growth mission by serving6 distinct households through real shopping visits while they retain shop access. This awards Level1 and one permit automatically. Later targets9,12,... each award one more permit. Targets are lead-selected balance defaults. Ordinary mission cash claims are independent of these receipts.
- Earlier success counts, and later road edits do not revoke a previously earned permit. A repeated visit, reload or cash claim cannot renew it. Missing historical metadata grants two introductory strips; malformed metadata preserves the city but does not refill free permits.
- Direction preview and actual expansion preserve stable coordinates. North appears above, West left, East right and South below. Invalid/max-size attempts never spend permits.
- New/active H tutorials add the expansion lesson after junction controls. Two successful expansions are required before the outside-city invitation. Completed historical tutorials stay complete. Skip releases tutorial gates while retaining the two-free-plus-earned-permits economy.
- The manager boasts about free land in the expansion dialog, then delivers a one-time mayor funding explanation after the second successful strip. The speech pauses traffic; dismissal acknowledges the explanation, not a mission reward. It tells players what to do for their next permit and credits permits already earned.

## Verification

Independent full model suite185/185 passes: actual6/9-household earned visits, no renewal on reload/repeat/cash claim, preserved earned permits through closures, legacy/malformed metadata, invalid directions/map boundaries, Skip, and complete H tutorial arcs including two real expansions using both rich routing fixtures and the actual900 starting funds/waivers.

browser-check.mjs passes at320×640,390×900 and1440×900. It checks compass bounding boxes and actual West/East coordinates, two free strips, preserved town/funds, tutorial completion, mayor speech/acknowledgement, third-strip mission gate and reload. Screenshots compass-* and mayor-* show actual UI. An initial shared-dialog close-event race was caught and fixed by giving the mayor speech its own native dialog; the passing rerun verifies acknowledgement belongs only to that speech. Build passes with the existing bundle-size advisory.

Codex lead integrated model/progression and mission rewards with a bounded Codex UI agent and independent test agent. No Claude/Grok implementation is claimed for this slice. Grok authored the earlier road-manager popup only. Physical-device comfort and long-term growth pacing remain untested.
