/**
 * Test fixtures for period parsing
 * Tests various period formats (F5, F3, F7, innings, etc.)
 */

import { TestCase } from './types';

export const periodParsingTestCases: TestCase[] = [
  {
    description: 'Parse inning periods',
    input: 'IW Padres/Pirates 1st inning u0.5 @ +100',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: 100,
    expectedTeam1: 'Padres',
    expectedTeam2: 'Pirates',
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'Parse F5 as first half',
    input: 'IW ATH/SF F5 o4.5 @ -117',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -117,
    expectedTeam1: 'ATH',
    expectedTeam2: 'SF',
    expectedLine: 4.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'Parse F3 as first three innings',
    input: 'YG Padres/Pirates F3 o3 @ +200 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 200,
    expectedSize: 2000,
    expectedTeam1: 'Padres',
    expectedTeam2: 'Pirates',
    expectedLine: 3,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 13 }
  },
  {
    description: 'Default to full game when no period specified',
    input: 'IW Padres/Pirates u0.5 @ +100',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: 100,
    expectedTeam1: 'Padres',
    expectedTeam2: 'Pirates',
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: {PeriodTypeCode:'M',PeriodNumber:0},
    expectedSport: undefined,
    expectedLeague: undefined,
  },
  // F3 team total from parsers-test-cases.ts
  {
    description: 'YG Team total F3 over',
    input: 'YG Padres F3 TT o3 @ -105 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -105,
    expectedSize: 1000,
    expectedTeam1: 'Padres',
    expectedLine: 3,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 13 }
  },
  // F7 tests from parsers-test-cases.ts
  {
    description: 'YG Team F7 moneyline positive line',
    input: 'YG KC F7 +0 @ +125 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 125,
    expectedSize: 2000,
    expectedTeam1: 'KC',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 17 },
    expectedTiesLose: false
  },
  {
    description: 'YG Team F7 moneyline default price',
    input: 'YG LAA F7 @ +125 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 125,
    expectedSize: 2000,
    expectedTeam1: 'LAA',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 17 },
    expectedTiesLose: false
  }
];