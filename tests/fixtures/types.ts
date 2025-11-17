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
  expectedIsYes?: boolean;
  expectedTiesLose?: boolean;
  expectedProp?: string;
  expectedSeriesLength?: number;
  expectedRotationNumber?: number;
  expectedDaySequence?: number;
  expectedPeriod?: { PeriodTypeCode: string; PeriodNumber: number };
  expectedContestantType?: 'Individual' | 'TeamAdHoc' | 'TeamLeague';
  expectedSport?: string;
  expectedLeague?: string;
  // Event date (for both writeins and regular contracts with date specified)
  expectedEventDate?: Date;
  // Writein-specific fields
  expectedDescription?: string;
  // Optional flags
  expectedFreeBet?: boolean;
  // Reference date for year inference testing (optional)
  referenceDate?: Date;
}

export interface ErrorTestCase {
  description: string;
  input: string;
  expectedErrorType: string;
  expectedErrorMessage: string;
}