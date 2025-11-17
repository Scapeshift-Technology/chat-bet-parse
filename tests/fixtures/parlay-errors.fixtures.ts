/**
 * Error test cases for parlay parsing
 * Tests invalid parlay structure and syntax
 */

import { ErrorTestCase } from './types';

export const parlayErrorTestCases: ErrorTestCase[] = [
  // ==============================================================================
  // INVALID PARLAY STRUCTURE
  // ==============================================================================
  {
    description: 'Single leg (not a parlay)',
    input: 'YGP Lakers @ +120 = $100',
    expectedErrorType: 'InvalidParlayStructureError',
    expectedErrorMessage: 'Parlay requires at least 2 legs'
  },
  {
    description: 'No legs specified',
    input: 'YGP = $100',
    expectedErrorType: 'InvalidParlayStructureError',
    expectedErrorMessage: 'Parlay requires at least 2 legs'
  },
  {
    description: 'Missing size for YGP',
    input: 'YGP Lakers @ +120 & Warriors @ -110',
    expectedErrorType: 'MissingSizeForFillError',
    expectedErrorMessage: 'Fill (YG/YGP/YGRR) messages require a size'
  },
  {
    description: 'Invalid separator (comma)',
    input: 'YGP Lakers @ +120, Warriors @ -110 = $100',
    expectedErrorType: 'InvalidParlayStructureError',
    expectedErrorMessage: 'Parlay legs must be separated by &'
  },

  // ==============================================================================
  // INVALID TO-WIN SYNTAX
  // ==============================================================================
  {
    description: 'Missing tw keyword',
    input: 'YGP Lakers @ +120 & Warriors @ -110 = $100 $500',
    expectedErrorType: 'InvalidSizeFormatError',
    expectedErrorMessage: 'Invalid to-win syntax: must use "tw" keyword'
  },
  {
    description: 'Invalid tw format',
    input: 'YGP Lakers @ +120 & Warriors @ -110 = $100 towin:500',
    expectedErrorType: 'InvalidParlayToWinError',
    expectedErrorMessage: 'Invalid to-win format: use "tw $500" not "towin:500"'
  },
  {
    description: 'Multiple tw specifications',
    input: 'YGP Lakers @ +120 & Warriors @ -110 = $100 tw $500 tw $600',
    expectedErrorType: 'InvalidParlayToWinError',
    expectedErrorMessage: 'To-win amount specified multiple times'
  },

  // ==============================================================================
  // INVALID FLAG SYNTAX
  // ==============================================================================
  {
    description: 'Invalid flag value',
    input: 'YGP pusheslose:false Lakers @ +120 & Warriors @ -110 = $100',
    expectedErrorType: 'InvalidKeywordValueError',
    expectedErrorMessage: 'Invalid pusheslose value: must be "true"'
  },
  {
    description: 'Standalone flag without colon',
    input: 'YGP pusheslose Lakers @ +120 & Warriors @ -110 = $100',
    expectedErrorType: 'InvalidKeywordSyntaxError',
    expectedErrorMessage: 'Invalid keyword syntax'
  },

  // ==============================================================================
  // INVALID LEG SPECIFICATIONS
  // ==============================================================================
  {
    description: 'Leg missing price',
    input: 'YGP Lakers & Warriors @ -110 = $100',
    expectedErrorType: 'InvalidParlayLegError',
    expectedErrorMessage: 'Each parlay leg must have a price'
  },
  {
    description: 'Leg invalid format',
    input: 'YGP Lakers +120 & Warriors @ -110 = $100',
    expectedErrorType: 'InvalidParlayLegError',
    expectedErrorMessage: 'Invalid leg format: missing @ symbol'
  },
  {
    description: 'Empty leg between ampersands',
    input: 'YGP Lakers @ +120 & & Warriors @ -110 = $100',
    expectedErrorType: 'InvalidParlayLegError',
    expectedErrorMessage: 'Empty parlay leg'
  },
  {
    description: 'Trailing ampersand',
    input: 'YGP Lakers @ +120 & Warriors @ -110 & = $100',
    expectedErrorType: 'InvalidParlayLegError',
    expectedErrorMessage: 'Empty parlay leg'
  },
];
