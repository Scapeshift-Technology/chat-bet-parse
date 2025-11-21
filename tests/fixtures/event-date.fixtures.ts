/**
 * Test fixtures for event date parsing on straight bets
 * Tests positional and keyword-based date specifications
 */

import { TestCase } from './types';

export const eventDateTestCases: TestCase[] = [
  // ==============================================================================
  // POSITIONAL DATE SYNTAX (YG/IW)
  // ==============================================================================
  {
    description: 'YG with date before league',
    input: 'YG 7/1/25 NBA Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)), // July 1, 2025
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with date after league',
    input: 'YG NBA 7/1/25 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with date only (no league)',
    input: 'YG 5/14/25 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)), // May 14, 2025
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'IW with date before rotation number',
    input: 'IW 7/1/25 872 Cardinals/Cubs o8.5 @ -110',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedRotationNumber: 872,
    expectedTeam1: 'Cardinals',
    expectedTeam2: 'Cubs',
    expectedLine: 8.5,
    expectedIsOver: true,
    expectedSport: 'Baseball',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 }
  },
  {
    description: 'IW with date after league',
    input: 'IW MLB 5/14/25 Cardinals @ +150',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 150,
    expectedTeam1: 'Cardinals',
    expectedSport: 'Baseball',
    expectedLeague: 'MLB',
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },

  // ==============================================================================
  // KEYWORD DATE SYNTAX (YG/IW)
  // ==============================================================================
  {
    description: 'YG with date keyword immediately after prefix',
    input: 'YG date:7/1/25 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with date keyword and league',
    input: 'YG date:5/14/25 MLB Cardinals @ +150 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 150,
    expectedSize: 1000,
    expectedTeam1: 'Cardinals',
    expectedSport: 'Baseball',
    expectedLeague: 'MLB',
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with date keyword after league',
    input: 'YG NBA date:7/1/25 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedSport: 'Basketball',
    expectedLeague: 'NBA',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with date keyword just before @ sign',
    input: 'YG Lakers date:5/14/25 @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'IW with date keyword',
    input: 'IW date:5/14 Cardinals/Cubs o8.5 @ -110',
    expectedChatType: 'order',
    expectedContractType: 'TotalPoints',
    expectedPrice: -110,
    expectedTeam1: 'Cardinals',
    expectedTeam2: 'Cubs',
    expectedLine: 8.5,
    expectedIsOver: true,
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)), // Smart year inference - May 14 is in past relative to reference date
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    referenceDate: new Date(2024, 11, 1) // December 1, 2024
  },

  // ==============================================================================
  // DATE FORMAT VARIATIONS
  // ==============================================================================
  {
    description: 'YG with YYYY-MM-DD format',
    input: 'YG 2025-07-01 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with YYYY/MM/DD format',
    input: 'YG 2025/07/01 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with MM/DD/YYYY format',
    input: 'YG 07/01/2025 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with MM-DD-YYYY format',
    input: 'YG 07-01-2025 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)),
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with MM/DD format (year inference)',
    input: 'YG 7/1 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)), // Smart year inference - July 1 is in past relative to reference date
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false,
    referenceDate: new Date(2024, 11, 1) // December 1, 2024
  },
  {
    description: 'YG with MM-DD format (year inference)',
    input: 'YG 7-1 Lakers @ +120 = 2.5',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 2500,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 6, 1)), // Smart year inference - July 1 is in past relative to reference date
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false,
    referenceDate: new Date(2024, 11, 1) // December 1, 2024
  },

  // ==============================================================================
  // FREE BET FLAG
  // ==============================================================================
  {
    description: 'YG with freebet flag',
    input: 'YG freebet:true Lakers @ +120 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 1000,
    expectedTeam1: 'Lakers',
    expectedFreeBet: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with date and freebet',
    input: 'YG date:5/14 freebet:true Lakers @ +120 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 120,
    expectedSize: 1000,
    expectedTeam1: 'Lakers',
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)), // Smart year inference - May 14 is in past relative to reference date
    expectedFreeBet: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false,
    referenceDate: new Date(2024, 11, 1) // December 1, 2024
  },
  {
    description: 'IW with freebet flag',
    input: 'IW freebet:true Cardinals @ +150',
    expectedChatType: 'order',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 150,
    expectedTeam1: 'Cardinals',
    expectedFreeBet: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
  {
    description: 'YG with multiple keywords (date, league, freebet)',
    input: 'YG date:5/14/25 league:MLB freebet:true Cardinals @ +150 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'HandicapContestantML',
    expectedPrice: 150,
    expectedSize: 1000,
    expectedTeam1: 'Cardinals',
    expectedSport: 'Baseball',
    expectedLeague: 'MLB',
    expectedEventDate: new Date(Date.UTC(2025, 4, 14)),
    expectedFreeBet: true,
    expectedPeriod: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    expectedTiesLose: false
  },
];
