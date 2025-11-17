/**
 * Shared types for test fixtures
 */

// Straight bet test case
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

// Parlay test case - legs are validated separately
export interface ParlayTestCase {
  description: string;
  input: string;
  expectedChatType: 'order' | 'fill';
  // Parlay-level bet properties
  expectedRisk?: number;
  expectedToWin?: number;
  expectedUseFair: boolean;
  expectedPushesLose?: boolean;
  expectedFreeBet?: boolean;
  // Leg validations - each leg is a straight bet expectation
  expectedLegs: Array<{
    contractType: string;
    price: number;
    team?: string;
    teams?: string[];
    line?: number;
    isOver?: boolean;
    rotationNumber?: number;
    daySequence?: number;
    period?: { PeriodTypeCode: string; PeriodNumber: number };
    sport?: string;
    league?: string;
    eventDate?: Date;
  }>;
  // Reference date for year inference testing (optional)
  referenceDate?: Date;
}

// Round robin test case (for Stage 3)
export interface RoundRobinTestCase {
  description: string;
  input: string;
  expectedChatType: 'order' | 'fill';
  expectedRisk?: number;
  expectedToWin?: number;
  expectedUseFair: boolean;
  expectedPushesLose?: boolean;
  expectedFreeBet?: boolean;
  expectedParlaySize: number;
  expectedIsAtMost: boolean;
  expectedRiskType: 'perSelection' | 'total';
  expectedLegs: Array<{
    contractType: string;
    price: number;
    team?: string;
    teams?: string[];
    line?: number;
    isOver?: boolean;
  }>;
}

export interface ErrorTestCase {
  description: string;
  input: string;
  expectedErrorType: string;
  expectedErrorMessage: string;
}