/**
 * Shared types for test fixtures
 */

export interface TestCase {
  description: string;
  input: string;
  expectedChatType: 'order' | 'fill';
  expectedContractType: string;
  expectedPrice: number;
  expectedSize?: number;
  expectedTeam1?: string;
  expectedTeam2?: string;
  expectedLine?: number;
  expectedIsOver?: boolean;
  expectedProp?: string;
  expectedSeriesLength?: number;
  expectedRotationNumber?: number;
  expectedDaySequence?: number;
  expectedPeriod?: { PeriodTypeCode: string; PeriodNumber: number };
  expectedContestantType?: 'Individual' | 'TeamAdHoc' | 'TeamLeague';
  expectedSport?: string;
  expectedLeague?: string;
  // Writein-specific fields
  expectedEventDate?: Date;
  expectedDescription?: string;
}

export interface ErrorTestCase {
  description: string;
  input: string;
  expectedErrorType: string;
  expectedErrorMessage: string;
}