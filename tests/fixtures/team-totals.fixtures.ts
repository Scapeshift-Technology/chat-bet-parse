/**
 * Test fixtures for team total bets
 * Tests team-specific total points scenarios
 */

import { TestCase } from './types';

export const teamTotalsTestCases: TestCase[] = [
  // Orders (IW)
  {
    description: 'IW Team total basic',
    input: 'IW LAA TT o3.5 @ -115.5',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115.5,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'IW Team total with period and size',
    input: 'IW MIA F5 TT u1.5 @ -110 = 1.0',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1.0,
    expectedTeam1: 'MIA',
    expectedLine: 1.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },

  // Fills (YG)
  {
    description: 'YG Team total with decimal thousands',
    input: 'YG LAA TT o3.5 @ -115.5 = 8.925',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115.5,
    expectedSize: 8925,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true
  },
  {
    description: 'YG Team total F5 with decimal thousands',
    input: 'YG MIA F5 TT u1.5 @ -110 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'MIA',
    expectedLine: 1.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Team total with game number and k-notation',
    input: 'YG SEA G2 TT u4.5 @ -110 = 1.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1500,
    expectedTeam1: 'SEA',
    expectedDaySequence: 2,
    expectedLine: 4.5,
    expectedIsOver: false
  }
];