/**
 * Test fixtures for nCr notation parsing
 * Tests the XcY syntax used in round robin bets
 *
 * Format: NcR where N = total legs, R = parlay size
 * Modifier: trailing '-' means "at most R"
 *
 * Examples:
 * - "4c2" → 4 legs, make 2-leg parlays (exactly)
 * - "5c3" → 5 legs, make 3-leg parlays (exactly)
 * - "4c3-" → 4 legs, make 2-leg and 3-leg parlays (at most 3)
 */

export interface NcrNotationTestCase {
  description: string;
  input: string;
  expectedTotalLegs: number;
  expectedParlaySize: number;
  expectedIsAtMost: boolean;
}

export interface NcrNotationErrorTestCase {
  description: string;
  input: string;
  expectedErrorType: string;
  expectedErrorMessage: string;
}

export const ncrNotationTestCases: NcrNotationTestCase[] = [
  // ==============================================================================
  // BASIC EXACTLY SYNTAX
  // ==============================================================================
  {
    description: '4c2 - 4 legs, 2-team parlays',
    input: '4c2',
    expectedTotalLegs: 4,
    expectedParlaySize: 2,
    expectedIsAtMost: false
  },
  {
    description: '5c3 - 5 legs, 3-team parlays',
    input: '5c3',
    expectedTotalLegs: 5,
    expectedParlaySize: 3,
    expectedIsAtMost: false
  },
  {
    description: '6c4 - 6 legs, 4-team parlays',
    input: '6c4',
    expectedTotalLegs: 6,
    expectedParlaySize: 4,
    expectedIsAtMost: false
  },
  {
    description: '3c2 - minimum valid (3 legs, 2-team)',
    input: '3c2',
    expectedTotalLegs: 3,
    expectedParlaySize: 2,
    expectedIsAtMost: false
  },
  {
    description: '10c5 - larger numbers',
    input: '10c5',
    expectedTotalLegs: 10,
    expectedParlaySize: 5,
    expectedIsAtMost: false
  },

  // ==============================================================================
  // AT MOST SYNTAX (TRAILING MINUS)
  // ==============================================================================
  {
    description: '4c3- - at most 3 (2s and 3s)',
    input: '4c3-',
    expectedTotalLegs: 4,
    expectedParlaySize: 3,
    expectedIsAtMost: true
  },
  {
    description: '5c4- - at most 4 (2s, 3s, 4s)',
    input: '5c4-',
    expectedTotalLegs: 5,
    expectedParlaySize: 4,
    expectedIsAtMost: true
  },
  {
    description: '6c5- - at most 5 (2s, 3s, 4s, 5s)',
    input: '6c5-',
    expectedTotalLegs: 6,
    expectedParlaySize: 5,
    expectedIsAtMost: true
  },
  {
    description: '3c2- - minimum at-most (just 2s)',
    input: '3c2-',
    expectedTotalLegs: 3,
    expectedParlaySize: 2,
    expectedIsAtMost: true
  },

  // ==============================================================================
  // CASE VARIATIONS
  // ==============================================================================
  {
    description: '4C2 - uppercase C',
    input: '4C2',
    expectedTotalLegs: 4,
    expectedParlaySize: 2,
    expectedIsAtMost: false
  },
  {
    description: '4C3- - uppercase C with minus',
    input: '4C3-',
    expectedTotalLegs: 4,
    expectedParlaySize: 3,
    expectedIsAtMost: true
  },
];

export const ncrNotationErrorTestCases: NcrNotationErrorTestCase[] = [
  // ==============================================================================
  // INVALID FORMAT
  // ==============================================================================
  {
    description: 'Missing c separator',
    input: '42',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Invalid nCr notation format'
  },
  {
    description: 'Wrong separator (comma)',
    input: '4,2',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Invalid nCr notation format'
  },
  {
    description: 'Wrong separator (slash)',
    input: '4/2',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Invalid nCr notation format'
  },
  {
    description: 'Empty string',
    input: '',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Invalid nCr notation format'
  },
  {
    description: 'Only separator',
    input: 'c',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Invalid nCr notation format'
  },

  // ==============================================================================
  // INVALID NUMBERS
  // ==============================================================================
  {
    description: 'Non-numeric total legs',
    input: 'Xc2',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Total legs must be a number'
  },
  {
    description: 'Non-numeric parlay size',
    input: '4cX',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Parlay size must be a number'
  },
  {
    description: 'Decimal total legs',
    input: '4.5c2',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Total legs must be an integer'
  },
  {
    description: 'Decimal parlay size',
    input: '4c2.5',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Parlay size must be an integer'
  },
  {
    description: 'Negative total legs',
    input: '-4c2',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Total legs must be positive'
  },
  {
    description: 'Negative parlay size',
    input: '4c-2',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Parlay size must be positive'
  },
  {
    description: 'Zero total legs',
    input: '0c2',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Total legs must be at least 3'
  },
  {
    description: 'Zero parlay size',
    input: '4c0',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Parlay size must be at least 2'
  },

  // ==============================================================================
  // INVALID RANGES
  // ==============================================================================
  {
    description: 'Total legs less than 3',
    input: '2c2',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Total legs must be at least 3'
  },
  {
    description: 'Parlay size less than 2',
    input: '4c1',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Parlay size must be at least 2'
  },
  {
    description: 'Parlay size equals total legs',
    input: '4c4',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Parlay size must be less than total legs'
  },
  {
    description: 'Parlay size greater than total legs',
    input: '4c5',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Parlay size must be less than total legs'
  },

  // ==============================================================================
  // INVALID AT-MOST USAGE
  // ==============================================================================
  {
    description: 'Minus without parlay size',
    input: '4c-',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Invalid nCr notation format'
  },
  {
    description: 'Multiple minus signs',
    input: '4c3--',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Invalid at-most modifier'
  },
  {
    description: 'Minus in wrong position',
    input: '4-c3',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Invalid nCr notation format'
  },

  // ==============================================================================
  // UNSUPPORTED COMMA-SEPARATED (SQL CONSTRAINT)
  // ==============================================================================
  {
    description: 'Comma-separated parlay sizes (not supported)',
    input: '5c2,3',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Comma-separated parlay sizes not supported'
  },
  {
    description: 'Multiple comma-separated sizes',
    input: '6c2,3,4',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Comma-separated parlay sizes not supported'
  },
];
