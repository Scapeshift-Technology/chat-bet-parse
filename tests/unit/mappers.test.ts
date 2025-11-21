/**
 * Unit tests for grading mappers
 * These tests don't require a database connection
 */

import { parseChat } from '../../src/index';
import {
  mapParseResultToSqlParameters,
  validateGradingParameters,
} from '../../src/grading/mappers';
import { GradingDataError } from '../../src/grading/types';
import type { GradingSqlParameters } from '../../src/grading/types';

describe('Grading Mappers', () => {
  const defaultDate = new Date('2025-06-01');

  describe('mapParseResultToSqlParameters', () => {
    describe('Contract Type Mapping', () => {
      it('should map TotalPoints (game total)', () => {
        const result = parseChat('YG Padres/Pirates o8.5 @ +100 = 1.0');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.ContractType).toBe('TotalPoints');
        expect(params.Contestant1).toBe('Padres');
        expect(params.Contestant2).toBe('Pirates');
        expect(params.Line).toBe(8.5);
        expect(params.IsOver).toBe(true);
        expect(params.PeriodTypeCode).toBe('M');
        expect(params.PeriodNumber).toBe(0);
      });

      it('should map TotalPointsContestant (team total)', () => {
        const result = parseChat('YG Padres TT u4.5 @ -120 = 1.2');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.ContractType).toBe('TotalPointsContestant');
        expect(params.Contestant1).toBe('Padres');
        expect(params.SelectedContestant).toBe('Padres');
        expect(params.Line).toBe(4.5);
        expect(params.IsOver).toBe(false);
      });

      it('should map HandicapContestantML (moneyline)', () => {
        const result = parseChat('YG Pirates @ -180 = 1.8');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.ContractType).toBe('HandicapContestantML');
        expect(params.Contestant1).toBe('Pirates');
        expect(params.SelectedContestant).toBe('Pirates');
        expect(params.TiesLose).toBe(false);
      });

      it('should map HandicapContestantLine (spread)', () => {
        const result = parseChat('YG Pirates +2.5 @ -110 = 1.1');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.ContractType).toBe('HandicapContestantLine');
        expect(params.SelectedContestant).toBe('Pirates');
        expect(params.Line).toBe(2.5);
      });

      it('should map PropOU with individual player', () => {
        const result = parseChat('YG B. Falter Ks o1.5 @ +120 = 1.0');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.ContractType).toBe('PropOU');
        expect(params.Contestant1).toBeUndefined();
        expect(params.SelectedContestant).toBe('B. Falter');
        expect(params.Prop).toBe('Ks');
        expect(params.PropContestantType).toBe('Individual');
        expect(params.Line).toBe(1.5);
        expect(params.IsOver).toBe(true);
      });

      it('should map PropOU with team', () => {
        const result = parseChat('YG Chiefs team passing yards o275.5 @ -110 = 1.0');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.ContractType).toBe('PropOU');
        expect(params.Contestant1).toBe('Chiefs');
        expect(params.PropContestantType).toBe('TeamLeague');
      });

      it('should map PropYN', () => {
        const result = parseChat('IW Hill anytime td @ +120 = 1.0');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.ContractType).toBe('PropYN');
        expect(params.Contestant1).toBeUndefined(); // Individual prop - no team
        expect(params.SelectedContestant).toBe('Hill');
        expect(params.Prop).toBe('AnytimeTD');
        expect(params.IsYes).toBe(true);
      });

      it('should map Series', () => {
        const result = parseChat('YG Brewers 4-Game Series @ +120 = 1.0');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.ContractType).toBe('Series');
        expect(params.Contestant1).toBe('Brewers');
        expect(params.SelectedContestant).toBe('Brewers');
        expect(params.SeriesLength).toBe(4);
      });

      it('should map Writein', () => {
        const result = parseChat(
          'YG writein 12/25/2024 Christmas Event @ +200 = 1.0'
        );
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.ContractType).toBe('Writein');
        expect(params.EventDate?.getFullYear()).toBe(2024);
        expect(params.EventDate?.getMonth()).toBe(11); // December is month 11
        expect(params.EventDate?.getDate()).toBe(25);
        expect(params.WriteInDescription).toBe('Christmas Event');
      });
    });

    describe('Match Info Extraction', () => {
      it('should extract Player for individual props', () => {
        const result = parseChat('YG NBA Cooper Flagg (DAL) pts o16.5 @ +100 = 2k');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        // Individual props should use the Player field
        expect(params.Contestant1).toBe('DAL');
        expect(params.SelectedContestant).toBe('Cooper Flagg');
      });

      it('should extract Team1 for team-based contracts', () => {
        const result = parseChat('YG Lakers/Warriors o220.5 @ -110 = 1.1');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.Contestant1).toBe('Lakers');
        expect(params.Contestant2).toBe('Warriors');
      });

      it('should handle game number (DaySequence)', () => {
        const result = parseChat('YG Cardinals/PHI G2 o9 @ -105 = 2.0');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.DaySequence).toBe(2);
      });
    });

    describe('Period Extraction', () => {
      it('should extract period info (F5)', () => {
        const result = parseChat('YG Padres/Pirates F5 o4.5 @ +120 = 1.0');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.PeriodTypeCode).toBe('H');
        expect(params.PeriodNumber).toBe(1);
      });

      it('should extract second half period', () => {
        const result = parseChat('YG Lakers 2H TT o55.5 @ -105 = 1.5');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.PeriodTypeCode).toBe('H');
        expect(params.PeriodNumber).toBe(2);
      });

      it('should default to full game', () => {
        const result = parseChat('YG Lakers @ +120 = 2.5');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        expect(params.PeriodTypeCode).toBe('M');
        expect(params.PeriodNumber).toBe(0);
      });
    });

    describe('Parlay and Round Robin Mapping', () => {
      it('should map parlay contracts to array of parameters', () => {
        const result = parseChat('YGP Lakers @ +120 & Warriors @ -110 = 2.0');
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        // Should return an array with one entry per leg
        expect(Array.isArray(params)).toBe(true);
        expect(params).toHaveLength(2);

        // First leg - Lakers ML
        expect(params[0].ContractType).toBe('HandicapContestantML');
        expect(params[0].Contestant1).toBe('Lakers');
        expect(params[0].SelectedContestant).toBe('Lakers');
        expect(params[0].MatchScheduledDate).toEqual(defaultDate);

        // Second leg - Warriors ML
        expect(params[1].ContractType).toBe('HandicapContestantML');
        expect(params[1].Contestant1).toBe('Warriors');
        expect(params[1].SelectedContestant).toBe('Warriors');
        expect(params[1].MatchScheduledDate).toEqual(defaultDate);
      });

      it('should map round robin contracts to array of parameters', () => {
        const result = parseChat(
          'YGRR 3c2 Lakers @ +120 & Warriors @ -110 & Bulls @ +150 = 1.0 per'
        );
        const params = mapParseResultToSqlParameters(result, {
          matchScheduledDate: defaultDate,
        });

        // Should return an array with one entry per leg
        expect(Array.isArray(params)).toBe(true);
        expect(params).toHaveLength(3);

        // First leg - Lakers ML
        expect(params[0].ContractType).toBe('HandicapContestantML');
        expect(params[0].Contestant1).toBe('Lakers');
        expect(params[0].SelectedContestant).toBe('Lakers');

        // Second leg - Warriors ML
        expect(params[1].ContractType).toBe('HandicapContestantML');
        expect(params[1].Contestant1).toBe('Warriors');
        expect(params[1].SelectedContestant).toBe('Warriors');

        // Third leg - Bulls ML
        expect(params[2].ContractType).toBe('HandicapContestantML');
        expect(params[2].Contestant1).toBe('Bulls');
        expect(params[2].SelectedContestant).toBe('Bulls');
      });
    });

    describe('Error Handling', () => {
      it('should require matchScheduledDate', () => {
        const result = parseChat('YG Padres @ +150 = 1.0');

        expect(() => mapParseResultToSqlParameters(result)).toThrow(GradingDataError);
        expect(() => mapParseResultToSqlParameters(result)).toThrow(
          /MatchScheduledDate must be provided/
        );
      });
    });
  });

  describe('validateGradingParameters', () => {
    describe('Required Fields', () => {
      it('should require MatchScheduledDate', () => {
        const params = {
          Contestant1: 'Lakers',
          ContractType: 'HandicapContestantML',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          SelectedContestant: 'Lakers',
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(/MatchScheduledDate is required/);
      });

      it('should require Contestant1', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          ContractType: 'HandicapContestantML',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          SelectedContestant: 'Lakers',
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(/Contestant1 is required/);
      });

      it('should require ContractType', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Lakers',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(/ContractType is required/);
      });
    });

    describe('Contract-Specific Validation', () => {
      it('should validate TotalPoints requires Line and IsOver', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Lakers',
          ContractType: 'TotalPoints',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          IsOver: true,
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(/requires Line and IsOver/);
      });

      it('should validate TotalPointsContestant requires SelectedContestant', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Lakers',
          ContractType: 'TotalPointsContestant',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          Line: 112.5,
          IsOver: true,
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(/requires SelectedContestant/);
      });

      it('should validate HandicapContestantML requires SelectedContestant', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Lakers',
          ContractType: 'HandicapContestantML',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(/requires SelectedContestant/);
      });

      it('should validate HandicapContestantLine requires Line', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Lakers',
          ContractType: 'HandicapContestantLine',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          SelectedContestant: 'Lakers',
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(/requires SelectedContestant and Line/);
      });

      it('should validate PropOU requires all fields', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Player',
          ContractType: 'PropOU',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          SelectedContestant: 'Player',
          Line: 1.5,
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(
          /requires SelectedContestant, Line, IsOver, and Prop/
        );
      });

      it('should validate PropYN requires all fields', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Player',
          ContractType: 'PropYN',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          SelectedContestant: 'Player',
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(
          /requires SelectedContestant, IsYes, and Prop/
        );
      });

      it('should validate Series requires SeriesLength', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Brewers',
          ContractType: 'Series',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          SelectedContestant: 'Brewers',
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(
          /requires SelectedContestant and SeriesLength/
        );
      });

      it('should validate Writein requires EventDate and Description', () => {
        // Missing EventDate
        const params1 = {
          MatchScheduledDate: defaultDate,
          Contestant1: '',
          ContractType: 'Writein',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          WriteInDescription: 'Test',
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params1)).toThrow(
          /require EventDate and WriteInDescription/
        );

        // Missing WriteInDescription
        const params2 = {
          MatchScheduledDate: defaultDate,
          Contestant1: '',
          ContractType: 'Writein',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          EventDate: defaultDate,
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params2)).toThrow(
          /require EventDate and WriteInDescription/
        );
      });

      it('should reject unknown ContractType', () => {
        const params = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Lakers',
          ContractType: 'InvalidType',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
        } as GradingSqlParameters;

        expect(() => validateGradingParameters(params)).toThrow(/Unknown contract type/);
      });
    });

    describe('Valid Parameters', () => {
      it('should accept valid parameters', () => {
        const params: GradingSqlParameters = {
          MatchScheduledDate: defaultDate,
          Contestant1: 'Lakers',
          Contestant2: 'Warriors',
          ContractType: 'TotalPoints',
          PeriodTypeCode: 'M',
          PeriodNumber: 0,
          Line: 220.5,
          IsOver: true,
        };

        expect(() => validateGradingParameters(params)).not.toThrow();
      });
    });
  });
});
