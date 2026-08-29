/**
 * Unit tests for chat-bet-parse parsers
 * Tests all contract types and error scenarios from EBNF grammar
 */

import {
  parseChat,
  parseChatOrder,
  parseChatFill,
  isWritein,
  isParlay,
  isRoundRobin,
  ChatBetParseError,
  BET_CANDIDATE_SIGNAL,
} from '../../src/index';

// Import test types
import {
  TestCase,
  ErrorTestCase,
  ParlayTestCase,
  RoundRobinTestCase,
  NcrNotationTestCase,
  NcrNotationErrorTestCase,
} from '../fixtures/types';

// Import test fixtures directly from individual files
import { edgeCaseTestCases } from '../fixtures/edge-cases.fixtures';
import { errorTestCases, writeinErrorTestCases } from '../fixtures/error-cases.fixtures';
import { eventDateTestCases } from '../fixtures/event-date.fixtures';
import { eventDateErrorTestCases } from '../fixtures/event-date-errors.fixtures';
import {
  gameSequenceTestCases,
  enhancedGameNumberTestCases,
} from '../fixtures/game-sequence.fixtures';
import { gameTotalsTestCases } from '../fixtures/game-totals.fixtures';
import { individualContestantTestCases } from '../fixtures/individual-contestants.fixtures';
import { moneylinesTestCases } from '../fixtures/moneylines.fixtures';
import { periodParsingTestCases } from '../fixtures/period-parsing.fixtures';
import { priceParsingTestCases } from '../fixtures/price-parsing.fixtures';
import { propsYNTestCases, propsOUTestCases } from '../fixtures/props.fixtures';
import { seriesTestCases } from '../fixtures/series.fixtures';
import { orderSizeTestCases, fillSizeTestCases } from '../fixtures/size-parsing.fixtures';
import { specialFormatsTestCases } from '../fixtures/special-formats.fixtures';
import { sportLeagueInferenceTestCases } from '../fixtures/sport-league-inference.fixtures';
import { spreadsTestCases } from '../fixtures/spreads.fixtures';
import { teamTotalsTestCases } from '../fixtures/team-totals.fixtures';
import { impliedPrefixTestCases } from '../fixtures/implied-prefix.fixtures';
import { writeinTestCases } from '../fixtures/writein.fixtures';
import { parlayTestCases } from '../fixtures/parlay.fixtures';
import { parlayErrorTestCases } from '../fixtures/parlay-errors.fixtures';
import { ncrNotationTestCases, ncrNotationErrorTestCases } from '../fixtures/ncr-notation.fixtures';
import { roundRobinTestCases } from '../fixtures/round-robin.fixtures';
import { roundRobinErrorTestCases } from '../fixtures/round-robin-errors.fixtures';

// Import nCr parser for unit tests
import { parseNcrNotation } from '../../src/parsers/ncr';
import { parsePeriod } from '../../src/parsers/utils';

/**
 * HELPER FUNCTIONS FOR DRY TEST ASSERTIONS
 */

/**
 * Asserts equality only if expected value is defined
 */
function expectIfDefined<T>(actual: T, expected: T | undefined): void {
  if (expected !== undefined) {
    expect(actual).toBe(expected);
  }
}

/**
 * Asserts that a contract has a property with the expected value
 */
function expectContractProperty<T>(
  contract: any,
  propertyName: string,
  expectedValue: T | undefined
): void {
  if (expectedValue !== undefined) {
    expect(propertyName in contract).toBe(true);
    if (propertyName in contract) {
      expect(contract[propertyName]).toBe(expectedValue);
    }
  }
}

/**
 * Validates a single leg (used by both parlay and round robin validation)
 */
function validateLeg(actualLeg: any, expectedLeg: any): void {
  // Each leg must be a straight bet
  expect('contract' in actualLeg).toBe(true);
  if (!('contract' in actualLeg)) return;

  // Validate leg properties
  expect(actualLeg.contractType).toBe(expectedLeg.contractType);
  expect(actualLeg.bet.Price).toBe(expectedLeg.price);

  // Validate leg contract details
  if (expectedLeg.team) {
    expect('Contestant' in actualLeg.contract && actualLeg.contract.Contestant).toBe(
      expectedLeg.team
    );
  }
  if (expectedLeg.teams) {
    expect(actualLeg.contract.Match.Team1).toBe(expectedLeg.teams[0]);
    if (expectedLeg.teams[1]) {
      expect(actualLeg.contract.Match.Team2).toBe(expectedLeg.teams[1]);
    }
  }

  // Individual player prop fields
  expectIfDefined(actualLeg.contract.Match?.Player, expectedLeg.player);
  expectIfDefined(actualLeg.contract.Match?.PlayerTeam, expectedLeg.playerTeam);

  // Line and over/under
  expectContractProperty(actualLeg.contract, 'Line', expectedLeg.line);
  expectContractProperty(actualLeg.contract, 'IsOver', expectedLeg.isOver);

  // Other fields
  expectIfDefined(actualLeg.rotationNumber, expectedLeg.rotationNumber);
  expectIfDefined(actualLeg.contract.Match?.DaySequence, expectedLeg.daySequence);
  expectIfDefined(actualLeg.contract.Sport, expectedLeg.sport);
  expectIfDefined(actualLeg.contract.League, expectedLeg.league);

  // Period validation
  if (expectedLeg.period) {
    expect(actualLeg.contract.Period.PeriodTypeCode).toBe(expectedLeg.period.PeriodTypeCode);
    expect(actualLeg.contract.Period.PeriodNumber).toBe(expectedLeg.period.PeriodNumber);
  }

  // Event date
  if (expectedLeg.eventDate) {
    expect(actualLeg.contract.Match.Date).toEqual(expectedLeg.eventDate);
  }

  // Writein-specific validations
  expectContractProperty(actualLeg.contract, 'Description', expectedLeg.description);
  if (expectedLeg.writeinEventDate) {
    expect('EventDate' in actualLeg.contract && actualLeg.contract.EventDate).toEqual(
      expectedLeg.writeinEventDate
    );
  }
}

/**
 * Generic test function that validates a parsed result against expected values
 */
function validateTestCase(testCase: TestCase) {
  const options =
    testCase.referenceDate || testCase.impliedPrefix
      ? {
          ...(testCase.referenceDate ? { referenceDate: testCase.referenceDate } : {}),
          ...(testCase.impliedPrefix ? { impliedPrefix: testCase.impliedPrefix } : {}),
        }
      : undefined;
  const result = parseChat(testCase.input, options);

  // Basic result structure
  expect(result.chatType).toBe(testCase.expectedChatType);
  expect(result.contractType).toBe(testCase.expectedContractType);

  // Bet details
  expect(result.bet.Price).toBe(testCase.expectedPrice);
  expectIfDefined(result.bet.Size, testCase.expectedSize);
  expectIfDefined(result.bet.Risk, testCase.expectedRisk);
  expectIfDefined(result.bet.ToWin, testCase.expectedToWin);

  // ExecutionDtm - fills have it, orders don't
  if (testCase.expectedChatType === 'fill') {
    expect(result.bet.ExecutionDtm).toBeInstanceOf(Date);
  } else {
    expect(result.bet.ExecutionDtm).toBeUndefined();
  }

  // Contract details - different handling for different contract types
  if (isWritein(result.contract)) {
    // Writein-specific validations
    if (testCase.expectedEventDate !== undefined) {
      expect(result.contract.EventDate).toEqual(testCase.expectedEventDate);
    }
    expectIfDefined(result.contract.Description, testCase.expectedDescription);
  } else {
    // Regular contracts with Match property
    expectIfDefined(result.contract.Match.Team1, testCase.expectedTeam1);
    expectIfDefined(result.contract.Match.Team2, testCase.expectedTeam2);
    expectIfDefined(result.contract.Match.Player, testCase.expectedPlayer);
    expectIfDefined(result.contract.Match.PlayerTeam, testCase.expectedPlayerTeam);
    expectIfDefined(result.contract.Match.DaySequence, testCase.expectedDaySequence);
  }

  // Rotation number
  if (testCase.expectedRotationNumber !== undefined) {
    expect(result.rotationNumber).toBe(testCase.expectedRotationNumber);
    if ('RotationNumber' in result.contract) {
      expect(result.contract.RotationNumber).toBe(testCase.expectedRotationNumber);
    }
  }

  // Period info
  if (testCase.expectedPeriod !== undefined) {
    expect('Period' in result.contract).toBe(true);
    if ('Period' in result.contract) {
      expect(result.contract.Period.PeriodTypeCode).toBe(testCase.expectedPeriod.PeriodTypeCode);
      expect(result.contract.Period.PeriodNumber).toBe(testCase.expectedPeriod.PeriodNumber);
    }
  }

  // Contract-specific fields using helper
  expectContractProperty(result.contract, 'Line', testCase.expectedLine);
  expectContractProperty(result.contract, 'IsOver', testCase.expectedIsOver);
  expectContractProperty(result.contract, 'IsYes', testCase.expectedIsYes);
  expectContractProperty(result.contract, 'TiesLose', testCase.expectedTiesLose);
  expectContractProperty(result.contract, 'Prop', testCase.expectedProp);
  expectContractProperty(result.contract, 'SeriesLength', testCase.expectedSeriesLength);
  expectContractProperty(result.contract, 'ContestantType', testCase.expectedContestantType);

  // Sport and League fields (same for both writein and regular contracts)
  expectIfDefined(result.contract.Sport, testCase.expectedSport);
  expectIfDefined(result.contract.League, testCase.expectedLeague);

  // Event date for regular contracts (in addition to writeins)
  if (!isWritein(result.contract) && testCase.expectedEventDate !== undefined) {
    expect(result.contract.Match.Date).toEqual(testCase.expectedEventDate);
  }

  // Free bet flag
  expectIfDefined(result.bet.IsFreeBet, testCase.expectedFreeBet);
}

/**
 * Generic error test function
 */
function validateErrorTestCase(testCase: ErrorTestCase) {
  expect(() => parseChat(testCase.input)).toThrow();

  try {
    parseChat(testCase.input);
  } catch (error) {
    expect(error).toBeInstanceOf(ChatBetParseError);
    expect(error.name).toBe(testCase.expectedErrorType);
    expect(error.message).toContain(testCase.expectedErrorMessage);
    expect(error.rawInput).toBe(testCase.input);
  }
}

/**
 * Parlay test validation function
 */
function validateParlayTestCase(testCase: ParlayTestCase) {
  const options = testCase.referenceDate ? { referenceDate: testCase.referenceDate } : undefined;
  const result = parseChat(testCase.input, options);

  // Verify it's a parlay
  expect(isParlay(result)).toBe(true);
  if (!isParlay(result)) return; // Type guard

  // Validate parlay-level properties
  expect(result.chatType).toBe(testCase.expectedChatType);
  expectIfDefined(result.bet.Risk, testCase.expectedRisk);
  expectIfDefined(result.bet.ToWin, testCase.expectedToWin);
  expect(result.useFair).toBe(testCase.expectedUseFair);
  expectIfDefined(result.pushesLose, testCase.expectedPushesLose);
  expectIfDefined(result.bet.IsFreeBet, testCase.expectedFreeBet);

  // Validate leg count
  expect(result.legs).toHaveLength(testCase.expectedLegs.length);

  // Validate each leg using shared helper
  for (let i = 0; i < testCase.expectedLegs.length; i++) {
    validateLeg(result.legs[i], testCase.expectedLegs[i]);
  }
}

/**
 * Validation function for nCr notation unit tests
 */
function validateNcrTestCase(testCase: NcrNotationTestCase) {
  const result = parseNcrNotation(testCase.input, testCase.input);
  expect(result.totalLegs).toBe(testCase.expectedTotalLegs);
  expect(result.parlaySize).toBe(testCase.expectedParlaySize);
  expect(result.isAtMost).toBe(testCase.expectedIsAtMost);
}

/**
 * Validation function for nCr notation error tests
 */
function validateNcrErrorTestCase(testCase: NcrNotationErrorTestCase) {
  expect(() => parseNcrNotation(testCase.input, testCase.input)).toThrow();
  try {
    parseNcrNotation(testCase.input, testCase.input);
  } catch (error) {
    expect((error as Error).name).toBe(testCase.expectedErrorType);
    expect((error as Error).message).toContain(testCase.expectedErrorMessage);
  }
}

/**
 * Validation function for round robin integration tests
 */
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
  expectIfDefined(result.bet.Risk, testCase.expectedRisk);
  expectIfDefined(result.bet.ToWin, testCase.expectedToWin);
  expect(result.useFair).toBe(testCase.expectedUseFair);
  expectIfDefined(result.pushesLose, testCase.expectedPushesLose);
  expectIfDefined(result.bet.IsFreeBet, testCase.expectedFreeBet);

  // Validate leg count
  expect(result.legs).toHaveLength(testCase.expectedLegs.length);

  // Validate each leg using shared helper
  for (let i = 0; i < testCase.expectedLegs.length; i++) {
    validateLeg(result.legs[i], testCase.expectedLegs[i]);
  }
}

describe('Chat Bet Parsing', () => {
  // Edge Cases
  describe('Edge Cases', () => {
    test.each(edgeCaseTestCases)('$description', validateTestCase);
  });

  // Event Dates
  describe('Event Dates', () => {
    test.each(eventDateTestCases)('$description', validateTestCase);
  });

  // Game Sequence
  describe('Game Sequence', () => {
    test.each(gameSequenceTestCases)('$description', validateTestCase);
  });

  // Enhanced Game Number
  describe('Enhanced Game Number', () => {
    test.each(enhancedGameNumberTestCases)('$description', validateTestCase);
  });

  // Game Totals
  describe('Game Totals', () => {
    test.each(gameTotalsTestCases)('$description', validateTestCase);
  });

  // Individual Contestants
  describe('Individual Contestants', () => {
    test.each(individualContestantTestCases)('$description', validateTestCase);
  });

  // Moneylines
  describe('Moneylines', () => {
    test.each(moneylinesTestCases)('$description', validateTestCase);
  });

  // Period Parsing
  describe('Period Parsing', () => {
    test.each(periodParsingTestCases)('$description', validateTestCase);

    test('parses ordinal inning with trailing period like the period-free variant', () => {
      const withPeriod = parseChat('YG 919 Tigers o0.5 1st. inning +113 = 10.0');
      const withoutPeriod = parseChat('YG 919 Tigers o0.5 1st inning +113 = 10.0');

      expect(withPeriod.chatType).toBe(withoutPeriod.chatType);
      expect(withPeriod.contractType).toBe(withoutPeriod.contractType);
      expect(withPeriod.rotationNumber).toBe(withoutPeriod.rotationNumber);
      expect(withPeriod.contract).toEqual(withoutPeriod.contract);
      expect(withPeriod.bet.Price).toBe(withoutPeriod.bet.Price);
      expect(withPeriod.bet.Size).toBe(withoutPeriod.bet.Size);
      expect(withPeriod.bet.Risk).toBe(withoutPeriod.bet.Risk);
      expect(withPeriod.bet.ToWin).toBe(withoutPeriod.bet.ToWin);
    });

    test('parsePeriod accepts ordinal inning token with trailing period', () => {
      expect(parsePeriod('1st. inning', '1st. inning')).toEqual({
        PeriodTypeCode: 'I',
        PeriodNumber: 1,
      });
    });
  });

  // Price Parsing
  describe('Price Parsing', () => {
    test.each(priceParsingTestCases)('$description', validateTestCase);
  });

  // Props (Yes/No)
  describe('Props (Yes/No)', () => {
    test.each(propsYNTestCases)('$description', validateTestCase);
  });

  // Props (Over/Under)
  describe('Props (Over/Under)', () => {
    test.each(propsOUTestCases)('$description', validateTestCase);
  });

  // Series
  describe('Series', () => {
    test.each(seriesTestCases)('$description', validateTestCase);
  });

  // Order Size Parsing
  describe('Order Size Parsing', () => {
    test.each(orderSizeTestCases)('$description', validateTestCase);
  });

  // Fill Size Parsing
  describe('Fill Size Parsing', () => {
    test.each(fillSizeTestCases)('$description', validateTestCase);
  });

  // Extended Size Parsing (tw, tp, risk, towin) - checks bet.Risk/ToWin instead of bet.Size
  describe('Extended Size Parsing', () => {
    test('tw syntax - risk with to-win override', () => {
      const result = parseChat('YG Lakers ML @ -105 = $110 tw $100');
      expect(result.chatType).toBe('fill');
      expect(result.bet.Price).toBe(-105);
      expect(result.bet.Risk).toBe(110);
      expect(result.bet.ToWin).toBe(100);
      expect(result.bet.Size).toBeUndefined();
    });

    test('"to win" syntax - same as tw', () => {
      const result = parseChat('YG Celtics -1.5 @ -110 = $115 to win $100');
      expect(result.chatType).toBe('fill');
      expect(result.bet.Price).toBe(-110);
      expect(result.bet.Risk).toBe(115);
      expect(result.bet.ToWin).toBe(100);
      expect(result.bet.Size).toBeUndefined();
    });

    test('tp syntax - calculates to-win from to-pay', () => {
      const result = parseChat('YG Warriors ML @ -121 = $120 tp $220');
      expect(result.chatType).toBe('fill');
      expect(result.bet.Price).toBe(-121);
      expect(result.bet.Risk).toBe(120);
      expect(result.bet.ToWin).toBe(100); // $220 - $120
      expect(result.bet.Size).toBeUndefined();
    });

    test('"to pay" syntax - same as tp', () => {
      const result = parseChat('YG Heat ML @ -111 = $110 to pay 0.230');
      expect(result.chatType).toBe('fill');
      expect(result.bet.Price).toBe(-111);
      expect(result.bet.Risk).toBe(110);
      expect(result.bet.ToWin).toBe(120); // $210 - $110
      expect(result.bet.Size).toBeUndefined();
    });

    test('risk keyword - explicit risk amount only, calculates toWin from price', () => {
      const result = parseChat('YG Knicks -2.5 @ -110 = risk $110');
      expect(result.chatType).toBe('fill');
      expect(result.bet.Price).toBe(-110);
      expect(result.bet.Risk).toBe(110);
      expect(result.bet.ToWin).toBe(100); // calculated from -110 odds
      expect(result.bet.Size).toBeUndefined();
    });

    test('towin keyword - explicit to-win amount only, calculates risk from price', () => {
      const result = parseChat('YG Bulls ML @ +150 = towin 0.150');
      expect(result.chatType).toBe('fill');
      expect(result.bet.Price).toBe(150);
      expect(result.bet.Risk).toBe(100); // calculated from +150 odds
      expect(result.bet.ToWin).toBe(150);
      expect(result.bet.Size).toBeUndefined();
    });

    test('backward compat - simple size syntax still works and populates Risk/ToWin', () => {
      const result = parseChat('YG Lakers ML @ -110 = 2.5');
      expect(result.chatType).toBe('fill');
      expect(result.bet.Price).toBe(-110);
      expect(result.bet.Size).toBe(2500); // decimal thousands
      expect(result.bet.Risk).toBe(2750); // 2500 * 110/100
      expect(result.bet.ToWin).toBe(2500);
    });
  });

  // Special Formats
  describe('Special Formats', () => {
    test.each(specialFormatsTestCases)('$description', validateTestCase);
  });

  // Sport/League Inference
  describe('Sport/League Inference', () => {
    test.each(sportLeagueInferenceTestCases)('$description', validateTestCase);
  });

  // Spreads
  describe('Spreads', () => {
    test.each(spreadsTestCases)('$description', validateTestCase);
  });

  // Team Totals
  describe('Team Totals', () => {
    test.each(teamTotalsTestCases)('$description', validateTestCase);
  });

  // Writein
  describe('Implied Prefix', () => {
    test.each(impliedPrefixTestCases)('$description', validateTestCase);

    test('unprefixed message without impliedPrefix still throws (default unchanged)', () => {
      expect(() => parseChat('Over 4 first five -105 Red Sox')).toThrow(ChatBetParseError);
    });

    test('chatter under implied IW throws, never silently parses', () => {
      expect(() => parseChat('will lyk when im ready', { impliedPrefix: 'IW' })).toThrow(
        ChatBetParseError
      );
    });

    test('date-like chatter (mid-token hyphen) under implied IW throws', () => {
      expect(() => parseChat('available 8-20', { impliedPrefix: 'IW' })).toThrow(ChatBetParseError);
    });

    test('range-like chatter under implied IW throws', () => {
      expect(() => parseChat('back around 3-4pm i think', { impliedPrefix: 'IW' })).toThrow(
        ChatBetParseError
      );
    });

    test('implied YG without size throws MissingSizeForFillError semantics', () => {
      expect(() => parseChat('872 Athletics @ +145', { impliedPrefix: 'YG' })).toThrow(
        ChatBetParseError
      );
    });

    // BET_CANDIDATE_SIGNAL is exported so downstream pre-parse gates can
    // mirror the implied-prefix bet signal from ONE definition (consumers
    // pin their local copy to this regex's source in a parity test).
    test('BET_CANDIDATE_SIGNAL accepts token-boundary and letter-glued signed numbers', () => {
      for (const text of ['Red Sox -1.5 -110', 'First 5 gurdians-128 ml', 'Angels+1.5']) {
        expect(BET_CANDIDATE_SIGNAL.test(text)).toBe(true);
      }
    });

    test('BET_CANDIDATE_SIGNAL rejects digit-glued ranges and plain chatter', () => {
      for (const text of [
        'available 8-20',
        'back around 3-4pm i think',
        'will lyk when im ready',
      ]) {
        expect(BET_CANDIDATE_SIGNAL.test(text)).toBe(false);
      }
    });
  });

  describe('Writein', () => {
    test.each(writeinTestCases)('$description', validateTestCase);
  });

  // Error Cases
  describe('Error Cases', () => {
    test.each(errorTestCases)('$description', validateErrorTestCase);
  });

  // Event Date Error Cases
  describe('Event Date Error Cases', () => {
    test.each(eventDateErrorTestCases)('$description', validateErrorTestCase);
  });

  // Writein Error Cases
  describe('Writein Error Cases', () => {
    test.each(writeinErrorTestCases)('$description', validateErrorTestCase);
  });

  // Parlays (Stage 2)
  describe('Parlays', () => {
    test.each(parlayTestCases)('$description', validateParlayTestCase);
  });

  // Parlay Error Cases (Stage 2)
  describe('Parlay Errors', () => {
    test.each(parlayErrorTestCases)('$description', validateErrorTestCase);
  });

  // nCr Notation Parsing (Unit Tests - Stage 3)
  describe('nCr Notation Parsing', () => {
    test.each(ncrNotationTestCases)('$description', validateNcrTestCase);
  });

  // nCr Notation Errors (Unit Tests - Stage 3)
  describe('nCr Notation Errors', () => {
    test.each(ncrNotationErrorTestCases)('$description', validateNcrErrorTestCase);
  });

  // Round Robins (Stage 3)
  describe('Round Robins', () => {
    test.each(roundRobinTestCases)('$description', validateRoundRobinTestCase);
  });

  // Round Robin Error Cases (Stage 3)
  describe('Round Robin Errors', () => {
    test.each(roundRobinErrorTestCases)('$description', validateErrorTestCase);
  });

  // Additional specific parser tests
  describe('Specific Parser Functions', () => {
    test('parseChatOrder should reject YG message', () => {
      expect(() => parseChatOrder('YG Padres/Pirates u0.5 @ +100 = 1.0')).toThrow(
        'Expected order (IW) message'
      );
    });

    test('parseChatFill should reject IW message', () => {
      expect(() => parseChatFill('IW Padres/Pirates u0.5 @ +100')).toThrow(
        'Expected fill (YG) message'
      );
    });
  });
});

describe('Leading whitespace before prefixed messages', () => {
  const { parseChat } = require('../../src/index');

  // ExecutionDtm is stamped with new Date() at parse time, so it (like
  // rawInput) is normalized out of the equality check.
  const scrub = (r: any) => ({
    ...r,
    rawInput: undefined,
    bet: r.bet ? { ...r.bet, ExecutionDtm: undefined } : r.bet,
  });

  it.each([
    ['  YGP 872 Cardinals/Cubs o8.5 @ -110 & 701 Lakers @ +120 = $100', 'fill'],
    ['\nIWP Lakers @ +120 & Warriors @ -110', 'order'],
    ['  IWRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115', 'order'],
    ['  YGRR 3c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100 per', 'fill'],
    ['\n  IW Yankees @ -110', 'order'],
    ['  YG Yankees @ -110 = $100', 'fill'],
    ['  IWW 12/25 NBA Lakers score 120+ points @ +200', 'order'],
  ])('parses %s identically to its trimmed form', (padded, chatType) => {
    const result = parseChat(padded);
    expect(result.chatType).toBe(chatType);
    expect(scrub(result)).toEqual(scrub(parseChat(padded.trim())));
  });
});

describe('Period word-phrases in totals (live 🙈 2026-08-28: "first 5 under 4-105")', () => {
  // Root causes fixed together because either alone leaves the live message
  // wrong: (1) detectContractType's totals branches only knew compact period
  // codes, so "first 5" routed to contestant-ML with the tail swallowed as a
  // contestant name; (2) the attached-price extractor only knew [ou]
  // shorthand, so a price glued to a word-form total ("under 4-105") stayed
  // in the text and the -110 default applied — booking risk 4400 on a -105
  // ticket.
  const asTotal = (input: string, line: number, isOver: boolean, price: number) => {
    const r = parseChat(input);
    expect(r.contractType).toBe('TotalPoints');
    expect((r.contract as any).Line).toBe(line);
    expect((r.contract as any).IsOver).toBe(isOver);
    expect((r.contract as any).Period).toEqual({ PeriodTypeCode: 'H', PeriodNumber: 1 });
    expect(r.bet!.Price).toBe(price);
    return r;
  };

  it('parses the live message verbatim (glued integer line-price)', () => {
    const r = asTotal('yg Astros first 5 under 4-105 = $4k', 4, false, -105);
    expect(r.bet!.Risk).toBe(4200);
    expect(r.bet!.ToWin).toBe(4000);
  });

  it.each([
    ['yg Astros first 5 under 4 -105 = $4k', 4, false, -105],
    ['yg Astros first 5 u4 -105 = $4k', 4, false, -105],
    ['yg Astros 1st 5 under 4.5 -105 = $4k', 4.5, false, -105],
    ['yg Astros first five over 8.5 +102 = $4k', 8.5, true, 102],
    ['yg Astros 1st half under 4 -105 = $4k', 4, false, -105],
    ['yg Astros first half over 8.5 -110 = $4k', 8.5, true, -110],
  ])('parses %s as an F5/H1 total', (input, line, isOver, price) => {
    asTotal(input as string, line as number, isOver as boolean, price as number);
  });

  it('extracts a price glued to a word-form total even with a compact period', () => {
    asTotal('yg Astros F5 under 4-105 = $4k', 4, false, -105);
  });

  it('extracts a glued price on a full-game word-form total', () => {
    const r = parseChat('yg Astros under 8.5-105 = $4k');
    expect(r.contractType).toBe('TotalPoints');
    expect((r.contract as any).Line).toBe(8.5);
    expect(r.bet!.Price).toBe(-105);
  });

  it('normalizes second-half phrases too', () => {
    const r = parseChat('yg Vanderbilt second half under 24.5 -105 = $1k');
    expect(r.contractType).toBe('TotalPoints');
    expect((r.contract as any).Period).toEqual({ PeriodTypeCode: 'H', PeriodNumber: 2 });
    expect(r.bet!.Price).toBe(-105);
  });

  it('leaves [ou] shorthand attached-price behavior byte-identical', () => {
    const r = parseChat('yg Astros F5 u4.5-105 = $4k');
    expect(r.contractType).toBe('TotalPoints');
    expect((r.contract as any).Line).toBe(4.5);
    expect(r.bet!.Price).toBe(-105);
  });

  it('still routes word-period moneylines to contestant-ML', () => {
    const r = parseChat('yg Astros first 5 -105 = $4k');
    expect(r.contractType).toBe('HandicapContestantML');
    expect((r.contract as any).Period).toEqual({ PeriodTypeCode: 'H', PeriodNumber: 1 });
    expect(r.bet!.Price).toBe(-105);
  });
});
