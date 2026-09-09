#!/usr/bin/env bash
set -euo pipefail
: "${GITHUB_SHA:?}"
: "${RELEASE_TAG:?}"
: "${GH_REPO:?}"
: "${RUN_BUMP:?}"
case "$RUN_BUMP" in Patch|Minor|Major) ;; *) echo 'Invalid RUN version bump' >&2; exit 1;; esac

# A successful rerun must not upload the same run twice.
receipt_count=$(gh release view "$RELEASE_TAG" --json assets --jq '[.assets[] | select(.name == "run-world.json")] | length')
if [[ "$receipt_count" != 0 ]]; then
  echo 'This release already has a successful RUN upload receipt.' >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi
attempt_count=$(gh release view "$RELEASE_TAG" --json assets --jq '[.assets[] | select(.name == "run-world-attempt.json")] | length')
if [[ "$attempt_count" != 0 ]]; then
  echo 'A previous RUN attempt has no success receipt. Inspect RUN before retrying; no duplicate upload was attempted.' >&2
  exit 1
fi
: "${RUNDOT_API_KEY:?Add the RUNDOT_API_KEY repository secret before publishing}"
(cd .release && sha256sum --check SHA256SUMS)
python3 - <<'PY'
import hashlib, json, os
from pathlib import Path
metadata = json.loads(Path('.release/build.json').read_text())
config = json.loads(Path('game.config.prod.json').read_text())
assert metadata['commit'] == os.environ['GITHUB_SHA'], 'Artifact source commit mismatch'
assert metadata['gameId'] == config['gameId'], 'Artifact game identity mismatch'
assert metadata['sha256'] == hashlib.sha256(Path('.release/working-on-it.tar.gz').read_bytes()).hexdigest(), 'Artifact digest mismatch'
PY
# This job starts in a fresh checkout: unpack the tested artifact, never rebuild it.
mkdir -p dist
tar -xzf .release/working-on-it.tar.gz -C dist
gh release view "$RELEASE_TAG" --json body --jq .body > .release/run-changelog.md
printf '%s' "$RUNDOT_API_KEY" | nix develop -c rundot login --api-key-stdin
unset RUNDOT_API_KEY
python3 - <<'PY_MARKER'
import json, os
from pathlib import Path
attempt = json.loads(Path('.release/build.json').read_text())
attempt['bump'] = os.environ['RUN_BUMP']
Path('.release/run-world-attempt.json').write_text(json.dumps(attempt, indent=2) + '\n')
PY_MARKER
# Persist intent before the external mutation. An ambiguous failure must not redeploy.
gh release upload "$RELEASE_TAG" .release/run-world-attempt.json
# Do not log the JSON verbatim: share URLs may contain private review-link keys.
nix develop -c rundot deploy --build-path ./dist --bump "$RUN_BUMP" --public \
  --changelog-file .release/run-changelog.md --json > .release/run-output.log
python3 - <<'PY'
import json, os
from pathlib import Path
result = None
for line in Path('.release/run-output.log').read_text().splitlines():
    try:
        value = json.loads(line)
    except ValueError:
        continue
    if isinstance(value, dict) and value.get('success') is True:
        result = value
if result is None:
    raise SystemExit('RUN did not return a successful upload receipt. Check RUN status before retrying.')
config = json.loads(Path('game.config.prod.json').read_text())
if result.get('gameId') != config['gameId']:
    raise SystemExit('RUN receipt game identity mismatch; inspect deployment before retrying.')
receipt = {key: result.get(key) for key in ('gameId', 'version', 'visibility')}
receipt['commit'] = os.environ['GITHUB_SHA']
Path('.release/run-world.json').write_text(json.dumps(receipt, indent=2) + '\n')
with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
    summary.write(f"RUN upload: **{receipt['version']}** · status: **{receipt['visibility']}**.\n\n")
    summary.write('Publication was requested; review status does not mean the new version is live.\n')
PY
gh release upload "$RELEASE_TAG" .release/run-world.json
