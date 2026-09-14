# Shared SFX mix — 2026-09-13

All 17 installed effects now use measured per-recording attenuation in
`src/audio/mix.ts`, followed by the saved Effects slider. No MP3s were rewritten.

At 100% Effects, the authored starting targets are:

| Role | Integrated loudness per clip |
| --- | --- |
| Police, fire, ambulance, minor crashes, demolition | -20 LUFS |
| Full-intensity rain | -26 LUFS |
| Traffic pass-bys, before existing random envelope | -29 LUFS |

This aligns interchangeable clips while keeping continuous ambience behind
foreground cues. Rain retains its square-root intensity fade; traffic retains
its 75–100% variation and slight pitch variation. The latter can slightly change
perceived loudness. Multiple simultaneous sounds still sum normally; these are
per-clip targets, not a guaranteed combined-output loudness or peak ceiling.

Police measured -8.09 LUFS versus ambulance -18.69; crashes ranged from -6.13
to -14.41. The old 1.5x crash boost saturated the HTML audio volume above 66.7%
of the slider. It is removed. Every effect now scales proportionally throughout
0–100%, with no individual boost or early plateau. Traffic now subscribes to
Effects changes immediately, like the other players. Saved slider settings and
mute preferences are retained. Music keeps its independent existing control.
The new mix is quieter than the previous boosted mix at the same slider setting;
players can raise Effects relative to Music.

Measurement used FFmpeg loudnorm analysis on decoded shipped MP3s:

```sh
ffmpeg -hide_banner -nostats -i CLIP.mp3 \
  -af loudnorm=I=-23:TP=-2:LRA=11:print_format=json -f null -
```

The 0.26-second demolition file is too short for an integrated reading on its
own. Its measurement used `apad=pad_dur=1` before loudnorm, yielding -14.51 LUFS;
that silence is only for analysis, never playback. Original measured results are
in `source-measurements.json` (music readings included for context). Gains use
`10 ** ((target - measured) / 20)`, all below unity. Asset replacements require
remeasurement and updating their entries. Runtime adjustments preserve the
recordings' dynamics and avoid another lossy encode.

Validation: production typecheck/build passed. Run
`node --experimental-strip-types docs/audio/mix/verify.mjs` for isolated mocked
playback coverage: all 17 sources calibrated, target calculations, full-range
proportionality, live slider changes across categories and every crash variant,
mute/zero, saved preferences, pause and hidden-tab behavior. No active player
saves were accessed. No performance tests or publication. This is a measured
starting mix; subjective listening approval in the game remains with the user.
