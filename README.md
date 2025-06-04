# chat-bet-parse

A TypeScript npm package for parsing sports betting chat messages into structured data types compatible with SQL Server stored procedures. Supports both chat orders (IW - "I want") and chat fills (YG - "You got") across multiple sports including MLB and NBA.

## Features

- 🏈 **Multi-sport support** - MLB, NBA, and extensible for additional sports
- 📝 **Rich parsing** - Handles various chat betting syntax formats for both orders and fills
- 🔒 **Type-safe** - Full TypeScript support with discriminated unions
- 🗃️ **SQL Server ready** - Types designed for stored procedure integration
- ⚡ **Fast & lightweight** - Zero runtime dependencies
- 🧪 **Well tested** - Comprehensive test suite with 100% coverage

## Installation

```bash
npm install chat-bet-parse
```

## Quick Start

```typescript
import { parseChat } from 'chat-bet-parse';

// Parse a chat fill (executed bet)
const fillResult = parseChat(
  'YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094'
);

console.log(fillResult.chatType); // 'fill'
console.log(fillResult.contractType); // 'TotalPoints'
console.log(fillResult.bet.Size); // 94
console.log(fillResult.contract.Line); // 0.5

// Parse a chat order
const orderResult = parseChat(
  'IW Padres/Pirates 1st inning u0.5 @ +100'
);

console.log(orderResult.chatType); // 'order'
console.log(orderResult.contractType); // 'TotalPoints'
console.log(orderResult.bet.Size); // undefined (no size specified)
```

## API

### `parseChat(message: string)`

The main entry point that automatically detects the message type and delegates to the appropriate parser:

- **Chat Orders** (starting with "IW"): Delegates to `parseChatOrder()`
- **Chat Fills** (starting with "YG"): Delegates to `parseChatFill()`

**Returns**: A discriminated union with a `type` field:
```typescript
type ParseResult = 
  | { chatType: 'order'; /* order-specific fields */ }
  | { chatType: 'fill'; /* fill-specific fields */ }
```

### `parseChatOrder(message: string)`

Parses chat orders (IW messages) where size is optional and interpreted as literal units.

### `parseChatFill(message: string)`

Parses chat fills (YG messages) where size is required and decimal values are interpreted as thousands.

## Syntax Grammar (EBNF)

**Note**: All pattern matching is case insensitive unless otherwise specified.

### Basic Structure
```ebnf
message          = iw_details | yg_details
iw_details       = "IW" [rotation_number] chat_order    (* Orders *)
yg_details       = "YG" [rotation_number] chat_fill   (* Fills *)

chat_order       = contract [bet_price] ["=" unit_size]          (* Orders: price and size optional *)
chat_fill        = contract [bet_price] "=" fill_size            (* Fills: price optional, size required *)

contract         = game_total | team_total | moneyline | spread | prop | series
```

### Core Patterns
```ebnf
(* Rotation number must come immediately after YG if present *)
rotation_number  = digit+

(* Game number patterns: g2, gm1, #2 *)
game_number      = (("g" ["m"]) | "#") digit+

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
teams            = team "/" team
match            = (teams | team) [game_number]

(* Period patterns - flexible combinations *)
period           = (first (inning | half | quarter | hockey_period | "five" | "5")) | 
                   (second (inning | half | quarter | hockey_period)) |
                   (third (quarter | hockey_period)) |
                   (fourth quarter) |
                   "f5" | "h1" | "1h" | "h2" | "2h" |
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
series_suffix    = "out of" digit+                (* defaults to "out of 3" if not specified *)
```

### Examples by Contract Type

#### Chat Bets (Orders)
**Game Totals**
- `IW Padres/Pirates 1st inning u0.5 @ +100` (no size - order only)
- `IW ATH/SF F5 o4.5 @ -117 = 2.7` (with unit_size = $2.70 literal)
- `IW 507 Thunder/Nuggets o213.5` (no price, no size)

**Team Totals**
- `IW LAA TT o3.5 @ -115.5` (no size - order only)
- `IW MIA F5 TT u1.5 @ -110 = 1.0` (with unit_size = $1.00 literal)

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
- `YG 852 Guardians series -105 @ 3k` (k_size = $3,000, default 3-game series)
- `YG 854 Yankees 4 game series +110 @ 1k` (k_size = $1,000)
- `YG 856 Red Sox series out of 4 -120 @ 2.0` (decimal_thousands_size = $2,000)

#### Chat Fills (Executed Bets)
**Game Totals**
- `YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094` (decimal_thousands_size = $94)
- `YG ATH/SF F5 o4.5 @ -117 = 2.7` (decimal_thousands_size = $2,700)
- `YG 507 Thunder/Nuggets o213.5 @ 2k` (k_size = $2,000)
- `YG COL/ARI #2 1st inning u0.5 @ +120 = $200` (dollar_size = $200 literal)

**Team Totals**
- `YG LAA TT o3.5 @ -115.5 = 8.925` (decimal_thousands_size = $8,925)
- `YG MIA F5 TT u1.5 @ -110 = 1.0` (decimal_thousands_size = $1,000)
- `YG SEA G2 TT u4.5 @ -110 = 1.5k` (k_size = $1,500)

**Moneylines**
- `YG 872 Athletics @ 4k` (k_size = $4,000, default price -110)
- `YG 872 Athletics +145 @ $500` (dollar_size = $500 literal)

**Spreads**
- `YG 870 Mariners -1.5 +135 @ 2.5k` (k_size = $2,500)
- `YG 871 Rangers +1.5 -125 @ 1.5k` (k_size = $1,500)

**Props (Over/Under)**
- `YG Player123 passing yards o250.5 @ -115` (no size - order only)
- `YG Player456 rebounds o12.5 @ -110` (no size - order only)

**Props (Yes/No)**
- `YG CIN 1st team to score @ -115` (no size - order only)
- `YG CHC last to score @ -139` (no size - order only)

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
- **Game Numbers**: Patterns `g1`, `gm2`, `#2` (case insensitive)
- **Default Price**: `-110` when price omitted in k-notation bets
- **Line Validation**: Must be divisible by 0.5
- **Prop Distinction**: 
  - **PropOU** (PassingYards, RBI, Rebounds, ReceivingYards, Ks): MUST have over/under line
  - **PropYN** (FirstToScore, LastToScore): MAY NOT have line, Yes/No outcome only
- **Period Mapping**: 
  - `first inning`, `1st inning`, `first i`, `1st i` → `I1`
  - `first half`, `1st half`, `first h`, `1st h` → `H1`
  - `first five`, `1st five`, `first 5`, `1st 5`, `f5`, `h1`, `1h` → `H1` 
  - `second half`, `2nd half`, `second h`, `2nd h`, `2h` → `H2`
  - Default (no period) → `M0`

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