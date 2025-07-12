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
  expectedTeam1?: string;
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
  // Writein-specific fields
  expectedEventDate?: Date;
  expectedDescription?: string;
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
  },

  // Writein Contracts
  {
    description: 'IW Writein basic with full date',
    input: 'IW writein 2024/11/5 Trump to win presidency @ +150',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedEventDate: new Date(2024, 10, 5), // JavaScript months are 0-indexed
    expectedDescription: 'Trump to win presidency',
  },
  {
    description: 'IW Writein with date and size',
    input: 'IW writein 2024-11-05 Stock market to close above 40000 @ -120 = 5.0',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: -120,
    expectedSize: 5.0,
    expectedEventDate: new Date(2024, 10, 5),
    expectedDescription: 'Stock market to close above 40000',
  },
  {
    description: 'IW Writein with MM/DD/YYYY format',
    input: 'IW writein 11/05/2024 Bitcoin to reach 100k by end of year @ +200',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 200,
    expectedEventDate: new Date(2024, 10, 5),
    expectedDescription: 'Bitcoin to reach 100k by end of year',
  },
  {
    description: 'IW Writein with MM/DD format (no year)',
    input: 'IW writein 12/25 Christmas Day snow in NYC @ +300 = 2.5',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 300,
    expectedSize: 2.5,
    expectedEventDate: new Date(new Date().getFullYear(), 11, 25), // Current year, December 25
    expectedDescription: 'Christmas Day snow in NYC',
  },
  {
    description: 'IWW shorthand for writein order',
    input: 'IWW 2024/11/5 Trump to win presidency @ +150',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedEventDate: new Date(2024, 10, 5),
    expectedDescription: 'Trump to win presidency',
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

  // Additional valid cases from user feedback
  {
    description: 'YG Moneyline with +0 line (interpreted as ML)',
    input: 'YG 960 COL +0 @ +100 = 5.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 100,
    expectedSize: 5000,
    expectedRotationNumber: 960,
    expectedTeam1: 'COL'
  },
  {
    description: 'YG First five handicap line bet',
    input: 'YG 9909 SD F5 +0.5 @ -105 = 10.714',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -105,
    expectedSize: 10714,
    expectedRotationNumber: 9909,
    expectedTeam1: 'SD',
    expectedLine: 0.5,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },

  // Writein Contracts
  {
    description: 'YG Writein basic with decimal thousands',
    input: 'YG writein 2024/11/5 Trump to win presidency @ +150 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 3000, // 3.0 as decimal thousands for fills
    expectedEventDate: new Date(2024, 10, 5),
    expectedDescription: 'Trump to win presidency',
  },
  {
    description: 'YG Writein with k-notation',
    input: 'YG writein 2024-11-05 Stock market to close above 40000 @ -120 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: -120,
    expectedSize: 2000,
    expectedEventDate: new Date(2024, 10, 5),
    expectedDescription: 'Stock market to close above 40000',
  },
  {
    description: 'YG Writein with dollar amount',
    input: 'YG writein 11/05/2024 Bitcoin to reach 100k by end of year @ +200 = $500',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 200,
    expectedSize: 500, // Dollar amounts are literal
    expectedEventDate: new Date(2024, 10, 5),
    expectedDescription: 'Bitcoin to reach 100k by end of year',
  },
  {
    description: 'YG Writein with MM-DD format and default price',
    input: 'YG writein 12-25 Christmas Day snow in NYC = 1.5',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: -110, // Default price
    expectedSize: 1500, // 1.5 as decimal thousands
    expectedEventDate: new Date(new Date().getFullYear(), 11, 25),
    expectedDescription: 'Christmas Day snow in NYC',
  },
  {
    description: 'YGW shorthand for writein fill',
    input: 'YGW 2024/11/5 Trump to win presidency @ +150 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 3000,
    expectedEventDate: new Date(2024, 10, 5),
    expectedDescription: 'Trump to win presidency',
  },

  // Additional edge cases with price format variations
  {
    description: 'YG Team total F5 with price immediately after line (no @ symbol)',
    input: 'YG TOR F5 TT u2.5-125 = $500',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -125,
    expectedSize: 500, // Dollar amounts are literal
    expectedTeam1: 'TOR',
    expectedLine: 2.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Moneyline F5 with decimal thousands',
    input: 'YG ARI F5 ML @ -120 = 0.75',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -120,
    expectedSize: 750, // 0.75 as decimal thousands for fills
    expectedTeam1: 'ARI',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },

  // Additional edge cases with spacing variations around = sign
  {
    description: 'YG Team total F5 with no space after = sign',
    input: 'YG CLE F5 TT o1.5 +115 =$250',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: 115,
    expectedSize: 250, // Dollar amounts are literal
    expectedTeam1: 'CLE',
    expectedLine: 1.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Team total F5 with no space before or after = sign',
    input: 'YG CLE F5 TT o1.5 +115=$250',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: 115,
    expectedSize: 250, // Dollar amounts are literal
    expectedTeam1: 'CLE',
    expectedLine: 1.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG Team total F5 with no space before = sign',
    input: 'YG CLE F5 TT o1.5 +115= $250',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: 115,
    expectedSize: 250, // Dollar amounts are literal
    expectedTeam1: 'CLE',
    expectedLine: 1.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG implicit moneyline F5 (auto-detect ML)',
    input: 'YG COL F5 +135 = $1000',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 135,
    expectedSize: 1000, // Dollar amounts are literal
    expectedTeam1: 'COL',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'YG implicit moneyline full game (auto-detect ML) - case insensitive',
    input: 'yg col +135 = $1000',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 135,
    expectedSize: 1000, // Dollar amounts are literal
    expectedTeam1: 'col',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
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
// F7 PERIOD PARSING TEST CASES
// ==============================================================================

export const f7PeriodTestCases: TestCase[] = [
  {
    description: 'YG Team F7 moneyline positive line',
    input: 'YG KC F7 +0 @ +125 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 125,
    expectedSize: 2000,
    expectedTeam1: 'KC',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 17 }
  },
  {
    description: 'YG Team F7 moneyline default price',
    input: 'YG LAA F7 @ +125 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 125,
    expectedSize: 2000,
    expectedTeam1: 'LAA',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 17 }
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
  {
    description: 'Duplicate teams in Team1/Team2 format',
    input: 'YG MIN/MIN 1st inning o0.5 @ +130 = 3.75',
    expectedErrorType: 'InvalidTeamFormatError',
    expectedErrorMessage: 'Team1 and Team2 cannot be the same: "MIN"'
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
  },

  // Format error cases with helpful messages
  {
    description: 'Invalid fill format with double @ symbol',
    input: 'YG Pirates F5 u4.5 @ -115 @ 3.5k',
    expectedErrorType: 'InvalidChatFormatError',
    expectedErrorMessage: 'Expected format for fills is: "YG" [rotation_number] contract ["@" usa_price] "=" fill_size'
  },
  {
    description: 'Invalid order format with double @ symbol',
    input: 'IW Pirates F5 u4.5 @ -115 @ 3.5k',
    expectedErrorType: 'InvalidChatFormatError',
    expectedErrorMessage: 'Expected format for orders is: "IW" [rotation_number] contract ["@" usa_price] ["=" unit_size]'
  },
  {
    description: 'Invalid chat prefix - neither IW nor YG',
    input: 'XX Pirates F5 u4.5 @ -115 = 3.5k',
    expectedErrorType: 'UnrecognizedChatPrefixError',
    expectedErrorMessage: 'Chat must be either a chat order (start with "IW" for "i want") or a chat fill (start with "YG", for "you got")'
  }
];

// ==============================================================================
// WRITEIN ERROR TEST CASES
// ==============================================================================

export const writeinErrorTestCases: ErrorTestCase[] = [
  // Invalid writein format
  {
    description: 'No space between writein and date',
    input: 'YG writein2024/11/5 Trump to win presidency @ +150 = 3.0',
    expectedErrorType: 'InvalidContractTypeError',
    expectedErrorMessage: 'Unable to determine contract type'
  },
  {
    description: 'Missing date in writein',
    input: 'IW writein Trump to win presidency @ +150',
    expectedErrorType: 'InvalidWriteinDateError',
    expectedErrorMessage: 'Unable to parse date'
  },
  {
    description: 'Missing description in writein',
    input: 'IW writein 2024/11/5 @ +150',
    expectedErrorType: 'InvalidWriteinFormatError',
    expectedErrorMessage: 'Writein contracts must include a description'
  },
  
  // Invalid dates
  {
    description: 'Invalid date format',
    input: 'IW writein invalid-date Trump to win presidency @ +150',
    expectedErrorType: 'InvalidWriteinDateError',
    expectedErrorMessage: 'Unable to parse date'
  },
  {
    description: 'Invalid calendar date (Feb 30)',
    input: 'IW writein 02/30/2024 Invalid date test @ +150',
    expectedErrorType: 'InvalidWriteinDateError',
    expectedErrorMessage: 'Invalid calendar date'
  },
  {
    description: 'Empty date',
    input: 'IW writein  Trump to win presidency @ +150',
    expectedErrorType: 'InvalidWriteinDateError',
    expectedErrorMessage: 'Unable to parse date'
  },
  
  // Invalid descriptions
  {
    description: 'Description too short (less than 10 characters)',
    input: 'IW writein 2024/11/5 Short @ +150',
    expectedErrorType: 'InvalidWriteinDescriptionError',
    expectedErrorMessage: 'Description must be at least 10 characters long'
  },
  {
    description: 'Description too long (over 255 characters)',
    input: `IW writein 2024/11/5 ${'A'.repeat(260)} @ +150`,
    expectedErrorType: 'InvalidWriteinDescriptionError',
    expectedErrorMessage: 'Description cannot exceed 255 characters'
  },
  {
    description: 'Empty description after trimming',
    input: 'IW writein 2024/11/5    @ +150',
    expectedErrorType: 'InvalidWriteinFormatError',
    expectedErrorMessage: 'Writein contracts must include a description'
  },
  
  // Missing size for fills
  {
    description: 'Missing size for YG writein bet',
    input: 'YG writein 2024/11/5 Trump to win presidency @ +150',
    expectedErrorType: 'MissingSizeForFillError',
    expectedErrorMessage: 'Missing size for fill (YG) bet'
  }
];

// ==============================================================================
// ENHANCED GAME NUMBER TEST CASES - Game numbers before match and with spaces
// ==============================================================================

export const enhancedGameNumberTestCases: TestCase[] = [
  // Game numbers at beginning - without spaces
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
    expectedPrice: -110, // Default when missing
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
    expectedIsOver: false
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
    expectedProp: 'FirstToScore'
  },

  // Game numbers at beginning - WITH spaces
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
    expectedPrice: -110, // Default when missing
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
    expectedIsOver: false
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
    expectedProp: 'FirstToScore'
  },

  // Game numbers after teams/team - WITH spaces (existing position but new space format)
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
    expectedIsOver: false
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

  // Chat orders (IW) with new game number formats
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

  // Mixed scenarios with rotation numbers
  {
    description: 'YG Rotation number and game number G2 at beginning',
    input: 'YG 507 G2 Thunder/Nuggets o213.5 @ 2k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110, // Default when missing
    expectedSize: 2000,
    expectedRotationNumber: 507,
    expectedTeam1: 'Thunder',
    expectedTeam2: 'Nuggets',
    expectedDaySequence: 2,
    expectedLine: 213.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
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
    expectedDaySequence: 1
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
  ...f7PeriodTestCases,
  ...individualContestantTestCases,
  ...enhancedGameNumberTestCases
]; 