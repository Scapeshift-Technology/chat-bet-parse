## Publish-flow integrity: stop rebuilding at publish time

**What:** Make `npm publish` ship the artifact the pipeline actually tested:
either publish the downloaded build artifact directly (drop the
`prepublishOnly` rebuild) or reorder so `npm publish` precedes GitHub
Release creation.

**Why (three defects, found in the 2026-08-20 release review):**
`prepublishOnly` reruns build+test+lint on the release runner, so the
uploaded/downloaded `dist/` artifact plumbing is decorative; that rerun
partially undoes the `--ignore-scripts` hardening at the exact step where
`NPM_TOKEN` is present; and because the GitHub Release is created before
`npm publish`, a `prepublishOnly` failure strands a published GitHub
Release with no npm package.

**Effort:** S–M.
born: 2026-08-20
