# Level 14 — Build an apartment complex

Replaces the second-neighborhood-entrance lesson at stable ID `another-front-door` with revision 3. Level 19 retains the second entrance and emergency diversion lesson. The 25-level order and sequential award locks are unchanged.

The player starts with an inherited shop street, open building space and $2,600. The checklist teaches:

1. Place two nearby 4×4 apartment blocks, $800 each and four residents each.
2. Inspect a block → Join complex → select the other → review the preview → Build lanes & join.
3. Connect the private lanes to the shop street using Road.
4. Press Play and observe a completed shopping round trip from each of two blocks in the same connected complex.

Joining uses the ordinary automatic private-lane planner, payment and shared access rules. The challenge now includes the existing complex inspector and permits its join command only when apartment construction is supplied. The legacy house-only flow diagnostic accepts an empty starting neighborhood and is hidden from this block-based lesson. No special traffic physics, free lanes, mandatory building coordinates, upgrade requirement or failure countdown is added. Two reference layouts at x=2/8 and x=5/11, y=2, cost $1,840 including seven private lane tiles and a five-tile public approach, leaving $760. Players can choose other legal arrangements.

The receipt is per apartment block, not per resident: this beginner lesson requires one actual shopping return from each of two joined blocks. New shopping journeys must start after a connected managed complex is observed. A placed block, unjoined shopping trips, membership alone, disconnected lanes or mere route existence cannot earn the award. Joined blocks must still have usable routes to the shop and home at completion. Receipts, map bounds, membership, payment and progress survive reload.

Old revision 2 attempts remain parseable and are archived when selected; existing permanent awards are retained. No active player storage is edited by development or verification.

## Verification

- `apartmentChallenge.test.ts`: both layouts, mid-journey reload, real completion, idle/disconnected/unjoined rejection, malformed receipts and false completed-save rejection.
- `campaignLessons.test.ts`: all 17 tests pass, including all beginner reference/alternate solutions and exact continuous/reload comparisons.
- `jamCampaign.test.ts`, `campaignIdle.test.ts`, `challengeLessons.test.ts`, `cityPrivateLanes.test.ts`: pass, including all 25 untouched maps and preserved legacy Level 14 completion parsing.
- Production typecheck/build passes.
- `verify-browser.mjs` uses isolated storage, with prerequisite awards only in the test profile, and checks real map clicks for placement, joining and road connection at 1440 and 390 pixels, then reload and actual simulated completion. Both widths pass with no page errors; the narrow run also verifies legacy-attempt archival and permanent award preservation. Completion is advanced with ordinary deterministic model ticks after pressing Play. Results and screenshots are recorded in `evidence/`. Browser checks use a frozen source snapshot to avoid concurrent radio edits interrupting the mission.

No publication, performance testing or artwork changes.
