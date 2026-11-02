---
"chat-bet-parse": minor
---

Inning periods follow the owner's rule (2026-11-02): an inning number is that inning alone, a count of innings is the first N cumulatively, and inning text never lands in a team name (calchas Model FR Fills: `TEX/SD inning 7 u0.5` parsed as teams "TEX" / "SD inning 7" on the full game). Every phrasing that parsed in 0.18.0 parses the same, pinned by a regression table of 0.18.0 outputs.

- **Single inning, I<N>.** `inning 7`, `inn 7`, `7th inn` and `first inning` join `7th inning` / `7 inning`: all are I7 (I1 for `first inning`, `inning 1`, `1st inn`) on every contract type, with any market word after them (`SD inning 7 ML`, `SD 7th inning TT o0.5`). They were full game, with the phrase in the second team name; `first inning` threw.
- **First N innings, cumulative, H1<N>.** `F7`, `F7 innings`, `first 7`, `first seven`, `first 7 innings`, `1st 7 innings`, `innings 1-7` and `7 innings` are H17, for N = 2-8. F3 and F7 keep H13 and H17, and N = 5 keeps H1. `F2` / `F4` / `F6` / `F8` (H12 / H14 / H16 / H18) are new codes in the same H1<N> scheme. `innings 1-7` used to lose its `1-7` as a January 7 event date.
- **Inning text the grammar cannot read throws InvalidPeriodFormatError** instead of joining a team name: `innings 2-7`, `innings 7`, `7th innings`, `9 innings`, `first 9 innings`, `7 inn`, a bare `inning`. `parseTeam` rejects a name containing an inning word (`inn`, `inns`, `inning`, `innings`). Names that only contain the letters, like Innsbruck or Minnesota, are unaffected.
- **Single-team F7 totals parse (fix).** `KC F7 o6.5 @ -115`, the README's own example, threw InvalidContractTypeError: the single-team total and bare period-moneyline patterns listed `f5|f3` but not `f7`. Every compact-code list now reads `f[2-8]`.
- Period word phrases are normalized once, at the start of tokenizing (after writein detection, before keyword and date extraction), instead of on the extracted contract text.
- README: the EBNF period rules and Period Mapping now say what the grammar accepts. `first i` / `1st i` were documented as I1 but have always thrown, and they are no longer listed.
