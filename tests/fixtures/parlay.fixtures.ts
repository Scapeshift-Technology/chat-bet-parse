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
    expectedToWin: 320, // Lakers: 2.20, Warriors: 1.909090909, Parlay: 4.20, ToWin: $100 × 3.20 = $320.00
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
    expectedToWin: 761, // Lakers: 2.20, Warriors: 1.909090909, Celtics: 2.05, Parlay: 8.61, ToWin: $100 × 7.61 = $761.00
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
    expectedToWin: 770, // Lakers: 2.00, Warriors: 1.909090909, Celtics: 2.20, Nets: 1.952380952, Parlay: 16.40, ToWin: $50 × 15.40 = $770.00
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
  {
    description: 'YGP with dollar+k-notation size ($11k)',
    input: 'YGP spurs o237 @ -111 & magic ml @ -114 = $11k',
    expectedChatType: 'fill',
    expectedRisk: 11000,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'TotalPoints', price: -111, teams: ['spurs'], line: 237, isOver: true },
      { contractType: 'HandicapContestantML', price: -114, team: 'magic' }
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
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers', eventDate: new Date(Date.UTC(2025, 4, 14)) },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors', eventDate: new Date(Date.UTC(2025, 4, 15)) }
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
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers', eventDate: new Date(Date.UTC(2025, 4, 14)) },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors', eventDate: new Date(Date.UTC(2025, 4, 15)) }
    ],
    referenceDate: new Date(2024, 11, 1)
  },
  {
    description: 'YGP with leg-level dates (full year format)',
    input: 'YGP CFB 11/29/2025 Villanova u54.5 @ -128 & 11/28/2025 Illinois st +3.5 @ -133 = $5k tw $15550',
    expectedChatType: 'fill',
    expectedRisk: 5000,
    expectedToWin: 15550,
    expectedUseFair: false,
    expectedLegs: [
      { contractType: 'TotalPoints', price: -128, teams: ['Villanova'], line: 54.5, isOver: false, league: 'CFB', sport: 'Football', eventDate: new Date(Date.UTC(2025, 10, 29)) },
      { contractType: 'HandicapContestantLine', price: -133, team: 'Illinois st', line: 3.5, eventDate: new Date(Date.UTC(2025, 10, 28)) }
    ]
  },
  {
    description: 'YGP with comma-thousands syntax in to-win',
    input: 'YGP 11/29/2025 Villanova u54.5 @ -128 &  Illinois st +3.5 @ -133= $5k tw $15,550',
    expectedChatType: 'fill',
    expectedRisk: 5000,
    expectedToWin: 15550,
    expectedUseFair: false,
    expectedLegs: [
      { contractType: 'TotalPoints', price: -128, teams: ['Villanova'], line: 54.5, isOver: false, eventDate: new Date(Date.UTC(2025, 10, 29)) },
      { contractType: 'HandicapContestantLine', price: -133, team: 'Illinois st', line: 3.5 }
    ]
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
        eventDate: new Date(Date.UTC(2025, 4, 14))
      },
      {
        contractType: 'HandicapContestantML',
        price: 120,
        team: 'Lakers',
        rotationNumber: 701,
        eventDate: new Date(Date.UTC(2025, 4, 15))
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
        eventDate: new Date(Date.UTC(2025, 4, 14))
      },
      {
        contractType: 'HandicapContestantML',
        price: 120,
        team: 'Lakers',
        rotationNumber: 701,
        eventDate: new Date(Date.UTC(2025, 4, 15))
      },
      {
        contractType: 'HandicapContestantML',
        price: -110,
        team: 'Warriors',
        eventDate: new Date(Date.UTC(2025, 4, 16))
      }
    ],
    referenceDate: new Date(2024, 11, 1)
  },

  // ==============================================================================
  // PARLAY WITH WRITEIN LEGS
  // ==============================================================================
  {
    description: 'YGP with writein leg and regular leg',
    input: 'YGP writein 12/25/2024 Christmas Day game goes to overtime @ +200 & Lakers @ +120 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'Writein',
        price: 200,
        description: 'Christmas Day game goes to overtime',
        writeinEventDate: new Date(Date.UTC(2024, 11, 25))
      },
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' }
    ]
  },
  {
    description: 'YGP with multiple writein legs',
    input: 'YGP writein 12/25/2024 Event A happens @ +150 & writein 12/26/2024 Event B happens @ +200 & Warriors @ -110 = $100',
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'Writein',
        price: 150,
        description: 'Event A happens',
        writeinEventDate: new Date(Date.UTC(2024, 11, 25))
      },
      {
        contractType: 'Writein',
        price: 200,
        description: 'Event B happens',
        writeinEventDate: new Date(Date.UTC(2024, 11, 26))
      },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'IWP order with writein leg (no size)',
    input: 'IWP writein 12/25/2024 Trump wins presidency @ +150 & Warriors @ -110',
    expectedChatType: 'order',
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'Writein',
        price: 150,
        description: 'Trump wins presidency',
        writeinEventDate: new Date(Date.UTC(2024, 11, 25))
      },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
  {
    description: 'YGP with writein and multiple regular legs',
    input: 'YGP writein 1/1/2025 New Year special event @ +300 & Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $50',
    expectedChatType: 'fill',
    expectedRisk: 50,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'Writein',
        price: 300,
        description: 'New Year special event',
        writeinEventDate: new Date(Date.UTC(2025, 0, 1))
      },
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' }
    ]
  },
  {
    description: 'YGP multiline with writein leg',
    input: `YGP
writein 12/25/2024 Special event occurs @ +200
Lakers @ +120
Warriors @ -110
= $100`,
    expectedChatType: 'fill',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'Writein',
        price: 200,
        description: 'Special event occurs',
        writeinEventDate: new Date(Date.UTC(2024, 11, 25))
      },
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' }
    ]
  },
];
