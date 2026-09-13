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

`fill-it-up.mp3`: 128kbps re-encode (170s, 2.7MB), 95.5 FM, sold for game credits (`sku: radio-fill-it-up`). Shown as **Fill It Up!**. Preview starts at 0:50, the chorus (set by the user).

`room-for-us.mp3`: 128kbps re-encode (223s, 3.6MB), 98.7 FM, sold for game credits (`sku: radio-room-for-us`). Preview starts at 0:39, the first chorus by loudness analysis. Confirm by ear.

`what-a-jam.mp3`: 128kbps re-encode of the supplied master (169s, 2.7MB). The preview starts at 0:33, where loudness analysis suggests the first chorus begins. Confirm by ear.
