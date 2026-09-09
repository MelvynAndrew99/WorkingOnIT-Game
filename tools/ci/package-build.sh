#!/usr/bin/env bash
set -euo pipefail
: "${GITHUB_SHA:?A source commit is required}"
: "${GITHUB_RUN_NUMBER:?A build number is required}"
test -s dist/index.html
mkdir -p .release
tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -czf .release/working-on-it.tar.gz -C dist .
(cd .release && sha256sum working-on-it.tar.gz > SHA256SUMS)
python3 - <<'PY'
import json, os
from pathlib import Path
metadata = {
    'commit': os.environ['GITHUB_SHA'],
    'build': os.environ['GITHUB_RUN_NUMBER'],
    'sha256': Path('.release/SHA256SUMS').read_text().split()[0],
    'gameId': json.loads(Path('game.config.prod.json').read_text())['gameId'],
}
Path('.release/build.json').write_text(json.dumps(metadata, indent=2) + '\n')
PY
