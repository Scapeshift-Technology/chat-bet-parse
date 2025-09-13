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
  }
];