# Stage 2 Parlay Tests - Summary

## Test Fixtures Created

### 1. Updated Type Definitions (`tests/fixtures/types.ts`)

**New Types Added:**
- `ParlayTestCase` - Structure for parlay test expectations
- `RoundRobinTestCase` - Structure for round robin tests (Stage 3)

**Key Design Principles:**
- Parlays are NOT contract types (ContractType stays pure)
- Parlays are ParseResult types (bet aggregation types)
- Each leg is validated as a separate straight bet with its own contractType
- Parlay-level properties: Risk, ToWin, useFair, pushesLose, IsFreeBet

### 2. Parlay Test Fixtures (`tests/fixtures/parlay.fixtures.ts`)

**27 Test Cases Covering:**

#### Basic Functionality
- ✅ 2-leg, 3-leg, 4-leg parlays with fair odds
- ✅ IWP orders (no size specified)

#### To-Win Override
- ✅ Explicit to-win amounts (useFair = false)
- ✅ Calculated from leg prices when not specified (useFair = true)

#### Optional Flags
- ✅ `pusheslose:true`
- ✅ `tieslose:true` (synonym)
- ✅ `freebet:true`
- ✅ Multiple flags combined

#### Leg-Level Properties
- ✅ Rotation numbers per leg
- ✅ Game numbers (G1, G2)
- ✅ Dates per leg (positional and keyword syntax)
- ✅ Leagues per leg (MLB, NBA)
- ✅ Mixed leg properties

#### Period Specifications
- ✅ F5 (first 5 innings)
- ✅ 1st inning, 1H (first half)
- ✅ Mixed periods across legs

#### Multiline Format
- ✅ Basic multiline
- ✅ Multiline with flags
- ✅ Multiline with leg properties

### 3. Parlay Error Fixtures (`tests/fixtures/parlay-errors.fixtures.ts`)

**14 Error Test Cases:**
- ✅ Single leg (not a parlay)
- ✅ No legs specified
- ✅ Missing size for YGP
- ✅ Invalid separator (comma instead of &)
- ✅ Missing tw keyword
- ✅ Invalid tw format
- ✅ Multiple tw specifications
- ✅ Invalid flag values
- ✅ Standalone flag without colon
- ✅ Leg missing price
- ✅ Leg invalid format
- ✅ Empty leg between ampersands
- ✅ Trailing ampersand

## Design Architecture (Actual Implementation)

```typescript
// Parlays are ParseResult types, NOT contract types
// Uses two-discriminator approach: chatType + betType
export type ParseResult = ParseResultStraight | ParseResultParlay | ParseResultRoundRobin;

// Two discriminators for flexible type narrowing
export type ChatType = 'order' | 'fill';
export type BetType = 'straight' | 'parlay' | 'roundRobin';

// ContractType stays pure - only actual contracts
export type ContractType =
  | 'TotalPoints'
  | 'TotalPointsContestant'
  | 'HandicapContestantML'
  | 'HandicapContestantLine'
  | 'PropOU'
  | 'PropYN'
  | 'Series'
  | 'Writein'
  // NO Parlay or RoundRobin here!

// Base interface
interface ParseResultBase {
  chatType: ChatType;
  betType: BetType;
  bet: Bet;
}

// Parlay result structure
interface ParseResultParlay extends ParseResultBase {
  betType: 'parlay'
  // NO contractType field
  // NO contract field
  useFair: boolean       // true when ToWin not specified
  pushesLose?: boolean   // from "pusheslose:true" or "tieslose:true"
  legs: Array<ParseResultStraight>  // Each leg is a straight bet
}

// Type guards for discrimination
function isParlay(result: ParseResult): result is ParseResultParlay {
  return result.betType === 'parlay';
}

function isStraight(result: ParseResult): result is ParseResultStraight {
  return result.betType === 'straight';
}

function isOrder(result: ParseResult): result is ParseResult & { chatType: 'order' } {
  return result.chatType === 'order';
}

function isFill(result: ParseResult): result is ParseResult & { chatType: 'fill' } {
  return result.chatType === 'fill';
}
```

## Key Implementation Notes

### 1. Zero New Mapping Code
Each leg is a `ChatOrderResult` or `ChatFillResult`, so the existing `mapParseResultToContractLegSpec()` function works as-is:

```typescript
// UI usage example
if (isParlay(result)) {
  const contractSpecs = await Promise.all(
    result.legs.map(async (leg, index) => {
      const spec = await mapParseResultToContractLegSpec(leg, options);
      return {
        ...spec,
        LegSequence: index + 1,
        Price: leg.bet.Price,  // leg is ChatOrderResult, has Price
        TiesLose: result.pushesLose || false
      };
    })
  );
}
```

### 2. Legs Are Orders (Not Fills)
- Even for YGP fills, each leg is an order
- Legs have only Price, no Size
- ExecutionDtm lives at parlay level, not leg level

### 3. UseFair Flag Logic
- `useFair = true`: Calculate ToWin from leg prices (fair odds)
- `useFair = false`: User specified custom ToWin amount

### 4. PushesLose at Parlay Level
- Overrides TiesLose for all legs
- Matches SQL schema (TicketBet_Combo.PushesLose)
- Applied to all ContractLegSpecs when mapping

## Test Validation Structure

Example test case structure:
```typescript
{
  description: 'YGP 2-leg with fair odds',
  input: 'YGP Lakers @ +120 & Warriors @ -110 = $100',
  expectedChatType: 'fill',
  expectedRisk: 100,
  expectedUseFair: true,
  expectedLegs: [
    { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
    { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
  ]
}
```

## Next Steps

### Before Implementation:
1. ✅ Types updated in `tests/fixtures/types.ts`
2. ✅ Parlay fixtures created (27 test cases)
3. ✅ Error fixtures created (14 test cases)
4. ⏸️  Update `tests/unit/parsers.test.ts` to wire in parlay tests
5. ⏸️  Create `STAGE2_IMPLEMENTATION.md` guide for implementation agent

### Implementation Tasks (Stage 2):
1. Add `ChatParlayResult` type to `src/types/index.ts`
2. Add `isParlay()`, `isRoundRobin()`, `isStraightBet()` type guards
3. Update `ParseResult` union type
4. Create parlay-specific error classes
5. Implement YGP/IWP prefix recognition
6. Implement ampersand leg separator parsing
7. Implement multiline format parsing
8. Implement parlay-level keyword parsing (pusheslose, tieslose, freebet)
9. Implement to-win override syntax ("tw $500")
10. Run tests and iterate until all 27 tests pass

## Success Criteria

- All 27 parlay test cases pass
- All 14 error test cases pass
- Zero new mapping code required (reuses existing mapper)
- ContractType stays pure (no Parlay or RoundRobin values)
- Type guards enable structural discrimination
- Existing straight bet tests still pass (no regression)
