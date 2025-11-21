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

  // Runtime assertion: should return single spec for straight bets
  expect(Array.isArray(contractSpec)).toBe(false);
  const spec = contractSpec as ContractLegSpec;

  // Validate the spec
  validateContractLegSpec(spec);

  // Common assertions for all contract types
  expect(spec.LegSequence).toBe(1); // Always 1 for straight bets
  expect(spec.ContractType).toBe(testCase.expectedContractType);
  // For writeins, EventDate comes from the contract itself
  if (testCase.expectedContractType !== 'Writein') {
    expect(spec.EventDate).toEqual(options.eventDate);
  }
  expect(spec.Price).toBeNull(); // Always null for straight bets

  // League mapping
  if (testCase.expectedLeague) {
    expect(spec.League).toBe(testCase.expectedLeague);
  }

  // Sport mapping
  if (testCase.expectedSport !== undefined) {
    expect(spec.Sport).toBe(testCase.expectedSport);
  }

  // Period mapping
  if (testCase.expectedPeriod && testCase.expectedContractType !== 'Series' && testCase.expectedContractType !== 'Writein') {
    expect(spec.PeriodTypeCode).toBe(testCase.expectedPeriod.PeriodTypeCode);
    expect(spec.PeriodNumber).toBe(testCase.expectedPeriod.PeriodNumber);
  }

  // Day sequence mapping
  if (testCase.expectedDaySequence !== undefined) {
    expect(spec.DaySequence).toBe(testCase.expectedDaySequence);
  }

  // Contract-specific field mappings
  switch (testCase.expectedContractType) {
    case 'HandicapContestantML':
      expect(spec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(spec.Contestant2_RawName).toBe(testCase.expectedTeam2);
      expect(spec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      expect(spec.TiesLose).toBe(testCase.expectedTiesLose ?? false);
      expect(spec.Line).toBeUndefined();
      break;

    case 'HandicapContestantLine':
      expect(spec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(spec.Contestant2_RawName).toBe(testCase.expectedTeam2);
      expect(spec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      expect(spec.Line).toBe(testCase.expectedLine);
      expect(spec.TiesLose).toBe(false); // Default for spreads
      break;

    case 'TotalPoints':
      expect(spec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(spec.Contestant2_RawName).toBe(testCase.expectedTeam2);
      expect(spec.Line).toBe(testCase.expectedLine);
      expect(spec.IsOver).toBe(testCase.expectedIsOver);
      expect(spec.SelectedContestant_RawName).toBeUndefined();
      break;

    case 'TotalPointsContestant':
      expect(spec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(spec.Contestant2_RawName).toBe(testCase.expectedTeam2);
      expect(spec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      expect(spec.Line).toBe(testCase.expectedLine);
      expect(spec.IsOver).toBe(testCase.expectedIsOver);
      expect(spec.ContestantType).toBe('TeamLeague'); // Default for team totals
      break;

    case 'PropOU':
      // For individual player props vs team props
      if (testCase.expectedContestantType === 'Individual') {
        // Individual player prop
        expect(spec.Contestant1_RawName).toBe(testCase.expectedPlayerTeam || undefined);
        expect(spec.SelectedContestant_RawName).toBe(testCase.expectedPlayer);
      } else {
        // Team prop
        expect(spec.Contestant1_RawName).toBe(testCase.expectedTeam1);
        expect(spec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      }
      expect(spec.Line).toBe(testCase.expectedLine);
      expect(spec.IsOver).toBe(testCase.expectedIsOver);
      expect(spec.Prop).toBe(testCase.expectedProp);
      if (testCase.expectedContestantType) {
        expect(spec.PropContestantType).toBe(testCase.expectedContestantType);
      }
      break;

    case 'PropYN':
      // For individual player props vs team props
      if (testCase.expectedContestantType === 'Individual') {
        // Individual player prop
        expect(spec.Contestant1_RawName).toBe(testCase.expectedPlayerTeam || undefined);
        expect(spec.SelectedContestant_RawName).toBe(testCase.expectedPlayer);
      } else {
        // Team prop
        expect(spec.Contestant1_RawName).toBe(testCase.expectedTeam1);
        expect(spec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      }
      expect(spec.IsYes).toBe(testCase.expectedIsYes);
      expect(spec.Prop).toBe(testCase.expectedProp);
      if (testCase.expectedContestantType) {
        expect(spec.PropContestantType).toBe(testCase.expectedContestantType);
      }
      break;

    case 'Series':
      expect(spec.Contestant1_RawName).toBe(testCase.expectedTeam1);
      expect(spec.SelectedContestant_RawName).toBe(testCase.expectedTeam1);
      expect(spec.SeriesLength).toBe(testCase.expectedSeriesLength);
      expect(spec.PeriodTypeCode).toBeUndefined();
      expect(spec.PeriodNumber).toBeUndefined();
      break;

    case 'Writein':
      expect(spec.WriteInDescription).toBe(testCase.expectedDescription);
      expect(spec.Contestant1_RawName).toBeUndefined();
      expect(spec.Contestant2_RawName).toBeUndefined();
      expect(spec.PeriodTypeCode).toBeUndefined();
      expect(spec.PeriodNumber).toBeUndefined();
      // For writeins, EventDate comes from the contract itself
      if (testCase.expectedEventDate) {
        expect(spec.EventDate).toEqual(testCase.expectedEventDate);
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

      const result = mapParseResultToContractLegSpec(parseResult, { eventDate });

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      expect(contractSpec.EventDate).toEqual(eventDate);
    });

    test('should use writein EventDate when available', () => {
      const parseResult = parseChat('IW writein 2024/11/5 Trump to win presidency @ -150');

      const result = mapParseResultToContractLegSpec(parseResult);

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      // Use Date.UTC since dates are now timezone-agnostic (midnight UTC)
      expect(contractSpec.EventDate).toEqual(new Date(Date.UTC(2024, 10, 5))); // Month is 0-indexed
    });

    test('should use contract.Match.Date when available (date from bet text)', () => {
      // This bet includes a date in the text: 10/26/2025
      const parseResult = parseChat('YG NBA 10/26/2025 Pacers u230 @ -110 = 1k');

      const result = mapParseResultToContractLegSpec(parseResult);

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      // EventDate should come from the date in bet text (10/26/2025), not ExecutionDtm
      // The parser sets Match.Date to 2025-10-26T00:00:00.000Z (midnight UTC - timezone-agnostic)
      const expectedDate = new Date('2025-10-26T00:00:00.000Z');
      expect(contractSpec.EventDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(contractSpec.EventDate.getMonth()).toBe(expectedDate.getMonth());
      expect(contractSpec.EventDate.getDate()).toBe(expectedDate.getDate());
    });

    test('should use contract.Match.Date with partial date and referenceDate (day before)', () => {
      // Partial date (10/26) with referenceDate of 10/25/2025 (day before)
      const parseResult = parseChat('YG NBA 10/26 Pacers u230 @ -110 = 1k', {
        referenceDate: new Date('2025-10-25T03:21:49.000Z')
      });

      const result = mapParseResultToContractLegSpec(parseResult);

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      // EventDate should be 10/26/2025 (inferred from referenceDate)
      const expectedDate = new Date('2025-10-26T00:00:00.000Z');
      expect(contractSpec.EventDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(contractSpec.EventDate.getMonth()).toBe(expectedDate.getMonth());
      expect(contractSpec.EventDate.getDate()).toBe(expectedDate.getDate());
    });

    test('should use contract.Match.Date with partial date and referenceDate (same day)', () => {
      // Partial date (10/26) with referenceDate of 10/26/2025 (same day)
      const parseResult = parseChat('YG NBA 10/26 Pacers u230 @ -110 = 1k', {
        referenceDate: new Date('2025-10-26T03:21:49.000Z')
      });

      const result = mapParseResultToContractLegSpec(parseResult);

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      // EventDate should be 10/26/2025
      const expectedDate = new Date('2025-10-26T00:00:00.000Z');
      expect(contractSpec.EventDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(contractSpec.EventDate.getMonth()).toBe(expectedDate.getMonth());
      expect(contractSpec.EventDate.getDate()).toBe(expectedDate.getDate());
    });

    test('should use contract.Match.Date with partial date and referenceDate (day after)', () => {
      // Partial date (10/26) with referenceDate of 10/27/2025 (day after)
      const parseResult = parseChat('YG NBA 10/26 Pacers u230 @ -110 = 1k', {
        referenceDate: new Date('2025-10-27T03:21:49.000Z')
      });

      const result = mapParseResultToContractLegSpec(parseResult);

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      // EventDate should be 10/26/2026 (next year, since 10/26/2025 is in the past)
      const expectedDate = new Date('2026-10-26T00:00:00.000Z');
      expect(contractSpec.EventDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(contractSpec.EventDate.getMonth()).toBe(expectedDate.getMonth());
      expect(contractSpec.EventDate.getDate()).toBe(expectedDate.getDate());
    });

    test('should prioritize options.eventDate over contract.Match.Date (full date)', () => {
      // Bet has date 10/26/2025 in text, but options.eventDate should override
      const parseResult = parseChat('YG NBA 10/26/2025 Pacers u230 @ -110 = 1k');

      const overrideDate = new Date('2025-11-15T00:00:00.000Z');
      const result = mapParseResultToContractLegSpec(parseResult, {
        eventDate: overrideDate
      });

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      // EventDate should be from options.eventDate (11/15/2025), NOT from bet text (10/26/2025)
      expect(contractSpec.EventDate.getFullYear()).toBe(overrideDate.getFullYear());
      expect(contractSpec.EventDate.getMonth()).toBe(overrideDate.getMonth());
      expect(contractSpec.EventDate.getDate()).toBe(overrideDate.getDate());
    });

    test('should prioritize options.eventDate over contract.Match.Date (partial date)', () => {
      // Bet has partial date 10/26 in text with referenceDate, but options.eventDate should override both
      const parseResult = parseChat('YG NBA 10/26 Pacers u230 @ -110 = 1k', {
        referenceDate: new Date('2025-10-26T03:21:49.000Z')
      });

      const overrideDate = new Date('2025-12-01T00:00:00.000Z');
      const result = mapParseResultToContractLegSpec(parseResult, {
        eventDate: overrideDate
      });

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      // EventDate should be from options.eventDate (12/01/2025), NOT from bet text (10/26/2025)
      expect(contractSpec.EventDate.getFullYear()).toBe(overrideDate.getFullYear());
      expect(contractSpec.EventDate.getMonth()).toBe(overrideDate.getMonth());
      expect(contractSpec.EventDate.getDate()).toBe(overrideDate.getDate());
    });

    test('should prioritize contract.Match.Date over ExecutionDtm', () => {
      // Bet has date 10/26/2025 in text
      // Manually set ExecutionDtm to a different date to verify contract.Match.Date takes precedence
      const parseResult = parseChat('YG NBA 10/26/2025 Pacers u230 @ -110 = 1k');

      // Override ExecutionDtm to a known different date (11/15/2025)
      parseResult.bet.ExecutionDtm = new Date('2025-11-15T03:21:49.000Z');

      const result = mapParseResultToContractLegSpec(parseResult);

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      // EventDate should be from bet text (10/26/2025), NOT from ExecutionDtm (11/15/2025)
      const expectedDate = new Date('2025-10-26T00:00:00.000Z');
      expect(contractSpec.EventDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(contractSpec.EventDate.getMonth()).toBe(expectedDate.getMonth());
      expect(contractSpec.EventDate.getDate()).toBe(expectedDate.getDate());
    });

    test('should derive from ExecutionDtm for fills when no eventDate provided', () => {
      const parseResult = parseChat('YG Athletics @ +145 = 1.0');

      const result = mapParseResultToContractLegSpec(parseResult);

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      // Should be today's date in Eastern time (execution date)
      // Convert to Eastern time to match the mapper's logic
      const now = new Date();
      const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      // Use UTC methods since EventDate is now created at UTC midnight
      expect(contractSpec.EventDate.getUTCFullYear()).toBe(easternTime.getFullYear());
      expect(contractSpec.EventDate.getUTCMonth()).toBe(easternTime.getMonth());
      expect(contractSpec.EventDate.getUTCDate()).toBe(easternTime.getDate());
    });

    test('should default to today for orders when no eventDate provided', () => {
      const parseResult = parseChat('IW Athletics @ +145');

      const result = mapParseResultToContractLegSpec(parseResult);

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      const now = new Date();
      // Use UTC methods since EventDate is now created at UTC midnight
      expect(contractSpec.EventDate.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(contractSpec.EventDate.getUTCMonth()).toBe(now.getUTCMonth());
      expect(contractSpec.EventDate.getUTCDate()).toBe(now.getUTCDate());
    });
  });

  describe('League Handling', () => {
    test('should use provided league option', () => {
      const parseResult = parseChat('IW Athletics @ +145');

      const result = mapParseResultToContractLegSpec(parseResult, { league: 'MLB' });

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      expect(contractSpec.League).toBe('MLB');
    });

    test('should extract league from contract when available', () => {
      const parseResult = parseChat('IW MLB Athletics @ +145');

      const result = mapParseResultToContractLegSpec(parseResult);

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
      expect(contractSpec.League).toBe('MLB');
    });

    test('should prefer options.league over contract league', () => {
      const parseResult = parseChat('IW NFL Dolphins @ +145');

      const result = mapParseResultToContractLegSpec(parseResult, { league: 'CFL' });

      expect(Array.isArray(result)).toBe(false);
      const contractSpec = result as ContractLegSpec;
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