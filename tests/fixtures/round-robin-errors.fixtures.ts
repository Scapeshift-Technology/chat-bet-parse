/**
 * Error test cases for round robin parsing
 * Tests invalid round robin structure and syntax
 */

import { ErrorTestCase } from './types';

export const roundRobinErrorTestCases: ErrorTestCase[] = [
  // ==============================================================================
  // MISSING nCr NOTATION
  // ==============================================================================
  {
    description: 'Missing nCr notation',
    input: 'YGRR Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100 per',
    expectedErrorType: 'MissingNcrNotationError',
    expectedErrorMessage: 'Round robin requires nCr notation'
  },
  {
    description: 'nCr notation after legs',
    input: 'YGRR Lakers @ +120 & Warriors @ -110 & Celtics @ +105 4c2 = $100 per',
    expectedErrorType: 'MissingNcrNotationError',
    expectedErrorMessage: 'nCr notation must appear before legs'
  },

  // ==============================================================================
  // INVALID nCr NOTATION
  // ==============================================================================
  {
    description: 'Invalid nCr format',
    input: 'YGRR 4x2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Invalid nCr notation format'
  },
  {
    description: 'Comma-separated parlay sizes',
    input: 'YGRR 5c2,3 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $100 per',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Comma-separated parlay sizes not supported'
  },

  // ==============================================================================
  // LEG COUNT MISMATCH
  // ==============================================================================
  {
    description: 'nCr total legs does not match actual leg count (4c2 but 3 legs)',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100 per',
    expectedErrorType: 'LegCountMismatchError',
    expectedErrorMessage: 'Expected 4 legs from nCr notation, but found 3'
  },
  {
    description: 'nCr total legs does not match actual leg count (4c2 but 5 legs)',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 & Heat @ -105 = $100 per',
    expectedErrorType: 'LegCountMismatchError',
    expectedErrorMessage: 'Expected 4 legs from nCr notation, but found 5'
  },
  {
    description: 'nCr total legs less than minimum (3)',
    input: 'YGRR 2c2 Lakers @ +120 & Warriors @ -110 = $100 per',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Total legs must be at least 3'
  },

  // ==============================================================================
  // MISSING SIZE FOR FILL
  // ==============================================================================
  {
    description: 'Missing size for YGRR',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115',
    expectedErrorType: 'MissingSizeForFillError',
    expectedErrorMessage: 'Fill (YG/YGP/YGRR) messages require a size'
  },

  // ==============================================================================
  // MISSING OR INVALID RISK TYPE
  // ==============================================================================
  {
    description: 'Missing risk type (per/total)',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100',
    expectedErrorType: 'MissingRiskTypeError',
    expectedErrorMessage: 'Round robin requires risk type: "per" or "total"'
  },
  {
    description: 'Invalid risk type',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 each',
    expectedErrorType: 'InvalidRiskTypeError',
    expectedErrorMessage: 'Invalid risk type: must be "per" or "total"'
  },
  {
    description: 'Risk type before size',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = per $100',
    expectedErrorType: 'InvalidSizeFormatError',
    expectedErrorMessage: 'Risk type must come after size amount'
  },

  // ==============================================================================
  // INVALID LEG STRUCTURE
  // ==============================================================================
  {
    description: 'Too few legs for round robin (only 2)',
    input: 'YGRR 2c2 Lakers @ +120 & Warriors @ -110 = $100 per',
    expectedErrorType: 'InvalidNcrNotationError',
    expectedErrorMessage: 'Total legs must be at least 3'
  },
  {
    description: 'Single leg',
    input: 'YGRR 3c2 Lakers @ +120 = $100 per',
    expectedErrorType: 'LegCountMismatchError',
    expectedErrorMessage: 'Expected 3 legs from nCr notation, but found 1'
  },

  // ==============================================================================
  // INVALID TO-WIN SYNTAX
  // ==============================================================================
  {
    description: 'Missing tw keyword',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per $500',
    expectedErrorType: 'InvalidSizeFormatError',
    expectedErrorMessage: 'Invalid to-win syntax: must use "tw" keyword'
  },
  {
    description: 'Invalid tw format',
    input: 'YGRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per towin:500',
    expectedErrorType: 'InvalidRoundRobinToWinError',
    expectedErrorMessage: 'Invalid to-win format: use "tw $500" not "towin:500"'
  },

  // ==============================================================================
  // INVALID FLAG SYNTAX
  // ==============================================================================
  {
    description: 'Invalid flag value',
    input: 'YGRR pusheslose:false 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedErrorType: 'InvalidKeywordValueError',
    expectedErrorMessage: 'Invalid pusheslose value: must be "true"'
  },
  {
    description: 'Unknown flag',
    input: 'YGRR invalid:true 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedErrorType: 'UnknownKeywordError',
    expectedErrorMessage: 'Unknown keyword: invalid'
  },

  // ==============================================================================
  // INVALID LEG SPECIFICATIONS
  // ==============================================================================
  {
    description: 'Leg missing price',
    input: 'YGRR 4c2 Lakers & Warriors @ -110 & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedErrorType: 'InvalidRoundRobinLegError',
    expectedErrorMessage: 'Leg 1: Each round robin leg must have a price'
  },
  {
    description: 'Empty leg',
    input: 'YGRR 4c2 Lakers @ +120 & & Celtics @ +105 & Nets @ +115 = $100 per',
    expectedErrorType: 'InvalidRoundRobinLegError',
    expectedErrorMessage: 'Empty round robin leg'
  },
];
