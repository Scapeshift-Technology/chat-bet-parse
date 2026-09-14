---
"chat-bet-parse": patch
---

Price words are a price everywhere, and an unknown trailing word fails loud (live fills 2026-09-08: `yg h1 phillies under 4.5 even = 4k` and `yg h1 atlanta under 4.5 even = 4k` lost the word in the period-first reorder and booked at -110 — risk 4,400 on a 4,000 to-win instead of 4,000 / 4,000 at +100).

- `even` / `ev` / `pk` / `pick` / `pick'em` (any case) are +100 wherever a numeric price is accepted: after `@` (`pick` no longer reads as k-notation), as a standalone token (`under 4.5 even`, `-1.5 pk`, `Phillies EV`), and glued to a total line (`u4.5ev`). One vocabulary, `PRICE_WORD` (utils).
- The period-first reorder no longer drops text after the matched line/total: a `runs` suffix is kept, a moneyline marker still throws InvalidContractTypeError, and anything else — the slot where a price goes — throws InvalidPriceFormatError (`yg h1 phillies under 4.5 evens2 = 4k`) instead of silently defaulting to -110.
