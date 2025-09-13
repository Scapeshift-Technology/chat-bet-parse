/**
 * Test fixtures for game sequence/day sequence parsing
 * Tests G1, G2, #1, #2 formats
 */

import { TestCase } from './types';

export const gameSequenceTestCases: TestCase[] = [
  {
    description: 'Parse G2 format',
    input: 'YG SEA G2 TT u4.5 @ -110 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'SEA',
    expectedDaySequence: 2,
    expectedLine: 4.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Parse #2 format',
    input: 'YG COL/ARI #2 1st inning u0.5 @ +120 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 120,
    expectedSize: 2000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 2,
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'Parse #1 format for PropYN contracts',
    input: 'YG DET #1 first team to score @ -170 = 0.15',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -170,
    expectedSize: 150,
    expectedTeam1: 'DET',
    expectedDaySequence: 1,
    expectedProp: 'FirstToScore',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'Parse #2 format for PropYN contracts',
    input: 'YG DET #2 first team to score @ -170 = 0.15',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -170,
    expectedSize: 150,
    expectedTeam1: 'DET',
    expectedDaySequence: 2,
    expectedProp: 'FirstToScore',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  
  // Additional game number format from parsers-test-cases.ts
  {
    description: 'Game number GM1 format',
    input: 'YG COL/ARI GM1 F5 u5 @ -105 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedSize: 3000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 1,
    expectedLine: 5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  }
];

// Enhanced game number test cases from parsers-test-cases.ts
export const enhancedGameNumberTestCases: TestCase[] = [
  {
    description: 'YG Game number G2 at beginning - game total',
    input: 'YG G2 COL/ARI 1st inning u0.5 @ +120 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 120,
    expectedSize: 2000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 2,
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'YG Game number GM1 at beginning - game total',
    input: 'YG GM1 CLE/WAS 1st inning o0.5 runs = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'CLE',
    expectedTeam2: 'WAS',
    expectedDaySequence: 1,
    expectedLine: 0.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'YG Game number #2 at beginning - game total',
    input: 'YG #2 COL/ARI F5 u5 @ -105 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedSize: 3000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 2,
    expectedLine: 5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Game number G2 at beginning - team total',
    input: 'YG G2 SEA TT u4.5 @ -110 = 1.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1500,
    expectedTeam1: 'SEA',
    expectedDaySequence: 2,
    expectedLine: 4.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'YG Game number #1 at beginning - PropYN',
    input: 'YG #1 DET first team to score @ -170 = 0.15',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -170,
    expectedSize: 150,
    expectedTeam1: 'DET',
    expectedDaySequence: 1,
    expectedProp: 'FirstToScore',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  // Game numbers with spaces
  {
    description: 'YG Game number "G 2" at beginning - game total',
    input: 'YG G 2 COL/ARI 1st inning u0.5 @ +120 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 120,
    expectedSize: 2000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 2,
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'YG Game number "GM 1" at beginning - game total',
    input: 'YG GM 1 CLE/WAS 1st inning o0.5 runs = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'CLE',
    expectedTeam2: 'WAS',
    expectedDaySequence: 1,
    expectedLine: 0.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'YG Game number "# 2" at beginning - game total',
    input: 'YG # 2 COL/ARI F5 u5 @ -105 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedSize: 3000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 2,
    expectedLine: 5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Game number "G 2" at beginning - team total',
    input: 'YG G 2 SEA TT u4.5 @ -110 = 1.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1500,
    expectedTeam1: 'SEA',
    expectedDaySequence: 2,
    expectedLine: 4.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'YG Game number "# 1" at beginning - PropYN',
    input: 'YG # 1 DET first team to score @ -170 = 0.15',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -170,
    expectedSize: 150,
    expectedTeam1: 'DET',
    expectedDaySequence: 1,
    expectedProp: 'FirstToScore',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  // Game numbers after teams
  {
    description: 'YG Game number "G 2" after team - team total',
    input: 'YG SEA G 2 TT u4.5 @ -110 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'SEA',
    expectedDaySequence: 2,
    expectedLine: 4.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'YG Game number "GM 1" after teams - game total',
    input: 'YG COL/ARI GM 1 F5 u5 @ -105 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedSize: 3000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 1,
    expectedLine: 5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Game number "# 2" after teams - game total',
    input: 'YG COL/ARI # 2 1st inning u0.5 @ +120 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 120,
    expectedSize: 2000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 2,
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'YG Rotation number and game number "GM 1" at beginning',
    input: 'YG 872 GM 1 Athletics @ +145 = $500',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedSize: 500,
    expectedRotationNumber: 872,
    expectedTeam1: 'Athletics',
    expectedDaySequence: 1,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'YG Game number "# 2" after teams with dollar size',
    input: 'YG COL/ARI # 2 1st inning u0.5 @ +120 = $200',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 120,
    expectedSize: 200,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 2,
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'YG Game number "# 2" after team - PropYN',
    input: 'YG DET # 2 first team to score @ -170 = 0.15',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -170,
    expectedSize: 150,
    expectedTeam1: 'DET',
    expectedDaySequence: 2,
    expectedProp: 'FirstToScore'
  },
  {
    description: 'IW Game number G1 at beginning - game total order',
    input: 'IW G1 St. Louis/PHI o8.5 @ -110',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedTeam1: 'St. Louis',
    expectedTeam2: 'PHI',
    expectedDaySequence: 1,
    expectedLine: 8.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'IW Game number "# 3" at beginning - team total order',
    input: 'IW # 3 LAA TT o3.5 @ -115',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedTeam1: 'LAA',
    expectedDaySequence: 3,
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'YG Rotation number and game number G2 at beginning',
    input: 'YG 507 G2 Thunder/Nuggets o213.5 @ 2k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 2000,
    expectedRotationNumber: 507,
    expectedTeam1: 'Thunder',
    expectedTeam2: 'Nuggets',
    expectedDaySequence: 2,
    expectedLine: 213.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];