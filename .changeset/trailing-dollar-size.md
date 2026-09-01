---
"chat-bet-parse": minor
---

A trailing `$`-marked amount now parses as the size even without `=`: "yg orioles first 5 under 5.5 -105 $2500" previously threw MissingSizeForFillError and the fill was silently never logged (live miss, 2026-08-30). The `$` sigil is required — a bare trailing number still fails rather than guessing. Applies to fills and orders alike; existing `= size` and `@ $X` forms are unchanged.
