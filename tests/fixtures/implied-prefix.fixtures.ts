/**
 * Test fixtures for implied-prefix parsing (ParseOptions.impliedPrefix)
 *
 * Chats can designate a sender's unprefixed messages as orders (IW) or fills
 * (YG); the full existing grammar applies as if the prefix were present.
 * Additionally, implied-IW mode accepts one side-first order pattern observed
 * live: "Over 4 first five -105 Red Sox" (side word, line, first-five period
 * phrase, bare signed price, trailing team) — a single-team GAME total, the
 * team identifying the event, matching the existing single-team convention.
 */

import { TestCase } from './types';

export const impliedPrefixTestCases: TestCase[] = [
  // --- Side-first observed pattern (implied IW only) ---
  {
    description: 'implied IW side-first F5 total, whole-number line, bare price',
    input: 'Over 4 first five -105 Red Sox',
    impliedPrefix: 'IW',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -105,
    expectedTeam1: 'Red Sox',
    expectedLine: 4,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'implied IW side-first F5 total, half-point line, "1st 5", plus price',
    input: 'under 4.5 1st 5 +102 Yankees',
    impliedPrefix: 'IW',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: 102,
    expectedTeam1: 'Yankees',
    expectedLine: 4.5,
    expectedIsOver: false,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'implied IW side-first F5 total, "first 5 innings" phrase, mixed case',
    input: 'OVER 3 first 5 innings -110 Guardians',
    impliedPrefix: 'IW',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedTeam1: 'Guardians',
    expectedLine: 3,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },

  // --- Implied IW over the full existing grammar (no new formats) ---
  {
    description: 'implied IW moneyline with rotation number',
    input: '872 Athletics @ +145',
    impliedPrefix: 'IW',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedTeam1: 'Athletics',
    expectedRotationNumber: 872
  },
  {
    description: 'implied IW two-team F5 game total',
    input: 'ATH/SF F5 o4.5 @ -117',
    impliedPrefix: 'IW',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -117,
    expectedTeam1: 'ATH',
    expectedTeam2: 'SF',
    expectedLine: 4.5,
    expectedIsOver: true,
    expectedPeriod: { PeriodTypeCode: 'H', PeriodNumber: 1 }
  },
  {
    description: 'implied IW team total',
    input: 'LAA TT o3.5 @ -115',
    impliedPrefix: 'IW',
    expectedChatType: 'order',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true
  },
  {
    description: 'implied IW spread with rotation number',
    input: '870 Mariners -1.5 +135',
    impliedPrefix: 'IW',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantLine',
    expectedPrice: 135,
    expectedTeam1: 'Mariners',
    expectedLine: -1.5,
    expectedRotationNumber: 870
  },

  // --- Implied YG (fill default) over the full existing grammar ---
  {
    description: 'implied YG team total fill with decimal thousands size',
    input: 'LAA TT o3.5 @ -115.5 = 8.925',
    impliedPrefix: 'YG',
    expectedChatType: 'fill',
    expectedContractType: 'TotalPointsContestant',
    expectedPrice: -115.5,
    expectedSize: 8925,
    expectedTeam1: 'LAA',
    expectedLine: 3.5,
    expectedIsOver: true
  },

  // --- Explicit prefixes always win over the implied one ---
  {
    description: 'explicit YG wins over implied IW',
    input: 'YG 872 Athletics @ 4k',
    impliedPrefix: 'IW',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: -110,
    expectedSize: 4000,
    expectedTeam1: 'Athletics',
    expectedRotationNumber: 872
  },
  {
    description: 'explicit IW wins over implied YG',
    input: 'IW 872 Athletics @ +145',
    impliedPrefix: 'YG',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 145,
    expectedTeam1: 'Athletics',
    expectedRotationNumber: 872
  }
];
