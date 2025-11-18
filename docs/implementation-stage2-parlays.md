# Stage 2 Implementation Guide: Parlay Syntax (YGP/IWP)

## Overview

This document provides complete instructions for implementing Stage 2 features for the chat-bet-parse package. Stage 2 adds support for:

1. **YGP** (You Got Parlay) - Parlay fill messages with risk amount
2. **IWP** (I Want Parlay) - Parlay order messages without risk
3. Ampersand-separated leg syntax (`Lakers @ +120 & Warriors @ -110`)
4. Multiline parlay format
5. Parlay-level optional flags (`pusheslose`, `tieslose`, `freebet`)
6. To-win override syntax (`tw $500`)
7. Leg-level properties (dates, leagues, rotation numbers, periods)

## Background

### Current State (After Stage 1)
The parser currently supports:
- **YG/IW**: Straight bet fills/orders with event dates and flags
- **YGW/IWW**: Writein contracts with league/sport
- Rotation numbers, game numbers, periods, spreads, totals, moneylines, props, series
- Keyword property parsing (`date:`, `league:`, `freebet:`)

### What's Missing
- No parlay support (multiple legs in a single bet)
- No round robin support (Stage 3)
- Each bet must be a single contract

### Key Design Decision: Parlays Are NOT Contract Types

**CRITICAL:** Parlays and round robins are **bet aggregation types**, not contract types.

- Each leg of a parlay IS a contract (TotalPoints, HandicapContestantML, etc.)
- The parlay itself is NOT a contract
- `ContractType` enum stays pure - only actual betting contracts
- Parlays are distinguished as a separate `ParseResult` type

This design ensures:
- ✅ Zero new mapping code (reuses existing straight bet → ContractLegSpec mapper)
- ✅ Type safety via discriminated unions
- ✅ Clear separation of concerns
- ✅ SQL schema alignment (TicketBet_Combo with legs in TicketBet_ComboLeg)

## Stage 2 Requirements

### 1. New Chat Type Prefixes

**YGP (You Got Parlay) - Fill:**
- Format: `YGP <leg1> & <leg2> [& <leg3>...] = $<risk> [tw $<towin>]`
- Requires risk amount (like YG)
- Example: `YGP Lakers @ +120 & Warriors @ -110 = $100`

**IWP (I Want Parlay) - Order:**
- Format: `IWP <leg1> & <leg2> [& <leg3>...]`
- No risk amount required (like IW)
- Example: `IWP Lakers @ +120 & Warriors @ -110`

### 2. Leg Separator Syntax

**Ampersand Separator:**
- Legs separated by `&` character
- Whitespace around `&` is optional
- Minimum 2 legs required
- Examples:
  - `Lakers @ +120 & Warriors @ -110`
  - `Lakers @ +120&Warriors @ -110` (no spaces, also valid)
  - `Lakers @ +120  &  Warriors @ -110` (multiple spaces, also valid)

**Error Cases:**
- Comma separator NOT allowed: `Lakers @ +120, Warriors @ -110` → ERROR
- Single leg: `YGP Lakers @ +120 = $100` → ERROR (must have 2+ legs)
- Empty legs: `Lakers @ +120 & & Warriors @ -110` → ERROR

### 3. Multiline Parlay Format

Alternative to ampersand - each leg on separate line:

```
YGP
Lakers @ +120
Warriors @ -110
Celtics @ +105
= $100
```

**Rules:**
- `YGP` or `IWP` prefix on first line (can include flags on first line)
- Each subsequent line is a leg (until size specification)
- Size line starts with `=` for fills
- Blank lines ignored
- Minimum 2 legs required

### 4. Parlay-Level Optional Flags

**Supported Keywords (on YGP/IWP line):**
- `pusheslose:true` - Pushes reduce the parlay
- `tieslose:true` - Synonym for `pusheslose`
- `freebet:true` - Mark entire parlay as free bet

**Examples:**
- `YGP pusheslose:true Lakers @ +120 & Warriors @ -110 = $100`
- `YGP freebet:true pusheslose:true Lakers @ +120 & Warriors @ -110 = $50`

**Multiline with flags:**
```
YGP pusheslose:true freebet:true
Lakers @ +120
Warriors @ -110
= $100
```

### 5. To-Win Override Syntax

**Default Behavior (Fair Odds):**
- When no to-win specified, calculate from leg prices
- Set `useFair = true`
- Example: `YGP Lakers @ +120 & Warriors @ -110 = $100` → calculate ToWin from prices

**Override Behavior:**
- Format: `tw $<amount>` after risk amount
- Set `useFair = false`
- Example: `YGP Lakers @ +120 & Warriors @ -110 = $100 tw $500`
- Allows custom payouts different from fair odds

**Error Cases:**
- Missing `tw` keyword: `= $100 $500` → ERROR
- Invalid format: `= $100 towin:500` → ERROR (must use `tw`)
- Multiple `tw`: `= $100 tw $500 tw $600` → ERROR

### 6. Leg-Level Properties

Each leg can have its own properties (same as straight bets):

**Rotation Numbers:**
- `YGP 872 Cardinals/Cubs o8.5 @ -110 & 701 Lakers @ +120 = $100`

**Game Numbers:**
- `YGP Cardinals/Cubs G1 o8.5 @ -110 & Lakers @ +120 = $100`

**Dates (Positional or Keyword):**
- `YGP 5/14 Lakers @ +120 & 5/15 Warriors @ -110 = $100`
- `YGP date:5/14 Lakers @ +120 & date:5/15 Warriors @ -110 = $100`

**Leagues:**
- `YGP MLB Cardinals @ +150 & NBA Lakers @ +120 = $100`

**Periods:**
- `YGP Cardinals/Cubs F5 o4.5 @ -110 & Dodgers F5 @ +120 = $100`

**Mixed Properties:**
- `YGP MLB 5/14 Cardinals @ +150 & 701 date:5/15 Lakers @ +120 = $100`

### 7. Leg Parsing Strategy

**Key Insight: Each Leg Is A Straight Bet Order**

- Parse each leg independently using existing straight bet logic
- Each leg becomes a `ChatOrderResult` (even for YGP fills)
- Legs only have Price, no Size
- ExecutionDtm lives at parlay level, not leg level

**Why This Matters:**
- ✅ Reuses ALL existing contract parsing logic
- ✅ Each leg can be any contract type (totals, spreads, moneylines, props, series)
- ✅ Each leg can have own date, league, rotation number, period
- ✅ Zero new contract parsing code needed

## Design Architecture

### Type Structure

**File:** `src/types/index.ts`

```typescript
// ContractType stays pure - NO Parlay or RoundRobin
export type ContractType =
  | 'TotalPoints'
  | 'TotalPointsContestant'
  | 'HandicapContestantML'
  | 'HandicapContestantLine'
  | 'PropOU'
  | 'PropYN'
  | 'Series'
  | 'Writein';

// Two discriminators for flexible type narrowing
export type ChatType = 'order' | 'fill';
export type BetType = 'straight' | 'parlay' | 'roundRobin';

// Base interface for all parse results
export interface ParseResultBase {
  chatType: ChatType;
  betType: BetType;
  bet: Bet;
}

// Unified bet object (fields populated based on chatType and betType)
export interface Bet {
  // Straight bet fields
  Price?: number;    // USA odds (straight bets only)
  Size?: number;     // Straight bets only (optional for orders, required for fills)

  // Parlay/RoundRobin fill fields
  Risk?: number;     // Parlay/RR fills only (from "= $100")
  ToWin?: number;    // Parlay/RR fills only (optional override from "tw $500")

  // Common fields
  ExecutionDtm?: Date;   // Fills only (all betTypes)
  IsFreeBet?: boolean;   // All types
}

// NEW: Parlay result type (no contractType, no contract)
export interface ParseResultParlay extends ParseResultBase {
  betType: 'parlay';
  useFair: boolean;       // true when ToWin not specified
  pushesLose?: boolean;   // from "pusheslose:true" or "tieslose:true"
  legs: Array<ParseResultStraight>;  // Each leg is a straight bet
}

// Extended ParseResult union
export type ParseResult = ParseResultStraight | ParseResultParlay | ParseResultRoundRobin;

// NEW: Type guards for discrimination
export function isParlay(result: ParseResult): result is ParseResultParlay {
  return result.betType === 'parlay';
}

export function isRoundRobin(result: ParseResult): result is ParseResultRoundRobin {
  return result.betType === 'roundRobin';
}

export function isStraight(result: ParseResult): result is ParseResultStraight {
  return result.betType === 'straight';
}

export function isOrder(result: ParseResult): result is ParseResult & { chatType: 'order' } {
  return result.chatType === 'order';
}

export function isFill(result: ParseResult): result is ParseResult & { chatType: 'fill' } {
  return result.chatType === 'fill';
}
```

### SQL Schema Alignment

Parlay result maps directly to SQL stored procedure structure:

**TicketBet_Combo table:**
- `Bet_ComboType = 'Parlay'`
- `PushesLose` (boolean)

**TicketBet_ComboLeg table:**
- One row per leg
- `LegSequence` (1, 2, 3, ...)
- `Contract` (FK to Contract table)
- `Price` (American odds for this leg)

**Mapping flow:**
```typescript
// Each leg is a ParseResult → map to ContractLegSpec
const contractSpecs = await Promise.all(
  result.legs.map(async (leg, index) => {
    const spec = await mapParseResultToContractLegSpec(leg, options);
    return {
      ...spec,
      LegSequence: index + 1,
      Price: leg.bet.Price,  // Each leg has its own price
      TiesLose: result.pushesLose || false
    };
  })
);
```

## Implementation Plan

### Phase 1: Add New Types

**File:** `src/types/index.ts`

1. Add `ChatParlayResult` interface (structure shown above)
2. Update `ParseResult` union type to include `ChatParlayResult`
3. Add type guard functions: `isParlay()`, `isStraightBet()`
4. Add placeholder `isRoundRobin()` type guard (returns false for now, Stage 3 will implement)

### Phase 2: Create New Error Classes

**File:** `src/errors/index.ts`

Add parlay-specific error classes:

```typescript
export class InvalidParlayStructureError extends ChatBetParseError {
  constructor(rawInput: string, message: string) {
    super(rawInput, message);
    this.name = 'InvalidParlayStructureError';
  }
}

export class InvalidParlayLegError extends ChatBetParseError {
  constructor(rawInput: string, legNumber: number, message: string) {
    super(rawInput, `Leg ${legNumber}: ${message}`);
    this.name = 'InvalidParlayLegError';
  }
}

export class InvalidParlayToWinError extends ChatBetParseError {
  constructor(rawInput: string, message: string) {
    super(rawInput, message);
    this.name = 'InvalidParlayToWinError';
  }
}

export class MissingSizeForFillError extends ChatBetParseError {
  constructor(rawInput: string, prefix: string) {
    super(rawInput, `Fill (${prefix}) messages require a size`);
    this.name = 'MissingSizeForFillError';
  }
}
```

### Phase 3: Implement Parlay Detection

**File:** `src/parsers/index.ts`

Update `parseChat()` function to detect YGP/IWP:

```typescript
export function parseChat(input: string, options?: ParseOptions): ParseResult {
  const rawInput = input.trim();

  // Check for parlay prefixes first
  if (rawInput.startsWith('YGP ') || rawInput.startsWith('YGP\n')) {
    return parseParlayFill(rawInput, options);
  }

  if (rawInput.startsWith('IWP ') || rawInput.startsWith('IWP\n')) {
    return parseParlayOrder(rawInput, options);
  }

  // Check for round robin (Stage 3)
  if (rawInput.startsWith('YGRR ') || rawInput.startsWith('IWRR ')) {
    throw new Error('Round robin not yet implemented (Stage 3)');
  }

  // Existing straight bet logic...
}
```

### Phase 4: Implement Parlay Parsing Functions

**File:** `src/parsers/index.ts`

Create two new main functions:

#### 4a. `parseParlayFill()` function

```typescript
function parseParlayFill(rawInput: string, options?: ParseOptions): ChatParlayResult {
  // 1. Extract "YGP" prefix
  let text = rawInput.slice(3).trim();

  // 2. Parse parlay-level keywords (pusheslose, tieslose, freebet)
  const allowedKeys = ['pusheslose', 'tieslose', 'freebet'];
  const { pusheslose, tieslose, freebet, cleanedText } =
    parseParlayKeywords(text, rawInput, allowedKeys);

  // 3. Detect format: ampersand or multiline
  const isMultiline = cleanedText.includes('\n');

  // 4. Extract legs and size
  let legTexts: string[];
  let sizeText: string;

  if (isMultiline) {
    const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l);
    const sizeLineIndex = lines.findIndex(l => l.startsWith('='));
    if (sizeLineIndex === -1) {
      throw new MissingSizeForFillError(rawInput, 'YGP');
    }
    legTexts = lines.slice(0, sizeLineIndex);
    sizeText = lines[sizeLineIndex];
  } else {
    // Ampersand format
    const sizeIndex = cleanedText.indexOf('=');
    if (sizeIndex === -1) {
      throw new MissingSizeForFillError(rawInput, 'YGP');
    }
    const legsText = cleanedText.slice(0, sizeIndex).trim();
    sizeText = cleanedText.slice(sizeIndex).trim();
    legTexts = legsText.split('&').map(l => l.trim());
  }

  // 5. Validate leg count
  if (legTexts.length < 2) {
    throw new InvalidParlayStructureError(rawInput, 'Parlay requires at least 2 legs');
  }

  // 6. Parse each leg as IW order (reuse existing logic!)
  const legs: ChatOrderResult[] = [];
  for (let i = 0; i < legTexts.length; i++) {
    try {
      const legInput = `IW ${legTexts[i]}`;
      const legResult = parseChatOrder(legInput, options);
      legs.push(legResult as ChatOrderResult);
    } catch (error) {
      throw new InvalidParlayLegError(rawInput, i + 1, error.message);
    }
  }

  // 7. Parse size and optional to-win
  const { risk, toWin, useFair } = parseParlaySize(sizeText, rawInput);

  // 8. Build result
  return {
    chatType: 'fill',
    bet: {
      Risk: risk,
      ToWin: toWin,
      ExecutionDtm: new Date(),
      IsFreeBet: freebet || false
    },
    useFair,
    pushesLose: pusheslose || tieslose || undefined,
    legs
  };
}
```

#### 4b. `parseParlayOrder()` function

Similar to `parseParlayFill()` but:
- No size parsing required
- No ExecutionDtm
- Risk and ToWin are undefined

### Phase 5: Implement Helper Functions

**File:** `src/parsers/utils.ts`

#### 5a. `parseParlayKeywords()` function

Similar to existing `parseKeywords()` but handles parlay-specific keywords:

```typescript
export interface ParsedParlayKeywords {
  pusheslose?: boolean;
  tieslose?: boolean;
  freebet?: boolean;
  cleanedText: string;
}

export function parseParlayKeywords(
  text: string,
  rawInput: string,
  allowedKeys: string[]
): ParsedParlayKeywords {
  // Extract first line (keywords appear on first line only)
  const lines = text.split('\n');
  const firstLine = lines[0];
  const remainingLines = lines.slice(1);

  // Parse keywords from first line
  const parts = firstLine.trim().split(/\s+/);
  const keywords: Partial<ParsedParlayKeywords> = {};
  const remainingParts: string[] = [];

  for (const part of parts) {
    if (part.includes(':')) {
      // Validate syntax (same as Stage 1)
      const [key, value] = part.split(':');

      if (!allowedKeys.includes(key)) {
        throw new UnknownKeywordError(rawInput, key);
      }

      switch (key) {
        case 'pusheslose':
        case 'tieslose':
        case 'freebet':
          if (value !== 'true') {
            throw new InvalidKeywordValueError(rawInput, key, value,
              `Invalid ${key} value: must be "true"`);
          }
          keywords[key] = true;
          break;
      }
    } else {
      remainingParts.push(part);
    }
  }

  // Rebuild cleaned text
  const cleanedFirstLine = remainingParts.join(' ');
  const allLines = cleanedFirstLine ? [cleanedFirstLine, ...remainingLines] : remainingLines;

  return {
    ...keywords,
    cleanedText: allLines.join('\n')
  };
}
```

#### 5b. `parseParlaySize()` function

Parse size specification with optional to-win:

```typescript
export interface ParsedParlaySize {
  risk: number;
  toWin?: number;
  useFair: boolean;
}

export function parseParlaySize(
  sizeText: string,
  rawInput: string
): ParsedParlaySize {
  // Remove leading '='
  if (!sizeText.startsWith('=')) {
    throw new InvalidSizeFormatError(rawInput, 'Size must start with =');
  }

  const text = sizeText.slice(1).trim();

  // Check for to-win override
  const twMatch = text.match(/^(\$[\d.]+)\s+tw\s+(\$[\d.]+)$/i);

  if (twMatch) {
    // Has to-win override
    const risk = parseFloat(twMatch[1].replace('$', ''));
    const toWin = parseFloat(twMatch[2].replace('$', ''));
    return { risk, toWin, useFair: false };
  }

  // No to-win, calculate from fair odds
  const riskMatch = text.match(/^\$?([\d.]+)$/);
  if (!riskMatch) {
    throw new InvalidSizeFormatError(rawInput, 'Invalid size format');
  }

  const risk = parseFloat(riskMatch[1]);
  return { risk, toWin: undefined, useFair: true };
}
```

### Phase 6: Update Test Wiring

**File:** `tests/unit/parsers.test.ts`

Add imports and test sections:

```typescript
// Add to imports
import { ParlayTestCase } from '../fixtures/types';
import { parlayTestCases } from '../fixtures/parlay.fixtures';
import { parlayErrorTestCases } from '../fixtures/parlay-errors.fixtures';
import { isParlay } from '../../src/index';

// Add validation function
function validateParlayTestCase(testCase: ParlayTestCase) {
  const options = testCase.referenceDate ? { referenceDate: testCase.referenceDate } : undefined;
  const result = parseChat(testCase.input, options);

  // Verify it's a parlay
  expect(isParlay(result)).toBe(true);
  if (!isParlay(result)) return; // Type guard

  // Validate parlay-level properties
  expect(result.chatType).toBe(testCase.expectedChatType);
  if (testCase.expectedRisk !== undefined) {
    expect(result.bet.Risk).toBe(testCase.expectedRisk);
  }
  if (testCase.expectedToWin !== undefined) {
    expect(result.bet.ToWin).toBe(testCase.expectedToWin);
  }
  expect(result.useFair).toBe(testCase.expectedUseFair);
  if (testCase.expectedPushesLose !== undefined) {
    expect(result.pushesLose).toBe(testCase.expectedPushesLose);
  }
  if (testCase.expectedFreeBet !== undefined) {
    expect(result.bet.IsFreeBet).toBe(testCase.expectedFreeBet);
  }

  // Validate leg count
  expect(result.legs).toHaveLength(testCase.expectedLegs.length);

  // Validate each leg
  for (let i = 0; i < testCase.expectedLegs.length; i++) {
    const expectedLeg = testCase.expectedLegs[i];
    const actualLeg = result.legs[i];

    // Each leg must be a straight bet
    expect('contract' in actualLeg).toBe(true);
    if (!('contract' in actualLeg)) continue;

    // Validate leg properties
    expect(actualLeg.contractType).toBe(expectedLeg.contractType);
    expect(actualLeg.bet.Price).toBe(expectedLeg.price);

    // Validate leg contract details (team, teams, line, etc.)
    if (expectedLeg.team) {
      expect('Contestant' in actualLeg.contract &&
        actualLeg.contract.Contestant).toBe(expectedLeg.team);
    }
    if (expectedLeg.teams) {
      expect(actualLeg.contract.Match.Team1).toBe(expectedLeg.teams[0]);
      if (expectedLeg.teams[1]) {
        expect(actualLeg.contract.Match.Team2).toBe(expectedLeg.teams[1]);
      }
    }
    if (expectedLeg.line !== undefined) {
      expect('Line' in actualLeg.contract && actualLeg.contract.Line).toBe(expectedLeg.line);
    }
    if (expectedLeg.isOver !== undefined) {
      expect('IsOver' in actualLeg.contract && actualLeg.contract.IsOver).toBe(expectedLeg.isOver);
    }
    if (expectedLeg.rotationNumber !== undefined) {
      expect(actualLeg.rotationNumber).toBe(expectedLeg.rotationNumber);
    }
    if (expectedLeg.daySequence !== undefined) {
      expect(actualLeg.contract.Match.DaySequence).toBe(expectedLeg.daySequence);
    }
    if (expectedLeg.period) {
      expect(actualLeg.contract.Period.PeriodTypeCode).toBe(expectedLeg.period.PeriodTypeCode);
      expect(actualLeg.contract.Period.PeriodNumber).toBe(expectedLeg.period.PeriodNumber);
    }
    if (expectedLeg.sport) {
      expect(actualLeg.contract.Sport).toBe(expectedLeg.sport);
    }
    if (expectedLeg.league) {
      expect(actualLeg.contract.League).toBe(expectedLeg.league);
    }
    if (expectedLeg.eventDate) {
      expect(actualLeg.contract.Match.Date).toEqual(expectedLeg.eventDate);
    }
  }
}

// Add test sections
describe('Parlays', () => {
  test.each(parlayTestCases)('$description', validateParlayTestCase);
});

describe('Parlay Errors', () => {
  test.each(parlayErrorTestCases)('$description', validateErrorTestCase);
});
```

## Test Files Reference

All test cases are in place and currently failing (expected):

**Fixtures:**
- `tests/fixtures/parlay.fixtures.ts` - 27 test cases covering all parlay features
- `tests/fixtures/parlay-errors.fixtures.ts` - 14 error test cases
- `tests/fixtures/types.ts` - Updated with `ParlayTestCase` interface

**Test Categories:**
- Basic 2-leg, 3-leg, 4-leg parlays (4 tests)
- To-win override syntax (2 tests)
- Optional flags: pusheslose, tieslose, freebet (5 tests)
- Leg-level properties: rotation numbers, game numbers, dates, leagues (6 tests)
- Period specifications (2 tests)
- Multiline format (3 tests)
- Error cases: structure, to-win, flags, legs (14 tests)

## Implementation Validation

### Run Tests
```bash
npm test -- --testPathPattern="parsers.test"
```

### Expected Results After Implementation
- All 27 new parlay tests should pass
- All 14 parlay error tests should pass
- All 220 existing tests (including Stage 1) should continue to pass
- Total: 261 tests passing, 0 failing

## Key Implementation Notes

### 1. Reuse Existing Parsing Logic

**Most Important Principle: Each leg is a straight bet**

```typescript
// DON'T write new contract parsing code
// DO reuse existing parseChatOrder()

for (const legText of legTexts) {
  const legInput = `IW ${legText}`;  // Convert leg to order format
  const legResult = parseChatOrder(legInput, options);  // Existing function!
  legs.push(legResult);
}
```

This approach means:
- ✅ All existing contract types work in parlays (totals, spreads, props, series, writeins)
- ✅ All leg-level properties work (dates, leagues, rotation numbers, periods)
- ✅ All existing validation and error handling applies
- ✅ Zero duplicate code

### 2. Ampersand Splitting Edge Cases

When splitting by `&`, be careful:
- `Cardinals/Cubs o8.5 @ -110 & Lakers @ +120` → 2 legs (correct)
- `Cardinals & Cubs o8.5 @ -110` → 1 leg (the `&` is part of team name, not separator)

**Solution:** Only split on `&` that appears BETWEEN legs. The `@` symbol can help:
- Each leg must have exactly one `@` symbol
- Count `@` symbols to validate leg count after split

### 3. Multiline Format Parsing

**First Line Handling:**
- First line has prefix and optional keywords: `YGP pusheslose:true freebet:true`
- After removing prefix and keywords, remaining text on first line could be:
  - Empty (common case) → legs start on line 2
  - First leg → include in leg parsing

**Size Line Detection:**
- Look for line starting with `=`
- Everything before `=` line is legs
- `=` line contains risk (and optional to-win)

### 4. To-Win Syntax Parsing

**Valid formats:**
- `= $100` → Risk only, useFair = true
- `= 100` → Risk only (no $), useFair = true
- `= $100 tw $500` → Risk and ToWin, useFair = false
- `= 100 tw 500` → Risk and ToWin (no $), useFair = false

**Invalid formats (must error):**
- `= $100 $500` → Missing `tw` keyword
- `= $100 towin:500` → Wrong keyword
- `= $100 tw $500 tw $600` → Multiple `tw`

### 5. Type Guards Enable Safe Access

Use type guards to narrow types:

```typescript
const result = parseChat(input);

if (isParlay(result)) {
  // TypeScript knows: result is ChatParlayResult
  console.log(result.legs.length);  // OK
  console.log(result.useFair);      // OK
  console.log(result.contract);     // Error: no 'contract' property
}

if (isStraightBet(result)) {
  // TypeScript knows: result is ChatOrderResult | ChatFillResult
  console.log(result.contract);     // OK
  console.log(result.legs);         // Error: no 'legs' property
}
```

### 6. ExecutionDtm Handling

- YGP (fill): Set `bet.ExecutionDtm = new Date()` at parlay level
- IWP (order): Leave `bet.ExecutionDtm` undefined
- Legs (both): Never set ExecutionDtm on individual legs (they're always orders)

### 7. PushesLose vs TiesLose

- Both keywords do the same thing (synonyms)
- Store as single `pushesLose` field
- Apply to all legs when mapping to ContractLegSpec

## Files to Modify

### Required Changes
1. ✅ `src/types/index.ts` - Add `ChatParlayResult` type and guards
2. ✅ `src/errors/index.ts` - Add parlay error classes
3. ✅ `src/parsers/index.ts` - Add `parseParlayFill()`, `parseParlayOrder()`, update `parseChat()`
4. ✅ `src/parsers/utils.ts` - Add `parseParlayKeywords()`, `parseParlaySize()`
5. ✅ `tests/unit/parsers.test.ts` - Add parlay test validation and wiring

### No Changes Needed
- Contract parsing functions (reused as-is)
- Mapping functions (reused as-is, Stage 1 compliant)
- Type definitions for contracts (ContractType stays pure)

## Troubleshooting

### Common Issues

**Issue:** Ampersand in team name causes incorrect split
**Solution:** Validate each leg has exactly one `@` symbol after split

**Issue:** Keywords appearing in leg text
**Solution:** Keywords only parsed from first line (YGP line), not from leg text

**Issue:** `parseChatOrder()` not found in scope
**Solution:** It's in the same file, but might need to be refactored to be callable internally

**Issue:** Legs are fills instead of orders
**Solution:** Always parse legs as orders (`IW` prefix), never as fills (`YG` prefix)

**Issue:** Type guard not narrowing type
**Solution:** Use proper type guard syntax: `if (isParlay(result)) { /* result is ChatParlayResult here */ }`

**Issue:** To-win parsing errors on valid input
**Solution:** Check regex pattern matches all valid formats (with/without $, case-insensitive `tw`)

## Success Criteria

✅ All 27 parlay tests pass
✅ All 14 parlay error tests pass
✅ All 220 existing tests continue to pass (no regression)
✅ No TypeScript compilation errors
✅ Type guards work correctly (TypeScript narrows types)
✅ Zero new contract parsing code (reuses existing logic)
✅ ContractType enum unchanged (stays pure)
✅ Ampersand and multiline formats both work
✅ Parlay-level flags work (pusheslose, tieslose, freebet)
✅ To-win override syntax works
✅ Leg-level properties work (dates, leagues, rotation numbers, periods)

## Next Steps (Future Stages)

After Stage 2 is complete and all tests pass:
- **Stage 3:** Round Robin syntax (YGRR/IWRR) with nCr notation

Do not implement Stage 3 features yet. Focus only on Stage 2 requirements above.

## UI Integration Example

After implementation, the UI can use parlays like this:

```typescript
const result = await parseChatAsync('YGP Lakers @ +120 & Warriors @ -110 = $100');

if (isParlay(result)) {
  // Map each leg to ContractLegSpec (existing mapper!)
  const contractSpecs = await Promise.all(
    result.legs.map(async (leg, index) => {
      const spec = await mapParseResultToContractLegSpec(leg, options);
      return {
        ...spec,
        LegSequence: index + 1,
        Price: leg.bet.Price,
        TiesLose: result.pushesLose || false
      };
    })
  );

  // Call combo stored procedure
  await executeStoredProcedure({
    procedureName: 'dbo.Party_UPSERT_TicketBet_Combo_tr',
    params: {
      Party: currentParty,
      CounterpartyLedger,
      PartnershipLedger,
      WhoTurnedInType,
      ExecutionDtm: result.bet.ExecutionDtm,
      Risk: result.bet.Risk,
      ToWin: result.useFair
        ? calculateFairToWin(result.legs.map(l => l.bet.Price))
        : result.bet.ToWin,
      IsFreeBet: result.bet.IsFreeBet || false,
      Bet_ComboType: 'Parlay',
      PushesLose: result.pushesLose || false,
      DryRun: false
    },
    tableParams: { contractSpecs }
  });
}
```

**Zero new mapping code needed!** The existing `mapParseResultToContractLegSpec()` function works because each leg is a `ParseResult` (ChatOrderResult).
