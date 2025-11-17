/**
 * Error test cases for event date parsing
 * Tests invalid date formats and keyword syntax
 */

import { ErrorTestCase } from './types';

export const eventDateErrorTestCases: ErrorTestCase[] = [
  // ==============================================================================
  // INVALID DATE FORMATS
  // ==============================================================================
  {
    description: 'Invalid date format - month out of range',
    input: 'YG 13/45/25 Lakers @ +120 = 2.5',
    expectedErrorType: 'InvalidDateError',
    expectedErrorMessage: 'Unable to parse date'
  },
  {
    description: 'Non-existent date - February 30th',
    input: 'YG 2/30/25 Lakers @ +120 = 2.5',
    expectedErrorType: 'InvalidDateError',
    expectedErrorMessage: "Invalid calendar date (e.g., February 30th doesn't exist)"
  },
  {
    description: 'Non-existent date - April 31st',
    input: 'YG date:4/31/25 Lakers @ +120 = 2.5',
    expectedErrorType: 'InvalidDateError',
    expectedErrorMessage: "Invalid calendar date (e.g., February 30th doesn't exist)"
  },
  {
    description: 'Invalid date format - no separators',
    input: 'YG 070125 Lakers @ +120 = 2.5',
    expectedErrorType: 'InvalidDateError',
    expectedErrorMessage: 'Unable to parse date'
  },

  // ==============================================================================
  // INVALID KEYWORD SYNTAX
  // ==============================================================================
  {
    description: 'Space after colon in date keyword',
    input: 'YG date: 7/1/25 Lakers @ +120 = 2.5',
    expectedErrorType: 'InvalidKeywordSyntaxError',
    expectedErrorMessage: 'Invalid keyword syntax: no spaces allowed around colon'
  },
  {
    description: 'Space before colon in date keyword',
    input: 'YG date :7/1/25 Lakers @ +120 = 2.5',
    expectedErrorType: 'InvalidKeywordSyntaxError',
    expectedErrorMessage: 'Invalid keyword syntax: no spaces allowed around colon'
  },
  {
    description: 'Space both sides of colon in date keyword',
    input: 'YG date : 7/1/25 Lakers @ +120 = 2.5',
    expectedErrorType: 'InvalidKeywordSyntaxError',
    expectedErrorMessage: 'Invalid keyword syntax: no spaces allowed around colon'
  },
  {
    description: 'Invalid freebet value - not true',
    input: 'YG freebet:yes Lakers @ +120 = 1.0',
    expectedErrorType: 'InvalidKeywordValueError',
    expectedErrorMessage: 'Invalid freebet value: must be "true"'
  },
  {
    description: 'Invalid freebet value - false',
    input: 'YG freebet:false Lakers @ +120 = 1.0',
    expectedErrorType: 'InvalidKeywordValueError',
    expectedErrorMessage: 'Invalid freebet value: must be "true"'
  },
  {
    description: 'Space after colon in freebet keyword',
    input: 'YG freebet: true Lakers @ +120 = 1.0',
    expectedErrorType: 'InvalidKeywordSyntaxError',
    expectedErrorMessage: 'Invalid keyword syntax: no spaces allowed around colon'
  },
  {
    description: 'Invalid league keyword syntax',
    input: 'YG league: MLB Lakers @ +120 = 2.5',
    expectedErrorType: 'InvalidKeywordSyntaxError',
    expectedErrorMessage: 'Invalid keyword syntax: no spaces allowed around colon'
  },
  {
    description: 'Unknown keyword',
    input: 'YG unknown:value Lakers @ +120 = 2.5',
    expectedErrorType: 'UnknownKeywordError',
    expectedErrorMessage: 'Unknown keyword: unknown'
  },
];
