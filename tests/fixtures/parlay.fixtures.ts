/**
 * Test fixtures for parlay bets (YGP/IWP)
 * Tests multi-leg parlay syntax with ampersand and multiline formats
 */

import { ParlayTestCase } from './types';

export const parlayTestCases: ParlayTestCase[] = [
  // ==============================================================================
  // BASIC PARLAY - AMPERSAND SEPARATOR
  // ==============================================================================
  {
    description: 'YGP 2-leg with fair odds',
    input: 'YGP Lakers @ +120 & Warriors @ -110 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'YGP 3-leg with fair odds',
    input: 'YGP Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' }
    ]
  },
  {
    description: 'YGP 4-leg with fair odds',
    input: 'YGP Lakers @ +100 & Warriors @ -110 & Celtics @ +120 & Nets @ -105 = $50',
    expectedChatType: 'fill',
    expectedRisk: 50,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 100, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 120, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: -105, team: 'Nets' }
    ]
  },
  {
    description: 'IWP order (no size)',
    input: 'IWP Lakers @ +120 & Warriors @ -110',
    expectedChatType: 'order',
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },

  // ==============================================================================
  // PARLAY WITH TO-WIN OVERRIDE
  // ==============================================================================
  {
    description: 'YGP with explicit to-win',
    input: 'YGP Lakers @ +120 & Warriors @ -110 = $100 tw $500',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedToWin: 500,
    expectedUseFair: false,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'YGP 3-leg with to-win',
    input: 'YGP Lakers @ +100 & Warriors @ -110 & Celtics @ +120 = $100 tw $750',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedToWin: 750,
    expectedUseFair: false,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 100, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 120, team: 'Celtics' }
    ]
  },
  {
    description: 'YGP with decimal thousands size',
    input: 'YGP Lakers @ +120 & Warriors @ -110 = 2.5',
    expectedChatType: 'fill',
    expectedRisk: 2500,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'YGP with k-notation size',
    input: 'YGP Lakers @ +120 & Warriors @ -110 = 3k',
    expectedChatType: 'fill',
    expectedRisk: 3000,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'YGP with decimal and k-notation to-win',
    input: 'YGP Lakers @ +120 & Warriors @ -110 = 2.5 tw 3k',
    expectedChatType: 'fill',
    expectedRisk: 2500,
    expectedToWin: 3000,
    expectedUseFair: false,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },

  // ==============================================================================
  // PARLAY WITH OPTIONAL FLAGS
  // ==============================================================================
  {
    description: 'YGP with pusheslose',
    input: 'YGP pusheslose:true Lakers @ +120 & Warriors @ -110 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedPushesLose: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'YGP with tieslose (synonym)',
    input: 'YGP tieslose:true Lakers @ +120 & Warriors @ -110 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedPushesLose: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'YGP with freebet',
    input: 'YGP freebet:true Lakers @ +120 & Warriors @ -110 = $50',
    expectedChatType: 'fill',
    expectedRisk: 50,
    expectedUseFair: true,
    expectedFreeBet: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'YGP with multiple flags',
    input: 'YGP pusheslose:true freebet:true Lakers @ +120 & Warriors @ -110 = $50',
    expectedChatType: 'fill',
    expectedRisk: 50,
    expectedUseFair: true,
    expectedPushesLose: true,
    expectedFreeBet: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },

  // ==============================================================================
  // PARLAY WITH LEG-LEVEL PROPERTIES
  // ==============================================================================
  {
    description: 'YGP with rotation numbers',
    input: 'YGP 872 Cardinals/Cubs o8.5 @ -110 & 701 Lakers @ +120 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'TotalPoints',
        price: -110,
        teams: ['Cardinals', 'Cubs'],
        line: 8.5,
        isOver: true,
        rotationNumber: 872
      },
      {
        contractType: 'HandicapContestantML',
        price: 120,
        team: 'Lakers',
        rotationNumber: 701
      }
    ]
  },
  {
    description: 'YGP with game numbers',
    input: 'YGP Cardinals/Cubs G1 o8.5 @ -110 & Lakers @ +120 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'TotalPoints',
        price: -110,
        teams: ['Cardinals', 'Cubs'],
        line: 8.5,
        isOver: true,
        daySequence: 1
      },
      {
        contractType: 'HandicapContestantML',
        price: 120,
        team: 'Lakers'
      }
    ]
  },
  {
    description: 'YGP with leg-level dates (positional)',
    input: 'YGP 5/14 Lakers @ +120 & 5/15 Warriors @ -110 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers', eventDate: new Date(2025, 4, 14) },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors', eventDate: new Date(2025, 4, 15) }
    ],
    referenceDate: new Date(2024, 11, 1)
  },
  {
    description: 'YGP with leg-level dates (keyword)',
    input: 'YGP date:5/14 Lakers @ +120 & date:5/15 Warriors @ -110 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers', eventDate: new Date(2025, 4, 14) },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors', eventDate: new Date(2025, 4, 15) }
    ],
    referenceDate: new Date(2024, 11, 1)
  },
  {
    description: 'YGP with leg-level leagues',
    input: 'YGP MLB Cardinals @ +150 & NBA Lakers @ +120 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 150, team: 'Cardinals', league: 'MLB', sport: 'Baseball' },
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers', league: 'NBA', sport: 'Basketball' }
    ]
  },
  {
    description: 'YGP mixed leg properties',
    input: 'YGP MLB 5/14 Cardinals @ +150 & 701 date:5/15 Lakers @ +120 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'HandicapContestantML',
        price: 150,
        team: 'Cardinals',
        league: 'MLB',
        sport: 'Baseball',
        eventDate: new Date(2025, 4, 14)
      },
      {
        contractType: 'HandicapContestantML',
        price: 120,
        team: 'Lakers',
        rotationNumber: 701,
        eventDate: new Date(2025, 4, 15)
      }
    ],
    referenceDate: new Date(2024, 11, 1)
  },

  // ==============================================================================
  // PARLAY WITH PERIOD SPECIFICATIONS
  // ==============================================================================
  {
    description: 'YGP with F5 periods',
    input: 'YGP Cardinals/Cubs F5 o4.5 @ -110 & Dodgers F5 @ +120 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'TotalPoints',
        price: -110,
        teams: ['Cardinals', 'Cubs'],
        line: 4.5,
        isOver: true,
        period: { PeriodTypeCode: 'H', PeriodNumber: 1 }
      },
      {
        contractType: 'HandicapContestantML',
        price: 120,
        team: 'Dodgers',
        period: { PeriodTypeCode: 'H', PeriodNumber: 1 }
      }
    ]
  },
  {
    description: 'YGP with mixed periods',
    input: 'YGP Cubs 1st inning @ -110 & Lakers 1H @ +120 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'HandicapContestantML',
        price: -110,
        teams: ['Cubs'],
        period: { PeriodTypeCode: 'I', PeriodNumber: 1 }
      },
      {
        contractType: 'HandicapContestantML',
        price: 120,
        team: 'Lakers',
        period: { PeriodTypeCode: 'H', PeriodNumber: 1 }
      }
    ]
  },

  // ==============================================================================
  // MULTILINE PARLAY FORMAT
  // ==============================================================================
  {
    description: 'YGP multiline 2-leg',
    input: `YGP
Lakers @ +120
Warriors @ -110
= $100`,
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'YGP multiline with flags',
    input: `YGP pusheslose:true freebet:true
Lakers @ +120
Warriors @ -110
Celtics @ +105
= $100 tw $800`,
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedToWin: 800,
    expectedUseFair: false,
    expectedPushesLose: true,
    expectedFreeBet: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' }
    ]
  },
  {
    description: 'YGP multiline with leg properties',
    input: `YGP
5/14 MLB Cardinals @ +150
date:5/15 701 Lakers @ +120
5/16 Warriors @ -110
= $100`,
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'HandicapContestantML',
        price: 150,
        team: 'Cardinals',
        league: 'MLB',
        sport: 'Baseball',
        eventDate: new Date(2025, 4, 14)
      },
      {
        contractType: 'HandicapContestantML',
        price: 120,
        team: 'Lakers',
        rotationNumber: 701,
        eventDate: new Date(2025, 4, 15)
      },
      {
        contractType: 'HandicapContestantML',
        price: -110,
        team: 'Warriors',
        eventDate: new Date(2025, 4, 16)
      }
    ],
    referenceDate: new Date(2024, 11, 1)
  },
];
