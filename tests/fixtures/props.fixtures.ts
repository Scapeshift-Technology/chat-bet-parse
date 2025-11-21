/**
 * Test fixtures for proposition bets
 * Tests both Yes/No props and Over/Under props
 */

import { TestCase } from './types';

export const propsYNTestCases: TestCase[] = [
  // Orders (IW)
  {
    description: 'IW Last team to score prop with size',
    input: 'IW CHC last team to score @ -139 = 0.50',
    expectedChatType: 'order',
    expectedContractType: 'PropYN',
    expectedPrice: -139,
    expectedSize: 0.50,
    expectedTeam1: 'CHC',
    expectedProp: 'LastToScore',
    expectedIsYes: true
  },
  {
    description: 'IW "to score first" phrase',
    input: 'IW CIN to score first @ -115',
    expectedChatType: 'order',
    expectedContractType: 'PropYN',
    expectedPrice: -115,
    expectedTeam1: 'CIN',
    expectedProp: 'FirstToScore',
    expectedIsYes: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'IW "first to score" phrase',
    input: 'IW CIN first to score @ -115',
    expectedChatType: 'order',
    expectedContractType: 'PropYN',
    expectedPrice: -115,
    expectedTeam1: 'CIN',
    expectedProp: 'FirstToScore',
    expectedIsYes: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'IW "to score last" phrase',
    input: 'IW CIN to score last @ -115',
    expectedChatType: 'order',
    expectedContractType: 'PropYN',
    expectedPrice: -115,
    expectedTeam1: 'CIN',
    expectedProp: 'LastToScore',
    expectedIsYes: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'IW "last to score" phrase',
    input: 'IW CIN last to score @ -115',
    expectedChatType: 'order',
    expectedContractType: 'PropYN',
    expectedPrice: -115,
    expectedTeam1: 'CIN',
    expectedProp: 'LastToScore',
    expectedIsYes: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedContestantType: 'TeamLeague'
  },
  {
    description: 'IW Player anytime touchdown (football)',
    input: 'IW Hill anytime td @ +120',
    expectedChatType: 'order',
    expectedContractType: 'PropYN',
    expectedPrice: 120,
    expectedPlayer: 'Hill',
    expectedTeam1: undefined, // Individual props should NOT use Team1
    expectedProp: 'AnytimeTD',
    expectedIsYes: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedContestantType: 'Individual'
  },

  // Fills (YG)
  {
    description: 'YG Last team to score with decimal thousands',
    input: 'YG CHC last team to score @ -139 = 0.35',
    expectedChatType: 'fill',
    expectedContractType: 'PropYN',
    expectedPrice: -139,
    expectedSize: 350,
    expectedTeam1: 'CHC',
    expectedProp: 'LastToScore',
    expectedIsYes: true
  }
];

export const propsOUTestCases: TestCase[] = [
  // Orders (IW)
  {
    description: 'IW Player rebounds under prop with size',
    input: 'IW Player456 rebounds u12.5 @ -110 = 2.0',
    expectedChatType: 'order',
    expectedContractType: 'PropOU',
    expectedPrice: -110,
    expectedSize: 2.0,
    expectedPlayer: 'Player456',
    expectedTeam1: undefined, // Individual props should NOT use Team1
    expectedLine: 12.5,
    expectedIsOver: false,
    expectedProp: 'Rebounds',
    expectedContestantType: 'Individual'
  },
  {
    description: 'IW Player points over (basketball)',
    input: 'IW LeBron points o25.5 @ -115',
    expectedChatType: 'order',
    expectedContractType: 'PropOU',
    expectedPrice: -115,
    expectedPlayer: 'LeBron',
    expectedTeam1: undefined,
    expectedLine: 25.5,
    expectedIsOver: true,
    expectedProp: 'Points',
    expectedContestantType: 'Individual'
  },
  {
    description: 'IW Team passing yards over (football)',
    input: 'IW Chiefs team passing yards o275.5 @ -110',
    expectedChatType: 'order',
    expectedContractType: 'PropOU',
    expectedPrice: -110,
    expectedTeam1: 'Chiefs',
    expectedLine: 275.5,
    expectedIsOver: true,
    expectedProp: 'PassingYards',
    expectedContestantType: 'TeamLeague'
  },

  // Fills (YG)
  {
    description: 'YG Player passing yards over with decimal thousands',
    input: 'YG Player123 passing yards o250.5 @ -115 = 1.5',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: -115,
    expectedSize: 1500,
    expectedPlayer: 'Player123',
    expectedTeam1: undefined,
    expectedLine: 250.5,
    expectedIsOver: true,
    expectedProp: 'PassingYards',
    expectedContestantType: 'Individual',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'YG Player RBI under with k-notation',
    input: 'YG Player456 rbi u1.5 @ -105 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: -105,
    expectedSize: 2000,
    expectedPlayer: 'Player456',
    expectedTeam1: undefined,
    expectedLine: 1.5,
    expectedIsOver: false,
    expectedProp: 'RBI',
    expectedContestantType: 'Individual'
  },
  {
    description: 'YG Team passing yards prop (non-individual contestant)',
    input: 'YG Team123 team passing yards o250.5 @ -115 = 1.5',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: -115,
    expectedSize: 1500,
    expectedTeam1: 'Team123',
    expectedLine: 250.5,
    expectedIsOver: true,
    expectedProp: 'PassingYards',
    expectedContestantType: 'TeamLeague',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'YG NBA player points over WITHOUT team affiliation',
    input: 'YG NBA Cooper Flagg pts o16.5 @ +100 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: 100,
    expectedSize: 2000,
    expectedPlayer: 'Cooper Flagg',
    expectedPlayerTeam: undefined,
    expectedTeam1: undefined,
    expectedLine: 16.5,
    expectedIsOver: true,
    expectedProp: 'Points',
    expectedContestantType: 'Individual',
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'YG NBA player points over WITH team affiliation',
    input: 'YG NBA Cooper Flagg (DAL) pts o16.5 @ +100 = 2k',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: 100,
    expectedSize: 2000,
    expectedPlayer: 'Cooper Flagg',
    expectedPlayerTeam: 'DAL',
    expectedTeam1: undefined,
    expectedLine: 16.5,
    expectedIsOver: true,
    expectedProp: 'Points',
    expectedContestantType: 'Individual',
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];