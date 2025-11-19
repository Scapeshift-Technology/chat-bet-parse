/**
 * Test fixtures for round robin bets (YGRR/IWRR)
 * Tests nCr notation for specifying parlay combinations
 */

import { RoundRobinTestCase } from './types';

export const roundRobinTestCases: RoundRobinTestCase[] = [
  // ==============================================================================
  // BASIC ROUND ROBIN - EXACTLY N LEGS
  // ==============================================================================
  {
    description: 'YGRR 4c2 (four teams, 2-leg parlays) with per-selection risk',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },
  {
    description: 'YGRR 4c2 with total risk',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $600 total',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'total',
    expectedRisk: 600,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },
  {
    description: 'YGRR 5c3 (five teams, 3-leg parlays)',
    input: 'YGRR 5c3 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $50 per',
    expectedChatType: 'fill',
    expectedParlaySize: 3,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 50,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' },
      { contractType: 'HandicapContestantML', price: -105, team: 'Heat' }
    ]
  },
  {
    description: 'IWRR order (no size)',
    input: 'IWRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115',
    expectedChatType: 'order',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection', // Default when not specified
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },

  // ==============================================================================
  // ROUND ROBIN - AT MOST N LEGS (MINUS SUFFIX)
  // ==============================================================================
  {
    description: 'YGRR 4c3- (at most 3 legs: 2s and 3s)',
    input: 'YGRR 4c3- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 3,
    expectedIsAtMost: true,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },
  {
    description: 'YGRR 5c4- (at most 4 legs: 2s, 3s, and 4s)',
    input: 'YGRR 5c4- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $50 total',
    expectedChatType: 'fill',
    expectedParlaySize: 4,
    expectedIsAtMost: true,
    expectedRiskType: 'total',
    expectedRisk: 50,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' },
      { contractType: 'HandicapContestantML', price: -105, team: 'Heat' }
    ]
  },
  {
    description: 'YGRR 6c5- (at most 5 legs: all 2s through 5s)',
    input: 'YGRR 6c5- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 & Bucks @ +110 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 5,
    expectedIsAtMost: true,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' },
      { contractType: 'HandicapContestantML', price: -105, team: 'Heat' },
      { contractType: 'HandicapContestantML', price: 110, team: 'Bucks' }
    ]
  },

  // ==============================================================================
  // ROUND ROBIN WITH TO-WIN OVERRIDE
  // ==============================================================================
  {
    description: 'YGRR with explicit to-win',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per tw $800',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedToWin: 800,
    expectedUseFair: false,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },
  {
    description: 'YGRR at-most with to-win',
    input: 'YGRR 5c3- Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $50 total tw $1200',
    expectedChatType: 'fill',
    expectedParlaySize: 3,
    expectedIsAtMost: true,
    expectedRiskType: 'total',
    expectedRisk: 50,
    expectedToWin: 1200,
    expectedUseFair: false,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' },
      { contractType: 'HandicapContestantML', price: -105, team: 'Heat' }
    ]
  },
  {
    description: 'YGRR with dollar+k-notation size ($11k per)',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $11k per',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 11000,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },

  // ==============================================================================
  // ROUND ROBIN WITH OPTIONAL FLAGS
  // ==============================================================================
  {
    description: 'YGRR with pusheslose',
    input: 'YGRR pusheslose:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedPushesLose: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },
  {
    description: 'YGRR with freebet',
    input: 'YGRR freebet:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedFreeBet: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },
  {
    description: 'YGRR with multiple flags',
    input: 'YGRR pusheslose:true freebet:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedPushesLose: true,
    expectedFreeBet: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },

  // ==============================================================================
  // ROUND ROBIN WITH LEG-LEVEL PROPERTIES
  // ==============================================================================
  {
    description: 'YGRR with mixed contract types',
    input: 'YGRR 4c2 872 Cardinals/Cubs o8.5 @ -110 & 701 Lakers @ +120 & Dodgers @ -105 & Celtics @ +110 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'TotalPoints', price: -110, teams: ['Cardinals', 'Cubs'], line: 8.5, isOver: true },
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -105, team: 'Dodgers' },
      { contractType: 'HandicapContestantML', price: 110, team: 'Celtics' }
    ]
  },
  {
    description: 'YGRR with leg-level leagues',
    input: 'YGRR 4c2 MLB Cardinals @ +150 & NBA Lakers @ +120 & NHL Rangers @ -110 & NFL Chiefs @ +105 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 150, team: 'Cardinals' },
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Rangers' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Chiefs' }
    ]
  },

  // ==============================================================================
  // MULTILINE ROUND ROBIN FORMAT
  // ==============================================================================
  {
    description: 'YGRR multiline format',
    input: `YGRR 4c2
Lakers @ +120
Warriors @ -110
Celtics @ +105
Nets @ +115
= $100 per`,
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' }
    ]
  },
  {
    description: 'YGRR multiline with flags and at-most',
    input: `YGRR pusheslose:true freebet:true 5c3-
Lakers @ +120
Warriors @ -110
Celtics @ +105
Nets @ +115
Heat @ -105
= $50 total tw $1000`,
    expectedChatType: 'fill',
    expectedParlaySize: 3,
    expectedIsAtMost: true,
    expectedRiskType: 'total',
    expectedRisk: 50,
    expectedToWin: 1000,
    expectedUseFair: false,
    expectedPushesLose: true,
    expectedFreeBet: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' },
      { contractType: 'HandicapContestantML', price: 115, team: 'Nets' },
      { contractType: 'HandicapContestantML', price: -105, team: 'Heat' }
    ]
  },

  // ==============================================================================
  // VALIDATION: nCr MATCHES ACTUAL LEG COUNT
  // ==============================================================================
  {
    description: 'YGRR 3c2 with exactly 3 legs',
    input: 'YGRR 3c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' }
    ]
  },

  // ==============================================================================
  // ROUND ROBIN WITH WRITEIN LEGS
  // ==============================================================================
  {
    description: 'YGRR with writein leg',
    input: 'YGRR 4c2 writein 12/25/2024 Special holiday event @ +200 & Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100 per',
    expectedChatType: 'fill',
    expectedParlaySize: 2,
    expectedIsAtMost: false,
    expectedRiskType: 'perSelection',
    expectedRisk: 100,
    expectedUseFair: true,
    expectedLegs: [
      {
        contractType: 'Writein',
        price: 200,
        description: 'Special holiday event',
        writeinEventDate: new Date(2024, 11, 25)
      },
      { contractType: 'HandicapContestantML', price: 120, team: 'Lakers' },
      { contractType: 'HandicapContestantML', price: -110, team: 'Warriors' },
      { contractType: 'HandicapContestantML', price: 105, team: 'Celtics' }
    ]
  },
];
