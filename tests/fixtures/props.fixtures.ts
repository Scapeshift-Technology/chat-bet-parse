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
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
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
    expectedTeam1: 'Player456',
    expectedLine: 12.5,
    expectedIsOver: false,
    expectedProp: 'Rebounds'
  },

  // Fills (YG)
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
    expectedProp: 'PassingYards',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
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
    description: 'YG Team passing yards prop (non-individual contestant)',
    input: 'YG Team123 passing yards o250.5 @ -115 = 1.5',
    expectedChatType: 'fill',
    expectedContractType: 'PropOU',
    expectedPrice: -115,
    expectedSize: 1500,
    expectedTeam1: 'Team123',
    expectedLine: 250.5,
    expectedIsOver: true,
    expectedProp: 'PassingYards',
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  }
];