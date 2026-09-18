---
"chat-bet-parse": minor
---

Accept side-first full-game totals with the price before the team for implied IW orders (live calchas sample 2026-09-17T00:02Z: `Under 8 -110 Red Sox` previously threw InvalidContractTypeError).

- `over` / `under` / `o` / `u` (any case), an unsigned line, a signed American price with magnitude at least 100, and a trailing team rewrite to `IW <team> <o|u><line> @ <price>`. Shorthand may be glued or spaced (`u8.5`, `O 8.5`). The result is a full-game single-team TotalPoints contract (period M/0).
- Numeric and rotation-prefixed tails, prices below 100 in magnitude, and extra moneyline markers are rejected; allowlisted numeric team names such as `76ers` remain valid. Normal half-point line validation still applies.
- The existing F5 rewrite stays first. Team-first parsing, rotation-prefixed spreads, explicit-prefix parsing, and implied YG parsing are unchanged.
