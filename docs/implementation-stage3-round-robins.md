# Stage 3 Implementation Guide: Round Robin Syntax (YGRR/IWRR)

## Overview

This document provides complete instructions for implementing Stage 3 features for the chat-bet-parse package. Stage 3 adds support for:

1. **YGRR** (You Got Round Robin) - Round robin fill messages with risk amount
2. **IWRR** (I Want Round Robin) - Round robin order messages without risk
3. **nCr notation** for specifying parlay combinations (e.g., `4c2`, `5c3-`)
4. Risk type specification: `per` (per selection) vs `total` (total risk)
5. At-most modifier with trailing minus (e.g., `4c3-` means 2-leg and 3-leg parlays)
6. Ampersand and multiline formats (same as parlays)
7. Round robin-level optional flags (`pusheslose`, `tieslose`, `freebet`)
8. To-win override syntax (`tw $500`)

## Background

### Current State (After Stage 2)
The parser currently supports:
- **YG/IW**: Straight bet fills/orders
- **YGW/IWW**: Writein contracts
- **YGP/IWP**: Parlay fills/orders (Stage 2)
- Keyword property parsing, event dates, leg-level properties

### What's Missing
- Round robin support (multiple parlay sizes from same legs)
- nCr notation parsing (combinatorial specification)
- Risk type specification (per-selection vs total)

### SQL Schema Constraints

**TicketBet_Combo_RoundRobin table:**
```sql
- Bet (FK to TicketBet_Combo)
- ParlaySize (INT) - single number
- IsAtMost (BIT) - boolean flag
```

This constrains our syntax:
- ✅ `4c2` → ParlaySize=2, IsAtMost=false (exactly 2-leg parlays)
- ✅ `4c3-` → ParlaySize=3, IsAtMost=true (2-leg and 3-leg parlays)
- ❌ `5c2,3` → Cannot represent multiple specific sizes

### Key Design Decision: Round Robins Are NOT Contract Types

Same as parlays - round robins are **bet aggregation types**, not contract types:
- Each leg is a contract
- `ContractType` stays pure
- Round robins distinguished by `parlaySize` field in result

## Stage 3 Requirements

### 1. New Chat Type Prefixes

**YGRR (You Got Round Robin) - Fill:**
- Format: `YGRR <ncr> <legs> = $<risk> <type> [tw $<towin>]`
- Requires nCr notation, risk amount, and risk type
- Example: `YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per`

**IWRR (I Want Round Robin) - Order:**
- Format: `IWRR <ncr> <legs>`
- Requires nCr notation, no risk amount
- Example: `IWRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115`

### 2. nCr Notation Syntax

**Format:** `NcR[modifier]`
- `N` = Total number of legs (must be ≥3)
- `c` = Separator (case-insensitive)
- `R` = Parlay size (must be ≥2, must be < N)
- `modifier` = Optional trailing `-` for "at most"

**Examples:**
- `4c2` → 4 legs, exactly 2-leg parlays (6 combinations)
- `5c3` → 5 legs, exactly 3-leg parlays (10 combinations)
- `4c3-` → 4 legs, at most 3 (both 2-leg and 3-leg parlays: 6+4=10 combinations)
- `5c4-` → 5 legs, at most 4 (2-leg, 3-leg, and 4-leg parlays)

**Validation Rules:**
- `N >= 3` (round robins need at least 3 legs)
- `R >= 2` (parlay size must be at least 2)
- `R < N` (parlay size must be less than total legs)
- Actual leg count MUST match `N` from notation

**Invalid Formats (SQL Constraint):**
- ❌ `5c2,3` → Comma-separated not supported (can't store multiple sizes)
- ❌ `4c4` → Parlay size equals total legs (that's just a regular parlay)

### 3. Risk Type Specification

**Required for YGRR fills:**
- `per` or `total` must appear after size amount
- Example: `= $100 per` or `= $600 total`

**Per-Selection Risk:**
- Format: `= $<amount> per`
- Each individual parlay gets the specified risk
- Example: `4c2` with `$100 per` → 6 parlays, $600 total risk

**Total Risk:**
- Format: `= $<amount> total`
- Total risk is split across all parlays
- Example: `4c2` with `$600 total` → 6 parlays, $100 per parlay

**Default for Orders (IWRR):**
- Default to `perSelection` when not specified

### 4. At-Most Modifier (Trailing Minus)

**Syntax:** Trailing `-` after parlay size
- `4c3-` → At most 3 legs (generates 2-leg AND 3-leg parlays)
- `5c4-` → At most 4 legs (generates 2-leg, 3-leg, AND 4-leg parlays)

**Interpretation:**
- Always starts from 2-leg parlays
- Goes up to the specified size
- Example: `5c4-` generates:
  - All 2-leg combinations (10 parlays)
  - All 3-leg combinations (10 parlays)
  - All 4-leg combinations (5 parlays)
  - Total: 25 parlays

**Storage:**
- `ParlaySize` = the number specified (e.g., 4 for `5c4-`)
- `IsAtMost` = true

### 5. Leg Structure (Same as Parlays)

**Ampersand Separator:**
- `Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115`

**Multiline Format:**
```
YGRR 4c2
Lakers @ +120
Warriors @ -110
Celtics @ +105
Nets @ +115
= $100 per
```

**Leg Properties (Same as Parlays):**
- Each leg can have rotation numbers, game numbers, dates, leagues, periods
- Each leg is parsed as a straight bet order (reuses existing logic)

## Design Architecture

### Type Structure

**File:** `src/types/index.ts`

```typescript
// Add to existing ParseResult union
export type ParseResult = ParseResultStraight | ParseResultParlay | ParseResultRoundRobin;

// NEW: Round robin result type
export interface ParseResultRoundRobin extends ParseResultBase {
  betType: 'roundRobin';
  parlaySize: number;     // from nCr notation (e.g., 2 from "4c2")
  isAtMost: boolean;      // from trailing minus (e.g., true from "4c3-")
  riskType: 'perSelection' | 'total';  // from "per" or "total"
  useFair: boolean;       // true when ToWin not specified
  pushesLose?: boolean;   // from "pusheslose:true" or "tieslose:true"
  legs: Array<ParseResultStraight>;  // Same as parlays
}

// UPDATE: Type guard for round robins
export function isRoundRobin(result: ParseResult): result is ParseResultRoundRobin {
  return result.betType === 'roundRobin';
}
```

### nCr Notation Parser (Separate Module)

**File:** `src/parsers/ncr.ts` (NEW FILE)

```typescript
/**
 * nCr notation parser for round robin bets
 *
 * Format: NcR[modifier]
 * - N: Total legs (>=3)
 * - c: Separator (case-insensitive)
 * - R: Parlay size (>=2, <N)
 * - modifier: Optional '-' for "at most"
 *
 * Examples:
 * - "4c2" → {totalLegs: 4, parlaySize: 2, isAtMost: false}
 * - "5c3-" → {totalLegs: 5, parlaySize: 3, isAtMost: true}
 */

export interface NcrParsed {
  totalLegs: number;
  parlaySize: number;
  isAtMost: boolean;
}

export function parseNcrNotation(notation: string, rawInput: string): NcrParsed {
  // Implementation details in Phase 2 below
}
```

**Why Separate Module?**
- Complex validation logic deserves focused testing
- Reusable if needed elsewhere
- Clear separation of concerns
- Easier to test edge cases (50+ test cases dedicated to nCr parsing)

### SQL Schema Alignment

Round robin result maps to SQL stored procedure:

**TicketBet_Combo table:**
- `Bet_ComboType = 'RoundRobin'`
- `PushesLose` (boolean)

**TicketBet_Combo_RoundRobin table:**
- `ParlaySize` (from nCr notation)
- `IsAtMost` (from trailing minus)

**TicketBet_ComboLeg table (same as parlays):**
- One row per leg
- `LegSequence`, `Contract`, `Price`

## Implementation Plan

### Phase 1: Create nCr Notation Parser Module

**File:** `src/parsers/ncr.ts` (NEW FILE)

**Full implementation with all validation:**

```typescript
import { ChatBetParseError } from '../errors/index';

export class InvalidNcrNotationError extends ChatBetParseError {
  constructor(rawInput: string, message: string) {
    super(rawInput, message);
    this.name = 'InvalidNcrNotationError';
  }
}

export interface NcrParsed {
  totalLegs: number;
  parlaySize: number;
  isAtMost: boolean;
}

/**
 * Parse nCr notation for round robin bets
 * Format: NcR[modifier] where N=total legs, R=parlay size, modifier=optional '-'
 */
export function parseNcrNotation(notation: string, rawInput: string): NcrParsed {
  const trimmed = notation.trim();

  // Check for comma (unsupported SQL constraint)
  if (trimmed.includes(',')) {
    throw new InvalidNcrNotationError(
      rawInput,
      'Comma-separated parlay sizes not supported'
    );
  }

  // Parse basic format: NcR or NcR-
  const match = trimmed.match(/^(\d+)[cC](\d+)(-?)$/);

  if (!match) {
    throw new InvalidNcrNotationError(rawInput, 'Invalid nCr notation format');
  }

  const totalLegs = parseInt(match[1], 10);
  const parlaySize = parseInt(match[2], 10);
  const isAtMost = match[3] === '-';

  // Validate ranges
  if (totalLegs < 3) {
    throw new InvalidNcrNotationError(rawInput, 'Total legs must be at least 3');
  }

  if (parlaySize < 2) {
    throw new InvalidNcrNotationError(rawInput, 'Parlay size must be at least 2');
  }

  if (parlaySize >= totalLegs) {
    throw new InvalidNcrNotationError(
      rawInput,
      'Parlay size must be less than total legs'
    );
  }

  return { totalLegs, parlaySize, isAtMost };
}
```

### Phase 2: Add Round Robin Types

**File:** `src/types/index.ts`

Add `ChatRoundRobinResult` interface (shown above in Design Architecture section)

Update `ParseResult` union type

Update type guards:
```typescript
export function isRoundRobin(result: ParseResult): result is ChatRoundRobinResult {
  return 'legs' in result && 'parlaySize' in result;
}

// Update isParlay to exclude round robins
export function isParlay(result: ParseResult): result is ChatParlayResult {
  return 'legs' in result && !('parlaySize' in result);
}
```

### Phase 3: Add New Error Classes

**File:** `src/errors/index.ts`

```typescript
export class MissingNcrNotationError extends ChatBetParseError {
  constructor(rawInput: string) {
    super(rawInput, 'Round robin requires nCr notation');
    this.name = 'MissingNcrNotationError';
  }
}

export class LegCountMismatchError extends ChatBetParseError {
  constructor(rawInput: string, expected: number, actual: number) {
    super(rawInput, `Expected ${expected} legs from nCr notation, but found ${actual}`);
    this.name = 'LegCountMismatchError';
  }
}

export class MissingRiskTypeError extends ChatBetParseError {
  constructor(rawInput: string) {
    super(rawInput, 'Round robin requires risk type: "per" or "total"');
    this.name = 'MissingRiskTypeError';
  }
}

export class InvalidRiskTypeError extends ChatBetParseError {
  constructor(rawInput: string, value: string) {
    super(rawInput, `Invalid risk type: must be "per" or "total", got "${value}"`);
    this.name = 'InvalidRiskTypeError';
  }
}

export class InvalidRoundRobinLegError extends ChatBetParseError {
  constructor(rawInput: string, legNumber: number, message: string) {
    super(rawInput, `Leg ${legNumber}: ${message}`);
    this.name = 'InvalidRoundRobinLegError';
  }
}

export class InvalidRoundRobinToWinError extends ChatBetParseError {
  constructor(rawInput: string, message: string) {
    super(rawInput, message);
    this.name = 'InvalidRoundRobinToWinError';
  }
}
```

### Phase 4: Implement Round Robin Detection

**File:** `src/parsers/index.ts`

Update `parseChat()` function:

```typescript
export function parseChat(input: string, options?: ParseOptions): ParseResult {
  const rawInput = input.trim();

  // Check for round robin first (before parlay)
  if (rawInput.startsWith('YGRR ') || rawInput.startsWith('YGRR\n')) {
    return parseRoundRobinFill(rawInput, options);
  }

  if (rawInput.startsWith('IWRR ') || rawInput.startsWith('IWRR\n')) {
    return parseRoundRobinOrder(rawInput, options);
  }

  // Check for parlay
  if (rawInput.startsWith('YGP ') || rawInput.startsWith('YGP\n')) {
    return parseParlayFill(rawInput, options);
  }

  if (rawInput.startsWith('IWP ') || rawInput.startsWith('IWP\n')) {
    return parseParlayOrder(rawInput, options);
  }

  // Existing straight bet logic...
}
```

### Phase 5: Implement Round Robin Parsing Functions

**File:** `src/parsers/index.ts`

#### 5a. `parseRoundRobinFill()` function

```typescript
function parseRoundRobinFill(rawInput: string, options?: ParseOptions): ChatRoundRobinResult {
  // 1. Extract "YGRR" prefix
  let text = rawInput.slice(4).trim();

  // 2. Parse round robin-level keywords (same as parlays)
  const allowedKeys = ['pusheslose', 'tieslose', 'freebet'];
  const { pusheslose, tieslose, freebet, cleanedText } =
    parseParlayKeywords(text, rawInput, allowedKeys);  // Reuse from Stage 2

  // 3. Extract nCr notation (must be first token after keywords)
  const parts = cleanedText.split(/\s+/);
  if (parts.length < 1) {
    throw new MissingNcrNotationError(rawInput);
  }

  const ncrNotation = parts[0];
  const { totalLegs, parlaySize, isAtMost } = parseNcrNotation(ncrNotation, rawInput);

  // Remove nCr from text
  const afterNcr = parts.slice(1).join(' ');

  // 4. Detect format: ampersand or multiline
  const isMultiline = afterNcr.includes('\n');

  // 5. Extract legs and size (same logic as parlays)
  let legTexts: string[];
  let sizeText: string;

  if (isMultiline) {
    const lines = afterNcr.split('\n').map(l => l.trim()).filter(l => l);
    const sizeLineIndex = lines.findIndex(l => l.startsWith('='));
    if (sizeLineIndex === -1) {
      throw new MissingSizeForFillError(rawInput, 'YGRR');
    }
    legTexts = lines.slice(0, sizeLineIndex);
    sizeText = lines[sizeLineIndex];
  } else {
    // Ampersand format
    const sizeIndex = afterNcr.indexOf('=');
    if (sizeIndex === -1) {
      throw new MissingSizeForFillError(rawInput, 'YGRR');
    }
    const legsText = afterNcr.slice(0, sizeIndex).trim();
    sizeText = afterNcr.slice(sizeIndex).trim();
    legTexts = legsText.split('&').map(l => l.trim());
  }

  // 6. Validate leg count matches nCr notation
  if (legTexts.length !== totalLegs) {
    throw new LegCountMismatchError(rawInput, totalLegs, legTexts.length);
  }

  // 7. Parse each leg as IW order (reuse existing logic!)
  const legs: ChatOrderResult[] = [];
  for (let i = 0; i < legTexts.length; i++) {
    try {
      const legInput = `IW ${legTexts[i]}`;
      const legResult = parseChatOrder(legInput, options);
      legs.push(legResult as ChatOrderResult);
    } catch (error) {
      throw new InvalidRoundRobinLegError(rawInput, i + 1, error.message);
    }
  }

  // 8. Parse size with risk type (NEW for round robins)
  const { risk, toWin, useFair, riskType } = parseRoundRobinSize(sizeText, rawInput);

  // 9. Build result
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
    parlaySize,
    isAtMost,
    riskType,
    legs
  };
}
```

#### 5b. `parseRoundRobinOrder()` function

Similar to `parseRoundRobinFill()` but:
- No size parsing
- No ExecutionDtm
- Default riskType to `'perSelection'`
- Risk and ToWin undefined

### Phase 6: Implement Helper Function

**File:** `src/parsers/utils.ts`

```typescript
export interface ParsedRoundRobinSize {
  risk: number;
  toWin?: number;
  useFair: boolean;
  riskType: 'perSelection' | 'total';
}

export function parseRoundRobinSize(
  sizeText: string,
  rawInput: string
): ParsedRoundRobinSize {
  // Remove leading '='
  if (!sizeText.startsWith('=')) {
    throw new InvalidSizeFormatError(rawInput, 'Size must start with =');
  }

  const text = sizeText.slice(1).trim();

  // Parse format: $<amount> <type> [tw $<towin>]
  // Example: "$100 per" or "$600 total tw $1500"

  // Check for to-win override
  const twMatch = text.match(/^(\$?[\d.]+)\s+(per|total)\s+tw\s+(\$?[\d.]+)$/i);

  if (twMatch) {
    // Has to-win override
    const risk = parseFloat(twMatch[1].replace('$', ''));
    const riskType = twMatch[2].toLowerCase() as 'perSelection' | 'total';
    const toWin = parseFloat(twMatch[3].replace('$', ''));

    // Normalize "per" to "perSelection"
    const normalizedType = riskType === 'per' ? 'perSelection' : riskType;

    return { risk, toWin, useFair: false, riskType: normalizedType };
  }

  // No to-win, parse risk and type
  const sizeMatch = text.match(/^(\$?[\d.]+)\s+(per|total)$/i);

  if (!sizeMatch) {
    // Check if risk type is missing
    const hasRiskOnly = text.match(/^\$?[\d.]+$/);
    if (hasRiskOnly) {
      throw new MissingRiskTypeError(rawInput);
    }
    throw new InvalidSizeFormatError(rawInput, 'Invalid size format');
  }

  const risk = parseFloat(sizeMatch[1].replace('$', ''));
  const riskType = sizeMatch[2].toLowerCase();

  // Validate risk type
  if (riskType !== 'per' && riskType !== 'total') {
    throw new InvalidRiskTypeError(rawInput, riskType);
  }

  // Normalize "per" to "perSelection"
  const normalizedType = riskType === 'per' ? 'perSelection' : 'total';

  return { risk, toWin: undefined, useFair: true, riskType: normalizedType };
}
```

### Phase 7: Update Test Wiring

**File:** `tests/unit/parsers.test.ts`

Add nCr notation tests (separate describe block):

```typescript
// Import nCr test types and fixtures
import {
  NcrNotationTestCase,
  NcrNotationErrorTestCase,
  ncrNotationTestCases,
  ncrNotationErrorTestCases
} from '../fixtures/ncr-notation.fixtures';
import { parseNcrNotation } from '../../src/parsers/ncr';

// Import round robin test types and fixtures
import { RoundRobinTestCase } from '../fixtures/types';
import { roundRobinTestCases } from '../fixtures/round-robin.fixtures';
import { roundRobinErrorTestCases } from '../fixtures/round-robin-errors.fixtures';
import { isRoundRobin } from '../../src/index';

// nCr notation validation function
function validateNcrTestCase(testCase: NcrNotationTestCase) {
  const result = parseNcrNotation(testCase.input, testCase.input);
  expect(result.totalLegs).toBe(testCase.expectedTotalLegs);
  expect(result.parlaySize).toBe(testCase.expectedParlaySize);
  expect(result.isAtMost).toBe(testCase.expectedIsAtMost);
}

// nCr notation error validation function
function validateNcrErrorTestCase(testCase: NcrNotationErrorTestCase) {
  expect(() => parseNcrNotation(testCase.input, testCase.input)).toThrow();
  try {
    parseNcrNotation(testCase.input, testCase.input);
  } catch (error) {
    expect(error.name).toBe(testCase.expectedErrorType);
    expect(error.message).toContain(testCase.expectedErrorMessage);
  }
}

// Round robin validation function
function validateRoundRobinTestCase(testCase: RoundRobinTestCase) {
  const options = testCase.referenceDate ? { referenceDate: testCase.referenceDate } : undefined;
  const result = parseChat(testCase.input, options);

  // Verify it's a round robin
  expect(isRoundRobin(result)).toBe(true);
  if (!isRoundRobin(result)) return; // Type guard

  // Validate round robin-level properties
  expect(result.chatType).toBe(testCase.expectedChatType);
  expect(result.parlaySize).toBe(testCase.expectedParlaySize);
  expect(result.isAtMost).toBe(testCase.expectedIsAtMost);
  expect(result.riskType).toBe(testCase.expectedRiskType);

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

  // Validate each leg (same logic as parlays)
  for (let i = 0; i < testCase.expectedLegs.length; i++) {
    const expectedLeg = testCase.expectedLegs[i];
    const actualLeg = result.legs[i];

    expect('contract' in actualLeg).toBe(true);
    if (!('contract' in actualLeg)) continue;

    expect(actualLeg.contractType).toBe(expectedLeg.contractType);
    expect(actualLeg.bet.Price).toBe(expectedLeg.price);

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
  }
}

// Add test sections
describe('nCr Notation Parsing (Unit Tests)', () => {
  test.each(ncrNotationTestCases)('$description', validateNcrTestCase);
});

describe('nCr Notation Errors (Unit Tests)', () => {
  test.each(ncrNotationErrorTestCases)('$description', validateNcrErrorTestCase);
});

describe('Round Robins', () => {
  test.each(roundRobinTestCases)('$description', validateRoundRobinTestCase);
});

describe('Round Robin Errors', () => {
  test.each(roundRobinErrorTestCases)('$description', validateErrorTestCase);
});
```

## Test Files Reference

All test cases are in place:

**nCr Notation Tests (Unit):**
- `tests/fixtures/ncr-notation.fixtures.ts` - 50+ test cases
  - 13 valid format tests
  - 35+ error/validation tests

**Round Robin Tests (Integration):**
- `tests/fixtures/round-robin.fixtures.ts` - 22 test cases
  - Basic exactly syntax (4 tests)
  - At-most syntax (3 tests)
  - To-win override (2 tests)
  - Optional flags (3 tests)
  - Leg-level properties (2 tests)
  - Multiline format (2 tests)
  - Validation tests (6 tests)

**Round Robin Error Tests:**
- `tests/fixtures/round-robin-errors.fixtures.ts` - 18 error test cases

**Total Stage 3 Tests:** 90+ tests

## Implementation Validation

### Run Tests
```bash
# Run all tests
npm test -- --testPathPattern="parsers.test"

# Run only nCr notation tests
npm test -- --testPathPattern="parsers.test" -t "nCr Notation"

# Run only round robin integration tests
npm test -- --testPathPattern="parsers.test" -t "Round Robin"
```

### Expected Results After Implementation
- All 13 nCr notation tests pass
- All 37 nCr error tests pass
- All 22 round robin integration tests pass
- All 18 round robin error tests pass
- All 261 existing tests (Stages 1-2) continue to pass
- Total: 351 tests passing, 0 failing

## Key Implementation Notes

### 1. nCr Parser is Standalone Module

**Critical:** The nCr parser MUST be:
- In separate file: `src/parsers/ncr.ts`
- Thoroughly unit tested (50+ dedicated tests)
- Reusable and well-documented
- Validated independently before integration

This ensures the complex combinatorial logic is bulletproof.

### 2. Reuse Parlay Parsing Logic

Round robins are similar to parlays:
- Same leg parsing (each leg is IW order)
- Same keyword parsing (`pusheslose`, `freebet`)
- Same leg separator (ampersand or multiline)
- Same to-win override syntax

**Reuse these functions:**
- `parseParlayKeywords()` (from Stage 2)
- `parseChatOrder()` (for each leg)
- Ampersand/multiline detection logic

### 3. Risk Type is Required for Fills

Unlike parlays, round robins MUST specify risk type:
- ❌ `= $100` → ERROR (missing type)
- ✅ `= $100 per` → OK
- ✅ `= $600 total` → OK

This is because the risk calculation depends on knowing whether it's per-parlay or total.

### 4. Leg Count Validation is Critical

The nCr notation specifies total legs:
- `4c2` expects exactly 4 legs
- If 3 or 5 legs provided → ERROR
- Validate AFTER parsing all legs

### 5. SQL Constraint: No Comma-Separated Sizes

The database can only store:
- Single `ParlaySize` number
- `IsAtMost` boolean

Therefore:
- ❌ `5c2,3` → Cannot represent
- ✅ `5c3-` → Can represent (at most 3, generates 2s and 3s)

Error clearly when comma detected.

### 6. Type Guards Enable Discrimination

```typescript
const result = parseChat(input);

if (isRoundRobin(result)) {
  // TypeScript knows: result is ChatRoundRobinResult
  console.log(result.parlaySize);     // OK
  console.log(result.riskType);       // OK
  console.log(result.isAtMost);       // OK
}

if (isParlay(result)) {
  // TypeScript knows: result is ChatParlayResult
  console.log(result.legs);           // OK
  console.log(result.parlaySize);     // Error: no parlaySize on parlays
}
```

### 7. Per vs Total Risk Calculation (UI Responsibility)

The parser stores:
- `Risk` amount
- `riskType` ('perSelection' | 'total')

UI calculates actual parlay risks:
```typescript
if (result.riskType === 'perSelection') {
  // Each parlay gets Risk amount
  const totalRisk = result.bet.Risk * numCombinations;
} else {
  // Total risk split across parlays
  const riskPerParlay = result.bet.Risk / numCombinations;
}
```

## Files to Modify

### Required Changes
1. ✅ `src/parsers/ncr.ts` - NEW FILE for nCr notation parser
2. ✅ `src/types/index.ts` - Add `ChatRoundRobinResult` type and update guards
3. ✅ `src/errors/index.ts` - Add round robin error classes
4. ✅ `src/parsers/index.ts` - Add `parseRoundRobinFill()`, `parseRoundRobinOrder()`, update `parseChat()`
5. ✅ `src/parsers/utils.ts` - Add `parseRoundRobinSize()`
6. ✅ `tests/unit/parsers.test.ts` - Add round robin test validation and wiring

### No Changes Needed
- Contract parsing functions (reused from Stages 1-2)
- Parlay parsing functions (reused keyword logic)
- Mapping functions (same as parlays)

## Troubleshooting

### Common Issues

**Issue:** nCr parsing fails on valid input
**Solution:** Check regex in `parseNcrNotation()` - must be case-insensitive for 'c'

**Issue:** Leg count mismatch error
**Solution:** Validate leg count AFTER splitting and parsing all legs

**Issue:** Risk type missing but no error
**Solution:** Check `parseRoundRobinSize()` detects missing type and throws `MissingRiskTypeError`

**Issue:** Type guard not narrowing correctly
**Solution:** Ensure `parlaySize` field is only on `ChatRoundRobinResult`, not `ChatParlayResult`

**Issue:** Comma-separated notation not rejected
**Solution:** Check for comma BEFORE regex match in `parseNcrNotation()`

**Issue:** At-most not setting `isAtMost` flag
**Solution:** Verify regex captures trailing `-` in group 3

## Success Criteria

✅ All 50 nCr notation tests pass (unit tests)
✅ All 22 round robin integration tests pass
✅ All 18 round robin error tests pass
✅ All 261 existing tests continue to pass (no regression)
✅ No TypeScript compilation errors
✅ Type guards work correctly
✅ Zero new contract parsing code (reuses existing)
✅ nCr parser is standalone, well-tested module
✅ ContractType enum unchanged (stays pure)
✅ Risk type specification works (per/total)
✅ At-most modifier works (trailing minus)
✅ Leg count validation works
✅ SQL constraint enforced (no comma-separated)

## UI Integration Example

After implementation, UI uses round robins like this:

```typescript
const result = await parseChatAsync('YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per');

if (isRoundRobin(result)) {
  // Map each leg to ContractLegSpec (same as parlays!)
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

  // Calculate actual risk per combination
  const numCombinations = calculateCombinations(
    result.legs.length,
    result.parlaySize,
    result.isAtMost
  );

  const actualRisk = result.riskType === 'perSelection'
    ? result.bet.Risk
    : result.bet.Risk / numCombinations;

  const totalRisk = result.riskType === 'perSelection'
    ? result.bet.Risk * numCombinations
    : result.bet.Risk;

  // Call combo stored procedure
  await executeStoredProcedure({
    procedureName: 'dbo.Party_UPSERT_TicketBet_Combo_tr',
    params: {
      Party: currentParty,
      CounterpartyLedger,
      PartnershipLedger,
      WhoTurnedInType,
      ExecutionDtm: result.bet.ExecutionDtm,
      Risk: totalRisk,
      ToWin: result.useFair
        ? calculateRoundRobinToWin(result.legs, result.parlaySize, result.isAtMost)
        : result.bet.ToWin,
      IsFreeBet: result.bet.IsFreeBet || false,
      Bet_ComboType: 'RoundRobin',
      PushesLose: result.pushesLose || false,
      ParlaySize: result.parlaySize,
      IsAtMost: result.isAtMost,
      DryRun: false
    },
    tableParams: { contractSpecs }
  });
}
```

**Zero new mapping code!** Same as parlays - reuses existing `mapParseResultToContractLegSpec()`.

## Completion

Stage 3 completes the chat-bet-parse feature set:
- ✅ Stage 1: Event dates, writein leagues, free bet flag
- ✅ Stage 2: Parlays (YGP/IWP)
- ✅ Stage 3: Round robins (YGRR/IWRR)

Total test coverage: 351 tests across all contract types and bet aggregation types.
