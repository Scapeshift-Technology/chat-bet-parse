# chat-bet-parse

A TypeScript npm package for parsing sports betting chat messages into structured data types compatible with SQL Server stored procedures. Supports both chat orders (IW - "I want") and chat fills (YG - "You got") across multiple sports including MLB and NBA, with optional auto-grading functionality against real game results.

## Features

- 🏈 **Multi-sport support** - MLB, NBA, and extensible for additional sports
- 📝 **Rich parsing** - Handles various chat betting syntax formats for both orders and fills
- 🔒 **Type-safe** - Full TypeScript support with discriminated unions
- 🗃️ **SQL Server ready** - Types designed for stored procedure integration
- ⚡ **Fast & lightweight** - Zero runtime dependencies for parsing
- 🏆 **Contract grading** - SQL Server integration for grading parsed contracts (optional)
- 🧪 **Well tested** - Comprehensive test suite with 100% coverage

## Installation

```bash
npm install chat-bet-parse
```

For grading functionality (optional):
```bash
npm install chat-bet-parse mssql
```

## Quick Start

### Parsing

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

// Parse a writein contract
const writeinResult = parseChat(
  'YG writein 2024-12-25 Christmas Day game will go to overtime @ +200 = 1.5'
);

console.log(writeinResult.chatType); // 'fill'
console.log(writeinResult.contractType); // 'Writein'
console.log(writeinResult.contract.EventDate); // Date object for 2024-12-25
console.log(writeinResult.contract.Description); // 'Christmas Day game will go to overtime'
console.log(writeinResult.bet.Size); // 1500
```

### Grading (Optional)

```typescript
import { parseChat, ChatBetGradingClient } from 'chat-bet-parse';

// Initialize grading client (requires Scapeshift SQL Server database)
const gradingClient = new ChatBetGradingClient(
  'Server=your-server;Database=your-db;User Id=user;Password=pass;'
);

// Parse and grade a bet
const result = parseChat('YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094');
const grade = await gradingClient.grade(result);
console.log('Bet result:', grade); // 'W', 'L', 'P', or '?'

await gradingClient.close();
```

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

**Example SQL Usage:**
```sql
SELECT dbo.Contract_CALCULATE_Grade_fn(
    '2024-01-15',           -- MatchScheduledDate
    'Yankees',              -- Contestant1  
    'Red Sox',              -- Contestant2
    NULL,                   -- DaySequence (for doubleheaders)
    'TeamLeague',           -- MatchContestantType
    'FG',                   -- PeriodTypeCode (Full Game)
    1,                      -- PeriodNumber
    'TotalPoints',          -- ContractType
    9.5,                    -- Line
    1,                      -- IsOver (1 for over, 0 for under)
    NULL,                   -- SelectedContestant (for team totals)
    0,                      -- TiesLose
    NULL,                   -- Prop (for prop bets)
    NULL,                   -- PropContestantType
    NULL,                   -- IsYes (for yes/no props)
    NULL,                   -- SeriesLength (for series bets)
    NULL,                   -- EventDate (for writein contracts)
    NULL                    -- WriteInDescription (for writein contracts)
) as Grade;

-- Example: Writein contract grading
SELECT dbo.Contract_CALCULATE_Grade_fn(
    NULL,                   -- MatchScheduledDate (not used for writeins)
    NULL,                   -- Contestant1 (not used for writeins)
    NULL,                   -- Contestant2 (not used for writeins)
    NULL,                   -- DaySequence
    NULL,                   -- MatchContestantType
    'M',                    -- PeriodTypeCode (default)
    0,                      -- PeriodNumber (default)
    'Writein',              -- ContractType
    NULL,                   -- Line (not used for writeins)
    NULL,                   -- IsOver (not used for writeins)
    NULL,                   -- SelectedContestant (not used for writeins)
    0,                      -- TiesLose
    NULL,                   -- Prop (not used for writeins)
    NULL,                   -- PropContestantType
    NULL,                   -- IsYes (not used for writeins)
    NULL,                   -- SeriesLength (not used for writeins)
    '2024-12-25',           -- EventDate
    'Christmas Day game will go to overtime'  -- WriteInDescription
) as Grade;
```

**Implementation Notes:**
- PropYN grading may require enhancement for specific prop types
- Series grading requires all games in the series to be completed
- Function only accepts unambiguous contestant name matches

See [src/grading/README.md](src/grading/README.md) for detailed grading documentation.

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
iw_details       = "IW" [rotation_number] [game_number] chat_order    (* Orders *)
yg_details       = "YG" [rotation_number] [game_number] chat_fill   (* Fills *)
                   (* "IWW" and "YGW" are shorthands for "IW writein" and "YG writein" *)

chat_order       = contract [bet_price] ["=" unit_size]          (* Orders: price and size optional *)
chat_fill        = contract [bet_price] "=" fill_size            (* Fills: price optional, size required *)

contract         = game_total | team_total | moneyline | spread | prop | series | writein
```

### Core Patterns
```ebnf
(* Rotation number must come immediately after YG if present *)
rotation_number  = digit+

(* Game number patterns: g2, gm1, #2, g 2, gm 1, # 2 *)
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