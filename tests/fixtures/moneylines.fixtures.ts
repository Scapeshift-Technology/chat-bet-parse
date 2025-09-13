/**
 * Test fixtures for moneyline bets
 * Tests various moneyline scenarios
 */

import { TestCase } from './types';

export const moneylinesTestCases: TestCase[] = [
  // Orders (IW)
  {
    description: 'IW Moneyline with size',
    input: 'IW 872 Athletics @ +145 = 4.0',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedSize: 4.0,
    expectedRotationNumber: 872,
    expectedTeam1: 'Athletics'
  },

  // Fills (YG)
  {
    description: 'YG Moneyline with price and dollar size',
    input: 'YG 872 Athletics +145 = $500',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedSize: 500,
    expectedRotationNumber: 872,
    expectedTeam1: 'Athletics'
  },
  {
    description: 'YG Spread +0 line F5',
    input: 'YG 9921 SEA F5 +0 @ -250 = 12.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -250,
    expectedSize: 12000,
    expectedRotationNumber: 9921,
    expectedTeam1: 'SEA',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 },
    expectedSport: 'Baseball',
  },
  {
    description: 'YG Spread +0 line F5 variant',
    input: 'YG 9909 SD F5 +0 @ -250 = 12.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -250,
    expectedSize: 12000,
    expectedRotationNumber: 9909,
    expectedTeam1: 'SD',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 },
    expectedSport: 'Baseball',
  },
  {
    description: 'YG Moneyline with +0 line (interpreted as ML)',
    input: 'YG 960 COL +0 @ +100 = 5.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 100,
    expectedSize: 5000,
    expectedRotationNumber: 960,
    expectedTeam1: 'COL'
  }
];