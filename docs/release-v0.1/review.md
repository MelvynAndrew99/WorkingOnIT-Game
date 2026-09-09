# Pre-release review: Working ON IT! v0.1

September 9, 2026. User requested independent installed Grok/Claude input before uploading. No upload was performed by this review.

## Specialist status

- Claude was asked through its installed client and returned: “You've hit your session limit · resets 2pm (America/New_York)”. No Claude review or sign-off is available.
- Grok completed a read-only model/economy review: no confirmed standalone blocker in its inspected scope. Its report is preserved in [grok-review.txt](grok-review.txt). It requests tutorial acknowledgement visibility and a real prior-public-version save migration check before upload. It did not inspect UI or run checks.
- Codex owns the checks and changes below. Do not present these as specialist consensus.

## Lead checks and corrections

- 171/171 model tests pass on the reviewed candidate.
- Production build/TypeScript pass; the existing large-bundle advisory remains.
- Updated guidance browser checks pass320/390/1440 wide and forcedportrait: actual Home/Store/Road placement, category/tool targeting, live free prices, dismissal, dialogs, reduced motion and skip. The320 case now also exercises the actual Settings checkbox and retains the Home objective action with tips disabled.
- Production assets served via Vite preview pass actual boot, Home placement and persisted reload at390/1440 without development-source imports or page errors.
- Fixed: Show gameplay control tips previously only affected a CSS selector for an old paragraph. It now hides optional callouts/highlights without removing the objective's construction actions. Target derivation and presentation suppression are separate.
- Fixed: Settings now says demolition refunds what was paid, and free construction refunds$0.
- Approved thumbnail remains512×512 JPG; existing game ID and save namespace remain intact.

## Remaining release choices / improvements

- Grok's highest-impact concern is save compatibility. Existing legacy migration fixtures pass, and the candidate reloads its own saves, but neither establishes compatibility with an actual prior public save mid-response. Verify that before uploading; preserve the original save. Invalid saved city data currently falls back to a new town when neither host nor local copy parses. This is an existing recovery risk, not a reproduced regression in this review.
- Tutorial acknowledgement controls exist: Understood is the driver's primary action; Keep my safe crossing is in the current objective's expanded details. A first-session usability check should confirm players find that secondary action. Source presence is not a physical-device usability result.
- Grok's suggested Clinic/Hospital dock mismatch is not reproduced: BuildPalette already displays Clinic. Some model messages still say Hospital. Its first-tool concern is also covered: the new guidance derives Home/Store/Road from real construction, not the static lesson tool. Its assumption that existing music plays is incorrect; see the audio finding below.
- Grok also found mission spending totals use catalog prices for free construction. Treat that as a reporting correction, not a demonstrated loss of player funds. Historical tutorial documents retain superseded Practice descriptions; update those when consolidating documentation.

- Make the outside-city transition easier to discover. Currently the connection lives under Jobs → City link & guide; the completed tutorial does not itself present a direct connection invitation. Source evidence: MissionBoard.tsx, TutorialPanel.tsx and ObjectiveBar.tsx. A visible invitation using the existing explicit connection picker would better satisfy the accepted tutorial-to-main-game direction; this finding is not a demand to add a new traffic system.
- Audio is currently silent: src/main.tsx does not call initMusic. The legacy track/module exists, but no new selected recording is integrated. If v0.1 should have audio, install the user's selected gameplay music and controls before publishing; a full effects catalog need not block an explicitly silent alpha. Do not enable the historical theme by assumption.
- Run a host/real-phone check after upload and before declaring the candidate ready publicly. Local production/browser checks do not establish RUN host pause/resume, host-save synchronization or physical-device comfort.
- New driver styles, ongoing crisis costs, manager inactivity advice and mayor Help/Later additions can remain backlog work. Do not expand this review into implementing the entire roadmap.

## RUN version naming

Read-only `rundot game list-tags` confirms the existing Public tag now points to1.5.0. This supersedes prior notes that1.5.0 was still in review. The installed `rundot deploy --help` exposes Major/Minor/Patch increments, not an arbitrary version argument. Keep this game's identity; use “Working ON IT! v0.1” as the milestone/release-notes label while retaining RUN's technical sequence. Recheck current tags when actually deploying. Draft release notes are in [changelog.md](changelog.md).

No private share token is included in this report or the draft changelog.
