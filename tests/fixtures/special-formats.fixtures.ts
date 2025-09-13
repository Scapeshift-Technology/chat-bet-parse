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
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
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
  }
];