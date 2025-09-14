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
  },
  {
    description: 'Parse CFB second half team total under with TT',
    input: 'YG CFB Bowling green TT 2h u23.5 @ -105 = 1.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -105,
    expectedSize: 1500,
    expectedTeam1: 'Bowling green',
    expectedLine: 23.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 2 },
    expectedSport: 'Football',
    expectedLeague: 'CFB'
  },
  {
    description: 'Parse single team with period as game total without TT',
    input: 'YG CFB Bowling green 2h u23.5 @ -105 = 1.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedSize: 1500,
    expectedTeam1: 'Bowling green',
    expectedLine: 23.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 2 },
    expectedSport: 'Football',
    expectedLeague: 'CFB'
  },
  {
    description: 'Parse period after team name for moneyline',
    input: 'IW NBA Lakers 1h ML @ -150 = 3k',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -150,
    expectedSize: 3000,
    expectedTeam1: 'Lakers',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 },
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedTiesLose: false
  },
  {
    description: 'Parse period after total specification',
    input: 'YG NFL Chiefs/Bills o27.5 h1 @ +110 = 500',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 110,
    expectedSize: 500,
    expectedTeam1: 'Chiefs',
    expectedTeam2: 'Bills',
    expectedLine: 27.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 },
    expectedSport: 'Football',
    expectedLeague: 'NFL'
  },
  {
    description: 'Parse h2 format instead of 2h',
    input: 'IW CFB Michigan h2 TT o14 @ -120 = 2.4k',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -120,
    expectedSize: 2400,
    expectedTeam1: 'Michigan',
    expectedLine: 14,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 2 },
    expectedSport: 'Football',
    expectedLeague: 'CFB'
  },
  {
    description: 'Parse q1 period format for first quarter',
    input: 'YG NBA Warriors q1 -2.5 @ -110 = 1.1k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -110,
    expectedSize: 1100,
    expectedTeam1: 'Warriors',
    expectedLine: -2.5,
    expectedPeriod: { PeriodTypeCode: 'Q', PeriodNumber: 1 },
    expectedSport: 'Basketball',
    expectedLeague: 'NBA'
  },
  {
    description: 'Parse period near the end of bet specification',
    input: 'IW NHL Rangers/Devils p3 u0.5 @ -105 = 2k',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedSize: 2000,
    expectedTeam1: 'Rangers',
    expectedTeam2: 'Devils',
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'P', PeriodNumber: 3 },
    expectedSport: 'Hockey',
    expectedLeague: 'NHL'
  },
  {
    description: 'Parse period at end of bet specification',
    input: 'IW NHL Rangers/Devils u.5 p3 @ -105 = 2k',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedSize: 2000,
    expectedTeam1: 'Rangers',
    expectedTeam2: 'Devils',
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'P', PeriodNumber: 3 },
    expectedSport: 'Hockey',
    expectedLeague: 'NHL'
  }
];