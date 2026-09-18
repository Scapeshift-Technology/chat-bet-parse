## Add current-LTS Node (22.x) to the CI and release matrices

**What:** Add 22.x alongside 18.x/20.x in `.github/workflows/ci.yml` and
`release.yml`.

**Why:** Node 18 is itself EOL (2025); 22/24 are the current LTS lines. Kept
out of the 2026-08-20 release-unblock PR deliberately — a newly failing 22.x
lane would have re-blocked the release; add it when there's room to fix
whatever it surfaces.

**Effort:** S.
born: 2026-08-20
