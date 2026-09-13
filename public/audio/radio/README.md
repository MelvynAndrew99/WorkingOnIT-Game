# W-ON-IT City Radio

`src/ui/CityRadio.tsx` is a reusable radio: a mini now-playing bar (power, song, next station) that expands into the full receiver (dial with static between stations, SEEK, station list). The title screen docks it under the menu; later it can be dropped into the game HUD with `<CityRadio opens="up" stopOnUnmount={false} />`, positioned by the host.

## Adding a song

1. Encode to **128kbps MP3** so it loads quickly on phones. Strip embedded cover art:
   `ffmpeg -i "inbox/Song.mp3" -map 0:a -map_metadata -1 -c:a libmp3lame -b:a 128k -ar 44100 public/audio/radio/song.mp3`
2. Add an entry to `RADIO_TRACKS` in `src/audio/radio.ts`: a unique `frequency` (88.0 to 108.0, at least 1 MHz from its neighbours), a one-line DJ quip from The Man, and an `unlock` rule.
3. The station list is sorted by frequency and scrolls inside the receiver, so any number of songs fits. To retire a song, delete its entry.

## Unlock rules

- `{kind:'free'}`: always plays in full.
- `{kind:'mission', challengeId, label}`: full song once that mission's award is saved. **What a Jam!** uses `what-a-jam` (Level 25).
- `{kind:'purchase', sku, label}`: data model only. No purchase flow or entitlement check exists yet, so these always play previews. Wire the check in `unlocked()` in `src/ui/CityRadio.tsx`.

Locked songs play a `previewSeconds` clip (default 20) starting at `previewStart`, fading out over the last 1.5 seconds. When a full song ends the station rolls on to the next unlocked song.

`fill-it-up.mp3`: 128kbps re-encode (170s, 2.7MB), 101.5 FM, planned game-credits unlock (`sku: radio-fill-it-up`). Shown as **Fill It Up!**. Preview starts at 0:50, the chorus (set by the user).

`too-busy-to-work.mp3`: 128kbps MP3, 219s, 3.5MB, 98.7 FM. Free full playback. Converted from `inbox/Too Busy to Work.mp3`, stripping embedded artwork; inbox original preserved.

Room For Us has been removed from the station list and its game audio deleted.

Station order: Working ON IT! (92.3), What a Jam! (95.5), We Got Pizza, We Got Praise (97.1), Too Busy to Work (98.7), Fill It Up! (101.5), Busy Junction (105.7). The initial dial starts at the theme; the first SEEK tunes it before subsequent scans advance. Tapping “Tap to tune in” powers on and opens the receiver.

`what-a-jam.mp3`: 128kbps re-encode of the supplied master (169s, 2.7MB). The preview starts at 0:33, where loudness analysis suggests the first chorus begins. Confirm by ear.

## Verification (2026-09-13)

Production build/typecheck and radio regression command pass. Isolated Chromium contexts at 1440px and 390px verify first Next starts the theme, all five stations play in order and wrap, tapping the mini information panel powers on, station labels match, and Fill It Up! is a 20-second preview when locked. A test-only entitlement callback verifies it starts at the beginning and plays the full duration when unlocked; this does not implement purchases or grant player entitlements. ffprobe confirms Too Busy to Work has one MP3 stream at 128,000 bits/second, 218.92 seconds, 3,503,660 bytes. No publication or active-save access.

## Jam gift: We Got Pizza, We Got Praise (2026-09-13)

Added at 97.1 FM immediately after What a Jam!, free in full as the user's jam gift. Converted from `inbox/We Got Pizza, We Got Praise.mp3` without modifying the original. ffprobe verifies a single MP3 audio stream at 128,000 bits/second, 179.52 seconds, 2,873,512 bytes, with embedded art removed. No timed eligibility cutoff was specified or added. Existing locked-song previews and entitlement rules remain.

Verification: build/typecheck and updated radio regression command pass. Isolated 1440px/390px browser checks confirm six-channel order and wrap, and the new channel loads without missing audio, playing free in full with a 179.52-second duration.

## Channel identities (2026-09-13)

Each channel now has a distinct station name shown in the mini player, receiver and station list, with song credits retained separately in the catalog and accessible station labels.

| FM | Station | Song |
| --- | --- | --- |
| 92.3 | The Mix | Working ON IT! |
| 95.5 | Now FM | What a Jam! |
| 97.1 | Country | We Got Pizza, We Got Praise |
| 98.7 | The Rock | Too Busy to Work |
| 101.5 | UK Hits | Fill It Up! |
| 105.7 | Classic FM | Busy Junction |
