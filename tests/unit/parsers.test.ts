/**
 * Unit tests for chat-bet-parse parsers
 * Tests all contract types and error scenarios from EBNF grammar
 */

import {
  parseChat,
  parseChatOrder,
  parseChatFill,
  isWritein,
  ChatBetParseError
} from '../../src/index';

// Import test types
import { TestCase, ErrorTestCase } from '../fixtures/types';

// Import test fixtures directly from individual files
import { edgeCaseTestCases } from '../fixtures/edge-cases.fixtures';
import { errorTestCases, writeinErrorTestCases } from '../fixtures/error-cases.fixtures';
import { eventDateTestCases } from '../fixtures/event-date.fixtures';
import { eventDateErrorTestCases } from '../fixtures/event-date-errors.fixtures';
import { gameSequenceTestCases, enhancedGameNumberTestCases } from '../fixtures/game-sequence.fixtures';
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
import { writeinTestCases } from '../fixtures/writein.fixtures';

/**
 * Generic test function that validates a parsed result against expected values
 */
function validateTestCase(testCase: TestCase) {
  const options = testCase.referenceDate ? { referenceDate: testCase.referenceDate } : undefined;
  const result = parseChat(testCase.input, options);

  // Basic result structure
  expect(result.chatType).toBe(testCase.expectedChatType);
  expect(result.contractType).toBe(testCase.expectedContractType);

  // Bet details
  expect(result.bet.Price).toBe(testCase.expectedPrice);
  if (testCase.expectedSize !== undefined) {
    expect(result.bet.Size).toBe(testCase.expectedSize);
  }

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
    if (testCase.expectedDescription !== undefined) {
      expect(result.contract.Description).toBe(testCase.expectedDescription);
    }
  } else {
    // Regular contracts with Match property
    if (testCase.expectedTeam1 !== undefined) {
      expect(result.contract.Match.Team1).toBe(testCase.expectedTeam1);
    }
    if (testCase.expectedTeam2 !== undefined) {
      expect(result.contract.Match.Team2).toBe(testCase.expectedTeam2);
    }

    // Day sequence
    if (testCase.expectedDaySequence !== undefined) {
      expect(result.contract.Match.DaySequence).toBe(testCase.expectedDaySequence);
    }
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

  // Contract-specific fields
  if (testCase.expectedLine !== undefined) {
    expect('Line' in result.contract).toBe(true);
    if ('Line' in result.contract) {
      expect(result.contract.Line).toBe(testCase.expectedLine);
    }
  }

  if (testCase.expectedIsOver !== undefined) {
    expect('IsOver' in result.contract).toBe(true);
    if ('IsOver' in result.contract) {
      expect(result.contract.IsOver).toBe(testCase.expectedIsOver);
    }
  }

  if (testCase.expectedIsYes !== undefined) {
    expect('IsYes' in result.contract).toBe(true);
    if ('IsYes' in result.contract) {
      expect(result.contract.IsYes).toBe(testCase.expectedIsYes);
    }
  }

  if (testCase.expectedTiesLose !== undefined) {
    expect('TiesLose' in result.contract).toBe(true);
    if ('TiesLose' in result.contract) {
      expect(result.contract.TiesLose).toBe(testCase.expectedTiesLose);
    }
  }

  if (testCase.expectedProp !== undefined) {
    expect('Prop' in result.contract).toBe(true);
    if ('Prop' in result.contract) {
      expect(result.contract.Prop).toBe(testCase.expectedProp);
    }
  }

  if (testCase.expectedSeriesLength !== undefined) {
    expect('SeriesLength' in result.contract).toBe(true);
    if ('SeriesLength' in result.contract) {
      expect(result.contract.SeriesLength).toBe(testCase.expectedSeriesLength);
    }
  }

  // ContestantType field for props
  if (testCase.expectedContestantType !== undefined) {
    expect('ContestantType' in result.contract).toBe(true);
    if ('ContestantType' in result.contract) {
      expect(result.contract.ContestantType).toBe(testCase.expectedContestantType);
    }
  }

  // Sport and League fields
  if (!isWritein(result.contract)) {
    // Regular contracts
    if (testCase.expectedSport !== undefined) {
      expect(result.contract.Sport).toBe(testCase.expectedSport);
    }
    if (testCase.expectedLeague !== undefined) {
      expect(result.contract.League).toBe(testCase.expectedLeague);
    }
  } else {
    // Writein contracts can also have Sport and League
    if (testCase.expectedSport !== undefined) {
      expect(result.contract.Sport).toBe(testCase.expectedSport);
    }
    if (testCase.expectedLeague !== undefined) {
      expect(result.contract.League).toBe(testCase.expectedLeague);
    }
  }

  // Event date for regular contracts (in addition to writeins)
  if (!isWritein(result.contract) && testCase.expectedEventDate !== undefined) {
    expect(result.contract.Match.Date).toEqual(testCase.expectedEventDate);
  }

  // Free bet flag
  if (testCase.expectedFreeBet !== undefined) {
    expect(result.bet.IsFreeBet).toBe(testCase.expectedFreeBet);
  }
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

  // Additional specific parser tests
  describe('Specific Parser Functions', () => {
    test('parseChatOrder should reject YG message', () => {
      expect(() => parseChatOrder('YG Padres/Pirates u0.5 @ +100 = 1.0'))
        .toThrow('Expected order (IW) message');
    });

    test('parseChatFill should reject IW message', () => {
      expect(() => parseChatFill('IW Padres/Pirates u0.5 @ +100'))
        .toThrow('Expected fill (YG) message');
    });
  });
});