/**
 * Unit tests for chat-bet-parse parsers
 * Tests all contract types and error scenarios from EBNF grammar
 */

import { 
  parseChat, 
  parseChatOrder, 
  parseChatFill,
  isTotalPoints,
  isTotalPointsContestant,
  isHandicapML,
  isHandicapLine,
  isPropYN,
  isSeries,
  isPropOU,
  ChatBetParseError
} from '../../src/index';

import {
  allValidTestCases,
  errorTestCases,
  validOrderTestCases,
  validFillTestCases
} from '../fixtures/test-cases';

describe('Chat Bet Parsing', () => {
  
  // ==============================================================================
  // MAIN PARSER FUNCTION TESTS
  // ==============================================================================
  
  describe('parseChat() - Main Entry Point', () => {
    test.each(allValidTestCases)('$description', (testCase) => {
      const result = parseChat(testCase.input);
      
      // Basic result structure
      expect(result.chatType).toBe(testCase.expectedChatType);
      expect(result.contractType).toBe(testCase.expectedContractType);
      
      // Bet details
      expect(result.bet.Price).toBe(testCase.expectedPrice);
      if (testCase.expectedSize !== undefined) {
        expect(result.bet.Size).toBe(testCase.expectedSize);
      }
      
      // Contract details
      expect(result.contract.Match.Team1).toBe(testCase.expectedTeam1);
      if (testCase.expectedTeam2) {
        expect(result.contract.Match.Team2).toBe(testCase.expectedTeam2);
      }
      
      // Rotation number
      if (testCase.expectedRotationNumber) {
        expect(result.rotationNumber).toBe(testCase.expectedRotationNumber);
        if ('RotationNumber' in result.contract) {
          expect(result.contract.RotationNumber).toBe(testCase.expectedRotationNumber);
        }
      }
      
      // Day sequence
      if (testCase.expectedDaySequence) {
        expect(result.contract.Match.DaySequence).toBe(testCase.expectedDaySequence);
      }
      
      // Period info
      if (testCase.expectedPeriod) {
        if ('Period' in result.contract) {
          expect(result.contract.Period.PeriodTypeCode).toBe(testCase.expectedPeriod.PeriodTypeCode);
          expect(result.contract.Period.PeriodNumber).toBe(testCase.expectedPeriod.PeriodNumber);
        }
      }
      
      // Contract-specific fields
      if (testCase.expectedLine !== undefined) {
        if ('Line' in result.contract) {
          expect(result.contract.Line).toBe(testCase.expectedLine);
        }
      }
      
      if (testCase.expectedIsOver !== undefined) {
        if ('IsOver' in result.contract) {
          expect(result.contract.IsOver).toBe(testCase.expectedIsOver);
        }
      }
      
      if (testCase.expectedProp) {
        if ('Prop' in result.contract) {
          expect(result.contract.Prop).toBe(testCase.expectedProp);
        }
      }
      
      if (testCase.expectedSeriesLength) {
        if ('SeriesLength' in result.contract) {
          expect(result.contract.SeriesLength).toBe(testCase.expectedSeriesLength);
        }
      }
    });
  });
  
  // ==============================================================================
  // ORDER-SPECIFIC PARSER TESTS
  // ==============================================================================
  
  describe('parseChatOrder() - Order Parsing', () => {
    test.each(validOrderTestCases)('$description', (testCase) => {
      const result = parseChatOrder(testCase.input);
      
      expect(result.chatType).toBe('order');
      expect(result.bet.Price).toBe(testCase.expectedPrice);
      
      // Orders can have optional size
      if (testCase.expectedSize !== undefined) {
        expect(result.bet.Size).toBe(testCase.expectedSize);
      } else {
        expect(result.bet.Size).toBeUndefined();
      }
      
      // Orders don't have ExecutionDtm
      expect(result.bet.ExecutionDtm).toBeUndefined();
    });
    
    test('should reject YG message', () => {
      expect(() => parseChatOrder('YG Padres/Pirates u0.5 @ +100 = 1.0'))
        .toThrow('Expected order (IW) message');
    });
  });
  
  // ==============================================================================
  // FILL-SPECIFIC PARSER TESTS
  // ==============================================================================
  
  describe('parseChatFill() - Fill Parsing', () => {
    test.each(validFillTestCases)('$description', (testCase) => {
      const result = parseChatFill(testCase.input);
      
      expect(result.chatType).toBe('fill');
      expect(result.bet.Price).toBe(testCase.expectedPrice);
      expect(result.bet.Size).toBe(testCase.expectedSize);
      
      // Fills always have ExecutionDtm
      expect(result.bet.ExecutionDtm).toBeInstanceOf(Date);
    });
    
    test('should reject IW message', () => {
      expect(() => parseChatFill('IW Padres/Pirates u0.5 @ +100'))
        .toThrow('Expected fill (YG) message');
    });
  });
  
  // ==============================================================================
  // CONTRACT TYPE DETECTION TESTS
  // ==============================================================================
  
  describe('Contract Type Detection', () => {
    
    test('should detect TotalPoints contracts', () => {
      const result = parseChat('IW Padres/Pirates u0.5 @ +100');
      expect(result.contractType).toBe('TotalPoints');
      expect(isTotalPoints(result.contract)).toBe(true);
    });
    
    test('should detect TotalPointsContestant contracts', () => {
      const result = parseChat('IW LAA TT o3.5 @ -115');
      expect(result.contractType).toBe('TotalPointsContestant');
      expect(isTotalPointsContestant(result.contract)).toBe(true);
    });
    
    test('should detect HandicapContestantML contracts', () => {
      const result = parseChat('IW 872 Athletics @ +145');
      expect(result.contractType).toBe('HandicapContestantML');
      expect(isHandicapML(result.contract)).toBe(true);
    });
    
    test('should detect HandicapContestantLine contracts', () => {
      const result = parseChat('IW 870 Mariners -1.5 +135');
      expect(result.contractType).toBe('HandicapContestantLine');
      expect(isHandicapLine(result.contract)).toBe(true);
    });
    
    test('should detect PropOU contracts', () => {
      const result = parseChat('IW Player123 passing yards o250.5 @ -115');
      expect(result.contractType).toBe('PropOU');
      expect(isPropOU(result.contract)).toBe(true);
    });
    
    test('should detect PropYN contracts', () => {
      const result = parseChat('IW CIN 1st team to score @ -115');
      expect(result.contractType).toBe('PropYN');
      expect(isPropYN(result.contract)).toBe(true);
    });
    
    test('should detect Series contracts', () => {
      const result = parseChat('IW 852 Guardians series -105');
      expect(result.contractType).toBe('Series');
      expect(isSeries(result.contract)).toBe(true);
    });
  });
  
  // ==============================================================================
  // SIZE PARSING TESTS
  // ==============================================================================
  
  describe('Size Parsing', () => {
    
    describe('Order Size Parsing (literal interpretation)', () => {
      test('should parse unit sizes as literal', () => {
        const result = parseChat('IW LAA TT o3.5 @ -115 = 2.5');
        expect(result.bet.Size).toBe(2.5);
      });
      
      test('should parse k-notation correctly', () => {
        const result = parseChat('IW LAA TT o3.5 @ -115 = 2.5k');
        expect(result.bet.Size).toBe(2500);
      });
      
      test('should parse dollar amounts as literal', () => {
        const result = parseChat('IW LAA TT o3.5 @ -115 = $250');
        expect(result.bet.Size).toBe(250);
      });
    });
    
    describe('Fill Size Parsing (thousands interpretation)', () => {
      test('should parse decimal as thousands', () => {
        const result = parseChat('YG LAA TT o3.5 @ -115 = 2.5');
        expect(result.bet.Size).toBe(2500);
      });
      
      test('should parse k-notation correctly', () => {
        const result = parseChat('YG LAA TT o3.5 @ -115 = 2.5k');
        expect(result.bet.Size).toBe(2500);
      });
      
      test('should parse dollar amounts as literal', () => {
        const result = parseChat('YG LAA TT o3.5 @ -115 = $250');
        expect(result.bet.Size).toBe(250);
      });
      
      test('should handle small decimal thousands', () => {
        const result = parseChat('YG CIN 1st team to score @ -115 = 0.563');
        expect(result.bet.Size).toBe(563);
      });
    });
  });
  
  // ==============================================================================
  // PRICE PARSING TESTS
  // ==============================================================================
  
  describe('Price Parsing', () => {
    
    test('should parse positive odds', () => {
      const result = parseChat('IW Athletics @ +145');
      expect(result.bet.Price).toBe(145);
    });
    
    test('should parse negative odds', () => {
      const result = parseChat('IW LAA TT o3.5 @ -115');
      expect(result.bet.Price).toBe(-115);
    });
    
    test('should parse decimal odds', () => {
      const result = parseChat('YG CIN first team to score @ -109.8 = $265');
      expect(result.bet.Price).toBe(-109.8);
    });
    
    test('should convert "ev" to +100', () => {
      const result = parseChat('IW LAA TT o3.5 @ ev');
      expect(result.bet.Price).toBe(100);
    });
    
    test('should convert "even" to +100', () => {
      const result = parseChat('IW LAA TT o3.5 @ even');
      expect(result.bet.Price).toBe(100);
    });
    
    test('should default to -110 when missing in k-notation', () => {
      const result = parseChat('YG 872 Athletics @ 4k');
      expect(result.bet.Price).toBe(-110);
    });
  });
  
  // ==============================================================================
  // PERIOD PARSING TESTS
  // ==============================================================================
  
  describe('Period Parsing', () => {
    
    test('should parse inning periods', () => {
      const result = parseChat('IW Padres/Pirates 1st inning u0.5 @ +100');
      if ('Period' in result.contract) {
        expect(result.contract.Period.PeriodTypeCode).toBe('I');
        expect(result.contract.Period.PeriodNumber).toBe(1);
      }
    });
    
    test('should parse F5 as first half', () => {
      const result = parseChat('IW ATH/SF F5 o4.5 @ -117');
      if ('Period' in result.contract) {
        expect(result.contract.Period.PeriodTypeCode).toBe('H');
        expect(result.contract.Period.PeriodNumber).toBe(1);
      }
    });
    
    test('should default to full game when no period specified', () => {
      const result = parseChat('IW Padres/Pirates u0.5 @ +100');
      if ('Period' in result.contract) {
        expect(result.contract.Period.PeriodTypeCode).toBe('M');
        expect(result.contract.Period.PeriodNumber).toBe(0);
      }
    });
  });
  
  // ==============================================================================
  // GAME NUMBER PARSING TESTS
  // ==============================================================================
  
  describe('Game Number Parsing', () => {
    
    test('should parse G2 format', () => {
      const result = parseChat('YG SEA G2 TT u4.5 @ -110 = 1.0');
      expect(result.contract.Match.DaySequence).toBe(2);
    });
    
    test('should parse #2 format', () => {
      const result = parseChat('YG COL/ARI #2 1st inning u0.5 @ +120 = 2.0');
      expect(result.contract.Match.DaySequence).toBe(2);
    });
    
    test('should not have DaySequence when not specified', () => {
      const result = parseChat('IW Padres/Pirates u0.5 @ +100');
      expect(result.contract.Match.DaySequence).toBeUndefined();
    });
  });
  
  // ==============================================================================
  // ROTATION NUMBER TESTS
  // ==============================================================================
  
  describe('Rotation Number Parsing', () => {
    
    test('should parse rotation numbers correctly', () => {
      const result = parseChat('IW 507 Thunder/Nuggets o213.5');
      expect(result.rotationNumber).toBe(507);
      if ('RotationNumber' in result.contract) {
        expect(result.contract.RotationNumber).toBe(507);
      }
    });
    
    test('should work without rotation numbers', () => {
      const result = parseChat('IW Padres/Pirates u0.5 @ +100');
      expect(result.rotationNumber).toBeUndefined();
    });
  });
  
  // ==============================================================================
  // SPORT/LEAGUE INFERENCE TESTS
  // ==============================================================================
  
  describe('Sport/League Inference', () => {
    
    test('should infer NBA from rotation number range', () => {
      const result = parseChat('IW 507 Thunder/Nuggets o213.5');
      expect(result.contract.Sport).toBe('Basketball');
      expect(result.contract.League).toBe('NBA');
    });
    
    test('should infer MLB from rotation number range', () => {
      const result = parseChat('IW 872 Athletics @ +145');
      expect(result.contract.Sport).toBe('Baseball');
      expect(result.contract.League).toBe('MLB');
    });
    
    test('should default to No Sport / No League when no rotation number', () => {
      const result = parseChat('IW Padres/Pirates u0.5 @ +100');
      expect(result.contract.Sport).toBeUndefined();
      expect(result.contract.League).toBeUndefined();
    });
  });
  
  // ==============================================================================
  // ERROR HANDLING TESTS
  // ==============================================================================
  
  describe('Error Handling', () => {
    
    test.each(errorTestCases)('$description', (testCase) => {
      expect(() => parseChat(testCase.input)).toThrow();
      
      try {
        parseChat(testCase.input);
      } catch (error) {
        expect(error).toBeInstanceOf(ChatBetParseError);
        expect(error.name).toBe(testCase.expectedErrorType);
        expect(error.message).toContain(testCase.expectedErrorMessage);
        expect(error.rawInput).toBe(testCase.input);
      }
    });
    
    test('should provide helpful error context', () => {
      try {
        parseChat('IW invalid @ bad = wrong');
      } catch (error) {
        expect(error).toBeInstanceOf(ChatBetParseError);
        expect(error.rawInput).toBe('IW invalid @ bad = wrong');
      }
    });
  });
  
  // ==============================================================================
  // EDGE CASE TESTS
  // ==============================================================================
  
  describe('Edge Cases', () => {
    
    test('should handle teams with special characters', () => {
      const result = parseChat('IW 49ers/Patriots u45.5 @ -110');
      expect(result.contract.Match.Team1).toBe('49ers');
      expect(result.contract.Match.Team2).toBe('Patriots');
    });
    
    test('should handle teams with ampersands', () => {
      const result = parseChat('IW A&M TT o21.5 @ -115');
      expect(result.contract.Match.Team1).toBe('A&M');
    });
    
    test('should handle fractional lines', () => {
      const result = parseChat('IW Padres/Pirates u0.5 @ +100');
      if ('Line' in result.contract) {
        expect(result.contract.Line).toBe(0.5);
      }
    });
    
    test('should handle high NBA totals', () => {
      const result = parseChat('IW Thunder/Nuggets o240.5 @ -110');
      if ('Line' in result.contract) {
        expect(result.contract.Line).toBe(240.5);
      }
    });
    
    test('should handle case insensitive input', () => {
      const result = parseChat('iw laa tt o3.5 @ -115');
      expect(result.contractType).toBe('TotalPointsContestant');
      expect(result.contract.Match.Team1).toBe('laa');
    });
  });
  
  // ==============================================================================
  // CONTRACT FIELD VALIDATION TESTS
  // ==============================================================================
  
  describe('Contract Field Validation', () => {
    
    test('should set correct discriminator fields for TotalPoints', () => {
      const result = parseChat('IW Padres/Pirates u0.5 @ +100');
      if ('HasContestant' in result.contract) {
        expect(result.contract.HasContestant).toBe(false);
        expect(result.contract.HasLine).toBe(true);
        expect(result.contract.ContractSportCompetitionMatchType).toBe('TotalPoints');
      }
    });
    
    test('should set correct discriminator fields for TotalPointsContestant', () => {
      const result = parseChat('IW LAA TT o3.5 @ -115');
      if ('HasContestant' in result.contract) {
        expect(result.contract.HasContestant).toBe(true);
        expect(result.contract.HasLine).toBe(true);
        expect(result.contract.ContractSportCompetitionMatchType).toBe('TotalPoints');
      }
    });
    
    test('should set correct discriminator fields for HandicapContestantML', () => {
      const result = parseChat('IW 872 Athletics @ +145');
      if ('HasContestant' in result.contract) {
        expect(result.contract.HasContestant).toBe(true);
        expect(result.contract.HasLine).toBe(false);
        expect(result.contract.ContractSportCompetitionMatchType).toBe('Handicap');
      }
    });
    
    test('should set correct discriminator fields for HandicapContestantLine', () => {
      const result = parseChat('IW 870 Mariners -1.5 +135');
      if ('HasContestant' in result.contract) {
        expect(result.contract.HasContestant).toBe(true);
        expect(result.contract.HasLine).toBe(true);
        expect(result.contract.ContractSportCompetitionMatchType).toBe('Handicap');
      }
    });
    
    test('should set correct discriminator fields for PropOU', () => {
      const result = parseChat('IW Player123 passing yards o250.5 @ -115');
      if ('HasContestant' in result.contract) {
        expect(result.contract.HasContestant).toBe(true);
        expect(result.contract.HasLine).toBe(true);
        expect(result.contract.ContractSportCompetitionMatchType).toBe('Prop');
      }
    });
    
    test('should set correct discriminator fields for PropYN', () => {
      const result = parseChat('IW CIN 1st team to score @ -115');
      if ('HasContestant' in result.contract) {
        expect(result.contract.HasContestant).toBe(true);
        expect(result.contract.HasLine).toBe(false);
        expect(result.contract.ContractSportCompetitionMatchType).toBe('Prop');
      }
    });
    
    test('should set TiesLose to false for MLB moneylines', () => {
      const result = parseChat('IW 872 Athletics @ +145');
      if ('TiesLose' in result.contract) {
        expect(result.contract.TiesLose).toBe(false);
      }
    });
    
    test('should set ContestantType to TeamLeague for team props', () => {
      const result = parseChat('IW CIN 1st team to score @ -115');
      if ('ContestantType' in result.contract) {
        expect(result.contract.ContestantType).toBe('TeamLeague');
      }
    });
  });
}); 