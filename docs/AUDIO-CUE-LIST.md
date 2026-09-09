# Working ON IT! — audio production handoff

Release review correction (September 9): the legacy `main_theme.mp3` and music module remain on disk, but the current `src/main.tsx` boot does not call `initMusic`. The game is currently silent. References below to the existing track playing are superseded; selected new audio and integration are still pending.

September 9, 2026. The user is generating music and sourcing/layering effects in Splice while the interface is rebuilt. These are production targets, not installed recordings. Preserve the accepted “What a Jam!” lyrics and 116 BPM ending-credits song in WHAT-A-JAM.md. Normal gameplay uses the original 96 BPM direction; the user has two background tracks to supply. Keep existing audio until replacements are selected.

## Make these first

| File / cue | Suggested duration | Direction and intended trigger |
| --- | --- | --- |
| gameplay-calm.wav | 60–120 seconds, loopable | 96 BPM gameplay background: warm piano, rounded bass, restrained drums, light guitar. Cheerfully capable, spacious enough for traffic. Audition the two user-provided tracks before deciding final filenames or loop edits. |
| ui-select-01.wav | 0.1–0.25 seconds | Soft dry click/tick for selecting a tool. Pleasant after hundreds of taps. |
| build-road-01.wav | 0.15–0.4 seconds | Small asphalt/cone tap, not an explosion. Supply 3 variations for road dragging. |
| build-building-01.wav | 0.4–0.8 seconds | Satisfying solid placement with a light construction flourish. 2–3 variations. |
| mission-claim.wav | 0.7–1.3 seconds | Bright tiny brass/piano approval, a municipal job well done. Plays when a reward is actually claimed, once. |
| tutorial-step.wav | 0.3–0.7 seconds | Clear, gentle upward cue when a lesson advances. Quieter/smaller than mission claim. |
| traffic-warning.wav | 0.3–0.7 seconds | Distinct restrained caution pulse when a junction warning first appears. Urgent enough to notice, not a repeated alarm. |
| crash-minor.wav | 0.5–1 second | Stylized metal bump, brake squeak, loose debris. Readable but not distressing or comically celebratory. |

## Layer these next

| File / cue | Suggested duration | Direction and intended trigger |
| --- | --- | --- |
| ambience-town.wav | 30–60 seconds, seamless | Quiet open-air town bed. Keep obvious horns, speech and sirens separate. |
| traffic-pass-01.wav | 1–3 seconds | Small car passing; 3 variations, without baked background music. |
| horn-short-01.wav | 0.2–0.5 seconds | A brief commuter complaint. Occasional punctuation, not every waiting car. |
| siren-police.wav | 4–8 second loop | Distinct patrol response texture. Dry source; engine movement layered separately. |
| siren-ems.wav | 4–8 second loop | Ambulance response texture distinct from police. |
| siren-fire.wav | 4–8 second loop | Fire response texture with a heavier character. |
| engine-service.wav | 4–8 second loop | Low service-vehicle motor layer, without siren. |
| scene-cleared.wav | 0.4–0.8 seconds | Small reassuring resolution. Relief, not a jackpot fanfare. |
| remove.wav | 0.2–0.5 seconds | Gentle dismantle/refund feedback. |
| ui-unavailable.wav | 0.15–0.3 seconds | Soft low tick for an invalid placement. Never harsh after a mistake. |

## Music prompt to try

Instrumental music for a playful city traffic optimization game, 96 BPM. Warm electric piano, rounded bass, restrained dry drums, muted guitar and light wooden percussion. Cheerful municipal confidence, gentle comedy, sparse melody and steady dynamics for long building sessions. Leave room for traffic and interface effects. No vocals, car horns, sirens, crash sounds or dramatic drops. Keep a consistent groove suitable for a loop edit.

[Intro — establish the calm building groove]
[Verse — small piano and guitar variations]
[Break — lighten the texture, hold the pulse]
[Refrain — return to the familiar motif]
[Bridge — playful rhythmic motion without extra loudness]
[Final Section — return to the opening texture for a loop edit]

Use the user's Suno skill at `/mnt/t/Business/songwriter/skills/suno.txt`. This is a future prompt example, not a request to regenerate the two existing tracks. What a Jam! retains its supplied 116 BPM lyrics/style for ending credits, with later radio-perk use optional.

## Delivery

- Keep editable projects and source masters. WAV exports are useful masters; 48 kHz/24-bit is a suggested handoff format, not a requirement to redo good existing audio.
- Send music, ambience, engine, siren and interface effects as separate layers. Export a combined audition mix too if it helps communicate your intent.
- Name variations with -01, -02, -03. Note intended loop points or provide a seamless loop export. Leave a little natural tail on one-shots.
- Preserve which source/layer came from each Splice sample or generator so we can revise the mix later.
- Start with calm gameplay, tool selection, road placement and mission claim. We can add ambience and emergency layers after those feel right.

## Integration plan once files arrive

Music and effects get separate volume/mute controls. Respect user-gesture playback and game/host pause. Rate-limit road-drag sounds, pool a small number of concurrent effects, reduce distant/overlapping sirens and keep tutorial/mission cues legible. No sound should be required to understand a warning: visible feedback remains authoritative. The legacy main_theme.mp3 remains on disk but is not initialized by the current game boot; new music playback, effects mixer and cue wiring are not implemented by this brief.
