/**
 * Test fixtures for chat-bet-parse
 * Comprehensive test cases covering all contract types from EBNF grammar
 */

export interface TestCase {
  description: string;
  input: string;
  expectedChatType: 'order' | 'fill';
  expectedContractType: string;
  expectedPrice: number;
  expectedSize?: number;
  expectedTeam1: string;
  expectedTeam2?: string;
  expectedLine?: number;
  expectedIsOver?: boolean;
  expectedProp?: string;
  expectedSeriesLength?: number;
  expectedRotationNumber?: number;
  expectedDaySequence?: number;
  expectedPeriod?: { PeriodTypeCode: string; PeriodNumber: number };
  expectedContestantType?: 'Individual' | 'TeamAdHoc' | 'TeamLeague';
  expectedSport?: string;
}

export interface ErrorTestCase {
  description: string;
  input: string;
  expectedErrorType: string;
  expectedErrorMessage: string;
}

// ==============================================================================
// VALID TEST CASES - CHAT ORDERS (IW)
// ==============================================================================

export const validOrderTestCases: TestCase[] = [
  // Game Totals
  {
    description: 'IW Game total with period and price',
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
  {
    description: 'IW NBA game total with rotation number',
    input: 'IW 507 Thunder/Nuggets o213.5',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedRotationNumber: 507,
    expectedTeam1: 'Thunder',
    expectedTeam2: 'Nuggets',
    expectedLine: 213.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  
  // Team Totals
  {
    description: 'IW Team total basic',
    input: 'IW LAA TT o3.5 @ -115.5',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115.5,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'IW Team total with period and size',
    input: 'IW MIA F5 TT u1.5 @ -110 = 1.0',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1.0,
    expectedTeam1: 'MIA',
    expectedLine: 1.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  
  // Moneylines
  {
    description: 'IW Moneyline with rotation number',
    input: 'IW 872 Athletics @ +145',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedRotationNumber: 872,
    expectedTeam1: 'Athletics'
  },
  {
    description: 'IW Moneyline with size',
    input: 'IW 872 Athletics @ +145 = 4.0',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedSize: 4.0,
    expectedRotationNumber: 872,
    expectedTeam1: 'Athletics'
  },
  
  // Spreads
  {
    description: 'IW Spread negative line',
    input: 'IW 870 Mariners -1.5 +135',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: 135,
    expectedRotationNumber: 870,
    expectedTeam1: 'Mariners',
    expectedLine: -1.5
  },
  {
    description: 'IW Spread positive line with size',
    input: 'IW 871 Rangers +1.5 -125 = 3.0',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -125,
    expectedSize: 3.0,
    expectedRotationNumber: 871,
    expectedTeam1: 'Rangers',
    expectedLine: 1.5
  },
  
  // Props (Yes/No)
  {
    description: 'IW First team to score prop',
    input: 'IW CIN 1st team to score @ -115',
    expectedChatType: 'order',
    expectedContractType: 'PropYN',
    expectedPrice: -115,
    expectedTeam1: 'CIN',
    expectedProp: 'FirstToScore'
  },
  {
    description: 'IW Last team to score prop with size',
    input: 'IW CHC last team to score @ -139 = 0.50',
    expectedChatType: 'order',
    expectedContractType: 'PropYN',
    expectedPrice: -139,
    expectedSize: 0.50,
    expectedTeam1: 'CHC',
    expectedProp: 'LastToScore'
  },
  
  // Props (Over/Under)
  {
    description: 'IW Player passing yards over prop',
    input: 'IW Player123 passing yards o250.5 @ -115',
    expectedChatType: 'order',
    expectedContractType: 'PropOU',
    expectedPrice: -115,
    expectedTeam1: 'Player123',
    expectedLine: 250.5,
    expectedIsOver: true,
    expectedProp: 'PassingYards'
  },
  {
    description: 'IW Player rebounds under prop with size',
    input: 'IW Player456 rebounds u12.5 @ -110 = 2.0',
    expectedChatType: 'order',
    expectedContractType: 'PropOU',
    expectedPrice: -110,
    expectedSize: 2.0,
    expectedTeam1: 'Player456',
    expectedLine: 12.5,
    expectedIsOver: false,
    expectedProp: 'Rebounds'
  },
  
  // Series
  {
    description: 'IW Series bet default length',
    input: 'IW 852 Guardians series -105',
    expectedChatType: 'order',
    expectedContractType: 'Series',
    expectedPrice: -105,
    expectedRotationNumber: 852,
    expectedTeam1: 'Guardians',
    expectedSeriesLength: 3
  },
  {
    description: 'IW Series bet explicit length with size',
    input: 'IW 854 Yankees 4 game series +110 = 1.0',
    expectedChatType: 'order',
    expectedContractType: 'Series',
    expectedPrice: 110,
    expectedSize: 1.0,
    expectedRotationNumber: 854,
    expectedTeam1: 'Yankees',
    expectedSeriesLength: 4
  }
];

// ==============================================================================
// VALID TEST CASES - CHAT FILLS (YG)
// ==============================================================================

export const validFillTestCases: TestCase[] = [
  // Game Totals
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
    expectedPeriod: { PeriodTypeCode: 'I', PeriodNumber: 1 }
  },
  
  // Team Totals  
  {
    description: 'YG Team total with decimal thousands',
    input: 'YG LAA TT o3.5 @ -115.5 = 8.925',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115.5,
    expectedSize: 8925,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true
  },
  {
    description: 'YG Team total F5 with decimal thousands',
    input: 'YG MIA F5 TT u1.5 @ -110 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'MIA',
    expectedLine: 1.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Team total with game number and k-notation',
    input: 'YG SEA G2 TT u4.5 @ -110 = 1.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1500,
    expectedTeam1: 'SEA',
    expectedDaySequence: 2,
    expectedLine: 4.5,
    expectedIsOver: false
  },
  
  // Moneylines
  {
    description: 'YG Moneyline with k-notation (no explicit price)',
    input: 'YG 872 Athletics @ 4k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -110, // Default
    expectedSize: 4000,
    expectedRotationNumber: 872,
    expectedTeam1: 'Athletics'
  },
  {
    description: 'YG Moneyline with price and dollar size',
    input: 'YG 872 Athletics +145 = $500',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedSize: 500,
    expectedRotationNumber: 872,
    expectedTeam1: 'Athletics'
  },
  
  // Spreads
  {
    description: 'YG Spread with k-notation',
    input: 'YG 870 Mariners -1.5 +135 = 2.5k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: 135,
    expectedSize: 2500,
    expectedRotationNumber: 870,
    expectedTeam1: 'Mariners',
    expectedLine: -1.5
  },
  {
    description: 'YG Spread positive line with k-notation',
    input: 'YG 871 Rangers +1.5 -125 = 1.5k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -125,
    expectedSize: 1500,
    expectedRotationNumber: 871,
    expectedTeam1: 'Rangers',
    expectedLine: 1.5
  },
  {
    description: 'YG Spread +0 line F5',
    input: 'YG 9921 SEA F5 +0 @ -250 = 12.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -250,
    expectedSize: 12000,
    expectedRotationNumber: 9921,
    expectedTeam1: 'SEA',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 },
    expectedSport: 'Baseball',
  },
  {
    description: 'YG Spread +0 line F5 variant',
    input: 'YG 9909 SD F5 +0 @ -250 = 12.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -250,
    expectedSize: 12000,
    expectedRotationNumber: 9909,
    expectedTeam1: 'SD',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 },
    expectedSport: 'Baseball',
  },
  
  // Props
  {
    description: 'YG First team to score with decimal thousands',
    input: 'YG CIN 1st team to score @ -115 = 0.563',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -115,
    expectedSize: 563,
    expectedTeam1: 'CIN',
    expectedProp: 'FirstToScore'
  },
  {
    description: 'YG Last team to score with decimal thousands',
    input: 'YG CHC last team to score @ -139 = 0.35',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -139,
    expectedSize: 350,
    expectedTeam1: 'CHC',
    expectedProp: 'LastToScore'
  },
  {
    description: 'YG First team to score alternative wording with dollar size',
    input: 'YG CIN first team to score @ -109.8 = $265',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -109.8,
    expectedSize: 265,
    expectedTeam1: 'CIN',
    expectedProp: 'FirstToScore'
  },
  
  // Series
  {
    description: 'YG Series default length with k-notation',
    input: 'YG 852 Guardians series -105 = 3k',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: -105,
    expectedSize: 3000,
    expectedRotationNumber: 852,
    expectedTeam1: 'Guardians',
    expectedSeriesLength: 3
  },
  {
    description: 'YG Series explicit length with k-notation',
    input: 'YG 854 Yankees 4 game series +110 = 1k',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: 110,
    expectedSize: 1000,
    expectedRotationNumber: 854,
    expectedTeam1: 'Yankees',
    expectedSeriesLength: 4
  },
  {
    description: 'YG Series "out of" syntax with decimal thousands',
    input: 'YG 856 Red Sox series out of 4 -120 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: -120,
    expectedSize: 2000,
    expectedRotationNumber: 856,
    expectedTeam1: 'Red Sox',
    expectedSeriesLength: 4
  },
  {
    description: 'YG Series "X-Game Series" format with decimal thousands',
    input: 'YG Lakers 7-Game Series @ +120 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: 120,
    expectedSize: 1000,
    expectedTeam1: 'Lakers',
    expectedSeriesLength: 7
  },
  {
    description: 'YG Series "series/X" format with decimal thousands',
    input: 'YG 856 St. Louis Cardinals series/5 -120 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: -120,
    expectedSize: 2000,
    expectedRotationNumber: 856,
    expectedTeam1: 'St. Louis Cardinals',
    expectedSeriesLength: 5
  },

  // Props (Over/Under)
  {
    description: 'YG Player passing yards over with decimal thousands',
    input: 'YG Player123 passing yards o250.5 @ -115 = 1.5',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: -115,
    expectedSize: 1500,
    expectedTeam1: 'Player123',
    expectedLine: 250.5,
    expectedIsOver: true,
    expectedProp: 'PassingYards'
  },
  {
    description: 'YG Player RBI under with k-notation',
    input: 'YG Player456 rbi u1.5 @ -105 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: -105,
    expectedSize: 2000,
    expectedTeam1: 'Player456',
    expectedLine: 1.5,
    expectedIsOver: false,
    expectedProp: 'RBI'
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
];

// ==============================================================================
// SPECIAL PRICE CASES
// ==============================================================================

export const specialPriceTestCases: TestCase[] = [
  {
    description: 'Price "ev" converts to +100',
    input: 'IW LAA TT o3.5 @ ev',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: 100,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true
  },
  {
    description: 'Price "even" converts to +100',
    input: 'IW LAA TT o3.5 @ even',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: 100,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true
  },
  {
    description: 'Decimal price parsing',
    input: 'YG CIN first team to score @ -109.8 = $265',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -109.8,
    expectedSize: 265,
    expectedTeam1: 'CIN',
    expectedProp: 'FirstToScore'
  }
];

// ==============================================================================
// GAME NUMBER VARIATIONS
// ==============================================================================

export const gameNumberTestCases: TestCase[] = [
  {
    description: 'Game number G2 format',
    input: 'YG SEA G2 TT u4.5 @ -110 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'SEA',
    expectedDaySequence: 2
  },
  {
    description: 'Game number GM1 format',
    input: 'YG COL/ARI GM1 F5 u5 @ -105 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedSize: 3000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 1
  },
  {
    description: 'Game number #2 format',
    input: 'YG COL/ARI #2 1st inning u0.5 @ +120 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: 120,
    expectedSize: 2000,
    expectedTeam1: 'COL',
    expectedTeam2: 'ARI',
    expectedDaySequence: 2
  }
];

// ==============================================================================
// F3 PERIOD PARSING TEST CASES
// ==============================================================================

export const f3PeriodTestCases: TestCase[] = [
  {
    description: 'YG Game total F3 over',
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
  }
];

// ==============================================================================
// INDIVIDUAL CONTESTANT TEST CASES
// ==============================================================================

export const individualContestantTestCases: TestCase[] = [
  {
    description: 'YG Individual player strikeouts over',
    input: 'YG B. Falter Ks o1.5 @ +120 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: 120,
    expectedSize: 1000,
    expectedTeam1: 'B. Falter',
    expectedLine: 1.5,
    expectedIsOver: true,
    expectedProp: 'Ks',
    expectedContestantType: 'Individual'
  }
];

// ==============================================================================
// ERROR TEST CASES
// ==============================================================================

export const errorTestCases: ErrorTestCase[] = [
  // Invalid prefixes
  {
    description: 'Invalid chat prefix',
    input: 'XX Padres/Pirates u0.5 @ +100',
    expectedErrorType: 'UnrecognizedChatPrefixError',
    expectedErrorMessage: 'Unrecognized chat prefix: "XX"'
  },
  
  // Missing size for fills
  {
    description: 'Missing size for YG bet',
    input: 'YG Padres/Pirates u0.5 @ +100',
    expectedErrorType: 'MissingSizeForFillError',
    expectedErrorMessage: 'Missing size for fill (YG) bet'
  },
  
  // Invalid prices
  {
    description: 'Invalid price format',
    input: 'IW LAA TT o3.5 @ invalid',
    expectedErrorType: 'InvalidPriceFormatError',
    expectedErrorMessage: 'Invalid USA price format: "invalid"'
  },
  {
    description: 'Empty price',
    input: 'IW LAA TT o3.5 @ ',
    expectedErrorType: 'InvalidChatFormatError',
    expectedErrorMessage: 'No contract details found'
  },
  
  // Invalid sizes
  {
    description: 'Invalid size format for order',
    input: 'IW LAA TT o3.5 @ -110 = invalid',
    expectedErrorType: 'InvalidSizeFormatError',
    expectedErrorMessage: 'Invalid size format: "invalid"'
  },
  {
    description: 'Negative size',
    input: 'YG LAA TT o3.5 @ -110 = -1.0',
    expectedErrorType: 'InvalidSizeFormatError',
    expectedErrorMessage: 'Invalid size format: "-1.0"'
  },
  
  // Invalid lines
  {
    description: 'Line not divisible by 0.5',
    input: 'IW LAA TT o3.3 @ -110',
    expectedErrorType: 'InvalidLineValueError',
    expectedErrorMessage: 'Invalid line value: 3.3. Line must be divisible by 0.5'
  },
  
  // Invalid rotation numbers
  {
    description: 'Invalid rotation number',
    input: 'YG abc Athletics @ 4k',
    expectedErrorType: 'InvalidRotationNumberError',
    expectedErrorMessage: 'Invalid rotation number: "abc"'
  },
  {
    description: 'Rotation number too large',
    input: 'YG 99999 Athletics @ 4k',
    expectedErrorType: 'InvalidRotationNumberError',
    expectedErrorMessage: 'Invalid rotation number: "99999"'
  },
  
  // Invalid periods
  {
    description: 'Invalid period format',
    input: 'IW Padres/Pirates 99th inning u0.5 @ +100',
    expectedErrorType: 'InvalidPeriodFormatError',
    expectedErrorMessage: 'Invalid period format: "99th inning"'
  },
  
  // Invalid game numbers
  {
    description: 'Invalid game number format',
    input: 'YG SEA Gx TT u4.5 @ -110 = 1.0',
    expectedErrorType: 'InvalidGameNumberError',
    expectedErrorMessage: 'Invalid game number format: "Gx"'
  },
  
  // Invalid teams
  {
    description: 'Empty team name',
    input: 'IW  TT o3.5 @ -110',
    expectedErrorType: 'InvalidTeamFormatError',
    expectedErrorMessage: 'Team name cannot be empty'
  },
  
  // Contract type detection errors
  {
    description: 'Ambiguous contract - could not determine type',
    input: 'IW some random text @ -110',
    expectedErrorType: 'InvalidContractTypeError',
    expectedErrorMessage: 'Unable to determine contract type from: "some random text"'
  },
  
  // Message too short
  {
    description: 'Message too short',
    input: 'IW',
    expectedErrorType: 'InvalidChatFormatError',
    expectedErrorMessage: 'Message too short'
  },

  // Prop validation errors
  {
    description: 'PropOU without line (passing yards)',
    input: 'IW Player123 passing yards @ -115',
    expectedErrorType: 'InvalidContractTypeError',
    expectedErrorMessage: 'PassingYards props require an over/under line'
  },
  {
    description: 'PropYN with line (first to score)',
    input: 'IW CIN first team to score o1.5 @ -115',
    expectedErrorType: 'InvalidContractTypeError',
    expectedErrorMessage: 'FirstToScore props cannot have a line - they are yes/no bets only'
  },
  {
    description: 'Unsupported prop type',
    input: 'IW Player123 some unknown prop @ -115',
    expectedErrorType: 'InvalidContractTypeError',
    expectedErrorMessage: 'Unsupported prop type'
  }
];

// ==============================================================================
// EXPORT ALL TEST CASES
// ==============================================================================

export const allValidTestCases = [
  ...validOrderTestCases,
  ...validFillTestCases, 
  ...specialPriceTestCases,
  ...gameNumberTestCases,
  ...f3PeriodTestCases,
  ...individualContestantTestCases
]; 