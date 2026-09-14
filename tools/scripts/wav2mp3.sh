#!/usr/bin/env bash
#
# wav2mp3.sh - Batch convert .wav files to .mp3 using ffmpeg.
#
# Usage:
#   ./wav2mp3.sh [-i input_dir] [-o output_dir] [-b bitrate] [-f] [-d]
#
# Options:
#   -i DIR      Input directory to search for .wav files (default: current dir)
#   -o DIR      Output directory for .mp3 files (default: same as input dir)
#   -b BITRATE  MP3 bitrate, e.g. 128k, 192k, 320k (default: 192k)
#   -f          Force overwrite even if the .mp3 already exists
#   -d          Delete the source .wav after a successful conversion
#   -h          Show this help message
#
# Behavior:
#   - Recursively finds all .wav files under input_dir (case-insensitive .wav/.WAV)
#   - Mirrors the input directory structure under output_dir
#   - Skips a file if the corresponding .mp3 already exists (unless -f is set)
#   - Safe with spaces/special characters in filenames
#
# Examples:
#   ./wav2mp3.sh -i ./assets/audio -o ./assets/audio_mp3
#   ./wav2mp3.sh -i . -b 320k -f
#   ./wav2mp3.sh -i ./raw_wav -d          # convert in place and delete originals

set -euo pipefail

INPUT_DIR="."
OUTPUT_DIR=""
BITRATE="192k"
FORCE=0
DELETE_SOURCE=0

usage() {
    sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
}

while getopts "i:o:b:fdh" opt; do
    case "$opt" in
        i) INPUT_DIR="$OPTARG" ;;
        o) OUTPUT_DIR="$OPTARG" ;;
        b) BITRATE="$OPTARG" ;;
        f) FORCE=1 ;;
        d) DELETE_SOURCE=1 ;;
        h) usage ;;
        *) usage ;;
    esac
done

if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "Error: ffmpeg is not installed or not on PATH." >&2
    echo "Install it first, e.g.:" >&2
    echo "  macOS:   brew install ffmpeg" >&2
    echo "  Ubuntu:  sudo apt install ffmpeg" >&2
    echo "  Windows: winget install ffmpeg (or download from ffmpeg.org)" >&2
    exit 1
fi

if [ ! -d "$INPUT_DIR" ]; then
    echo "Error: input directory '$INPUT_DIR' does not exist." >&2
    exit 1
fi

if [ -z "$OUTPUT_DIR" ]; then
    OUTPUT_DIR="$INPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR"

total=0
converted=0
skipped=0
failed=0

# Use process substitution + null-delimited find so filenames with spaces/newlines are safe.
while IFS= read -r -d '' wav_file; do
    total=$((total + 1))

    rel_path="${wav_file#"$INPUT_DIR"/}"
    rel_dir="$(dirname "$rel_path")"
    base_name="$(basename "$rel_path")"
    base_name_no_ext="${base_name%.[wW][aA][vV]}"

    dest_dir="$OUTPUT_DIR/$rel_dir"
    dest_file="$dest_dir/${base_name_no_ext}.mp3"

    mkdir -p "$dest_dir"

    if [ -f "$dest_file" ] && [ "$FORCE" -ne 1 ]; then
        echo "Skip (exists): $dest_file"
        skipped=$((skipped + 1))
        continue
    fi

    echo "Converting: $wav_file -> $dest_file"
    if ffmpeg -nostdin -y -loglevel error -i "$wav_file" -codec:a libmp3lame -b:a "$BITRATE" "$dest_file"; then
        converted=$((converted + 1))
        if [ "$DELETE_SOURCE" -eq 1 ]; then
            rm -f "$wav_file"
        fi
    else
        echo "Failed: $wav_file" >&2
        failed=$((failed + 1))
    fi
done < <(find "$INPUT_DIR" -type f \( -iname "*.wav" \) -print0)

echo ""
echo "Done. Found: $total | Converted: $converted | Skipped: $skipped | Failed: $failed"

if [ "$failed" -gt 0 ]; then
    exit 1
fi