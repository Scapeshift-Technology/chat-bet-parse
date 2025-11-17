import { ChatBetParseError } from '../errors/index';

export class InvalidNcrNotationError extends ChatBetParseError {
  constructor(rawInput: string, message: string) {
    super(message, rawInput);
    this.name = 'InvalidNcrNotationError';
  }
}

export interface NcrParsed {
  totalLegs: number;
  parlaySize: number;
  isAtMost: boolean;
}

/**
 * Parse nCr notation for round robin bets
 * Format: NcR[modifier] where N=total legs, R=parlay size, modifier=optional '-'
 */
export function parseNcrNotation(notation: string, rawInput: string): NcrParsed {
  const trimmed = notation.trim();

  // Check for comma-separated parlay sizes (e.g., "5c2,3") - unsupported SQL constraint
  // Only check for comma after 'c' separator, not before it
  if (/[cC].*,/.test(trimmed)) {
    throw new InvalidNcrNotationError(rawInput, 'Comma-separated parlay sizes not supported');
  }

  // Parse basic format with flexible pattern: NcR or NcR-
  // Allow for decimal, negative, non-numeric to provide specific error messages
  // First group: digits/decimal/negative OR letters (for specific errors)
  // Second group: Must have at least one non-minus character
  // Third group: Optional trailing minus(es)
  const match = trimmed.match(/^(-?[\d.]+|[A-Za-z]+)[cC](-?[\d.]+|[A-Za-z]+|[^-\s]+)(-+)?$/i);

  if (!match) {
    throw new InvalidNcrNotationError(rawInput, 'Invalid nCr notation format');
  }

  const totalLegsStr = match[1];
  const parlaySizeStr = match[2];
  const minusModifier = match[3] || '';

  // Check for multiple minus signs
  if (minusModifier.length > 1) {
    throw new InvalidNcrNotationError(rawInput, 'Invalid at-most modifier');
  }

  const isAtMost = minusModifier === '-';

  // Check for non-numeric total legs
  if (!/^-?\d+(?:\.\d+)?$/.test(totalLegsStr)) {
    throw new InvalidNcrNotationError(rawInput, 'Total legs must be a number');
  }

  // Check for non-numeric parlay size
  if (!/^-?\d+(?:\.\d+)?$/.test(parlaySizeStr)) {
    throw new InvalidNcrNotationError(rawInput, 'Parlay size must be a number');
  }

  // Check for decimal total legs
  if (totalLegsStr.includes('.')) {
    throw new InvalidNcrNotationError(rawInput, 'Total legs must be an integer');
  }

  // Check for decimal parlay size
  if (parlaySizeStr.includes('.')) {
    throw new InvalidNcrNotationError(rawInput, 'Parlay size must be an integer');
  }

  const totalLegs = parseInt(totalLegsStr, 10);
  const parlaySize = parseInt(parlaySizeStr, 10);

  // Check for negative total legs
  if (totalLegs < 0) {
    throw new InvalidNcrNotationError(rawInput, 'Total legs must be positive');
  }

  // Check for negative parlay size
  if (parlaySize < 0) {
    throw new InvalidNcrNotationError(rawInput, 'Parlay size must be positive');
  }

  // Validate ranges
  if (totalLegs < 3) {
    throw new InvalidNcrNotationError(rawInput, 'Total legs must be at least 3');
  }

  if (parlaySize < 2) {
    throw new InvalidNcrNotationError(rawInput, 'Parlay size must be at least 2');
  }

  if (parlaySize >= totalLegs) {
    throw new InvalidNcrNotationError(rawInput, 'Parlay size must be less than total legs');
  }

  return { totalLegs, parlaySize, isAtMost };
}
