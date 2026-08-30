---
'chat-bet-parse': minor
---

**Free-form parlays parse instead of contestant-swallowing** (from a live
fill sample 2026-08-26 — "yg Parlay Cubs ml and over 8.5 @ +265 = $3500"
previously parsed as a STRAIGHT total with Team1 "Parlay Cubs ml and", i.e.
wrong grading semantics at parlay odds): a bare `YG`/`IW` prefix (or implied
prefix) followed by the `Parlay` keyword now parses a combined-price parlay —
legs split on `and`/`&`, one `@ price` for the whole ticket, `= size [tw]`
for fills. Legs carry no per-leg prices (a leg containing `@` or a
price-shaped signed integer fails loudly toward YGP/IWP), and a team-less
total leg inherits the nearest prior leg's team ("Cubs ml and over 8.5" is
the Cubs game's total). Direct `parseChatOrder`/`parseChatFill` calls on
leading-Parlay text now throw instead of silently mis-parsing.
