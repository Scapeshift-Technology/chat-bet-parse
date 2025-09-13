/**
 * Test fixtures for price/odds parsing
 * Tests various price formats and special price keywords
 */

import { TestCase } from './types';

export const priceParsingTestCases: TestCase[] = [
  // Note: 'ev' test moved from parsers-test-cases.ts
  {
    description: 'Price "ev" converts to +100',
    input: 'IW LAA TT o3.5 @ ev',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: 100,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: {PeriodTypeCode:'M',PeriodNumber:0},
  },
  {
    description: 'Parse positive odds',
    input: 'IW Athletics @ +145',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedTeam1: 'Athletics',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Parse negative odds',
    input: 'IW LAA TT o3.5 @ -115',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Parse decimal odds',
    input: 'YG CIN first team to score @ -109.8 = $265',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -109.8,
    expectedSize: 265,
    expectedTeam1: 'CIN',
    expectedProp: 'FirstToScore',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  
  {
    description: 'Convert "even" to +100',
    input: 'IW LAA TT o3.5 @ even',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: 100,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Default to -110 when missing in k-notation',
    input: 'YG 872 Athletics @ 4k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -110,
    expectedSize: 4000,
    expectedRotationNumber: 872,
    expectedTeam1: 'Athletics',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];