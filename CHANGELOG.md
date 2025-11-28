# chat-bet-parse

## 0.6.9

### Patch Changes

- **Support for Team Names Starting with Numbers (49ers, 76ers)**: Fixed parser regex patterns to correctly handle team names that start with "49" or "76", such as "49ers" and "76ers".

  ### 🎯 Problem Solved

  Previously, the parser failed to recognize team names starting with digits in single-team game total formats, causing parse errors.

  **Before:**
  ```typescript
  const result = parseChat('YG NBA 11/28/2025 76ers u226.5 @ -115 = 1k');
  // ❌ InvalidContractTypeError: Unable to determine contract type
  ```

  **After:**
  ```typescript
  const result = parseChat('YG NBA 11/28/2025 76ers u226.5 @ -115 = 1k');
  // ✅ Successfully parses as TotalPoints contract
  console.log(result.contract.Match.Contestant1_RawName); // "76ers"
  console.log(result.contract.Line); // 226.5
  ```

  ### 🔧 Technical Details

  Updated 5 regex patterns in the parser to allow optional "49" or "76" numeric prefixes:
  - Single team game total shorthand (`76ers u226.5`)
  - Single team with period (`76ers 1H u110`)
  - Period extraction for spreads, team totals, and game totals

  Pattern format: `(?:49|76)?[a-zA-Z\s&.-]+` allows optional "49" or "76" prefix followed by standard team name characters, preventing unintended matches while supporting these specific NFL/NBA teams.

  ### ✅ Impact

  - All 499 tests passing
  - Supports both "49ers" (NFL) and "76ers" (NBA) in all bet formats
  - Precise regex ensures no false positives with other numeric patterns

## 0.6.8

### Patch Changes

- **Automatic ToWin Calculation for Parlays and Round Robins**: When parsing parlays (YGP) and round robins (YGRR) with fair odds (`useFair: true`), the library now automatically calculates `bet.ToWin` from leg prices using fair parlay odds mathematics.

  ### 🎯 Problem Solved

  Previously, `bet.ToWin` was `undefined` for parlays and round robins when no explicit `tw` override was provided. This caused downstream errors in systems that expected both `Risk` and `ToWin` to be populated.

  **Before:**
  ```typescript
  const result = parseChat('YGP Lakers @ +120 & Warriors @ -110 = $100');
  console.log(result.bet.ToWin); // undefined ❌
  ```

  **After:**
  ```typescript
  const result = parseChat('YGP Lakers @ +120 & Warriors @ -110 = $100');
  console.log(result.bet.ToWin); // 320.00 ✅
  console.log(result.useFair);   // true
  ```

  ### 🚀 How It Works

  **Parlay Calculation:**
  1. Convert each leg's American odds to decimal odds (+120 → 2.20, -110 → 1.909090...)
  2. Multiply all decimal odds together to get parlay multiplier
  3. Calculate `ToWin = Risk × (multiplier - 1)`

  **Round Robin Calculation:**
  1. Generate all nCr combinations (or at-most combinations for notation like 4c3-)
  2. Calculate fair ToWin for each parlay combination
  3. Sum all ToWins for total expected payout

  ### 📚 Examples

  ```typescript
  // 2-leg parlay
  parseChat('YGP Lakers @ +120 & Warriors @ -110 = $100')
  // → { bet: { Risk: 100, ToWin: 320 }, useFair: true }

  // 3-leg parlay
  parseChat('YGP Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100')
  // → { bet: { Risk: 100, ToWin: 761 }, useFair: true }

  // Round robin with per-selection risk
  parseChat('YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per')
  // → { bet: { Risk: 600, ToWin: 1986.56 }, useFair: true, riskType: 'perSelection' }

  // With explicit tw override (not fair odds)
  parseChat('YGP Lakers @ +120 & Warriors @ -110 = $100 tw $500')
  // → { bet: { Risk: 100, ToWin: 500 }, useFair: false }
  ```

  ### ✅ Impact

  - `bet.ToWin` is now always populated for fills with fair odds
  - Use `useFair: true` to distinguish calculated ToWin from explicit overrides
  - All 497 tests passing

- **Correct Total Risk Calculation for Round Robins**: When parsing round robins with per-selection risk mode (e.g., `$100 per`), the library now correctly calculates total risk as `per-parlay risk × number of parlays`.

  ### 🎯 Problem Solved

  Previously, the library only returned the per-parlay risk amount instead of calculating the total risk across all parlays.

  **Before:**
  ```typescript
  const result = parseChat('YGRR 4c2 ... = $100 per');
  console.log(result.bet.Risk); // 100 ❌ (only per-parlay amount)
  ```

  **After:**
  ```typescript
  const result = parseChat('YGRR 4c2 ... = $100 per');
  console.log(result.bet.Risk); // 600 ✅ ($100 per × 6 parlays)
  ```

  ### 📚 Examples

  ```typescript
  // 4c2 = C(4,2) = 6 parlays
  parseChat('YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per')
  // → { bet: { Risk: 600 }, riskType: 'perSelection' }

  // 4c3- (at-most) = C(4,2) + C(4,3) = 6 + 4 = 10 parlays
  parseChat('YGRR 4c3- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per')
  // → { bet: { Risk: 1000 }, riskType: 'perSelection' }

  // Total risk mode (unchanged behavior)
  parseChat('YGRR 4c2 ... = $600 total')
  // → { bet: { Risk: 600 }, riskType: 'total' }
  ```

  ### 🔧 New Helper Functions

  - `calculateCombination(n, r)`: Calculates C(n,r) = "n choose r"
  - `calculateTotalParlays(totalLegs, parlaySize, isAtMost)`: Calculates total number of parlays
  - `americanToDecimalOdds(odds)`: Converts American odds to decimal
  - `calculateParlayFairToWin(legPrices, risk)`: Calculates fair ToWin for a single parlay
  - `calculateRoundRobinFairToWin(legPrices, risk, riskType, parlaySize, isAtMost)`: Calculates fair ToWin for all round robin combinations

  ### 📄 Migration Guide

  See `RECENT_CHANGES_FOR_UI.md` for detailed migration instructions for UI developers.

## 0.6.3

### Patch Changes

- **Timezone-Agnostic Date Handling**: All date parsing and creation now uses UTC to ensure consistent behavior across different server timezones

  ### 🎯 Problem Solved

  Previously, dates were created using local timezone (e.g., `new Date(year, month, day)`), which caused test failures when running in different timezones:
  - **Local (Eastern timezone)**: `2025-10-26T04:00:00.000Z` (midnight Eastern = 4am UTC)
  - **CI/CD (UTC timezone)**: `2025-10-26T00:00:00.000Z` (midnight UTC)

  ### 🚀 Solution

  All date creation now uses `Date.UTC()` to produce timezone-agnostic dates at midnight UTC:
  ```typescript
  // Before (timezone-dependent)
  new Date(2025, 9, 26) // Different results in different timezones

  // After (timezone-agnostic)
  new Date(Date.UTC(2025, 9, 26)) // Always 2025-10-26T00:00:00.000Z
  ```

  ### 📚 Files Modified

  - `src/parsers/utils.ts`: Updated date creation and validation to use UTC
  - `src/tracking/mappers.ts`: Updated ExecutionDtm extraction and fallback logic to use UTC
  - Test files: Updated expectations to use `Date.UTC()` and UTC getter methods
  - Test fixtures: Updated all date expectations from local time to UTC midnight

  ### ✅ Impact

  - Tests now pass consistently in any timezone (Eastern, UTC, PST, etc.)
  - Parser produces identical results regardless of server location
  - All 485 tests passing in both local and CI/CD environments

## 0.6.2

### Patch Changes

- **Tracking Mapper EventDate Priority Enhancement**: The tracking mapper now prioritizes dates embedded in bet text (`contract.Match.Date`) over execution timestamps when determining `EventDate`

  ### 🎯 EventDate Priority Order

  1. Writein contracts' explicit `EventDate`
  2. Caller-provided `options.eventDate`
  3. **Date parsed from bet text (`contract.Match.Date`)** ← NEW
  4. Date extracted from `ExecutionDtm` timestamp
  5. Today's date (fallback)

  ### 🚀 What Changed

  Before this fix, when parsing a bet like `"YG NBA 10/26/2025 Pacers u230 @ -110 = 1k"` executed on 10/25/2025, the mapper would use the execution date (10/25) instead of the date specified in the bet text (10/26).

  **Before:**
  ```typescript
  const result = parseChat('YG NBA 10/26/2025 Pacers u230 @ -110 = 1k');
  const spec = mapParseResultToContractLegSpec(result);
  // EventDate = 2025-10-25 (from ExecutionDtm) ❌
  ```

  **After:**
  ```typescript
  const result = parseChat('YG NBA 10/26/2025 Pacers u230 @ -110 = 1k');
  const spec = mapParseResultToContractLegSpec(result);
  // EventDate = 2025-10-26 (from bet text) ✅
  ```

  ### 🧪 Test Coverage

  - Added 11 new Date Handling tests covering:
    - Full date formats (MM/DD/YYYY)
    - Partial date formats (MM/DD) with referenceDate inference
    - Priority ordering verification (options.eventDate > Match.Date > ExecutionDtm)
    - All 485 tests passing

  ### 📚 Files Modified

  - `src/tracking/mappers.ts`: Added `contract.Match.Date` check in EventDate determination
  - `tests/unit/tracking.test.ts`: Added 7 new comprehensive Date Handling tests
  - `tests/fixtures/game-totals.fixtures.ts`: Added 4 NBA date parsing test cases

## 0.6.0

### Minor Changes

- **DEPRECATION: Grading Mapper Functions**: The grading mapper module (`src/grading/mappers.ts`) is now deprecated in favor of the tracking mapper module. The grading mapper now wraps the tracking mapper for backward compatibility.

  **Deprecated Functions:**
  - `mapParseResultToSqlParameters` → Use `mapParseResultToContractLegSpec` instead
  - `validateGradingParameters` → Use `validateContractLegSpec` instead

  **Migration:**
  ```typescript
  // Before (DEPRECATED)
  import { mapParseResultToSqlParameters } from 'chat-bet-parse/grading';
  const params = mapParseResultToSqlParameters(result, { matchScheduledDate: date });

  // After (RECOMMENDED)
  import { mapParseResultToContractLegSpec } from 'chat-bet-parse/tracking';
  const spec = mapParseResultToContractLegSpec(result, { eventDate: date });
  ```

  **Why?** Both mappers were doing the same conceptual work with 95% duplicate code. Consolidating to the tracking mapper eliminates duplication and provides a single source of truth. The `ChatBetGradingClient` continues to work unchanged.

- **Individual Player Props with Match.Player Field**: Add dedicated fields for individual player props to properly distinguish them from team-based props

  ### 🎯 New Match Fields

  - **`Match.Player`** - Player name for individual props (e.g., "Cooper Flagg", "B. Falter")
    ```typescript
    // Before (WRONG): Player stored in Team1
    { Match: { Team1: "Cooper Flagg" }, ContestantType: "Individual" }

    // After (CORRECT): Player stored in dedicated field
    { Match: { Player: "Cooper Flagg", PlayerTeam: "DAL" }, ContestantType: "Individual" }
    ```

  - **`Match.PlayerTeam`** - Optional team affiliation from "(TEAM)" syntax
    ```
    YG NBA Cooper Flagg (DAL) pts o16.5 @ +100 = 2k
    → Match.Player = "Cooper Flagg"
    → Match.PlayerTeam = "DAL"
    ```

  ### 🔄 Breaking Changes

  - **`Match.Team1` is now optional** (was previously required)
  - Individual player props now use `Match.Player` instead of `Match.Team1`
  - SQL mapper returns `undefined` (not `null`) for missing `Contestant1_RawName` on individual props

  ### 🚀 Parser Enhancements

  - **Smart contestant type detection**: Automatically determines Individual vs TeamLeague based on prop keywords
  - **Multi-word player name support**: New `extractContestantAndProp()` utility handles names like "Cooper Flagg pts"
  - **Team affiliation parsing**: `parsePlayerWithTeam()` extracts player and team from "(TEAM)" syntax
  - **Team prop differentiation**: Use "team passing yards" keyword to distinguish team-level props from player props

  ### 📦 SQL Mapping Updates

  - **Individual props**: `Contestant1_RawName = PlayerTeam || undefined`, `SelectedContestant_RawName = Player`
  - **Team props**: `Contestant1_RawName = Team1` (unchanged)
  - No SQL schema changes required - existing `ContractLegSpecTableType` handles both cases

  ### 🧪 Test Coverage

  - Updated 9 test files with individual player prop test cases
  - Added support for "Cooper Flagg", "B. Falter", and Player123/Team123 patterns
  - All 441 tests passing

  ### 📚 Files Modified

  - `src/types/index.ts`: Extended Match interface with Player and PlayerTeam fields
  - `src/parsers/utils.ts`: Added parsePlayerWithTeam() and extractContestantAndProp()
  - `src/parsers/index.ts`: Updated parsePropOU() and parsePropYN() for individual props
  - `src/tracking/mappers.ts`: Updated extractMatchInfo() for correct SQL mapping
  - Test fixtures updated to use "team passing yards" syntax for team-level props

- **Parlay/Round Robin Support in Mappers**: Grading and tracking mappers now handle parlay and round robin bets by returning arrays of mapped parameters

  ### 🎯 Mapper Updates

  - **`mapParseResultToSqlParameters()`** - Returns array for parlay/round robin
    ```typescript
    // Straight bet (backward compatible)
    const params = mapParseResultToSqlParameters(straightBet, options);
    // → Single GradingSqlParameters object

    // Parlay/Round Robin (new)
    const params = mapParseResultToSqlParameters(parlayBet, options);
    // → Array of GradingSqlParameters (one per leg)
    ```

  - **`mapParseResultToContractLegSpec()`** - Returns array for parlay/round robin
    ```typescript
    // Straight bet (backward compatible)
    const spec = mapParseResultToContractLegSpec(straightBet, options);
    // → Single ContractLegSpec object

    // Parlay/Round Robin (new)
    const specs = mapParseResultToContractLegSpec(parlayBet, options);
    // → Array of ContractLegSpec (one per leg with LegSequence and Price)
    ```

  ### 🚀 Features

  - **Recursive leg mapping**: Each parlay/round robin leg is mapped individually using the same logic as straight bets
  - **Automatic LegSequence**: Combo legs automatically get assigned proper 1-based LegSequence values
  - **Price handling**: Combo legs include Price field (null for straight bets per SQL spec)
  - **Validation updates**: Allow `undefined` Contestant1 for individual props (PropOU/PropYN with Individual type)

  ### 🔄 Breaking Changes

  - Return type changed from `GradingSqlParameters` to `GradingSqlParameters | GradingSqlParameters[]`
  - Return type changed from `ContractLegSpec` to `ContractLegSpec | ContractLegSpec[]`
  - Code using these mappers must handle both single and array return types

  ### 🧪 Test Coverage

  - New test suite `tests/unit/mappers.test.ts` with 31 comprehensive tests
  - Covers all contract types, parlay/round robin mapping, validation
  - Updated individual prop tests to expect correct Contestant1 mapping
  - All 472 tests passing

  ### 📚 Files Modified

  - `src/grading/mappers.ts`: Updated mapParseResultToSqlParameters() to handle combos
  - `src/tracking/mappers.ts`: Updated mapParseResultToContractLegSpec() to handle combos
  - `tests/unit/mappers.test.ts`: New comprehensive test suite for grading mappers

## 0.5.0

### Minor Changes

- **Extended Size Syntax for Straight Bets**: Add new size specification formats that allow explicit control over risk and to-win amounts

  ### 🎯 New Size Formats

  - **`tw` / `to win`** - Specify risk and to-win explicitly
    ```
    YG Lakers ML @ -110 = $110 tw $100
    ```
    Perfect for tickets that show risk amount even with negative odds, or when dealing with short-pay due to rounded odds.

  - **`tp` / `to pay`** - Specify risk and total payout (parser calculates to-win)
    ```
    YG Warriors ML @ -120 = $120 tp $220
    ```
    Useful when ticket shows total payout instead of profit.

  - **`risk`** - Specify only risk amount (parser calculates to-win from price)
    ```
    YG Knicks -2.5 @ -110 = risk $110
    ```

  - **`towin`** - Specify only to-win amount (parser calculates risk from price)
    ```
    YG Bulls ML @ +150 = towin $150
    ```

  ### 🚀 Automatic Risk/ToWin Calculation

  - **Parser now always populates `bet.Risk` and `bet.ToWin`** for all straight bets
  - Clients **no longer need** their own `calculateRiskAndToWin()` utility functions
  - Moved calculation logic into parser library for single source of truth
  - Smart inference: fills in missing Risk or ToWin based on Price when only one value specified
  - Full backward compatibility: existing `Size` syntax still works and auto-calculates both values

  ### 📦 Type Updates

  - `Bet` interface now includes `Risk?: number` and `ToWin?: number`
  - `ParsedTokens` and `WriteInTokens` interfaces updated to support new fields
  - New `ParsedStraightSize` interface for size parsing results

  ### 🔧 Implementation Details

  - Added `calculateRiskAndToWin()`, `calculateToWinFromRisk()`, `calculateRiskFromToWin()` to utils
  - New `parseStraightSize()` function handles all size formats (DRY implementation)
  - Updated `parseChatOrder()` and `parseChatFill()` to always populate Risk/ToWin
  - 7 new tests for extended syntax, all existing 437 tests still passing
  - **Changed**: +311 lines, -17 lines across 5 files

  ### 📚 Migration Guide

  See [MIGRATION_GUIDE_v0.5.0.md](./MIGRATION_GUIDE_v0.5.0.md) for detailed instructions on:
  - Removing client-side `calculateRiskAndToWin()` utilities
  - Updating components to use `result.bet.Risk` and `result.bet.ToWin` directly
  - Testing recommendations

## 0.4.3

### Patch Changes

- **Case-insensitive league detection**: Support league codes in any case (NBA, nba, Nba, etc.)
- **CBB alias support**: Add CBB as alias for CBK (College Basketball), similar to existing FCS → CFB mapping
- **Expanded prop keywords**: Add 120+ prop betting keywords across baseball, football, and basketball with automatic Individual/TeamLeague classification
  - Keywords are matched longest-first and include contestantType metadata that flows through to ContractLegSpec
  - Examples: player stats (Individual), team props (TeamLeague)
  - Backward compatible: existing API unchanged, sim-dash gets PropContestantType automatically
- **Fix dollar+k-notation parsing**: Correctly parse `$11k` → `$11,000` (previously incorrectly parsed as `$11`)
- **Writein legs in parlays/round robins**: Add test coverage for writein contracts as legs in YGP/IWP/YGRR/IWRR bets
  - Syntax: `YGP writein 12/25/2024 Event description @ +200 & Lakers @ +120 = $100`
  - Known limitation: Writein descriptions cannot contain ampersand character

## 0.4.2

### Patch Changes

- **DRY refactoring**: Consolidate duplicated parsing and validation logic
  - Merged size parsing functions into shared helper
  - Consolidated keyword parsing with `extractAndValidateKeywords` helper
  - Extracted contract validation to `shared/contractValidation.ts` module
  - Replaced duplicate switch statements with contract parser factory pattern
  - Fixed parlay/round robin size parsing to support k-notation and decimal formats
  - Reduced codebase by ~410 lines while maintaining 100% test coverage
- **Timezone-independent testing**: Fix ExecutionDtm date handling test to work across all timezones (was failing in CI/CD)

## 0.4.1

### Patch Changes

- **Documentation update**: Update README and archive implementation guides
  - Add parlay (YGP/IWP) and round robin (YGRR/IWRR) support to features
  - Document two-discriminator type system (chatType + betType)
  - Add comprehensive EBNF grammar for parlays and round robins
  - Add 60+ new syntax examples for parlays and round robins
  - Update API documentation with type guards and result structures

## 0.4.0

### Minor Changes

- **Parlay betting support**: Implement YGP/IWP parlay parsing
  - 2-10 leg parlays with `&` separator
  - Fair odds calculation or explicit to-win override (`tw` keyword)
  - Support for `pusheslose`/`tieslose` and `freebet` flags
  - Leg-level rotation numbers, game numbers, dates, leagues, and periods
  - Multiline format support
  - Size formats: decimal thousands, k-notation, dollar+k (`$11k`)
  - All contract types supported in parlay legs (including writein)

- **Round robin betting support**: Implement YGRR/IWRR round robin parsing with nCr notation
  - nCr notation: `4c2` (4 teams, 2-team parlays), `5c3`, `6c4`, etc.
  - At-most modifier with trailing dash: `4c3-` (at most 3: creates 2s and 3s)
  - Per-selection vs total risk types: `= $100 per` or `= $600 total`
  - Same parlay features: to-win override, flags, leg properties
  - Multiline format support

- **Event dates for straight bets**: Add date support for YG/IW bets
  - Multiple date formats: YYYY-MM-DD, MM/DD/YYYY, YYYY/MM/DD, MM-DD-YYYY
  - Positional dates: `YG 12/25/2024 Lakers @ +150 = 2.5`
  - Keyword dates: `YG date:12/25/2024 Lakers @ +150 = 2.5`
  - Smart year inference for MM/DD format
  - Calendar date validation

- **League keywords for writeins**: Add league support for YGW/IWW
  - Syntax: `YGW league:NBA 12/25/2024 Custom event @ +200 = 1.5`
  - Works with both positional and keyword date formats

- **ParseOptions**: New options object for parser configuration
  - `referenceDate?: Date` - for date parsing context
  - Passed to all parse functions: `parseChat(message, options)`

- **Type system refactor**: Implement two-discriminator type system
  - `chatType`: 'order' | 'fill'
  - `betType`: 'straight' | 'parlay' | 'roundRobin'
  - Type guards: `isParlay()`, `isRoundRobin()`, `isStraightBet()`
  - Discriminated unions for type-safe result handling

## 0.3.7

### Minor Changes

- Add Writein contract support for custom betting events

  ### 🏗️ New Features

  - **Writein Contracts**: New contract type for custom betting events not tied to specific sports matches
    - Support for format: `IW/YG writein DATE DESCRIPTION [@ price] [= size]`
    - Multiple date format support: YYYY-MM-DD, MM/DD/YYYY, YYYY/MM/DD, MM-DD-YYYY, and equivalents without year
    - Smart year inference (current year if future/today, next year if past)
    - Calendar date validation (rejects invalid dates like Feb 30th)
    - Description validation (10-255 characters, no newlines)
    - Full price and size parsing support (@ +150, = 3.0, k-notation, etc.)
    - Case-insensitive "writein" detection
  - **Enhanced Type System**: New `ContractWritein` interface with `EventDate` and `Description` properties
  - **Comprehensive Error Handling**: 
    - `InvalidWriteinFormatError` for format issues
    - `InvalidWriteinDateError` for date parsing failures  
    - `InvalidWriteinDescriptionError` for description validation
  - **Grading System Integration**: Updated SQL Server grading support for Writein contracts
  - **Extensive Testing**: 18 new tests covering positive and error scenarios

## 0.3.0

### Minor Changes

- 354c740: Add SQL Server grading client and expand parser support

  ### 🏗️ New Features

  - **SQL Server Grading Client**: New `ChatBetGradingClient` for automated contract grading against SQL Server databases
    - Support for all major contract types: TotalPoints, TotalPointsContestant, HandicapContestantML, HandicapContestantLine
    - Comprehensive error handling with `GradingConnectionError` and `GradingDataError`
    - Flexible configuration with connection pooling options
    - Factory functions for easy client creation
  - **Enhanced Parser Support**: Extended parsing capabilities for F3 periods and individual player props
    - F3 (first three innings) period parsing for baseball games
    - Individual player detection for props (e.g., "B. Name Ks o1.5")
    - Improved team name handling with special characters

## 0.2.0

### Minor Changes

- 744258e: Initial release of chat-bet-parse

  - 🏈 Multi-sport support (MLB, NBA) with extensible framework
  - 📝 Rich parsing for chat orders (IW) and fills (YG) with different size interpretations
  - 🔒 Full TypeScript support with discriminated unions
  - 🗃️ SQL Server ready types for stored procedure integration
  - ⚡ Zero runtime dependencies
  - 🧪 Comprehensive test suite with 141 tests and 100% coverage
  - 📖 Complete EBNF grammar documentation
  - ✅ README validation tests to ensure documentation accuracy
