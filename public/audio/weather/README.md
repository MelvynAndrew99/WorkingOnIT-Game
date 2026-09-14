# Rain recordings

User-supplied `BRS_Rain_Street_City_Splatty_2.wav`, `_3.wav` and `_5.wav`
were converted to matching `rain-2.mp3`, `rain-3.mp3` and `rain-5.mp3` on
2026-09-13. Stereo, 128 kbps MP3, 48 kHz; full recordings retained without
trimming or normalization. All MP3s passed full decode verification before
the inbox WAVs were deleted at the user's request. Combined size: 44,709,336
bytes of WAV to 2,704,644 bytes of MP3.

Gameplay plays one random recording at a time and excludes the previous
recording from the next choice. Volume follows visible rain intensity at
half the effects volume. Supports sandbox and challenges, effects mute,
pause, hidden tabs, host sleep, disabled weather and scene cleanup.
Audio selection is presentation-only and does not change saved weather.

Mocked playback checks cover selection, no immediate repeats, single-layer
playback, intensity, pause/resume, sleep, mute, challenges and cleanup.
Browser listening/mix approval remains unverified. No publication.

Mix correction: the initial files averaged roughly -33 to -35 dB RMS before
the quiet runtime gain. Normalized the recordings toward -22 LUFS with a
-1.5 dBTP processing ceiling and raised runtime gain to 0.8 times effects
volume times the square root of rain intensity. This supersedes the initial
unnormalized/half-volume mix above. Original converted MP3s are preserved in
`docs/audio/weather/originals` for future mix revisions.

Shared-mix update (2026-09-13): the above 0.8 runtime gain is superseded by
measured per-file trims targeting -26 LUFS at full rain intensity and 100%
Effects. The intensity fade remains. See `docs/audio/mix/README.md`.
