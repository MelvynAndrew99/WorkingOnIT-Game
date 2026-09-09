# Build, release and RUN publishing

`.github/workflows/release.yml` uses the locked Nix environment and package-lock.json.

## Normal merge to main

Every push to main (including a merged PR) runs `npm ci`, the game tests, publishing-script checks and the production build inside the workflow. Failed checks prevent release/publishing. A successful build creates a GitHub release tagged `build-<workflow number>-<short commit>`, containing:

- `working-on-it.tar.gz`: the production dist folder, ready to serve or upload.
- `SHA256SUMS`: archive checksum.
- `build.json`: full source commit, game ID, build number and archive checksum.

GitHub build tags are separate from player-facing milestones such as v0.2 and RUN's platform version sequence. This avoids automatically editing or committing version files on every merge. Push-triggered runs do not publish to RUN. Reruns reuse their release/tag and reject changed artifact bytes rather than overwrite a released build.

## One-time RUN secret

Create a RUN deployment API key scoped to this existing game (`l7mD5BHH8LslWkr5mC7d`) with permission to deploy/publish. The installed CLI supports API-key authentication through stdin; `nix develop -c rundot game api-keys --help` lists key-management commands.

In GitHub repository **Settings → Secrets and variables → Actions**, add a repository secret named **RUNDOT_API_KEY** containing that key. Do not paste the key into source, workflow inputs, issues or release notes. Existing local login credentials are not copied to GitHub. Ordinary builds/releases need only the automatically provided GITHUB_TOKEN.

The repository must allow GitHub Actions, the pinned checkout/artifact/Nix actions, and a workflow requesting contents:write for GitHub release jobs. No personal GitHub token is required by this workflow.

## Publish manually

After this workflow is merged to the default branch:

1. Open **Actions → Build, release and publish → Run workflow**.
2. Select **main**. Other refs are rejected.
3. Leave **publish** enabled and choose the RUN version bump (Patch by default; Minor/Major are available).
4. Run it. The same test/build/release pipeline executes, then publishes the exact verified archive. It does not rebuild a different bundle in the publish job.

Uncheck publish to run a build/release manually without touching RUN. A manual run builds the main commit selected when the run starts; it does not deploy a moving branch head. Publish jobs are serialized. GitHub concurrency keeps at most one pending job in that group, so submit one publish request at a time.

Successful publishing adds `run-world.json` to the GitHub release and writes the RUN version/status to the job summary. A `review` result means the upload succeeded and public publication was requested, not that the version is already live. Normal RUN review still applies.

## Retry and recovery

A successful RUN receipt makes a rerun skip deployment. A persistent `run-world-attempt.json` is written before upload. If an attempt exists without a success receipt, the job stops instead of risking another version after an uncertain network result. Inspect RUN's current versions first. If upload did succeed, retain/record the confirmed result; do not blindly redeploy. If it definitely did not upload, remove that release's attempt asset before retrying. Raw RUN output is not printed or uploaded because share URLs can contain review access keys.

This pipeline is validated locally but cannot run on GitHub until merged. The RUN key must be configured before the manual publish job can succeed. Adding workflow files locally does not activate or execute them.

References: [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [Nix installation action](https://github.com/cachix/install-nix-action), [artifact action](https://github.com/actions/upload-artifact). CLI flags were verified against the repository's pinned RUN CLI 7.14.3.
