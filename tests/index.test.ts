/**
 * Integration tests for README examples
 * 
 * This test suite validates the examples shown in the README.md Quick Start section
 * to ensure that the documentation matches the actual behavior of the library.
 */

import { parseChat, isTotalPoints } from '../src/index';
import type { ContractSportCompetitionMatchTotalPoints } from '../src/index';

describe('README Examples', () => {
  describe('Quick Start Examples', () => {
    it('should parse chat fill example from README correctly', () => {
      // Example from README.md Quick Start section
      const fillResult = parseChat(
        'YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094'
      );

      // Validate the exact assertions shown in the README
      expect(fillResult.chatType).toBe('fill');
      expect(fillResult.contractType).toBe('TotalPoints');
      expect(fillResult.bet.Size).toBe(94);
      
      // Type guard to access contract properties safely
      if (fillResult.contractType === 'TotalPoints' && isTotalPoints(fillResult.contract)) {
        expect(fillResult.contract.Line).toBe(0.5);
      }
    });

    it('should parse chat order example from README correctly', () => {
      // Example from README.md Quick Start section
      const orderResult = parseChat(
        'IW Padres/Pirates 1st inning u0.5 @ +100'
      );

      // Validate the exact assertions shown in the README
      expect(orderResult.chatType).toBe('order');
      expect(orderResult.contractType).toBe('TotalPoints');
      expect(orderResult.bet.Size).toBe(undefined);
      
      // Type guard to access contract properties safely
      if (orderResult.contractType === 'TotalPoints' && isTotalPoints(orderResult.contract)) {
        expect(orderResult.contract.Line).toBe(0.5);
      }
    });

    it('should verify additional properties not explicitly shown in README', () => {
      // Chat fill example - verify additional properties for completeness
      const fillResult = parseChat(
        'YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094'
      );

      expect(fillResult.bet.Price).toBe(100);
      expect(fillResult.contract.Sport).toBeUndefined();
      expect(fillResult.contract.League).toBeUndefined();
      
      // Use type assertion since we know this is a TotalPoints contract
      const totalPointsContract = fillResult.contract as ContractSportCompetitionMatchTotalPoints;
      expect(totalPointsContract.Period.PeriodTypeCode).toBe('I');
      expect(totalPointsContract.Period.PeriodNumber).toBe(1);
      expect(totalPointsContract.Match.Team1).toBe('Padres');
      expect(totalPointsContract.Match.Team2).toBe('Pirates');
      
      if (fillResult.contractType === 'TotalPoints' && isTotalPoints(fillResult.contract)) {
        expect(fillResult.contract.IsOver).toBe(false); // u0.5 = under
      }

      // Chat order example - verify additional properties for completeness
      const orderResult = parseChat(
        'IW Padres/Pirates 1st inning u0.5 @ +100'
      );

      expect(orderResult.bet.Price).toBe(100);
      expect(orderResult.contract.Sport).toBeUndefined();
      expect(orderResult.contract.League).toBeUndefined();
      
      // Use type assertion since we know this is a TotalPoints contract
      const orderTotalPointsContract = orderResult.contract as ContractSportCompetitionMatchTotalPoints;
      expect(orderTotalPointsContract.Period.PeriodTypeCode).toBe('I');
      expect(orderTotalPointsContract.Period.PeriodNumber).toBe(1);
      expect(orderTotalPointsContract.Match.Team1).toBe('Padres');
      expect(orderTotalPointsContract.Match.Team2).toBe('Pirates');
      
      if (orderResult.contractType === 'TotalPoints' && isTotalPoints(orderResult.contract)) {
        expect(orderResult.contract.IsOver).toBe(false); // u0.5 = under
      }
    });
  });
}); 