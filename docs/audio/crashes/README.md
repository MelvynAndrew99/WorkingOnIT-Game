# Minor crash sounds — local integration (2026-09-11)

Six user-supplied CrashAuto WAV copies converted using libmp3lame at constant 128 kbps, preserving duration, sample rate and channels. Runtime files: public/audio/crashes/crash-minor-01.mp3 through crash-minor-06.mp3. Source mapping and byte counts: [sources.json](sources.json). Original inbox WAV copies deleted at the user’s request after bitrate and full decode verification. No trimming, pitch changes or loudness normalization applied.

New minor incidents created during a live simulation step trigger one randomly chosen clip, excluding the previous clip. At most three impacts overlap. Existing incidents on load do not trigger audio. Serious/fire incidents await their own sound selection. Uses existing effects volume/mute; pause, hidden tab, host sleep and scene teardown stop impacts without replay. Playback denial drops the impact; future crashes can play after browser interaction. Both sandbox and active challenges supported. Simulation/save rules unchanged.

Validation: production build passes; isolated mocked-audio functional checks cover all six variants, no immediate repeats, overlap bound, mute, pause, hidden tab, sleep, menu, challenge and cleanup. All MP3s decoded successfully and report 128000 bit/s. Listening/mix approval in the user's browser remains unverified. No publication or performance testing.

Shared-mix update (2026-09-13): each recording now has a measured runtime
trim targeting -20 LUFS at 100% Effects. The later 1.5x impact boost has been
removed so the slider scales proportionally throughout its range. Audio files
remain unchanged. See [shared mix](../mix/README.md).
