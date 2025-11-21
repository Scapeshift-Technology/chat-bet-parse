/**
 * Test fixtures for game total bets
 * Tests various game total scenarios (over/under on full game score)
 */

import { TestCase } from './types';

export const gameTotalsTestCases: TestCase[] = [
  // Orders (IW)
  {
    description: 'IW Game total F5 over with size',
    input: 'IW ATH/SF F5 o4.5 @ -117 = 2.7',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -117,
    expectedSize: 2.7,
    expectedTeam1: 'ATH',
    expectedTeam2: 'SF',
    expectedLine: 4.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },

  // Fills (YG)
  {
    description: 'YG Game total with decimal thousands size',
    input: 'YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 100,
    expectedSize: 94,
    expectedTeam1: 'Padres',
    expectedTeam2: 'Pirates',
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'YG Game total 1st inning over with decimal thousands',
    input: 'YG Diamondbacks/Phillies 1st inning o0.5 @ +106 = 0.275',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 106,
    expectedSize: 275,
    expectedTeam1: 'Diamondbacks',
    expectedTeam2: 'Phillies',
    expectedLine: 0.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  {
    description: 'YG Game total F5 with decimal thousands',
    input: 'YG ATH/SF F5 o4.5 @ -117 = 2.7',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -117,
    expectedSize: 2700,
    expectedTeam1: 'ATH',
    expectedTeam2: 'SF',
    expectedLine: 4.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Team F5 total under with k-notation',
    input: 'YG Pirates F5 u4.5 @ -115 = 3.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -115,
    expectedSize: 3500,
    expectedTeam1: 'Pirates',
    expectedLine: 4.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG NBA total with k-notation',
    input: 'YG 507 Thunder/Nuggets o213.5 @ 2k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110, // Default when missing
    expectedSize: 2000,
    expectedRotationNumber: 507,
    expectedTeam1: 'Thunder',
    expectedTeam2: 'Nuggets',
    expectedLine: 213.5,
    expectedIsOver: true
  },
  {
    description: 'YG Game total with game number and dollar size',
    input: 'YG COL/ARI #2 1st inning u0.5 @ +120 = $200',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 120,
    expectedSize: 200,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 2,
    expectedLine: 0.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 },
    expectedSport: 'Baseball'
  },
  {
    description: 'YG Game total with GM1 and runs suffix',
    input: 'YG CLE/WAS GM1 1st inning o0.5 runs = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110, // Default when missing
    expectedSize: 1000, // 1.0 as decimal thousands for fills
    expectedTeam1: 'CLE',
    expectedTeam2: 'WAS',
    expectedDaySequence: 1,
    expectedLine: 0.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 },
    expectedSport: 'Baseball'
  },
  {
    description: 'YG Game total with runs suffix and decimal price/size',
    input: 'YG TEX/BOS 1st inning o0.5 runs @ +102.2 = 3.099',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 102.2,
    expectedSize: 3099, // 3.099 as decimal thousands for fills
    expectedTeam1: 'TEX',
    expectedTeam2: 'BOS',
    expectedLine: 0.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 },
    expectedSport: 'Baseball'
  },
  // New CFB test case for TDD
  {
    description: 'YG CFB Northern Illinois/Maryland Under',
    input: 'YG CFB Northern Illinois/Maryland Under 47 @ -110 = 2.4k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 2400,
    expectedTeam1: 'Northern Illinois',
    expectedTeam2: 'Maryland',
    expectedLine: 47,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedSport: 'Football',
    expectedLeague: 'CFB'
  },
  // MLB 1st inning test with .5 format (no leading zero)
  {
    description: 'YG MLB 1st inning over with .5 format',
    input: 'YG Yankees/Red Sox 1st inning o.5 @ +105 = 1.2k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 105,
    expectedSize: 1200,
    expectedTeam1: 'Yankees',
    expectedTeam2: 'Red Sox',
    expectedLine: 0.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 },
    expectedSport: 'Baseball'
  },
  // NBA game total with full date (10/26/2025) without referenceDate
  {
    description: 'YG NBA game total with full date (10/26/2025) without referenceDate',
    input: 'YG NBA 10/26/2025 Pacers u230 @ -110 = 1k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'Pacers',
    expectedLine: 230,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedEventDate: new Date('2025-10-26T00:00:00.000Z')
  },
  // NBA game total with full date (10/26/2025) with referenceDate
  {
    description: 'YG NBA game total with full date (10/26/2025) with referenceDate',
    input: 'YG NBA 10/26/2025 Pacers u230 @ -110 = 1k',
    referenceDate: new Date('2025-10-26T03:21:49.000Z'),
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'Pacers',
    expectedLine: 230,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedEventDate: new Date('2025-10-26T00:00:00.000Z')
  },
  // NBA game total with partial date (10/26) with referenceDate
  {
    description: 'YG NBA game total with partial date (10/26) with referenceDate',
    input: 'YG NBA 10/26 Pacers u230 @ -110 = 1k',
    referenceDate: new Date('2025-10-26T03:21:49.000Z'),
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'Pacers',
    expectedLine: 230,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedEventDate: new Date('2025-10-26T00:00:00.000Z')
  }
];