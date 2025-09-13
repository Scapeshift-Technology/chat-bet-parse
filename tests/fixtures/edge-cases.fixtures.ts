/**
 * Test fixtures for edge cases and special scenarios
 * Tests special characters, case sensitivity, and unusual inputs
 */

import { TestCase } from './types';

export const edgeCaseTestCases: TestCase[] = [
  {
    description: 'Handle teams with special characters (49ers)',
    input: 'IW 49ers/Patriots u45.5 @ -110',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedTeam1: '49ers',
    expectedTeam2: 'Patriots',
    expectedLine: 45.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Handle teams with ampersands',
    input: 'IW A&M TT o21.5 @ -115',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedTeam1: 'A&M',
    expectedLine: 21.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  
  {
    description: 'Handle high NBA totals',
    input: 'IW Thunder/Nuggets o240.5 @ -110',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedTeam1: 'Thunder',
    expectedTeam2: 'Nuggets',
    expectedLine: 240.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Handle case insensitive input',
    input: 'iw laa tt o3.5 @ -115',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedTeam1: 'laa',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];