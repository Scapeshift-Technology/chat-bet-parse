/**
 * Test fixtures for spread/handicap bets
 * Tests various spread betting scenarios
 */

import { TestCase } from './types';

export const spreadsTestCases: TestCase[] = [
  // Orders (IW)
  {
    description: 'IW Spread positive line with size',
    input: 'IW 871 Rangers +1.5 -125 = 3.0',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -125,
    expectedSize: 3.0,
    expectedRotationNumber: 871,
    expectedTeam1: 'Rangers',
    expectedLine: 1.5
  },

  // Fills (YG)
  {
    description: 'YG Spread with k-notation',
    input: 'YG 870 Mariners -1.5 +135 = 2.5k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: 135,
    expectedSize: 2500,
    expectedRotationNumber: 870,
    expectedTeam1: 'Mariners',
    expectedLine: -1.5
  },
  {
    description: 'YG Spread positive line with k-notation',
    input: 'YG 871 Rangers +1.5 -125 = 1.5k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -125,
    expectedSize: 1500,
    expectedRotationNumber: 871,
    expectedTeam1: 'Rangers',
    expectedLine: 1.5
  },
  {
    description: 'YG First five handicap line bet',
    input: 'YG 9909 SD F5 +0.5 @ -105 = 10.714',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -105,
    expectedSize: 10714,
    expectedRotationNumber: 9909,
    expectedTeam1: 'SD',
    expectedLine: 0.5,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Second half spread with period at beginning',
    input: 'YG 2h Vanderbilt +2.5 @ +100 = 1k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: 100,
    expectedSize: 1000,
    expectedTeam1: 'Vanderbilt',
    expectedLine: 2.5,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 2 }
  }
];