---
"chat-bet-parse": minor
---

Three counterparty-chat shapes that used to fail or silently misparse now parse (live samples 2026-09-04, "Jays +1/2-119 first five" was lost as an unparsed order):

- **Half-point fractions are lines, not dates.** `+1/2`, `-1/2`, `o1/2`, `N 1/2` and the unicode `½` forms (`+½`, `8½`, `u8½`) normalize to `.5` before positional date extraction. Previously a bare `+1/2` threw InvalidContractTypeError and — worse — `Jays u8 1/2 -110` parsed as total **8** dated **January 2**, because the standalone `1/2` token matched the date pattern. A leading standalone `1/2` with no sign, o/u, or preceding number is still a date, and `11/2` is untouched. The implied-prefix gate and `BET_CANDIDATE_SIGNAL` apply the same normalization so `½` forms are admitted.
- **Spread lines glued to their price split.** `+0.5-119`, `+1.5-119`, `-1.5-119 F5` parse with the price, the same way totals already handled `o8.5-110`.
- **A period or game marker after the price is consumed.** `Jays +0.5 -119 first five` is now an F5 spread (it was a full-game spread with "first five" left in unconsumed diagnostics), and `YG 913 Tigers o0.5 1st inning +112 Game 1 = 5.36` records DaySequence 1 (the trailing "Game 1" used to be dropped). A trailing period that contradicts one inside the contract text throws InvalidPeriodFormatError instead of guessing; any other tail stays unconsumed exactly as before. `G1`/`Game 1`/`DH1` markers are also accepted mid-contract ("Tigers G1 o0.5 1st inning").
