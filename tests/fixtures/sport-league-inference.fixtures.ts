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
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
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
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'Infer Football from rotation number range (100s-200s)',
    input: 'YG 195 Illinois/Washington o54 @ -105 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedSize: 3000,
    expectedRotationNumber: 195,
    expectedTeam1: 'Illinois',
    expectedTeam2: 'Washington',
    expectedLine: 54,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedSport: 'Football'
  },
  {
    description: 'Infer Basketball from rotation number range (700s)',
    input: 'IW 705 Celtics/Heat u215.5 @ -110',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedRotationNumber: 705,
    expectedTeam1: 'Celtics',
    expectedTeam2: 'Heat',
    expectedLine: 215.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedSport: 'Basketball'
  },

];