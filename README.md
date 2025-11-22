# chat-bet-parse

A TypeScript npm package for parsing sports betting chat messages into structured data types compatible with SQL Server stored procedures. Supports both chat orders (IW - "I want") and chat fills (YG - "You got") across multiple sports including MLB and NBA, with optional auto-grading functionality against real game results.

## Features

- 🏈 **Multi-sport support** - MLB, NBA, and extensible for additional sports
- 📝 **Rich parsing** - Handles various chat betting syntax formats for both orders and fills
- 🎯 **Parlay support** - Multi-leg parlays with ampersand and multiline syntax (YGP/IWP)
- 🎲 **Round robin support** - nCr notation for complex parlay combinations (YGRR/IWRR)
- 🔒 **Type-safe** - Full TypeScript support with discriminated unions
- 🗃️ **SQL Server ready** - Types designed for stored procedure integration
- ⚡ **Fast & lightweight** - Zero runtime dependencies for parsing
- 🏆 **Contract grading** - SQL Server integration for grading parsed contracts (optional)
- 🧪 **Well tested** - Comprehensive test suite with 100% coverage

## Installation

```bash
npm install chat-bet-parse
```

## Examples by Contract Type

### Chat Bets (Orders)
**Game Totals**
- `IW Padres/Pirates 1st inning u0.5 @ +100` (no size - order only)
- `IW ATH/SF F5 o4.5 @ -117 = 2.7` (with unit_size = $2.70 literal)
- `IW KC F7 o6.5 @ -115 = 1.0` (first seven innings with unit_size = $1.00 literal)
- `IW 507 Thunder/Nuggets o213.5` (no price, no size)
- `IW G1 St. Louis/PHI o8.5 @ -110` (game number before teams)
- `IW # 2 COL/ARI F5 u5 @ -105` (game number with space before teams)

**Team Totals**
- `IW LAA TT o3.5 @ -115.5` (no size - order only)
- `IW MIA F5 TT u1.5 @ -110 = 1.0` (with unit_size = $1.00 literal)
- `IW G2 SEA TT u4.5 @ -110` (game number before team)
- `IW # 3 LAA TT o3.5 @ -115` (game number with space before team)

**Moneylines**
- `IW 872 Athletics @ +145` (no size - order only)
- `IW 872 Athletics @ +145 = 4.0` (with unit_size = $4.00 literal)

**Spreads**
- `IW 870 Mariners -1.5 +135` (no size - order only)
- `IW 871 Rangers +1.5 -125 = 3.0` (with unit_size = $3.00 literal)

**Props (Over/Under)**
- `IW Player123 passing yards o250.5 @ -115` (no size - order only)
- `IW Player456 rebounds o12.5 @ -110 = 2.0` (with unit_size = $2.00 literal)
- `YG Player789 rbi o1.5 @ -105 = 1.5` (decimal_thousands_size = $1,500)

**Props (Yes/No)**
- `IW CIN 1st team to score @ -115` (no size - order only)
- `IW CHC last team to score @ -139 = 0.50` (with unit_size = $0.50 literal)
- `YG CIN 1st team to score @ -115 = 0.563` (decimal_thousands_size = $563)
- `YG CHC last team to score @ -139 = 0.35` (decimal_thousands_size = $350)
- `YG CIN first team to score @ -109.8 = $265` (dollar_size = $265 literal)

**Series Bets**
- `IW 852 Guardians series @ -105` (no size - order only, default 3-game series)
- `IW 854 Yankees 4 game series @ +110 = 1.0` (with unit_size = $1.00 literal)
- `IW 856 Red Sox series out of 4 @ -120 = 2.0` (with unit_size = $2.00 literal)
- `IW Lakers 7-Game Series @ +120 = 1.0` (with unit_size = $1.00 literal)
- `IW 856 St. Louis Cardinals series/5 @ -120 = 2.0` (with unit_size = $2.00 literal)

**Writein Contracts**
- `IW writein 2024-12-25 Christmas Day game will go to overtime @ +200` (no size - order only)
- `IWW 2024-12-25 Christmas Day game will go to overtime @ +200` (shorthand for "IW writein")
- `IW writein 12/31/2024 New Year's Eve total points over 250 @ -110 = 5.0` (with unit_size = $5.00 literal)
- `IW writein 03/15 March Madness upset in first round @ +300 = 2.5` (MM/DD format, infers year)
- `IW writein 6-1 June trade deadline blockbuster deal @ +150 = 1.0` (MM-DD format, infers year)

### Chat Fills (Executed Bets)
**Game Totals**
- `YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094` (decimal_thousands_size = $94)
- `YG ATH/SF F5 o4.5 @ -117 = 2.7` (decimal_thousands_size = $2,700)
- `YG KC F7 o6.5 @ -115 = 1.5` (first seven innings, decimal_thousands_size = $1,500)
- `YG 507 Thunder/Nuggets o213.5 @ 2k` (k_size = $2,000)
- `YG COL/ARI #2 1st inning u0.5 @ +120 = $200` (dollar_size = $200 literal)
- `YG G2 COL/ARI 1st inning u0.5 @ +120 = 2.0` (game number before teams)
- `YG GM 1 CLE/WAS 1st inning o0.5 runs = 1.0` (game number with space before teams)

**Team Totals**
- `YG LAA TT o3.5 @ -115.5 = 8.925` (decimal_thousands_size = $8,925)
- `YG MIA F5 TT u1.5 @ -110 = 1.0` (decimal_thousands_size = $1,000)
- `YG SEA G2 TT u4.5 @ -110 = 1.5k` (k_size = $1,500)
- `YG G 2 SEA TT u4.5 @ -110 = 1.0` (game number with space before team)

**Moneylines**
- `YG 872 Athletics @ 4k` (k_size = $4,000, default price -110)
- `YG KC F7 @ +125 = 2.0` (first seven innings moneyline, decimal_thousands_size = $2,000)
- `YG 872 Athletics +145 @ $500` (dollar_size = $500 literal)

**Spreads**
- `YG 870 Mariners -1.5 +135 @ 2.5k` (k_size = $2,500)
- `YG 871 Rangers +1.5 -125 @ 1.5k` (k_size = $1,500)

**Props (Over/Under)**
- `YG Player123 passing yards o250.5 @ -115` (no size - order only)
- `YG Player456 rebounds o12.5 @ -110` (no size - order only)

**Series Bets**
- `YG 852 Guardians series @ -105 = 3k` (k_size = $3,000, default 3-game series)
- `YG 854 Yankees 4 game series @ +110 = 1k` (k_size = $1,000)
- `YG 856 Red Sox series out of 4 @ -120 = 2.0` (decimal_thousands_size = $2,000)
- `YG Lakers 7-Game Series @ +120 = 1.0` (decimal_thousands_size = $1,000)
- `YG 856 St. Louis Cardinals series/5 @ -120 = 2.0` (decimal_thousands_size = $2,000)

**Props (Yes/No)**
- `YG CIN 1st team to score @ -115 = 0.563` (decimal_thousands_size = $563)
- `YG CHC last to score @ -139 = 0.35` (decimal_thousands_size = $350)
- `YG CIN first team to score @ -109.8 = $265` (dollar_size = $265 literal)

**Writein Contracts**
- `YG writein 2024-12-25 Christmas Day game will go to overtime @ +200 = 1.5` (decimal_thousands_size = $1,500)
- `YGW 2024-12-25 Christmas Day game will go to overtime @ +200 = 1.5` (shorthand for "YG writein")
- `YG writein 12/31/2024 New Year's Eve total points over 250 @ -110 = 5.0` (decimal_thousands_size = $5,000)
- `YG writein 03/15 March Madness upset in first round @ +300 = 2.5k` (k_size = $2,500)
- `YG writein 6-1 June trade deadline blockbuster deal @ +150 = $1000` (dollar_size = $1,000 literal)

### Parlays (YGP/IWP)

**Basic Parlays - Ampersand Syntax**
- `YGP Lakers @ +120 & Warriors @ -110 = $100` (2-leg parlay, fair odds)
- `YGP Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100` (3-leg parlay)
- `IWP Lakers @ +120 & Warriors @ -110` (parlay order, no size)

**Parlays with To-Win Override**
- `YGP Lakers @ +120 & Warriors @ -110 = $100 tw $500` (custom payout, not fair odds)
- `YGP Lakers @ +100 & Warriors @ -110 & Celtics @ +120 = $100 tw $750`

**Parlays with Optional Flags**
- `YGP pusheslose:true Lakers @ +120 & Warriors @ -110 = $100` (pushes reduce parlay)
- `YGP freebet:true Lakers @ +120 & Warriors @ -110 = $50` (free bet parlay)
- `YGP pusheslose:true freebet:true Lakers @ +120 & Warriors @ -110 = $50` (multiple flags)

**Parlays with Leg Properties**
- `YGP 872 Cardinals/Cubs o8.5 @ -110 & 701 Lakers @ +120 = $100` (rotation numbers)
- `YGP Cardinals/Cubs G1 o8.5 @ -110 & Lakers @ +120 = $100` (game number on leg 1)
- `YGP 5/14 Lakers @ +120 & 5/15 Warriors @ -110 = $100` (dates per leg)
- `YGP MLB Cardinals @ +150 & NBA Lakers @ +120 = $100` (leagues per leg)
- `YGP Cardinals/Cubs F5 o4.5 @ -110 & Dodgers F5 @ +120 = $100` (periods)

**Multiline Parlay Format**
```
YGP
Lakers @ +120
Warriors @ -110
Celtics @ +105
= $100
```

```
YGP pusheslose:true freebet:true
Lakers @ +120
Warriors @ -110
= $100 tw $800
```

### Round Robins (YGRR/IWRR)

**Basic Round Robins - nCr Notation**
- `YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per` (4 teams, 2-leg parlays, $100 per parlay)
- `YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $600 total` (4 teams, 2-leg parlays, $600 total risk)
- `YGRR 5c3 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $50 per` (5 teams, 3-leg parlays)
- `IWRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115` (order, no size)

**Round Robins with At-Most Modifier**
- `YGRR 4c3- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per` (2-leg and 3-leg parlays)
- `YGRR 5c4- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $50 total` (2-leg, 3-leg, and 4-leg parlays)

**Round Robins with To-Win Override**
- `YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per tw $800`
- `YGRR 5c3- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $50 total tw $1200`

**Round Robins with Optional Flags**
- `YGRR pusheslose:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per`
- `YGRR freebet:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per`
- `YGRR pusheslose:true freebet:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per`

**Multiline Round Robin Format**
```
YGRR 4c2
Lakers @ +120
Warriors @ -110
Celtics @ +105
Nets @ +115
= $100 per
```

```
YGRR pusheslose:true freebet:true 5c3-
Lakers @ +120
Warriors @ -110
Celtics @ +105
Nets @ +115
Heat @ -105
= $50 total tw $1000
```

## Syntax Grammar (EBNF)

**Note**: All pattern matching is case insensitive unless otherwise specified.

### Basic Structure
```ebnf
message          = straight_bet | parlay_bet | round_robin_bet

(* Straight Bets *)
straight_bet     = iw_details | yg_details
iw_details       = "IW" [event_date] [rotation_number] [game_number] chat_order    (* Orders *)
yg_details       = "YG" [event_date] [rotation_number] [game_number] chat_fill     (* Fills *)
                   (* "IWW" and "YGW" are shorthands for "IW writein" and "YG writein" *)

chat_order       = contract [bet_price] ["=" unit_size]          (* Orders: price and size optional *)
chat_fill        = contract [bet_price] "=" fill_size            (* Fills: price optional, size required *)

contract         = game_total | team_total | moneyline | spread | prop | series | writein

(* Parlays *)
parlay_bet       = parlay_fill | parlay_order
parlay_fill      = "YGP" [parlay_flags] parlay_legs "=" parlay_size [to_win]
parlay_order     = "IWP" [parlay_flags] parlay_legs
parlay_legs      = leg ("&" leg)+ | multiline_legs    (* 2+ legs required *)
leg              = [event_date] [league] [rotation_number] contract [bet_price]
parlay_flags     = (flag " ")*
flag             = "pusheslose:true" | "tieslose:true" | "freebet:true"
to_win           = "tw" "$"? number

(* Round Robins *)
round_robin_bet  = round_robin_fill | round_robin_order
round_robin_fill = "YGRR" [parlay_flags] ncr_notation parlay_legs "=" rr_size risk_type [to_win]
round_robin_order= "IWRR" [parlay_flags] ncr_notation parlay_legs
ncr_notation     = number [cC] number ["-"]    (* e.g., "4c2", "5c3-" *)
risk_type        = "per" | "total"             (* "per" = per selection, "total" = total risk *)
rr_size          = parlay_size                 (* Same as parlay_size but requires risk_type *)

(* Multiline Format *)
multiline_legs   = newline (leg newline)+
parlay_size      = "$"? number
```

### Core Patterns
```ebnf
(* Event date - optional on YG/IW, required on YGW/IWW *)
event_date       = yyyy_mm_dd | mm_dd_yyyy | yyyy_mm_dd_alt | mm_dd_yyyy_alt | mm_dd | mm_dd_alt
                 | "date:" (yyyy_mm_dd | mm_dd_yyyy | yyyy_mm_dd_alt | mm_dd_yyyy_alt | mm_dd | mm_dd_alt)

(* Rotation number must come immediately after YG if present *)
rotation_number  = digit+

(* Game number patterns: g2, gm1, #2, g 2, gm 2, # 2 *)
game_number      = (("g" ["m"] [" "]) | "#" [" "]) digit+

(* Over/under pattern: o4.5, u0.5 *)
over_under       = ("o" | "u") line
line             = digit+ ["." "5"]

(* USA odds format: +150, -110, -115.5 *)
usa_price        = ("+" | "-") digit+ ["." digit+]

(* Size formats with different interpretations *)
unit_size              = digit+ "." digit+                    (* Literal value for orders *)
fill_size              = decimal_thousands_size | k_size | dollar_size
decimal_thousands_size = digit+ "." digit+                  (* Interpreted as value × 1000 *)
k_size                 = digit+ ["." digit+] "k"              (* Interpreted as value × 1000 *)
dollar_size            = "$" digit+ ["." digit+]             (* Interpreted as literal dollar amount *)

(* Ordinal numbers *)
first            = "1" ["st"] | "first"
second           = "2" ["nd"] | "second"
third            = "3" ["rd"] | "third"
fourth           = "4" ["th"] | "fourth"

(* Common words with abbreviations *)
inning           = "inning" | "i"
half             = "half" | "h"
quarter          = "quarter" | "q"
hockey_period    = "period" | "p"

(* Team and period patterns *)
team             = [("49" | "76")] (letter | "&" | " ")+
teams            = team "/" team                              (* Both teams must be different *)
match            = (teams | team) [game_number]              (* Game number can also appear before match in message structure *)

(* Period patterns - flexible combinations *)
period           = (first (inning | half | quarter | hockey_period | "five" | "5")) |
                   (second (inning | half | quarter | hockey_period)) |
                   (third (quarter | hockey_period)) |
                   (fourth quarter) |
                   "f5" | "f3" | "f7" | "h1" | "1h" | "h2" | "2h" |
                   "q1" | "1q" | "q2" | "2q" | "q3" | "3q" | "q4" | "4q" |
                   "p1" | "1p" | "p2" | "2p" | "p3" | "3p"

(* Bet pricing - optional for both orders and fills, defaults to -110 *)
bet_price        = "@" usa_price
```

### Contract Types
```ebnf
(* 1. Game Totals *)
game_total       = match [period] over_under

(* 2. Team Totals *)
team_total       = team [game_number] [period] "TT" over_under

(* 3. Moneylines *)
moneyline        = team

(* 4. Spreads *)
spread           = team ("+" | "-") line

(* 5. Props *)
prop             = prop_ou | prop_yn
prop_ou          = team prop_ou_type over_under
prop_yn          = team prop_yn_type

(* Prop types with over/under lines *)
prop_ou_type     = passing_yards | rbi | rebounds | receiving_yards | ks

(* Prop types with yes/no outcomes *)
prop_yn_type     = last_to_score | first_to_score

passing_yards    = "passing yards" | "passingyards"
rbi              = "rbi" | "rbis"
rebounds         = "rebounds" | "rebs"
receiving_yards  = "receiving yards" | "receivingyards"
ks               = "ks" | "strikeouts"
last_to_score    = "last" ("to score" | "team to score")
first_to_score   = (first ("to score" | "team to score"))

(* 6. Series *)
series           = team "series" [series_suffix]
series_suffix    = "out of" digit+ |                  (* "out of 4" *)
                   digit+ "game series" |             (* "4 game series" *)
                   digit+ "-game series" |            (* "7-Game Series" *)
                   "/" digit+                         (* "series/5" *)
                                                      (* defaults to "out of 3" if not specified *)

(* 7. Writeins *)
writein          = "writein" writein_date writein_description
writein_date     = yyyy_mm_dd | mm_dd_yyyy | yyyy_mm_dd_alt | mm_dd_yyyy_alt | mm_dd | mm_dd_alt
writein_description = (letter | digit | " " | punctuation)+    (* 10-255 characters, no newlines *)

(* Date formats with smart year inference *)
yyyy_mm_dd       = digit digit digit digit "/" digit+ "/" digit+     (* YYYY/MM/DD *)
mm_dd_yyyy       = digit+ "/" digit+ "/" digit digit digit digit     (* MM/DD/YYYY *)
yyyy_mm_dd_alt   = digit digit digit digit "-" digit+ "-" digit+     (* YYYY-MM-DD *)
mm_dd_yyyy_alt   = digit+ "-" digit+ "-" digit digit digit digit     (* MM-DD-YYYY *)
mm_dd            = digit+ "/" digit+                                 (* MM/DD - infers year *)
mm_dd_alt        = digit+ "-" digit+                                 (* MM-DD - infers year *)
```

### Examples by Contract Type

#### Chat Bets (Orders)
**Game Totals**
- `IW Padres/Pirates 1st inning u0.5 @ +100` (no size - order only)
- `IW ATH/SF F5 o4.5 @ -117 = 2.7` (with unit_size = $2.70 literal)
- `IW KC F7 o6.5 @ -115 = 1.0` (first seven innings with unit_size = $1.00 literal)
- `IW 507 Thunder/Nuggets o213.5` (no price, no size)
- `IW G1 St. Louis/PHI o8.5 @ -110` (game number before teams)
- `IW # 2 COL/ARI F5 u5 @ -105` (game number with space before teams)

**Team Totals**
- `IW LAA TT o3.5 @ -115.5` (no size - order only)
- `IW MIA F5 TT u1.5 @ -110 = 1.0` (with unit_size = $1.00 literal)
- `IW G2 SEA TT u4.5 @ -110` (game number before team)
- `IW # 3 LAA TT o3.5 @ -115` (game number with space before team)

**Moneylines**
- `IW 872 Athletics @ +145` (no size - order only)
- `IW 872 Athletics @ +145 = 4.0` (with unit_size = $4.00 literal)

**Spreads**
- `IW 870 Mariners -1.5 +135` (no size - order only)
- `IW 871 Rangers +1.5 -125 = 3.0` (with unit_size = $3.00 literal)

**Props (Over/Under)**
- `IW Player123 passing yards o250.5 @ -115` (no size - order only)
- `IW Player456 rebounds o12.5 @ -110 = 2.0` (with unit_size = $2.00 literal)
- `YG Player789 rbi o1.5 @ -105 = 1.5` (decimal_thousands_size = $1,500)

**Props (Yes/No)**
- `IW CIN 1st team to score @ -115` (no size - order only)
- `IW CHC last team to score @ -139 = 0.50` (with unit_size = $0.50 literal)
- `YG CIN 1st team to score @ -115 = 0.563` (decimal_thousands_size = $563)
- `YG CHC last team to score @ -139 = 0.35` (decimal_thousands_size = $350)
- `YG CIN first team to score @ -109.8 = $265` (dollar_size = $265 literal)

**Series Bets**
- `IW 852 Guardians series @ -105` (no size - order only, default 3-game series)
- `IW 854 Yankees 4 game series @ +110 = 1.0` (with unit_size = $1.00 literal)
- `IW 856 Red Sox series out of 4 @ -120 = 2.0` (with unit_size = $2.00 literal)
- `IW Lakers 7-Game Series @ +120 = 1.0` (with unit_size = $1.00 literal)
- `IW 856 St. Louis Cardinals series/5 @ -120 = 2.0` (with unit_size = $2.00 literal)

**Writein Contracts**
- `IW writein 2024-12-25 Christmas Day game will go to overtime @ +200` (no size - order only)
- `IWW 2024-12-25 Christmas Day game will go to overtime @ +200` (shorthand for "IW writein")
- `IW writein 12/31/2024 New Year's Eve total points over 250 @ -110 = 5.0` (with unit_size = $5.00 literal)
- `IW writein 03/15 March Madness upset in first round @ +300 = 2.5` (MM/DD format, infers year)
- `IW writein 6-1 June trade deadline blockbuster deal @ +150 = 1.0` (MM-DD format, infers year)

#### Chat Fills (Executed Bets)
**Game Totals**
- `YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094` (decimal_thousands_size = $94)
- `YG ATH/SF F5 o4.5 @ -117 = 2.7` (decimal_thousands_size = $2,700)
- `YG KC F7 o6.5 @ -115 = 1.5` (first seven innings, decimal_thousands_size = $1,500)
- `YG 507 Thunder/Nuggets o213.5 @ 2k` (k_size = $2,000)
- `YG COL/ARI #2 1st inning u0.5 @ +120 = $200` (dollar_size = $200 literal)
- `YG G2 COL/ARI 1st inning u0.5 @ +120 = 2.0` (game number before teams)
- `YG GM 1 CLE/WAS 1st inning o0.5 runs = 1.0` (game number with space before teams)

**Team Totals**
- `YG LAA TT o3.5 @ -115.5 = 8.925` (decimal_thousands_size = $8,925)
- `YG MIA F5 TT u1.5 @ -110 = 1.0` (decimal_thousands_size = $1,000)
- `YG SEA G2 TT u4.5 @ -110 = 1.5k` (k_size = $1,500)
- `YG G 2 SEA TT u4.5 @ -110 = 1.0` (game number with space before team)

**Moneylines**
- `YG 872 Athletics @ 4k` (k_size = $4,000, default price -110)
- `YG KC F7 @ +125 = 2.0` (first seven innings moneyline, decimal_thousands_size = $2,000)
- `YG 872 Athletics +145 @ $500` (dollar_size = $500 literal)

**Spreads**
- `YG 870 Mariners -1.5 +135 @ 2.5k` (k_size = $2,500)
- `YG 871 Rangers +1.5 -125 @ 1.5k` (k_size = $1,500)

**Props (Over/Under)**
- `YG Player123 passing yards o250.5 @ -115` (no size - order only)
- `YG Player456 rebounds o12.5 @ -110` (no size - order only)

**Series Bets**
- `YG 852 Guardians series @ -105 = 3k` (k_size = $3,000, default 3-game series)
- `YG 854 Yankees 4 game series @ +110 = 1k` (k_size = $1,000)
- `YG 856 Red Sox series out of 4 @ -120 = 2.0` (decimal_thousands_size = $2,000)
- `YG Lakers 7-Game Series @ +120 = 1.0` (decimal_thousands_size = $1,000)
- `YG 856 St. Louis Cardinals series/5 @ -120 = 2.0` (decimal_thousands_size = $2,000)

**Props (Yes/No)**
- `YG CIN 1st team to score @ -115 = 0.563` (decimal_thousands_size = $563)
- `YG CHC last to score @ -139 = 0.35` (decimal_thousands_size = $350)
- `YG CIN first team to score @ -109.8 = $265` (dollar_size = $265 literal)

**Writein Contracts**
- `YG writein 2024-12-25 Christmas Day game will go to overtime @ +200 = 1.5` (decimal_thousands_size = $1,500)
- `YGW 2024-12-25 Christmas Day game will go to overtime @ +200 = 1.5` (shorthand for "YG writein")
- `YG writein 12/31/2024 New Year's Eve total points over 250 @ -110 = 5.0` (decimal_thousands_size = $5,000)
- `YG writein 03/15 March Madness upset in first round @ +300 = 2.5k` (k_size = $2,500)
- `YG writein 6-1 June trade deadline blockbuster deal @ +150 = $1000` (dollar_size = $1,000 literal)

#### Parlays (YGP/IWP)

**Basic Parlays - Ampersand Syntax**
- `YGP Lakers @ +120 & Warriors @ -110 = $100` (2-leg parlay, fair odds)
- `YGP Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100` (3-leg parlay)
- `IWP Lakers @ +120 & Warriors @ -110` (parlay order, no size)

**Parlays with To-Win Override**
- `YGP Lakers @ +120 & Warriors @ -110 = $100 tw $500` (custom payout, not fair odds)
- `YGP Lakers @ +100 & Warriors @ -110 & Celtics @ +120 = $100 tw $750`

**Parlays with Optional Flags**
- `YGP pusheslose:true Lakers @ +120 & Warriors @ -110 = $100` (pushes reduce parlay)
- `YGP freebet:true Lakers @ +120 & Warriors @ -110 = $50` (free bet parlay)
- `YGP pusheslose:true freebet:true Lakers @ +120 & Warriors @ -110 = $50` (multiple flags)

**Parlays with Leg Properties**
- `YGP 872 Cardinals/Cubs o8.5 @ -110 & 701 Lakers @ +120 = $100` (rotation numbers)
- `YGP Cardinals/Cubs G1 o8.5 @ -110 & Lakers @ +120 = $100` (game number on leg 1)
- `YGP 5/14 Lakers @ +120 & 5/15 Warriors @ -110 = $100` (dates per leg)
- `YGP MLB Cardinals @ +150 & NBA Lakers @ +120 = $100` (leagues per leg)
- `YGP Cardinals/Cubs F5 o4.5 @ -110 & Dodgers F5 @ +120 = $100` (periods)

**Multiline Parlay Format**
```
YGP
Lakers @ +120
Warriors @ -110
Celtics @ +105
= $100
```

```
YGP pusheslose:true freebet:true
Lakers @ +120
Warriors @ -110
= $100 tw $800
```

#### Round Robins (YGRR/IWRR)

**Basic Round Robins - nCr Notation**
- `YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per` (4 teams, 2-leg parlays, $100 per parlay)
- `YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $600 total` (4 teams, 2-leg parlays, $600 total risk)
- `YGRR 5c3 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $50 per` (5 teams, 3-leg parlays)
- `IWRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115` (order, no size)

**Round Robins with At-Most Modifier**
- `YGRR 4c3- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per` (2-leg and 3-leg parlays)
- `YGRR 5c4- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $50 total` (2-leg, 3-leg, and 4-leg parlays)

**Round Robins with To-Win Override**
- `YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per tw $800`
- `YGRR 5c3- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $50 total tw $1200`

**Round Robins with Optional Flags**
- `YGRR pusheslose:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per`
- `YGRR freebet:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per`
- `YGRR pusheslose:true freebet:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per`

**Multiline Round Robin Format**
```
YGRR 4c2
Lakers @ +120
Warriors @ -110
Celtics @ +105
Nets @ +115
= $100 per
```

```
YGRR pusheslose:true freebet:true 5c3-
Lakers @ +120
Warriors @ -110
Celtics @ +105
Nets @ +115
Heat @ -105
= $50 total tw $1000
```

### Size Interpretation Rules

#### Chat Bets (Orders)
| Format | Example | Interpretation |
|--------|---------|---------------|
| Unit size | `2.0` | `$2.00` (literal) |
| Unit size | `0.50` | `$0.50` (literal) |
| Unit size | `4.75` | `$4.75` (literal) |

#### Chat Fills (Executed Bets)
| Format | Example | Interpretation |
|--------|---------|---------------|
| Decimal thousands | `2.0` | `$2,000` (× 1000) |
| Decimal thousands | `0.563` | `$563` (× 1000) |
| K-notation | `4k` | `$4,000` |
| K-notation | `2.5k` | `$2,500` |
| Dollar amount | `$200` | `$200` (literal) |
| Dollar amount | `$2.0` | `$2` (literal) |

### Special Rules

- **Case Insensitivity**: All text patterns are matched case insensitively
- **Rotation Numbers**: Must appear immediately after "YG" when present
- **Game Numbers**: Can appear before or after teams/team with patterns `g1`, `gm2`, `#2`, `g 1`, `gm 2`, `# 2` (case insensitive, optional spaces)
- **Default Price**: `-110` when price omitted in k-notation bets
- **Line Validation**: Must be divisible by 0.5
- **Team Validation**: In team matchups (Team1/Team2 format), both teams must be different
- **Event Dates on Straight Bets**:
  - **Positional Syntax**: Date can appear after YG/IW prefix and before/after league
  - **Keyword Syntax**: Use `date:` prefix (e.g., `date:5/14/25`)
  - **Same Formats**: Supports all writein date formats (see below)
  - **Optional**: Event dates are optional on YG/IW (required on YGW/IWW)
- **Parlay Rules**:
  - **Minimum Legs**: Parlays require at least 2 legs
  - **Leg Separator**: Use `&` (ampersand) to separate legs
  - **Multiline Format**: Each leg on separate line, size line starts with `=`
  - **Optional Flags**: `pusheslose:true`, `tieslose:true` (synonym), `freebet:true`
  - **To-Win Override**: Use `tw $amount` after size to specify custom payout
  - **Fair Odds**: When to-win not specified, calculate from leg prices (`useFair = true`)
  - **Leg Properties**: Each leg can have its own date, league, rotation number, period
- **Round Robin Rules**:
  - **nCr Notation**: Format `NcR` where N=total legs, R=parlay size (e.g., `4c2`)
  - **At-Most Modifier**: Trailing `-` generates all parlay sizes from 2 to R (e.g., `4c3-`)
  - **Risk Type Required**: Must specify `per` (per selection) or `total` (total risk)
  - **Minimum Legs**: Round robins require at least 3 legs
  - **Validation**: Actual leg count must match N in nCr notation
  - **Same Features**: Supports same flags, to-win override, and leg properties as parlays
- **Prop Distinction**:
  - **PropOU** (PassingYards, RBI, Rebounds, ReceivingYards, Ks): MUST have over/under line
  - **PropYN** (FirstToScore, LastToScore): MAY NOT have line, Yes/No outcome only
- **Writein Rules**:
  - **Date Requirement**: Date must be the first token after "writein"
  - **Date Formats**: Supports YYYY-MM-DD, MM/DD/YYYY, YYYY/MM/DD, MM-DD-YYYY, MM/DD, MM-DD
  - **Smart Year Inference**: For dates without year (MM/DD, MM-DD):
    - If date is today or future: uses current year
    - If date is in the past: uses next year
  - **Date Validation**: Rejects invalid calendar dates (e.g., February 30th)
  - **Description Length**: Must be 10-255 characters, no newlines allowed
  - **Case Insensitive**: "writein", "WRITEIN", "WriteIn" all accepted
- **Period Mapping**:
  - `first inning`, `1st inning`, `first i`, `1st i` → `I1`
  - `first half`, `1st half`, `first h`, `1st h` → `H1`
  - `first five`, `1st five`, `first 5`, `1st 5`, `f5`, `h1`, `1h` → `H1`
  - `first seven`, `f7` → `H17` (first seven innings)
  - `second half`, `2nd half`, `second h`, `2nd h`, `2h` → `H2`
  - Default (no period) → `M0`

## API

### `parseChat(message: string, options?: ParseOptions)`

The main entry point that automatically detects the message type and delegates to the appropriate parser:

- **Straight Bet Orders** (starting with "IW"): Delegates to `parseChatOrder()`
- **Straight Bet Fills** (starting with "YG"): Delegates to `parseChatFill()`
- **Parlay Orders** (starting with "IWP"): Parses parlay orders
- **Parlay Fills** (starting with "YGP"): Parses parlay fills
- **Round Robin Orders** (starting with "IWRR"): Parses round robin orders
- **Round Robin Fills** (starting with "YGRR"): Parses round robin fills
- **Writein Orders** (starting with "IWW"): Shorthand for `IW writein`
- **Writein Fills** (starting with "YGW"): Shorthand for `YG writein`

**Returns**: A discriminated union with two discriminators (`chatType` and `betType`):
```typescript
type ParseResult = ParseResultStraight | ParseResultParlay | ParseResultRoundRobin;

// Two discriminators for flexible type narrowing:
// - chatType: 'order' | 'fill'  (whether it's an order or executed bet)
// - betType: 'straight' | 'parlay' | 'roundRobin'  (bet structure)
```

**ParseOptions**:
```typescript
interface ParseOptions {
  referenceDate?: Date;  // For date inference (defaults to current date)
}
```

### Type Guards

Use type guards to discriminate between result types. You can narrow by **bet type** or **chat type**:

```typescript
import { isStraight, isParlay, isRoundRobin, isOrder, isFill } from 'chat-bet-parse';

const result = parseChat(input);

// Discriminate by BET TYPE
if (isStraight(result)) {
  // result is ParseResultStraight
  console.log(result.betType); // 'straight'
  console.log(result.contractType);
  console.log(result.contract);
}

if (isParlay(result)) {
  // result is ParseResultParlay
  console.log(result.betType); // 'parlay'
  console.log(result.legs);
  console.log(result.useFair);
  console.log(result.pushesLose);
}

if (isRoundRobin(result)) {
  // result is ParseResultRoundRobin
  console.log(result.betType); // 'roundRobin'
  console.log(result.legs);
  console.log(result.parlaySize);
  console.log(result.isAtMost);
  console.log(result.riskType);
}

// Discriminate by CHAT TYPE
if (isOrder(result)) {
  // result has chatType === 'order'
  console.log(result.bet.Size); // May be undefined
  console.log(result.bet.ExecutionDtm); // undefined (no execution time for orders)
}

if (isFill(result)) {
  // result has chatType === 'fill'
  console.log(result.bet.ExecutionDtm); // Date object
  if (isStraight(result)) {
    console.log(result.bet.Size); // Required for straight fills
  } else {
    console.log(result.bet.Risk); // For parlay/round robin fills
  }
}
```

### Result Type Structures

All parse results share a common base with two discriminators:

```typescript
// Base interface for all results
interface ParseResultBase {
  chatType: 'order' | 'fill';  // Discriminator 1: order vs fill
  betType: 'straight' | 'parlay' | 'roundRobin';  // Discriminator 2: bet structure
  bet: Bet;  // Unified bet object (fields vary by chatType and betType)
}

// Unified bet object
interface Bet {
  // Primary fields - USE THESE
  Risk?: number;     // Always populated when size/risk specified (all bet types)
  ToWin?: number;    // Always populated when size/risk specified (all bet types)

  // Deprecated fields - kept for backward compatibility only
  /** @deprecated Use Risk/ToWin instead */
  Price?: number;    // USA odds (straight bets only)
  /** @deprecated Use Risk/ToWin instead */
  Size?: number;     // Straight bets only (optional for orders, required for fills)

  // Common fields
  ExecutionDtm?: Date;   // Fills only (all betTypes)
  IsFreeBet?: boolean;   // All types
}
```

**ParseResultStraight** (Straight Bets):
```typescript
interface ParseResultStraight extends ParseResultBase {
  betType: 'straight';
  contractType: ContractType;  // e.g., 'TotalPoints', 'HandicapContestantML'
  contract: Contract;           // The actual contract details
  rotationNumber?: number;
}
```

**ParseResultParlay** (Parlays):
```typescript
interface ParseResultParlay extends ParseResultBase {
  betType: 'parlay';
  useFair: boolean;       // true = calculate fair odds, false = custom to-win
  pushesLose?: boolean;   // from "pusheslose:true" or "tieslose:true"
  legs: Array<ParseResultStraight>;  // Each leg is a straight bet
}
```

**ParseResultRoundRobin** (Round Robins):
```typescript
interface ParseResultRoundRobin extends ParseResultBase {
  betType: 'roundRobin';
  parlaySize: number;              // From nCr notation (e.g., 2 from "4c2")
  isAtMost: boolean;               // From trailing "-" (e.g., true from "4c3-")
  riskType: 'perSelection' | 'total';  // Required for fills
  useFair: boolean;
  pushesLose?: boolean;
  legs: Array<ParseResultStraight>;
}
```

### Legacy Parser Functions

These functions are still available but `parseChat()` is recommended:

#### `parseChatOrder(message: string, options?: ParseOptions)`

Parses chat orders (IW messages) where size is optional and interpreted as literal units.

#### `parseChatFill(message: string, options?: ParseOptions)`

Parses chat fills (YG messages) where size is required and decimal values are interpreted as thousands.

## Contract Grading

The package includes optional SQL Server integration for grading parsed contracts against actual game outcomes. This functionality requires a licensed connection to Scapeshift's SQL Server database.

**Supported grading types:**
- **Game Totals**: Over/under on total points scored
- **Team Totals**: Over/under on team-specific points
- **Moneylines**: Straight win/loss outcomes
- **Spreads**: Point spread with handicap lines
- **Series**: Multi-game series outcomes
- **Props**: Player/team proposition bets (basic implementation)
- **Writeins**: Custom event contracts with user-defined descriptions

**Grade results:**
- `'W'` - Win
- `'L'` - Loss
- `'P'` - Push (tie)
- `'?'` - Unable to grade (missing data, incomplete game, etc.)

### SQL Server Function

The grading functionality is powered by the `dbo.Contract_CALCULATE_Grade_fn` SQL Server function which is deployed on Scapeshift's SQL Server database:

```sql

**Function Signature:**
```sql
dbo.Contract_CALCULATE_Grade_fn(
    @MatchScheduledDate DATE,
    @Contestant1 CHAR(50),
    @Contestant2 CHAR(50) = NULL,
    @DaySequence TINYINT = NULL,
    @MatchContestantType CHAR(10) = NULL,
    @PeriodTypeCode CHAR(2),
    @PeriodNumber TINYINT,
    @ContractType VARCHAR(30),
    @Line DECIMAL(5,2) = NULL,
    @IsOver BIT = NULL,
    @SelectedContestant CHAR(50) = NULL,
    @TiesLose BIT = 0,
    @Prop VARCHAR(20) = NULL,
    @PropContestantType CHAR(10) = NULL,
    @IsYes BIT = NULL,
    @SeriesLength TINYINT = NULL,
    @EventDate DATE = NULL,
    @WriteInDescription VARCHAR(255) = NULL
) RETURNS CHAR(1)
```

**Valid Contestant Types:**
- **Individual**: Individual competitors (e.g., tennis players, golfers)
- **TeamAdHoc**: Teams that register to play a single event together (e.g., doubles tennis pairs)
- **TeamLeague**: Teams that play together as a unit across multiple events (e.g., MLB teams, NBA teams)

**Contract Types Supported:**
- **TotalPoints**: Game total over/under bets
- **TotalPointsContestant**: Team total over/under bets
- **HandicapContestantML**: Moneyline (straight win/loss) bets
- **HandicapContestantLine**: Point spread bets
- **PropOU**: Proposition over/under bets
- **PropYN**: Proposition yes/no bets
- **Series**: Multi-game series outcome bets
- **Writein**: Custom event contracts with user-defined descriptions

**Implementation Notes:**
- PropYN grading may require enhancement for specific prop types
- Series grading requires all games in the series to be completed
- Function only accepts unambiguous contestant name matches

See [src/grading/README.md](src/grading/README.md) for detailed grading documentation.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build package
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

## License

MIT
