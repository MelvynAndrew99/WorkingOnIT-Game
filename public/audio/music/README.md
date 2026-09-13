# Gameplay music

`tranquil-city.mp3` is the user-supplied tranquil city background recording, originally named `Work On It Main Theme.mp3`. Renamed without re-encoding. Browser reports89.92 seconds. User confirms this recording is 96 BPM. Its intentional outro plays in full before restarting from the beginning; a seamless join is not required.

Runtime: src/audio/music.ts. Whole-file repeat, default30% volume, persisted mute/volume at Menu → Settings. Playback only while gameplay is running and visible; browser gestures unlock playback. RUN sleep/awake and pause/resume are respected. Missing audio never blocks gameplay. This is not the separate What a Jam! credits recording.

`TitleTheme.mp3` is the user-supplied main menu theme. It loops only while the main menu is showing and uses the same saved mute/volume, gesture unlock, hidden-page and RUN sleep handling. Other screens keep their existing music behavior.

Encoding (2026-09-11): both tracks were re-encoded at the user's request to 128 kbps stereo 44.1 kHz MP3 with cover art and metadata stripped (TitleTheme 2.7 MB → 1.73 MB, tranquil-city 2.25 MB → 1.44 MB) so the online build buffers faster. The ~200 kbps originals were discarded at the user's request. The menu theme starts buffering during the loading bar; the gameplay loop buffers after it.

Additional selected recordings can go in this directory. Keep production masters separately. Effects and future music ordering remain separate integration work; see docs/AUDIO-CUE-LIST.md.

`pause-menu.mp3` is the user-selected “Busy Junction (1).mp3” recording,
added on 2026-09-13. Converted to 128 kbps / 44.1 kHz MP3 with embedded
artwork and metadata removed; full decode verified. Inbox MP3 retained.
Loops during sandbox pause, using the shared music volume/mute, visibility
and host-sleep controls. Resuming restores the gameplay track at its held
position. Challenge planning retains its existing gameplay music.

Music transitions now use a one-second eased crossfade, retaining playback
positions and waiting for the incoming track to start before fading out
the old track. Rapid reversals start from the current mix. Mute, hidden tabs
and host sleep stop immediately. Pause music preloads after gameplay music.
