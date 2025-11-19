/**
 * Test fixtures for size parsing
 * Tests various size formats and notations for orders and fills
 */

import { TestCase } from './types';

export const orderSizeTestCases: TestCase[] = [
  {
    description: 'Order size - parse unit sizes as literal',
    input: 'IW LAA TT o3.5 @ -115 = 2.5',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 2.5,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Order size - parse k-notation correctly',
    input: 'IW LAA TT o3.5 @ -115 = 2.5k',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 2500,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Order size - parse dollar amounts as literal',
    input: 'IW LAA TT o3.5 @ -115 = $250',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 250,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];

export const fillSizeTestCases: TestCase[] = [
  {
    description: 'Fill size - plain integer as literal (no multiplication)',
    input: 'YG LAA TT o3.5 @ -115 = 100',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 100,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - plain integer 500 as literal',
    input: 'YG LAA TT o3.5 @ -115 = 500',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 500,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - plain integer 1000 as literal',
    input: 'YG LAA TT o3.5 @ -115 = 1000',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 1000,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - plain integer 10000 as literal',
    input: 'YG LAA TT o3.5 @ -115 = 10000',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 10000,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - decimal 2.5 as thousands (multiply by 1000)',
    input: 'YG LAA TT o3.5 @ -115 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 2500,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - decimal 1.0 as thousands',
    input: 'YG LAA TT o3.5 @ -115 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 1000,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - decimal 10.5 as thousands',
    input: 'YG LAA TT o3.5 @ -115 = 10.5',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 10500,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - k-notation correctly',
    input: 'YG LAA TT o3.5 @ -115 = 2.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 2500,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - dollar amounts as literal',
    input: 'YG LAA TT o3.5 @ -115 = $250',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 250,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - small decimal thousands (0.563)',
    input: 'YG CIN 1st team to score @ -115 = 0.563',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -115,
    expectedSize: 563,
    expectedTeam1: 'CIN',
    expectedProp: 'FirstToScore',
    expectedIsYes: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - dollar+k-notation ($11k)',
    input: 'YG LAA TT o3.5 @ -115 = $11k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 11000,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Fill size - dollar+k-notation with decimal ($2.5k)',
    input: 'YG LAA TT o3.5 @ -115 = $2.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedSize: 2500,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];