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
    expectedTeam1: 'Athletics',
    expectedTiesLose: false
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
    expectedTeam1: 'Athletics',
    expectedTiesLose: false
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
    expectedTiesLose: false
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
    expectedTiesLose: false
  },
  {
    description: 'YG Moneyline with +0 line (interpreted as ML)',
    input: 'YG 960 COL +0 @ +100 = 5.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 100,
    expectedSize: 5000,
    expectedRotationNumber: 960,
    expectedTeam1: 'COL',
    expectedTiesLose: false
  },
  // Regression test: team name containing "under" should not be parsed as total
  {
    description: 'YG Dunder Mifflin moneyline (team name contains "under")',
    input: 'YG Dunder Mifflin @ +199 = $500',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 199,
    expectedSize: 500,
    expectedTeam1: 'Dunder Mifflin',
    expectedTiesLose: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  // Regression test: team name starting with "Under" should not be parsed as total
  {
    description: 'YG Underwood moneyline (team name starts with "Under")',
    input: 'YG Underwood @ +155 = 2.5k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 155,
    expectedSize: 2500,
    expectedTeam1: 'Underwood',
    expectedTiesLose: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
  ,
  // Digit-led names on the allowlist stay moneyline contestants on every
  // acceptance path: plain name, "ML", and "+0".
  {
    description: 'YG 76ers plain-name moneyline (allowlisted digit-led name)',
    input: 'yg 76ers -110 = 1k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: '76ers',
    expectedTiesLose: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'IW Philadelphia 76ers ML moneyline (allowlisted name inside a longer name)',
    input: 'IW Philadelphia 76ers ML @ -110',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -110,
    expectedTeam1: 'Philadelphia 76ers',
    expectedTiesLose: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'IW 49ers +0 moneyline (allowlisted digit-led name)',
    input: 'IW 49ers +0 @ -120',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -120,
    expectedTeam1: '49ers',
    expectedTiesLose: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
  ,
  {
    description: 'a clipping-shaped name before a period token is a name, not a side ("UND 1h")',
    input: 'IW UND 1h ML @ -110',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -110,
    expectedTeam1: 'UND',
    expectedTiesLose: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'allowlisted digit-led name with trailing punctuation stays a moneyline contestant',
    input: 'IW 49ers. ML @ -110',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -110,
    expectedTeam1: '49ers.',
    expectedTiesLose: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];