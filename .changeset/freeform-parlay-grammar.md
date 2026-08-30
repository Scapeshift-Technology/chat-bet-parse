---
'chat-bet-parse': minor
---

**Free-form parlays parse instead of contestant-swallowing** (from a live
fill sample 2026-08-26 — "yg Parlay Cubs ml and over 8.5 @ +265 = $3500"
previously parsed as a STRAIGHT total with Team1 "Parlay Cubs ml and", i.e.
wrong grading semantics at parlay odds): a bare `YG`/`IW` prefix (or implied
prefix) followed by the `Parlay` keyword now parses a combined-price parlay —
legs split on the word `and` ONLY (`&` is legal inside team names and never
separates), one `@ price` for the whole ticket, `= size [tw]` for fills.
Legs carry no per-leg prices (a leg containing `@` or a price-shaped signed
integer fails loudly toward YGP/IWP; leg specs map with `Price: null`, the
combined price rides the top-level `bet.Price`); a team-less total leg
inherits the nearest prior leg's team ("Cubs ml and over 8.5" is the Cubs
game's total); spoken half-lines ("over 8 and a half" → 8.5) and combo prop
phrases ("points and assists") never split; leading
`pusheslose`/`tieslose`/`freebet` keywords apply as in YGP.
`BET_CANDIDATE_SIGNAL` gains a leading-`parlay` branch so priceless parlay
orders reach the parser and fail loudly instead of staying silent, and
direct `parseChatOrder`/`parseChatFill` calls on leading-Parlay text now
throw instead of silently mis-parsing.
