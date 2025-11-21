/**
 * Test fixtures for writein bets
 * Tests custom betting events with dates and descriptions
 */

import { TestCase } from './types';

export const writeinTestCases: TestCase[] = [
  // From parsers-test-cases.ts
  {
    description: 'IW Writein basic with full date',
    input: 'IW writein 2024/11/5 Trump to win presidency @ +150',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Trump to win presidency',
  },
  {
    description: 'IW Writein with date and size (Stock market)',
    input: 'IW writein 2024-11-05 Stock market to close above 40000 @ -120 = 5.0',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: -120,
    expectedSize: 5.0,
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Stock market to close above 40000',
  },
  {
    description: 'IW Writein basic with full date (duplicate - different format)',
    input: 'IW writein 2024/11/5 Stock market to close above 40000 @ -120 = 5.0',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: -120,
    expectedSize: 5,
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Stock market to close above 40000',
  },
  
  {
    description: 'IW Writein with MM/DD/YYYY format',
    input: 'IW writein 11/05/2024 Bitcoin to reach 100k by end of year @ +200',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 200,
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Bitcoin to reach 100k by end of year',
  },
  {
    description: 'IW Writein with MM/DD format (no year)',
    input: 'IW writein 12/25 Christmas Day snow in NYC @ +300 = 2.5',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 300,
    expectedSize: 2.5,
    expectedEventDate: new Date(Date.UTC(new Date().getUTCFullYear(), 11, 25)), // Current year, December 25
    expectedDescription: 'Christmas Day snow in NYC',
  },
  {
    description: 'IWW shorthand for writein order',
    input: 'IWW 2024/11/5 Trump to win presidency @ +150',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Trump to win presidency',
  },

  // Fills (YG)
  {
    description: 'YG Writein basic with decimal thousands',
    input: 'YG writein 2024/11/5 Trump to win presidency @ +150 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 3000, // 3.0 as decimal thousands for fills
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Trump to win presidency',
  },
  {
    description: 'YG Writein with k-notation',
    input: 'YG writein 2024-11-05 Stock market to close above 40000 @ -120 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: -120,
    expectedSize: 2000,
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Stock market to close above 40000',
  },
  {
    description: 'YG Writein with dollar amount',
    input: 'YG writein 11/05/2024 Bitcoin to reach 100k by end of year @ +200 = $500',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 200,
    expectedSize: 500, // Dollar amounts are literal
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Bitcoin to reach 100k by end of year',
  },
  {
    description: 'YG Writein with dollar+k-notation ($11k)',
    input: 'YG writein 11/05/2024 Bitcoin to reach 100k by end of year @ +200 = $11k',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 200,
    expectedSize: 11000,
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Bitcoin to reach 100k by end of year',
  },
  {
    description: 'YG Writein with MM-DD format and default price',
    input: 'YG writein 12-25 Christmas Day snow in NYC = 1.5',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: -110, // Default price
    expectedSize: 1500, // 1.5 as decimal thousands
    expectedEventDate: new Date(Date.UTC(new Date().getUTCFullYear(), 11, 25)),
    expectedDescription: 'Christmas Day snow in NYC',
  },
  {
    description: 'YGW shorthand for writein fill',
    input: 'YGW 2024/11/5 Trump to win presidency @ +150 = 3.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 3000,
    expectedEventDate: new Date(Date.UTC(2024, 10, 5)),
    expectedDescription: 'Trump to win presidency',
  },

  // ==============================================================================
  // WRITEIN WITH LEAGUE SUPPORT (Positional)
  // ==============================================================================
  {
    description: 'YGW with league before date',
    input: 'YGW MLB 2025-05-14 Cardinals win in extra innings @ +150 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 1000,
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedDescription: 'Cardinals win in extra innings',
    expectedSport: 'Baseball',
    expectedLeague: 'MLB'
  },
  {
    description: 'YGW with league after date',
    input: 'YGW 2025-05-14 MLB Cardinals win in extra innings @ +150 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 1000,
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedDescription: 'Cardinals win in extra innings',
    expectedSport: 'Baseball',
    expectedLeague: 'MLB'
  },
  {
    description: 'IWW with league before date',
    input: 'IWW NBA 12/25 Lakers score 120+ points @ +200',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 200,
    expectedEventDate: new Date(Date.UTC(new Date().getUTCFullYear(), 11, 25)),
    expectedDescription: 'Lakers score 120+ points',
    expectedSport: 'Basketball',
    expectedLeague: 'NBA'
  },
  {
    description: 'IWW with league after date',
    input: 'IWW 12/25 NBA Lakers score 120+ points @ +200',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 200,
    expectedEventDate: new Date(Date.UTC(new Date().getUTCFullYear(), 11, 25)),
    expectedDescription: 'Lakers score 120+ points',
    expectedSport: 'Basketball',
    expectedLeague: 'NBA'
  },

  // ==============================================================================
  // WRITEIN WITH LEAGUE SUPPORT (Keyword)
  // ==============================================================================
  {
    description: 'YGW with league keyword',
    input: 'YGW league:MLB 2025-05-14 Cardinals win @ +150 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 1000,
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedDescription: 'Cardinals win',
    expectedSport: 'Baseball',
    expectedLeague: 'MLB'
  },
  {
    description: 'YGW with date and league keywords',
    input: 'YGW date:5/14/25 league:MLB Cardinals win @ +150 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 1000,
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedDescription: 'Cardinals win',
    expectedSport: 'Baseball',
    expectedLeague: 'MLB'
  },
  {
    description: 'YGW with league keyword after date keyword',
    input: 'YGW league:MLB date:5/14/25 Cardinals win @ +150 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 1000,
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedDescription: 'Cardinals win',
    expectedSport: 'Baseball',
    expectedLeague: 'MLB'
  },

  // ==============================================================================
  // WRITEIN WITH FREE BET
  // ==============================================================================
  {
    description: 'YGW with freebet flag',
    input: 'YGW freebet:true 5/14/25 MLB Cardinals win @ +150 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'Writein',
    expectedPrice: 150,
    expectedSize: 1000,
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedDescription: 'Cardinals win',
    expectedSport: 'Baseball',
    expectedLeague: 'MLB',
    expectedFreeBet: true
  },
  {
    description: 'IWW with league and freebet',
    input: 'IWW 12/25 freebet:true Lakers score 120+ points league:NBA @ +200',
    expectedChatType: 'order',
    expectedContractType: 'Writein',
    expectedPrice: 200,
    expectedEventDate: new Date(Date.UTC(new Date().getUTCFullYear(), 11, 25)),
    expectedDescription: 'Lakers score 120+ points',
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedFreeBet: true
  }
];