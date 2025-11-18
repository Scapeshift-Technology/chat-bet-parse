# Stage 1 Implementation Guide: Event Dates & Optional Properties

## Overview

This document provides complete instructions for implementing Stage 1 features for the chat-bet-parse package. Stage 1 adds support for:

1. Event dates on regular contracts (YG/IW)
2. League specification on writein contracts (YGW/IWW)
3. Free bet flag on all contract types
4. General keyword property parsing system (key:value syntax)

## Background

### Current State
The parser currently supports:
- **YG/IW**: Straight bet fills/orders (e.g., `YG Lakers @ +120 = 2.5`)
- **YGW/IWW**: Writein contracts with required date (e.g., `YGW 2025-05-14 Cardinals win @ +150 = 1.0`)
- Rotation numbers, game numbers, periods, spreads, totals, moneylines, props, series

### What's Missing
- Regular contracts (YG/IW) cannot specify event dates
- Writein contracts (YGW/IWW) cannot specify league/sport
- No support for optional flags like `freebet`
- No general keyword property parsing system

## Stage 1 Requirements

### 1. Keyword Property Parsing System

**Syntax Rules:**
- Format: `key:value` (NO SPACES around colon)
- Valid: `date:7/1/25`, `freebet:true`, `league:MLB`
- Invalid: `date: 7/1/25`, `date :7/1/25`, `date : 7/1/25`
- Keywords are parsed and removed from the contract text immediately after the chat type prefix (YG/IW/YGW/IWW)
- Keywords can appear in any order
- Multiple keywords can be specified

**Supported Keywords by Type:**

**YG/IW (Straight Bets):**
- `date:<value>` - Event date (see date formats below)
- `freebet:true` - Mark as free bet

**YGW/IWW (Writeins):**
- `date:<value>` - Event date (can be positional OR keyword)
- `league:<value>` - League (can be positional OR keyword)
- `freebet:true` - Mark as free bet

### 2. Event Date Support on Regular Contracts

**Positional Date Syntax:**
- Date can appear immediately after YG/IW prefix
- Date can appear before or after league specification
- Examples:
  - `YG 7/1/25 Lakers @ +120 = 2.5`
  - `YG NBA 7/1/25 Lakers @ +120 = 2.5`
  - `YG 7/1/25 NBA Lakers @ +120 = 2.5`
  - `IW date:5/14 872 Cardinals/Cubs o8.5 @ -110`

**Keyword Date Syntax:**
- `date:<value>` can appear anywhere before the @ sign
- Examples:
  - `YG date:7/1/25 Lakers @ +120 = 2.5`
  - `YG Lakers date:5/14/25 @ +120 = 2.5` (just before @)

**Date Storage:**
- Store in `contract.Match.Date` property (currently always `undefined`)
- Use existing `parseWriteinDate()` function from `src/parsers/utils.ts`

### 3. League Support on Writeins

**Current Behavior:**
- YGW/IWW require date to be first positional argument after "writein"
- No league support

**New Behavior:**
- League can be specified positionally (before or after date)
- League can be specified via keyword (`league:MLB`)
- Examples:
  - `YGW MLB 2025-05-14 Cardinals win @ +150 = 1.0`
  - `YGW 2025-05-14 MLB Cardinals win @ +150 = 1.0`
  - `YGW league:MLB 2025-05-14 Cardinals win @ +150 = 1.0`
  - `YGW date:5/14/25 league:MLB Cardinals win @ +150 = 1.0`

**League Storage:**
- Store in `contract.League` property on writein contracts
- Use existing `knownLeagues` array from `src/types/index.ts` for validation
- Set corresponding `contract.Sport` based on `leagueSportMap`

### 4. Free Bet Flag

**Syntax:**
- `freebet:true` (only `true` is valid, `false` or other values should error)
- Can be specified on any contract type (YG/IW/YGW/IWW)

**Storage:**
- Store in `result.bet.IsFreeBet` property (boolean)

## Supported Date Formats

Use the existing `parseWriteinDate()` function which supports:

**With year:**
- `YYYY-MM-DD` or `YYYY/MM/DD` (e.g., `2025-07-01`, `2025/07/01`)
- `MM/DD/YYYY` or `MM-DD-YYYY` (e.g., `07/01/2025`, `07-01-2025`)

**Without year (smart inference):**
- `MM/DD` or `MM-DD` (e.g., `07/01`, `07-01`)
- If date is today or future → use current year
- If date is in past → use next year

## Implementation Plan

### Phase 1: Create New Error Classes

**File:** `src/errors/index.ts`

Add new error classes:
```typescript
export class InvalidKeywordSyntaxError extends ChatBetParseError {
  constructor(rawInput: string, keyword: string, message: string) {
    super(rawInput, message);
    this.name = 'InvalidKeywordSyntaxError';
  }
}

export class InvalidKeywordValueError extends ChatBetParseError {
  constructor(rawInput: string, keyword: string, value: string, message: string) {
    super(rawInput, message);
    this.name = 'InvalidKeywordValueError';
  }
}

export class UnknownKeywordError extends ChatBetParseError {
  constructor(rawInput: string, keyword: string) {
    super(rawInput, `Unknown keyword: ${keyword}`);
    this.name = 'UnknownKeywordError';
  }
}
```

Also rename `InvalidWriteinDateError` to just `InvalidDateError` for consistency (it's now used for both writeins and regular contracts).

### Phase 2: Implement Keyword Property Parser

**File:** `src/parsers/utils.ts`

Create a new utility function to parse and extract keyword properties:

```typescript
export interface ParsedKeywords {
  date?: string;
  league?: string;
  freebet?: boolean;
  // Cleaned text with keywords removed
  cleanedText: string;
}

/**
 * Parse and extract keyword properties from contract text
 * Format: key:value (no spaces around colon)
 * Returns parsed keywords and text with keywords removed
 */
export function parseKeywords(
  text: string,
  rawInput: string,
  allowedKeys: string[]
): ParsedKeywords {
  const parts = text.trim().split(/\s+/);
  const keywords: Partial<ParsedKeywords> = {};
  const remainingParts: string[] = [];

  for (const part of parts) {
    // Check if this is a keyword (contains colon)
    if (part.includes(':')) {
      // Validate no spaces around colon
      if (part.match(/\s*:\s*/)) {
        throw new InvalidKeywordSyntaxError(
          rawInput,
          part,
          'Invalid keyword syntax: no spaces allowed around colon'
        );
      }

      const [key, value] = part.split(':');

      // Check if keyword is allowed
      if (!allowedKeys.includes(key)) {
        throw new UnknownKeywordError(rawInput, key);
      }

      // Parse based on key
      switch (key) {
        case 'date':
          keywords.date = value;
          break;
        case 'league':
          keywords.league = value;
          break;
        case 'freebet':
          if (value !== 'true') {
            throw new InvalidKeywordValueError(
              rawInput,
              key,
              value,
              'Invalid freebet value: must be "true"'
            );
          }
          keywords.freebet = true;
          break;
      }
    } else {
      // Not a keyword, keep in remaining parts
      remainingParts.push(part);
    }
  }

  return {
    ...keywords,
    cleanedText: remainingParts.join(' ')
  };
}
```

### Phase 3: Update Tokenizer Functions

**File:** `src/parsers/index.ts`

#### 3a. Update `tokenizeRegular()` function

Currently `tokenizeRegular()` extracts rotation number and league from the beginning of contract text. Update it to also:

1. Extract keywords using `parseKeywords()`
2. Handle positional date parsing (detect date formats before league/rotation)
3. Store extracted keywords for later use

Key changes:
- Add keyword parsing before rotation number extraction
- Add positional date detection (use date format regex patterns)
- Handle date appearing before or after league
- Store parsed keywords in `ParsedTokens` interface

#### 3b. Update `ParsedTokens` interface

Add new fields:
```typescript
interface ParsedTokens {
  chatType: 'order' | 'fill';
  rotationNumber?: number;
  gameNumber?: number;
  contractText: string;
  explicitLeague?: KnownLeague;
  explicitSport?: Sport;
  // NEW FIELDS:
  eventDate?: Date;  // Parsed event date
  isFreeBet?: boolean;  // Free bet flag
}
```

#### 3c. Update `tokenizeWritein()` function

Currently requires date as first positional argument. Update to:

1. Parse keywords first using `parseKeywords()`
2. Extract league (positionally or from keywords)
3. Extract date (positionally or from keywords)
4. Handle date and league in any order

Example logic:
```typescript
// Parse keywords first
const allowedKeys = ['date', 'league', 'freebet'];
const { date: dateKeyword, league: leagueKeyword, freebet, cleanedText } =
  parseKeywords(initialText, rawInput, allowedKeys);

// Now parse remaining positional arguments
// Look for date and league in any order from cleanedText
// Prefer keyword values over positional if both specified
```

### Phase 4: Update Contract Parsing Functions

**File:** `src/parsers/index.ts`

#### 4a. Update all contract parsing functions

Functions to update:
- `parseTotalPoints()`
- `parseTotalPointsContestant()`
- `parseHandicapML()`
- `parseHandicapLine()`
- `parsePropOU()`
- `parsePropYN()`
- `parseSeries()`

Changes needed:
- Add `eventDate?: Date` parameter
- If `eventDate` is provided, set `contract.Match.Date = eventDate`

#### 4b. Update `parseWritein()` function

Add parameters:
- `league?: string`
- `sport?: Sport`

Set on contract:
```typescript
return {
  EventDate: eventDate,
  Description: validatedDescription,
  League: league,
  Sport: sport
};
```

### Phase 5: Update Main Parse Functions

**File:** `src/parsers/index.ts`

#### 5a. Update `parseChatOrder()` function

After tokenization:
1. Extract `eventDate` and `isFreeBet` from tokens
2. Pass `eventDate` to contract parsing functions
3. Set `result.bet.IsFreeBet = isFreeBet ?? false`

#### 5b. Update `parseChatFill()` function

Same changes as `parseChatOrder()`

### Phase 6: Update Type Definitions

**File:** `src/types/index.ts`

#### 6a. Update `Match` interface

Change:
```typescript
export interface Match {
  Date?: Date;  // Currently always undefined, now can be set
  Team1: string;
  Team2?: string;
  DaySequence?: number;
}
```

#### 6b. Update `ContractWritein` interface

Add:
```typescript
export interface ContractWritein {
  EventDate: Date;
  Description: string;
  Sport?: Sport;  // NEW
  League?: League;  // NEW
}
```

#### 6c. Update `Bet` interface

Add:
```typescript
export interface Bet {
  ExecutionDtm?: Date;
  Price: number;
  Size?: number;
  IsFreeBet?: boolean;  // NEW
}
```

## Test Files Reference

All test cases are in place and currently failing (expected). Implementation should make these pass:

**Fixtures:**
- `tests/fixtures/event-date.fixtures.ts` - 21 test cases for event dates and flags
- `tests/fixtures/event-date-errors.fixtures.ts` - 11 error test cases
- `tests/fixtures/writein.fixtures.ts` - Updated with 10 new writein league/flag test cases

**Test Runner:**
- `tests/unit/parsers.test.ts` - Already wired up, validation logic added

## Implementation Validation

### Run Tests
```bash
npm test -- --testPathPattern="parsers.test"
```

### Expected Results After Implementation
- All 42 new Stage 1 tests should pass
- All 178 existing tests should continue to pass
- Total: 220 tests passing, 0 failing

## Key Implementation Notes

### 1. Order of Operations
The keyword parsing MUST happen before contract parsing to avoid interfering with existing logic:

```
Input: "YG date:5/14 freebet:true Lakers @ +120 = 2.5"

Step 1: Parse keywords → extract "date:5/14", "freebet:true"
Step 2: Clean text → "YG Lakers @ +120 = 2.5"
Step 3: Parse contract → existing logic works unchanged
Step 4: Apply extracted properties → set Match.Date, bet.IsFreeBet
```

### 2. Positional vs Keyword
When both positional and keyword date/league are specified, prefer the keyword value.

### 3. Backward Compatibility
Existing functionality MUST NOT break. All 178 existing tests must continue passing.

### 4. Error Messages
Follow existing error message patterns:
- Include the `rawInput` in all errors
- Provide helpful context about what went wrong
- Use consistent language with existing errors

### 5. Date Parsing
Reuse `parseWriteinDate()` - don't duplicate date parsing logic. This ensures consistency between writein dates and regular contract dates.

## Files to Modify

### Required Changes
1. `src/errors/index.ts` - Add new error classes
2. `src/parsers/utils.ts` - Add `parseKeywords()` function
3. `src/parsers/index.ts` - Update tokenizers and contract parsing functions
4. `src/types/index.ts` - Update type definitions (Match, Bet, ContractWritein)

### No Changes Needed
- Test files (already created and wired up)
- README or documentation (Stage 1 is internal, no public API changes yet)
- Grading or tracking modules

## Troubleshooting

### Common Issues

**Issue:** Keywords not being removed from contract text
**Solution:** Ensure `parseKeywords()` is called before any other text processing

**Issue:** Date parsing errors on valid formats
**Solution:** Use `parseWriteinDate()` directly, don't create new date parsing logic

**Issue:** Tests fail with "undefined is not a function"
**Solution:** Make sure new error classes are exported from `src/errors/index.ts`

**Issue:** Keyword appears in team name
**Solution:** Keywords are only parsed from the beginning section (before contract content), not from team names

## Success Criteria

✅ All 42 new Stage 1 tests pass
✅ All 178 existing tests continue to pass
✅ No TypeScript compilation errors
✅ Code follows existing patterns and style
✅ Event dates work on regular contracts (YG/IW)
✅ League works on writein contracts (YGW/IWW)
✅ Free bet flag works on all contract types
✅ Keyword parsing is robust and well-tested

## Next Steps (Future Stages)

After Stage 1 is complete and all tests pass:
- **Stage 2:** Parlay syntax (YGP/IWP)
- **Stage 3:** Round Robin syntax (YGRR/IWRR)

Do not implement Stage 2 or Stage 3 features yet. Focus only on Stage 1 requirements above.
