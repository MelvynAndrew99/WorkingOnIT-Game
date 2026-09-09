#!/usr/bin/env python3
"""Exercise the real packaging/publish shell with fake gh/nix; never contacts RUN."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
MOCK = '''#!/usr/bin/env python3
import json, os, pathlib, shutil, sys
root = pathlib.Path(os.environ['FAKE_REMOTE'])
a = sys.argv[1:]
if pathlib.Path(sys.argv[0]).name == 'gh':
    if a[:2] == ['release', 'view']:
        if 'assets' in a:
            asset = 'run-world-attempt.json' if 'run-world-attempt.json' in a[-1] else 'run-world.json'
            print(int((root/asset).exists()))
        else:
            print('Verified game build')
    elif a[:2] == ['release', 'upload']:
        source = pathlib.Path(a[-1])
        if source.name == 'run-world.json' and os.environ.get('FAIL_RECEIPT'):
            sys.exit(1)
        shutil.copyfile(source, root/source.name)
    else:
        sys.exit('Unexpected gh invocation')
else:
    if 'login' in a:
        assert sys.stdin.read() == 'test-key'
    elif 'deploy' in a:
        assert pathlib.Path('dist/index.html').read_text() == 'verified game'
        assert (root/'run-world-attempt.json').exists()
        with (root/'deploys').open('a') as f: f.write('upload\\n')
        print('CLI progress text')
        print(json.dumps({'success': True, 'gameId': 'test-game', 'version': '1.6.1', 'visibility': 'review', 'shareUrl': 'https://example.invalid/?k=private-key'}))
    else:
        sys.exit('Unexpected nix invocation')
'''


class PublishTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.work = Path(self.tmp.name)
        (self.work/'dist').mkdir()
        (self.work/'dist/index.html').write_text('verified game')
        (self.work/'game.config.prod.json').write_text(json.dumps({'gameId': 'test-game'}))
        self.remote = self.work/'remote'
        self.remote.mkdir()
        (self.work/'bin').mkdir()
        for tool in ('gh', 'nix'):
            path = self.work/'bin'/tool
            path.write_text(MOCK)
            path.chmod(0o755)
        self.env = {**os.environ, 'PATH': str(self.work/'bin') + os.pathsep + os.environ['PATH'],
                    'GITHUB_SHA': 'a'*40, 'GITHUB_RUN_NUMBER': '7', 'RELEASE_TAG': 'build-7-aaaaaaa',
                    'GH_REPO': 'owner/game', 'RUN_BUMP': 'Patch', 'RUNDOT_API_KEY': 'test-key',
                    'GITHUB_STEP_SUMMARY': str(self.work/'summary'), 'FAKE_REMOTE': str(self.remote)}
        subprocess.run(['bash', str(ROOT/'tools/ci/package-build.sh')], cwd=self.work, env=self.env, check=True)
        shutil.rmtree(self.work/'dist')

    def publish(self):
        return subprocess.run(['bash', str(ROOT/'tools/ci/publish-run.sh')], cwd=self.work,
                              env=self.env, text=True, capture_output=True)

    def test_exact_archive_and_safe_receipt(self):
        result = self.publish()
        self.assertEqual(result.returncode, 0, result.stderr)
        receipt = json.loads((self.remote/'run-world.json').read_text())
        self.assertEqual(receipt['commit'], self.env['GITHUB_SHA'])
        self.assertEqual(receipt['version'], '1.6.1')
        self.assertNotIn('private-key', json.dumps(receipt) + result.stdout + result.stderr)
        self.assertEqual(self.publish().returncode, 0)
        self.assertEqual((self.remote/'deploys').read_text(), 'upload\n')

    def test_ambiguous_receipt_failure_blocks_duplicate(self):
        self.env['FAIL_RECEIPT'] = '1'
        self.assertNotEqual(self.publish().returncode, 0)
        del self.env['FAIL_RECEIPT']
        retry = self.publish()
        self.assertNotEqual(retry.returncode, 0)
        self.assertIn('Inspect RUN', retry.stderr)
        self.assertEqual((self.remote/'deploys').read_text(), 'upload\n')

    def test_wrong_commit_blocks_upload(self):
        self.env['GITHUB_SHA'] = 'b'*40
        self.assertNotEqual(self.publish().returncode, 0)
        self.assertFalse((self.remote/'deploys').exists())

    def test_corrupt_archive_blocks_upload(self):
        with (self.work/'.release/working-on-it.tar.gz').open('ab') as archive:
            archive.write(b'wrong bytes')
        self.assertNotEqual(self.publish().returncode, 0)
        self.assertFalse((self.remote/'deploys').exists())

    def test_missing_secret_blocks_upload(self):
        del self.env['RUNDOT_API_KEY']
        result = self.publish()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('RUNDOT_API_KEY', result.stderr)
        self.assertFalse((self.remote/'deploys').exists())

    def test_invalid_bump_is_rejected(self):
        self.env['RUN_BUMP'] = 'Patch; echo unexpected'
        self.assertNotEqual(self.publish().returncode, 0)
        self.assertFalse((self.remote/'deploys').exists())


if __name__ == '__main__':
    unittest.main()
