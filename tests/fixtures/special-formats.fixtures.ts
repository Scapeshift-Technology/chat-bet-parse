/**
 * Test fixtures for special format variations
 * Tests edge cases with spacing, implicit ML detection, and league prefixes
 */

import { TestCase } from './types';

export const specialFormatsTestCases: TestCase[] = [
  // Price format variations
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
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 },
    expectedTiesLose: false
  },

  // Spacing variations around = sign
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

  // Implicit moneyline detection
  {
    description: 'YG implicit moneyline F5 (auto-detect ML)',
    input: 'YG COL F5 +135 = $1000',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 135,
    expectedSize: 1000, // Dollar amounts are literal
    expectedTeam1: 'COL',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 },
    expectedTiesLose: false
  },
  {
    description: 'YG implicit moneyline full game (auto-detect ML) - case insensitive',
    input: 'yg col +135 = $1000',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 135,
    expectedSize: 1000, // Dollar amounts are literal
    expectedTeam1: 'col',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },

  // League prefix formats
  {
    description: 'YG with explicit league CFB and period 1Q',
    input: 'YG CFB 1Q Baylor/Auburn u13 @ -115 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -115,
    expectedSize: 2000,
    expectedTeam1: 'Baylor',
    expectedTeam2: 'Auburn',
    expectedLine: 13,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'Q', PeriodNumber: 1 },
    expectedLeague: 'CFB',
    expectedSport: 'Football'
  },
  {
    description: 'YG without explicit league or sport, with period 2h',
    input: 'YG auburn 2h o27.5 @ -110 = 1k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 1000,
    expectedTeam1: 'auburn',
    expectedLine: 27.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 2 }
  },
  {
    description: 'YG with explicit league FCS and spread',
    input: 'YG FCS Marist +6 @ -105 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -105,
    expectedSize: 2000,
    expectedTeam1: 'Marist',
    expectedLine: 6,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CFB',
    expectedSport: 'Football'
  },
  {
    description: 'YG with explicit league CFB and negative spread',
    input: 'YG CFB Georgetown -1 @ +100 = 500',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: 100,
    expectedSize: 500,
    expectedTeam1: 'Georgetown',
    expectedLine: -1,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CFB',
    expectedSport: 'Football'
  },
  {
    description: 'YG with explicit league CFB and positive spread',
    input: 'YG CFB Georgetown +1.5 @ -115 = $500',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -115,
    expectedSize: 500,
    expectedTeam1: 'Georgetown',
    expectedLine: 1.5,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CFB',
    expectedSport: 'Football'
  },
  {
    description: 'YG CFB full game total - Bucknell over (shorthand team notation)',
    input: 'YG CFB Bucknell o55.5 @ -110 = 500',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 500,
    expectedTeam1: 'Bucknell',
    expectedLine: 55.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CFB',
    expectedSport: 'Football'
  },
  {
    description: 'YG CFB full game total - FAU over with k suffix (shorthand team notation)',
    input: 'YG CFB FAU o60.5 @ -110 = 2.5k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 2500,
    expectedTeam1: 'FAU',
    expectedLine: 60.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CFB',
    expectedSport: 'Football'
  },
  {
    description: 'YG CFB full game total - Charlotte under with k suffix (shorthand team notation)',
    input: 'YG CFB charlotte u50 @ -110 = 3k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedSize: 3000,
    expectedTeam1: 'charlotte',
    expectedLine: 50,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CFB',
    expectedSport: 'Football'
  },

  // Case-insensitive league detection
  {
    description: 'YG NBA uppercase league with $k notation',
    input: 'YG NBA spurs o237 @ -111 = $11k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -111,
    expectedSize: 11000,
    expectedTeam1: 'spurs',
    expectedLine: 237,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'NBA',
    expectedSport: 'Basketball'
  },
  {
    description: 'YG nba lowercase league with $k notation',
    input: 'YG nba spurs o237 @ -111 = $11k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -111,
    expectedSize: 11000,
    expectedTeam1: 'spurs',
    expectedLine: 237,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'NBA',
    expectedSport: 'Basketball'
  },
  {
    description: 'YG mLB mixed-case league detection',
    input: 'YG mLB cardinals @ +150 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 150,
    expectedSize: 2000,
    expectedTeam1: 'cardinals',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'MLB',
    expectedSport: 'Baseball',
    expectedTiesLose: false
  },
  {
    description: 'YG Cfb mixed-case league detection',
    input: 'YG Cfb michigan -7 @ -110 = 1.5k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -110,
    expectedSize: 1500,
    expectedTeam1: 'michigan',
    expectedLine: -7,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CFB',
    expectedSport: 'Football'
  },
  {
    description: 'YG Cbk mixed-case league detection',
    input: 'YG Cbk duke o145.5 @ -115 = 3k',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPoints',
    expectedPrice: -115,
    expectedSize: 3000,
    expectedTeam1: 'duke',
    expectedLine: 145.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CBK',
    expectedSport: 'Basketball'
  },
  {
    description: 'YG cbb lowercase CBK league detection',
    input: 'YG cbb duke +5.5 @ +110 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: 110,
    expectedSize: 2000,
    expectedTeam1: 'duke',
    expectedLine: 5.5,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CBK',
    expectedSport: 'Basketball'
  },
  {
    description: 'YG CBB uppercase CBK league detection',
    input: 'YG CBB kentucky @ -120 = 1k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -120,
    expectedSize: 1000,
    expectedTeam1: 'kentucky',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedLeague: 'CBK',
    expectedSport: 'Basketball',
    expectedTiesLose: false
  },

  // Team-glued American prices ("gurdians-128" class): a letter-ending team
  // stem glued to a signed 3+ digit integer is a PRICE; glued small/decimal
  // numbers stay spread lines, and digit-glued forms stay untouched.
  {
    description: 'IW F5 moneyline with price glued to the team name',
    input: 'IW First 5 gurdians-128 ml',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -128,
    expectedTeam1: 'gurdians',
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 },
    expectedTiesLose: false
  },
  {
    description: 'IW moneyline with plus price glued to the team name',
    input: 'IW Yankees+105',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 105,
    expectedTeam1: 'Yankees',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'YG fill with team-glued price and dollar size',
    input: 'YG gurdians-128 = $500',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -128,
    expectedSize: 500,
    expectedTeam1: 'gurdians',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'team-glued spread with standalone price is untouched by the glued-price split',
    input: 'IW Angels+1.5 -125',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -125,
    expectedTeam1: 'Angels',
    expectedLine: 1.5,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'team-glued spread with no price keeps the -110 default (glued decimal is a line, not a price)',
    input: 'IW Angels+1.5',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: -110,
    expectedTeam1: 'Angels',
    expectedLine: 1.5,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'explicit @ price wins over a team-glued number — glued token stays in the team name',
    input: 'YG Guardians-128 @ -115 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -115,
    expectedSize: 2000,
    expectedTeam1: 'Guardians-128',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'k-notation after @ is a size, not a price — the team-glued price still splits',
    input: 'YG Yankees+105 @ 4k',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 105,
    expectedSize: 4000,
    expectedTeam1: 'Yankees',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];
