/**
 * Test fixtures for sport and league inference
 * Tests rotation number-based sport/league detection
 */

import { TestCase } from './types';

export const sportLeagueInferenceTestCases: TestCase[] = [
  {
    description: 'Infer Basketball from rotation number range (500s)',
    input: 'IW 507 Thunder/Nuggets o213.5',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedRotationNumber: 507,
    expectedTeam1: 'Thunder',
    expectedTeam2: 'Nuggets',
    expectedLine: 213.5,
    expectedIsOver: true,
    expectedPeriod: {PeriodTypeCode:'M',PeriodNumber:0},
    expectedSport: 'Basketball',
  },
  {
    description: 'Infer Baseball from rotation number range (800s-900s)',
    input: 'IW 872 Athletics @ +145',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedRotationNumber: 872,
    expectedTeam1: 'Athletics',
    expectedSport: 'Baseball',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Infer Football from rotation number range (400s)',
    input: 'IW 457 Dolphins @ +145',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedRotationNumber: 457,
    expectedTeam1: 'Dolphins',
    expectedSport: 'Football',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  
];