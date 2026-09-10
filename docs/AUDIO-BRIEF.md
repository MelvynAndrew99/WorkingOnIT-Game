# Working ON IT! — Suno prompts

The user generates music through their Suno subscription. The accepted ending-credits direction is **“What a Jam!”**: joyful soul-funk pop with light gospel touches, **116 BPM**, warm adult male lead, spirited backing responses, and affectionate civic comedy. The complete user-supplied lyrics and style are preserved in [WHAT-A-JAM.md](WHAT-A-JAM.md). This is an accepted creative brief, not an installed or selected recording.

The vocal song is the manager's personal victory speech. Keep the specified spoken cues and comic gaps; the main sections are sung. Match the eight-bar instrumental intro and outro for a possible loop edit, with the spoken ending before the instrumental tail. Audition the actual output rather than assuming generation will reproduce that structure.

The original **96 BPM** direction is confirmed for normal gameplay background music. The user has two background songs intended for the game; no files or track titles accompanied this correction. The prompts below retain the intended planning/building and busier-commute palette, without assuming which supplied track will fill which role. Gameplay music need not match the 116 BPM credits song. A later radio station perk may make What a Jam! and other radio-style songs available during play; that feature and its unlock rules remain future design.

## Suno skill

User-provided skill: `T:\Business\songwriter\skills\suno.txt`, read via `/mnt/t/Business/songwriter/skills/suno.txt`. For future generated prompts, use a style paragraph and customized bracketed, non-lyrical composition instructions, keeping the entire prompt under 1000 characters. Adapt its structural template to warm, restrained city-game music; do not import corruption, identity conflict or hybrid orchestral-electronic requirements from its example. These prompt-writing rules do not authorize rewriting the supplied What a Jam! lyrics or require regenerating the user's two tracks.

## Planning / building

Instrumental music for a playful city traffic optimization game. Warm electric piano, soft rounded bass, light brushed drums, muted guitar plucks, and occasional wooden percussion. A quietly confident municipal workday: curious, optimistic, gently comic, satisfying to build roads to. Steady 96 BPM, restrained dynamics, sparse melody, small variations that reward long listening. No vocals, no sirens, no car horns, no cinematic climax. Consistent groove with a simple opening and ending suitable for editing into a seamless gameplay loop. Leave room for interface sounds.

## Busy commute

Instrumental companion to a calm city-building groove, 96 BPM. Warm electric piano, rounded bass, dry ticking percussion, muted guitar, and a few playful syncopated mallet notes. A busy junction gradually finding its rhythm: energetic and lightly mischievous, never frantic or threatening. Add motion through rhythm rather than loudness. Sparse memorable motif, restrained dynamics, no vocals, no sirens, no horns, no dramatic drops. Consistent groove and a clean ending suitable for loop editing. Leave room for short game feedback sounds.

## Audition and integration

Audition the two supplied background songs when files arrive. Verify duration, tempo, loudness and usable loop or ending points. Matching 96 BPM alone does not guarantee aligned phrases or seamless transitions; playback order, looping and any adaptive switching remain to choose after listening.

Retain selected masters in `src/assets/source/audio/`; add runtime exports only when selected. Confirm the actual loop seam and phone-speaker balance. Keep music optional with a mute setting, respect browser gesture playback and RUN pause/resume, and avoid switching tracks on every brief queue fluctuation. These integration steps are future work; no new audio is installed by this brief.

## First supplied background recording installed

User supplied `Work On It Main Theme.mp3`, described as tranquil city background music and authorized renaming. Installed unchanged as `public/audio/music/tranquil-city.mp3` (89.92 seconds reported by browser). This supersedes the no-audio-installed status for this recording only. The What a Jam! credits song and additional backgrounds remain separate.

Gameplay-only repeat is now active through src/audio/music.ts with30% default volume, saved mute/volume under Menu → Settings, browser gesture retry, menu/pause/hidden-page suppression and RUN sleep/awake handling. Actual MP3 playback, end-to-start repeat, pause/resume and preference reload verified in an isolated browser; production build passed. Loop restart is verified, not a claim of a musically seamless seam or measured96BPM. No effects supplied or integrated by this change.

User subsequently confirmed the supplied recording is **96 BPM**. Its approximately90-second arrangement intentionally includes an outro, then restarts from the beginning. Preserve that full-file behavior; seamless-loop trimming or crossfading is not requested. The user has REAPER available for future audio editing if needed.

## Firetruck siren (2026-09-09)

User supplied the approximately15-second Splice clip at `public/audio/vehicles/FireTruckSiren_S08ER.232.mp3` and authorized firetruck integration. The source remains unchanged. `src/audio/vehicles.ts` plays a single shared full-file loop at25% default volume while at least one firetruck is responding, including traffic/route waiting. Patrols, cancelled responses, scene work and return journeys are silent. The scene refreshes response eligibility after simulation steps and clears it on destruction; audio does not affect dispatch or traffic rules.

Menu → Settings now has independent saved Sound effects and Effects volume controls (`working-on-it:effects`). Menu, pause, hidden page and RUN sleep suppress playback. Browser autoplay denial waits for a new gesture before retrying. Future supplied effects can use these preferences; no additional clips are selected yet.

Verification: production build and diff whitespace check pass. Chromium decoded14.928 seconds and verified actual playback, full-file repeat, single audio instance, response-end stop/rewind, menu/pause/sleep/visibility suppression, mute/zero-volume behavior, resume and saved preference reload. This checks playback and lifecycle behavior, not a seamless edit or phone-speaker balance. Local integration only; this task did not upload a release.

## Police siren (2026-09-10)

Integrated user-supplied `public/audio/vehicles/PoliceSiren_AP1.1061.mp3` unchanged. Browser reports2.624 seconds. It repeats during police emergency responses (including response waiting), stops/rewinds when no police response remains, and stays silent for patrols, cancelled responses, scene work and returns. Vehicle audio now maintains one independent loop per service, sharing existing effects preferences and lifecycle gates. Multiple police cars do not stack duplicate loops; police and fire can sound together.

Production build and whitespace checks pass. Actual Chromium playback verified police decoding/repeat, simultaneous fire playback and independent stop, idempotent initialization, response-end reset, pause/menu/sleep/visibility, mute/zero volume and saved preference reload. No new UI or clip editing; phone-speaker balance and seam quality remain listening checks. Local integration, no release upload.
