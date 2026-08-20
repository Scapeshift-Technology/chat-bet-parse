# TODOS

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
