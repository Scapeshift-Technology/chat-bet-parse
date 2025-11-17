/**
 * Test fixtures for error cases
 * Tests various invalid inputs and expected error types
 */

import { ErrorTestCase } from './types';

export const errorTestCases: ErrorTestCase[] = [
  // Invalid prefixes
  {
    description: 'Invalid chat prefix',
    input: 'XX Padres/Pirates u0.5 @ +100',
    expectedErrorType: 'UnrecognizedChatPrefixError',
    expectedErrorMessage: 'Unrecognized chat prefix: "XX"'
  },

  // Missing size for fills
  {
    description: 'Missing size for YG bet',
    input: 'YG Padres/Pirates u0.5 @ +100',
    expectedErrorType: 'MissingSizeForFillError',
    expectedErrorMessage: 'Fill (YG/YGP/YGRR) messages require a size'
  },

  // Invalid prices
  {
    description: 'Invalid price format',
    input: 'IW LAA TT o3.5 @ invalid',
    expectedErrorType: 'InvalidPriceFormatError',
    expectedErrorMessage: 'Invalid USA price format: "invalid"'
  },
  {
    description: 'Empty price',
    input: 'IW LAA TT o3.5 @ ',
    expectedErrorType: 'InvalidChatFormatError',
    expectedErrorMessage: 'No contract details found'
  },

  // Invalid sizes
  {
    description: 'Invalid size format for order',
    input: 'IW LAA TT o3.5 @ -110 = invalid',
    expectedErrorType: 'InvalidSizeFormatError',
    expectedErrorMessage: 'Invalid size format: "invalid"'
  },
  {
    description: 'Negative size',
    input: 'YG LAA TT o3.5 @ -110 = -1.0',
    expectedErrorType: 'InvalidSizeFormatError',
    expectedErrorMessage: 'Invalid size format: "-1.0"'
  },

  // Invalid lines
  {
    description: 'Line not divisible by 0.5',
    input: 'IW LAA TT o3.3 @ -110',
    expectedErrorType: 'InvalidLineValueError',
    expectedErrorMessage: 'Invalid line value: 3.3. Line must be divisible by 0.5'
  },

  // Invalid rotation numbers
  {
    description: 'Invalid rotation number',
    input: 'YG abc Athletics @ 4k',
    expectedErrorType: 'InvalidRotationNumberError',
    expectedErrorMessage: 'Invalid rotation number: "abc"'
  },
  {
    description: 'Rotation number too large',
    input: 'YG 99999 Athletics @ 4k',
    expectedErrorType: 'InvalidRotationNumberError',
    expectedErrorMessage: 'Invalid rotation number: "99999"'
  },

  // Invalid periods
  {
    description: 'Invalid period format',
    input: 'IW Padres/Pirates 99th inning u0.5 @ +100',
    expectedErrorType: 'InvalidPeriodFormatError',
    expectedErrorMessage: 'Invalid period format: "99th inning"'
  },

  // Invalid game numbers - removed since we now only extract valid patterns
  // 'Gx' is no longer treated as an invalid game number, just part of the team name

  // Invalid teams
  {
    description: 'Empty team name',
    input: 'IW  TT o3.5 @ -110',
    expectedErrorType: 'InvalidTeamFormatError',
    expectedErrorMessage: 'Team name cannot be empty'
  },
  {
    description: 'Duplicate teams in Team1/Team2 format',
    input: 'YG MIN/MIN 1st inning o0.5 @ +130 = 3.75',
    expectedErrorType: 'InvalidTeamFormatError',
    expectedErrorMessage: 'Team1 and Team2 cannot be the same: "MIN"'
  },

  // Message too short
  {
    description: 'Message too short',
    input: 'IW',
    expectedErrorType: 'InvalidChatFormatError',
    expectedErrorMessage: 'Message too short'
  },

  // Prop validation errors
  {
    description: 'PropOU without line (passing yards)',
    input: 'IW Player123 passing yards @ -115',
    expectedErrorType: 'InvalidContractTypeError',
    expectedErrorMessage: 'PassingYards props require an over/under line'
  },
  {
    description: 'PropYN with line (first to score)',
    input: 'IW CIN first team to score o1.5 @ -115',
    expectedErrorType: 'InvalidContractTypeError',
    expectedErrorMessage: 'FirstToScore props cannot have a line - they are yes/no bets only'
  },
  {
    description: 'Unsupported prop type',
    input: 'IW Player123 some unknown prop @ -115',
    expectedErrorType: 'InvalidContractTypeError',
    expectedErrorMessage: 'Unsupported prop type'
  },

  // Format error cases with helpful messages
  {
    description: 'Invalid fill format with double @ symbol',
    input: 'YG Pirates F5 u4.5 @ -115 @ 3.5k',
    expectedErrorType: 'InvalidChatFormatError',
    expectedErrorMessage: 'Expected format for fills is: "YG" [rotation_number] contract ["@" usa_price] "=" fill_size'
  },
  {
    description: 'Invalid order format with double @ symbol',
    input: 'IW Pirates F5 u4.5 @ -115 @ 3.5k',
    expectedErrorType: 'InvalidChatFormatError',
    expectedErrorMessage: 'Expected format for orders is: "IW" [rotation_number] contract ["@" usa_price] ["=" unit_size]'
  },
  {
    description: 'Invalid chat prefix - neither IW nor YG',
    input: 'XX Pirates F5 u4.5 @ -115 = 3.5k',
    expectedErrorType: 'UnrecognizedChatPrefixError',
    expectedErrorMessage: 'Chat must be either a chat order (start with "IW" for "i want") or a chat fill (start with "YG", for "you got")'
  }
];

export const writeinErrorTestCases: ErrorTestCase[] = [
  // Invalid writein format
  {
    description: 'No space between writein and date',
    input: 'YG writein2024/11/5 Trump to win presidency @ +150 = 3.0',
    expectedErrorType: 'InvalidContractTypeError',
    expectedErrorMessage: 'Unable to determine contract type'
  },
  {
    description: 'Missing date in writein',
    input: 'IW writein Trump to win presidency @ +150',
    expectedErrorType: 'InvalidWriteinDateError',
    expectedErrorMessage: 'Unable to parse date'
  },
  {
    description: 'Missing description in writein',
    input: 'IW writein 2024/11/5 @ +150',
    expectedErrorType: 'InvalidWriteinFormatError',
    expectedErrorMessage: 'Writein contracts must include a description'
  },

  // Invalid dates
  {
    description: 'Invalid date format',
    input: 'IW writein invalid-date Trump to win presidency @ +150',
    expectedErrorType: 'InvalidWriteinDateError',
    expectedErrorMessage: 'Unable to parse date'
  },
  {
    description: 'Invalid calendar date (Feb 30)',
    input: 'IW writein 02/30/2024 Invalid date test @ +150',
    expectedErrorType: 'InvalidWriteinDateError',
    expectedErrorMessage: 'Invalid calendar date'
  },
  {
    description: 'Empty date',
    input: 'IW writein  Trump to win presidency @ +150',
    expectedErrorType: 'InvalidWriteinDateError',
    expectedErrorMessage: 'Unable to parse date'
  },

  // Invalid descriptions
  {
    description: 'Description too short (less than 10 characters)',
    input: 'IW writein 2024/11/5 Short @ +150',
    expectedErrorType: 'InvalidWriteinDescriptionError',
    expectedErrorMessage: 'Description must be at least 10 characters long'
  },
  {
    description: 'Description too long (over 255 characters)',
    input: `IW writein 2024/11/5 ${'A'.repeat(260)} @ +150`,
    expectedErrorType: 'InvalidWriteinDescriptionError',
    expectedErrorMessage: 'Description cannot exceed 255 characters'
  },
  {
    description: 'Empty description after trimming',
    input: 'IW writein 2024/11/5    @ +150',
    expectedErrorType: 'InvalidWriteinFormatError',
    expectedErrorMessage: 'Writein contracts must include a description'
  },

  // Missing size for fills
  {
    description: 'Missing size for YG writein bet',
    input: 'YG writein 2024/11/5 Trump to win presidency @ +150',
    expectedErrorType: 'MissingSizeForFillError',
    expectedErrorMessage: 'Fill (YG/YGP/YGRR) messages require a size'
  }
];