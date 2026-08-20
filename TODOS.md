# TODOS

## Add current-LTS Node (22.x) to the CI and release matrices

**What:** Add 22.x alongside 18.x/20.x in `.github/workflows/ci.yml` and
`release.yml`.

**Why:** Node 18 is itself EOL (2025); 22/24 are the current LTS lines. Kept
out of the 2026-08-20 release-unblock PR deliberately — a newly failing 22.x
lane would have re-blocked the release; add it when there's room to fix
whatever it surfaces.

**Effort:** S.

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

## Delete the grading feature entirely

**What:** Remove the SQL Server contract-grading integration from the
package: `src/grading/`, `tests/integration/grading.test.ts`, the optional
grading exports, and the grading sections of the README.

**Why:** The SQL Server it graded against was retired in July 2026 and is
never coming back, and to the owner's knowledge no consumer ever used the
feature (owner decision 2026-08-19). The CI workflows already stopped
passing `DATABASE_CONNECTION_STRING`, so the suite permanently skips —
dead code with a dead test suite is pure liability.

**Effort:** S–M (delete + README/exports cleanup + major-version
consideration since it removes public API).
