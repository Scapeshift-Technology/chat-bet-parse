/**
 * Unit tests for tracking module (ContractLegSpec mapping)
 * Tests conversion of ParseResult to ContractLegSpec for SQL Server
 */

import { parseChat } from '../../src/index';
import {
  mapParseResultToContractLegSpec,
  validateContractLegSpec,
  type ContractLegSpec,
  type ContractMappingOptions,
  ContractMappingError
} from '../../src/tracking/index';

// Import test fixtures for comprehensive testing
import { moneylinesTestCases } from '../fixtures/moneylines.fixtures';
import { spreadsTestCases } from '../fixtures/spreads.fixtures';
import { gameTotalsTestCases } from '../fixtures/game-totals.fixtures';
import { teamTotalsTestCases } from '../fixtures/team-totals.fixtures';
import { propsYNTestCases, propsOUTestCases } from '../fixtures/props.fixtures';
import { seriesTestCases } from '../fixtures/series.fixtures';
import { writeinTestCases } from '../fixtures/writein.fixtures';
import type { TestCase } from '../fixtures/types';

/**
 * Helper function to test ContractLegSpec mapping for a given test case
 */
function validateContractLegSpecMapping(testCase: TestCase) {
  // Parse the input to get ParseResult
  const parseResult = parseChat(testCase.input);

  // Map to ContractLegSpec
  const options: ContractMappingOptions = {
    eventDate: new Date('2024-11-01'), // Fixed date for testing
    league: testCase.expectedLeague
  };

  const contractSpec = mapParseResultToContractLegSpec(parseResult, options);

  // Validate the spec
  validateContractLegSpec(contractSpec);

  // Common assertions for all contract types
  expect(contractSpec.LegSequence).toBe(1); // Always 1 for straight bets
  expect(contractSpec.ContractType).toBe(testCase.expectedContractType);
  // For writeins, EventDate comes from the contract itself
  if (testCase.expectedContractType !== 'Writein') {
    expect(contractSpec.EventDate).toEqual(options.eventDate);
  }
  expect(contractSpec.Price).toBeNull(); // Always null for straight bets

  // League mapping
  if (testCase.expectedLeague) {
    expect(contractSpec.League).toBe(testCase.expectedLeague);
  }

  // Sport mapping
  if (testCase.expectedSport !== undefined) {
    expect(contractSpec.Sport).toBe(testCase.expectedSport);
  }

  // Period mapping
  if (testCase.expectedPeriod && testCase.expectedContractType !== 'Series' && testCase.expectedContractType !== 'Writein') {
    expect(contractSpec.PeriodTypeCode).toBe(testCase.expectedPeriod.PeriodTypeCode);
    expect(contractSpec.PeriodNumber).toBe(testCase.expectedPeriod.PeriodNumber);
  }

  // Day sequence mapping
  if (testCase.expectedDaySequence !== undefined) {
    expect(contractSpec.DaySequence).toBe(testCase.expectedDaySequence);
  }

  // Contract-specific field mappings
  switch (testCase.expectedContractType) {
    case 'HandicapContestantML':
      expect(contractSpec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(contractSpec.Contestant2_RawName).toBe(testCase.expectedTeam2);
      expect(contractSpec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      expect(contractSpec.TiesLose).toBe(testCase.expectedTiesLose ?? false);
      expect(contractSpec.Line).toBeUndefined();
      break;

    case 'HandicapContestantLine':
      expect(contractSpec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(contractSpec.Contestant2_RawName).toBe(testCase.expectedTeam2);
      expect(contractSpec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      expect(contractSpec.Line).toBe(testCase.expectedLine);
      expect(contractSpec.TiesLose).toBe(false); // Default for spreads
      break;

    case 'TotalPoints':
      expect(contractSpec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(contractSpec.Contestant2_RawName).toBe(testCase.expectedTeam2);
      expect(contractSpec.Line).toBe(testCase.expectedLine);
      expect(contractSpec.IsOver).toBe(testCase.expectedIsOver);
      expect(contractSpec.SelectedContestant_RawName).toBeUndefined();
      break;

    case 'TotalPointsContestant':
      expect(contractSpec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(contractSpec.Contestant2_RawName).toBe(testCase.expectedTeam2);
      expect(contractSpec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      expect(contractSpec.Line).toBe(testCase.expectedLine);
      expect(contractSpec.IsOver).toBe(testCase.expectedIsOver);
      expect(contractSpec.ContestantType).toBe('TeamLeague'); // Default for team totals
      break;

    case 'PropOU':
      // For individual player props vs team props
      if (testCase.expectedContestantType === 'Individual') {
        // Individual player prop
        expect(contractSpec.Contestant1_RawName).toBe(testCase.expectedPlayerTeam || undefined);
        expect(contractSpec.SelectedContestant_RawName).toBe(testCase.expectedPlayer);
      } else {
        // Team prop
        expect(contractSpec.Contestant1_RawName).toBe(testCase.expectedTeam1);
        expect(contractSpec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      }
      expect(contractSpec.Line).toBe(testCase.expectedLine);
      expect(contractSpec.IsOver).toBe(testCase.expectedIsOver);
      expect(contractSpec.Prop).toBe(testCase.expectedProp);
      if (testCase.expectedContestantType) {
        expect(contractSpec.PropContestantType).toBe(testCase.expectedContestantType);
      }
      break;

    case 'PropYN':
      // For individual player props vs team props
      if (testCase.expectedContestantType === 'Individual') {
        // Individual player prop
        expect(contractSpec.Contestant1_RawName).toBe(testCase.expectedPlayerTeam || undefined);
        expect(contractSpec.SelectedContestant_RawName).toBe(testCase.expectedPlayer);
      } else {
        // Team prop
        expect(contractSpec.Contestant1_RawName).toBe(testCase.expectedTeam1);
        expect(contractSpec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      }
      expect(contractSpec.IsYes).toBe(testCase.expectedIsYes);
      expect(contractSpec.Prop).toBe(testCase.expectedProp);
      if (testCase.expectedContestantType) {
        expect(contractSpec.PropContestantType).toBe(testCase.expectedContestantType);
      }
      break;

    case 'Series':
      expect(contractSpec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(contractSpec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      expect(contractSpec.SeriesLength).toBe(testCase.expectedSeriesLength);
      expect(contractSpec.PeriodTypeCode).toBeUndefined();
      expect(contractSpec.PeriodNumber).toBeUndefined();
      break;

    case 'Writein':
      expect(contractSpec.WriteInDescription).toBe(testCase.expectedDescription);
      expect(contractSpec.Contestant1_RawName).toBeUndefined();
      expect(contractSpec.Contestant2_RawName).toBeUndefined();
      expect(contractSpec.PeriodTypeCode).toBeUndefined();
      expect(contractSpec.PeriodNumber).toBeUndefined();
      // For writeins, EventDate comes from the contract itself
      if (testCase.expectedEventDate) {
        expect(contractSpec.EventDate).toEqual(testCase.expectedEventDate);
      }
      break;
  }
}

describe('ContractLegSpec Mapping', () => {

  describe('Moneylines', () => {
    test.each(moneylinesTestCases)('$description', validateContractLegSpecMapping);
  });

  describe('Spreads', () => {
    test.each(spreadsTestCases)('$description', validateContractLegSpecMapping);
  });

  describe('Game Totals', () => {
    test.each(gameTotalsTestCases)('$description', validateContractLegSpecMapping);
  });

  describe('Team Totals', () => {
    test.each(teamTotalsTestCases)('$description', validateContractLegSpecMapping);
  });

  describe('Props (Yes/No)', () => {
    test.each(propsYNTestCases)('$description', validateContractLegSpecMapping);
  });

  describe('Props (Over/Under)', () => {
    test.each(propsOUTestCases)('$description', validateContractLegSpecMapping);
  });

  describe('Series', () => {
    test.each(seriesTestCases)('$description', validateContractLegSpecMapping);
  });

  describe('Writein', () => {
    test.each(writeinTestCases)('$description', validateContractLegSpecMapping);
  });

  describe('Date Handling', () => {
    test('should use provided eventDate option', () => {
      const parseResult = parseChat('IW Athletics @ +145');
      const eventDate = new Date('2024-12-25');

      const contractSpec = mapParseResultToContractLegSpec(parseResult, { eventDate });

      expect(contractSpec.EventDate).toEqual(eventDate);
    });

    test('should use writein EventDate when available', () => {
      const parseResult = parseChat('IW writein 2024/11/5 Trump to win presidency @ -150');

      const contractSpec = mapParseResultToContractLegSpec(parseResult);

      expect(contractSpec.EventDate).toEqual(new Date(2024, 10, 5)); // Month is 0-indexed
    });

    test('should derive from ExecutionDtm for fills when no eventDate provided', () => {
      const parseResult = parseChat('YG Athletics @ +145 = 1.0');

      const contractSpec = mapParseResultToContractLegSpec(parseResult);

      // Should be today's date in Eastern time (execution date)
      // Convert to Eastern time to match the mapper's logic
      const now = new Date();
      const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      expect(contractSpec.EventDate.getFullYear()).toBe(easternTime.getFullYear());
      expect(contractSpec.EventDate.getMonth()).toBe(easternTime.getMonth());
      expect(contractSpec.EventDate.getDate()).toBe(easternTime.getDate());
    });

    test('should default to today for orders when no eventDate provided', () => {
      const parseResult = parseChat('IW Athletics @ +145');

      const contractSpec = mapParseResultToContractLegSpec(parseResult);

      const today = new Date();
      expect(contractSpec.EventDate.getFullYear()).toBe(today.getFullYear());
      expect(contractSpec.EventDate.getMonth()).toBe(today.getMonth());
      expect(contractSpec.EventDate.getDate()).toBe(today.getDate());
    });
  });

  describe('League Handling', () => {
    test('should use provided league option', () => {
      const parseResult = parseChat('IW Athletics @ +145');

      const contractSpec = mapParseResultToContractLegSpec(parseResult, { league: 'MLB' });

      expect(contractSpec.League).toBe('MLB');
    });

    test('should extract league from contract when available', () => {
      const parseResult = parseChat('IW MLB Athletics @ +145');

      const contractSpec = mapParseResultToContractLegSpec(parseResult);

      expect(contractSpec.League).toBe('MLB');
    });

    test('should prefer options.league over contract league', () => {
      const parseResult = parseChat('IW NFL Dolphins @ +145');

      const contractSpec = mapParseResultToContractLegSpec(parseResult, { league: 'CFL' });

      expect(contractSpec.League).toBe('CFL'); // Options override contract
    });
  });

  describe('Validation', () => {
    test('should throw error for missing required fields', () => {
      const invalidSpec: Partial<ContractLegSpec> = {
        ContractType: 'TotalPoints'
        // Missing LegSequence, EventDate, and other required fields
      };

      expect(() => validateContractLegSpec(invalidSpec)).toThrow(ContractMappingError);
    });

    test('should validate TotalPoints requires Line and IsOver', () => {
      const invalidSpec: Partial<ContractLegSpec> = {
        LegSequence: 1,
        ContractType: 'TotalPoints',
        EventDate: new Date(),
        TiesLose: false
        // Missing Line and IsOver
      };

      expect(() => validateContractLegSpec(invalidSpec)).toThrow('TotalPoints requires Line and IsOver');
    });

    test('should validate HandicapContestantML requires SelectedContestant_RawName', () => {
      const invalidSpec: Partial<ContractLegSpec> = {
        LegSequence: 1,
        ContractType: 'HandicapContestantML',
        EventDate: new Date(),
        TiesLose: false
        // Missing SelectedContestant_RawName
      };

      expect(() => validateContractLegSpec(invalidSpec)).toThrow('HandicapContestantML requires SelectedContestant_RawName');
    });
  });
});