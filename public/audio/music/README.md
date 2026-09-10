# Gameplay music

`tranquil-city.mp3` is the user-supplied tranquil city background recording, originally named `Work On It Main Theme.mp3`. Renamed without re-encoding. Browser reports89.92 seconds. User confirms this recording is 96 BPM. Its intentional outro plays in full before restarting from the beginning; a seamless join is not required.

Runtime: src/audio/music.ts. Whole-file repeat, default30% volume, persisted mute/volume at Menu → Settings. Playback only while gameplay is running and visible; browser gestures unlock playback. RUN sleep/awake and pause/resume are respected. Missing audio never blocks gameplay. This is not the separate What a Jam! credits recording.

Additional selected recordings can go in this directory. Keep production masters separately. Effects and future music ordering remain separate integration work; see docs/AUDIO-CUE-LIST.md.
