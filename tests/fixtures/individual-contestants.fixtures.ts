/**
 * Test fixtures for individual contestant detection
 * Tests player names and individual prop bets
 */

import { TestCase } from './types';

export const individualContestantTestCases: TestCase[] = [
  {
    description: 'YG Individual player strikeouts over',
    input: 'YG B. Falter Ks o1.5 @ +120 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: 120,
    expectedSize: 1000,
    expectedTeam1: 'B. Falter',
    expectedLine: 1.5,
    expectedIsOver: true,
    expectedProp: 'Ks',
    expectedContestantType: 'Individual',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];