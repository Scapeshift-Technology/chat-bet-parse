---
'chat-bet-parse': minor
---

**BET_CANDIDATE_SIGNAL admits digit-glued totals prices** (from two live
counterparty orders, 2026-08-28 — "Astros first 5 under 4-105" and "First 5
giants over 4.5+105" both failed the candidate signal and never reached the
parser, even though 0.11.0's word-form totals extractor parses them): the
signal gains a totals-context branch matching over/under (word or o/u
shorthand) + number + glued signed 3-5 digit price, including punctuated and
decimal-odds forms ("4-105.", "4-105.5"). The branch is deliberately
restricted to the totals context — the only place the grammar consumes a
digit-glued price — because a context-free digit-glued match admits chatter
("they lost 110-105", phone numbers) that the implied default-price path
would silently mint into phantom moneyline orders; an anti-phantom test pins
that failure mode, and alignment tests pin every admitted glued-total form to
actual implied-prefix parseChat behavior.
