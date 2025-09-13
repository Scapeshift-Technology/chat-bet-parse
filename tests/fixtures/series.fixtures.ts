/**
 * Test fixtures for series bets
 * Tests various series betting scenarios
 */

import { TestCase } from './types';

export const seriesTestCases: TestCase[] = [
  // Orders (IW)
  {
    description: 'IW Series bet explicit length with size',
    input: 'IW 854 Yankees 4 game series +110 = 1.0',
    expectedChatType: 'order',
    expectedContractType: 'Series',
    expectedPrice: 110,
    expectedSize: 1.0,
    expectedRotationNumber: 854,
    expectedTeam1: 'Yankees',
    expectedSeriesLength: 4,
  },

  // Fills (YG)
  {
    description: 'YG Series default length with k-notation',
    input: 'YG 852 Guardians series -105 = 3k',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: -105,
    expectedSize: 3000,
    expectedRotationNumber: 852,
    expectedTeam1: 'Guardians',
    expectedSeriesLength: 3,
  },
  {
    description: 'YG Series explicit length with k-notation',
    input: 'YG 854 Yankees 4 game series +110 = 1k',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: 110,
    expectedSize: 1000,
    expectedRotationNumber: 854,
    expectedTeam1: 'Yankees',
    expectedSeriesLength: 4
  },
  {
    description: 'YG Series "out of" syntax with decimal thousands',
    input: 'YG 856 Red Sox series out of 4 -120 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: -120,
    expectedSize: 2000,
    expectedRotationNumber: 856,
    expectedTeam1: 'Red Sox',
    expectedSeriesLength: 4
  },
  {
    description: 'YG Series "X-Game Series" format with decimal thousands',
    input: 'YG Lakers 7-Game Series @ +120 = 1.0',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: 120,
    expectedSize: 1000,
    expectedTeam1: 'Lakers',
    expectedSeriesLength: 7
  },
  {
    description: 'YG Series "series/X" format with decimal thousands',
    input: 'YG 856 St. Louis Cardinals series/5 -120 = 2.0',
    expectedChatType: 'fill',
    expectedContractType: 'Series',
    expectedPrice: -120,
    expectedSize: 2000,
    expectedRotationNumber: 856,
    expectedTeam1: 'St. Louis Cardinals',
    expectedSeriesLength: 5
  }
];