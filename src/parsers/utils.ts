/**
 * Utility functions for parsing chat betting messages
 * Implements core patterns from EBNF grammar
 */

import type { Period, Sport, League } from '../types/index';
import {
  InvalidPriceFormatError,
  InvalidSizeFormatError,
  InvalidLineValueError,
  InvalidPeriodFormatError,
  InvalidGameNumberError,
  InvalidRotationNumberError,
  InvalidTeamFormatError,
  InvalidContractTypeError,
} from '../errors/index';

// ==============================================================================
// PRICE PARSING
// ==============================================================================

/**
 * Parses USA odds format: +150, -110, -115.5, ev, even
 */
export function parsePrice(priceStr: string, rawInput: string): number {
  const cleaned = priceStr.trim();

  // Handle special cases
  if (cleaned.toLowerCase() === 'ev' || cleaned.toLowerCase() === 'even') {
    return 100;
  }

  // Handle standard format: +/-number with optional decimal
  const match = cleaned.match(/^([+-])(\d+(?:\.\d+)?)$/);
  if (!match) {
    throw new InvalidPriceFormatError(rawInput, priceStr);
  }

  const sign = match[1];
  const value = parseFloat(match[2]);

  return sign === '+' ? value : -value;
}

// ==============================================================================
// SIZE PARSING
// ==============================================================================

export type SizeFormat = 'unit' | 'decimal_thousands' | 'k_notation' | 'dollar';

export interface ParsedSize {
  value: number;
  format: SizeFormat;
}

/**
 * Parse size for chat orders (unit interpretation)
 */
export function parseOrderSize(sizeStr: string, rawInput: string): ParsedSize {
  const cleaned = sizeStr.trim();

  // Dollar format: $200, $2.5
  if (cleaned.startsWith('$')) {
    const value = parseFloat(cleaned.substring(1));
    if (isNaN(value) || value < 0) {
      throw new InvalidSizeFormatError(
        rawInput,
        sizeStr,
        'positive dollar amount like $100 or $2.50'
      );
    }
    return { value, format: 'dollar' };
  }

  // K-notation: 4k, 2.5k
  if (cleaned.toLowerCase().endsWith('k')) {
    const value = parseFloat(cleaned.slice(0, -1));
    if (isNaN(value) || value < 0) {
      throw new InvalidSizeFormatError(rawInput, sizeStr, 'positive number with k like 4k or 2.5k');
    }
    return { value: value * 1000, format: 'k_notation' };
  }

  // Unit format: literal decimal
  const value = parseFloat(cleaned);
  if (isNaN(value) || value < 0) {
    throw new InvalidSizeFormatError(rawInput, sizeStr, 'positive decimal number like 2.0 or 0.50');
  }

  return { value, format: 'unit' };
}

/**
 * Parse size for chat fills (thousands interpretation for decimals)
 */
export function parseFillSize(sizeStr: string, rawInput: string): ParsedSize {
  const cleaned = sizeStr.trim();

  // Dollar format: $200, $2.0 (literal)
  if (cleaned.startsWith('$')) {
    const value = parseFloat(cleaned.substring(1));
    if (isNaN(value) || value < 0) {
      throw new InvalidSizeFormatError(
        rawInput,
        sizeStr,
        'positive dollar amount like $100 or $2.00'
      );
    }
    return { value, format: 'dollar' };
  }

  // K-notation: 4k, 2.5k
  if (cleaned.toLowerCase().endsWith('k')) {
    const value = parseFloat(cleaned.slice(0, -1));
    if (isNaN(value) || value < 0) {
      throw new InvalidSizeFormatError(rawInput, sizeStr, 'positive number with k like 4k or 2.5k');
    }
    return { value: value * 1000, format: 'k_notation' };
  }

  // Decimal thousands format: 2.0 = $2000, 0.563 = $563
  const value = parseFloat(cleaned);
  if (isNaN(value) || value < 0) {
    throw new InvalidSizeFormatError(
      rawInput,
      sizeStr,
      'positive decimal number like 2.0 (=$2000) or 0.563 (=$563)'
    );
  }

  return { value: value * 1000, format: 'decimal_thousands' };
}

// ==============================================================================
// LINE PARSING
// ==============================================================================

/**
 * Parse betting line - must be divisible by 0.5
 */
export function parseLine(lineStr: string, rawInput: string): number {
  const value = parseFloat(lineStr);

  if (isNaN(value)) {
    throw new InvalidLineValueError(rawInput, value);
  }

  // Check if divisible by 0.5
  if ((value * 2) % 1 !== 0) {
    throw new InvalidLineValueError(rawInput, value);
  }

  return value;
}

// ==============================================================================
// PERIOD PARSING
// ==============================================================================

/**
 * Parse period according to EBNF grammar
 */
export function parsePeriod(periodStr: string, rawInput: string): Period {
  const cleaned = periodStr.toLowerCase().trim();

  // Full game (default)
  if (!cleaned || cleaned === 'fg' || cleaned === 'full game') {
    return { PeriodTypeCode: 'M', PeriodNumber: 0 };
  }

  // First half patterns: f5, h1, 1h, first half, 1st half
  if (
    cleaned === 'f5' ||
    cleaned === 'h1' ||
    cleaned === '1h' ||
    cleaned === 'first half' ||
    cleaned === '1st half' ||
    cleaned === 'first h' ||
    cleaned === '1st h' ||
    cleaned === 'first five' ||
    cleaned === '1st five' ||
    cleaned === 'first 5' ||
    cleaned === '1st 5'
  ) {
    return { PeriodTypeCode: 'H', PeriodNumber: 1 };
  }

  // Second half patterns: h2, 2h, second half, 2nd half
  if (
    cleaned === 'h2' ||
    cleaned === '2h' ||
    cleaned === 'second half' ||
    cleaned === '2nd half' ||
    cleaned === 'second h' ||
    cleaned === '2nd h'
  ) {
    return { PeriodTypeCode: 'H', PeriodNumber: 2 };
  }

  // Quarter patterns
  const quarterMatch = cleaned.match(/^(?:(\d+)(?:st|nd|rd|th)?\s*quarter?|q(\d+)|(\d+)q)$/);
  if (quarterMatch) {
    const qNum = parseInt(quarterMatch[1] || quarterMatch[2] || quarterMatch[3]);
    if (qNum >= 1 && qNum <= 4) {
      return { PeriodTypeCode: 'Q', PeriodNumber: qNum };
    }
  }

  // Inning patterns
  const inningMatch = cleaned.match(/^(?:(\d+)(?:st|nd|rd|th)?\s*inning?|i(\d+)|(\d+)i)$/);
  if (inningMatch) {
    const iNum = parseInt(inningMatch[1] || inningMatch[2] || inningMatch[3]);
    if (iNum >= 1 && iNum <= 15) {
      // Reasonable max for baseball
      return { PeriodTypeCode: 'I', PeriodNumber: iNum };
    }
  }

  // Hockey period patterns
  const periodMatch = cleaned.match(/^(?:(\d+)(?:st|nd|rd|th)?\s*period?|p(\d+)|(\d+)p)$/);
  if (periodMatch) {
    const pNum = parseInt(periodMatch[1] || periodMatch[2] || periodMatch[3]);
    if (pNum >= 1 && pNum <= 4) {
      // 1-3 regulation + OT
      return { PeriodTypeCode: 'P', PeriodNumber: pNum };
    }
  }

  throw new InvalidPeriodFormatError(rawInput, periodStr);
}

// ==============================================================================
// GAME NUMBER PARSING
// ==============================================================================

/**
 * Parse game number: G2, GM1, #2, etc.
 */
export function parseGameNumber(gameStr: string, rawInput: string): number {
  const cleaned = gameStr.toLowerCase().trim();

  // Patterns: g2, gm1, #2
  const match = cleaned.match(/^(?:g(?:m)?(\d+)|#(\d+))$/);
  if (!match) {
    throw new InvalidGameNumberError(rawInput, gameStr);
  }

  const gameNum = parseInt(match[1] || match[2]);
  if (gameNum < 1 || gameNum > 10) {
    // Reasonable bounds
    throw new InvalidGameNumberError(rawInput, gameStr);
  }

  return gameNum;
}

// ==============================================================================
// ROTATION NUMBER PARSING
// ==============================================================================

/**
 * Parse rotation number (must appear immediately after YG/IW)
 */
export function parseRotationNumber(rotationStr: string, rawInput: string): number {
  const value = parseInt(rotationStr.trim());

  if (isNaN(value) || value < 1 || value > 9999) {
    throw new InvalidRotationNumberError(rawInput, rotationStr);
  }

  return value;
}

// ==============================================================================
// TEAM PARSING
// ==============================================================================

/**
 * Clean and validate team name
 */
export function parseTeam(teamStr: string, rawInput: string): string {
  const cleaned = teamStr.trim();

  if (!cleaned) {
    throw new InvalidTeamFormatError(rawInput, teamStr, 'Team name cannot be empty');
  }

  // Basic validation - allow letters, numbers, spaces, &, and common punctuation
  if (!/^[a-zA-Z0-9\s&\-.']+$/.test(cleaned)) {
    throw new InvalidTeamFormatError(rawInput, teamStr, 'Team name contains invalid characters');
  }

  if (cleaned.length > 50) {
    throw new InvalidTeamFormatError(rawInput, teamStr, 'Team name too long (max 50 characters)');
  }

  return cleaned;
}

/**
 * Parse teams string: "Team1/Team2" or just "Team1"
 */
export function parseTeams(teamsStr: string, rawInput: string): { team1: string; team2?: string } {
  const parts = teamsStr.split('/');

  if (parts.length === 1) {
    return { team1: parseTeam(parts[0], rawInput) };
  } else if (parts.length === 2) {
    return {
      team1: parseTeam(parts[0], rawInput),
      team2: parseTeam(parts[1], rawInput),
    };
  } else {
    throw new InvalidTeamFormatError(rawInput, teamsStr, 'Too many "/" separators');
  }
}

// ==============================================================================
// SPORT/LEAGUE INFERENCE
// ==============================================================================

/**
 * Infer sport and league from context (rotation number, teams, etc.)
 * This is a simplified version - in practice, you might use rotation number ranges
 */
export function inferSportAndLeague(rotationNumber?: number): { sport: Sport; league: League } {
  // Default to MLB for now - in practice you'd use rotation number ranges
  // and other heuristics to determine sport/league
  if (rotationNumber) {
    // Example heuristics (adjust based on your sportsbook's rotation number scheme):
    if (rotationNumber >= 500 && rotationNumber < 600) {
      return { sport: 'Basketball', league: 'NBA' };
    }
    if (rotationNumber >= 800 && rotationNumber < 900) {
      return { sport: 'Baseball', league: 'MLB' };
    }
  }

  // Default
  return { sport: 'Baseball', league: 'MLB' };
}

// ==============================================================================
// TEXT UTILITIES
// ==============================================================================

/**
 * Case-insensitive text matching
 */
export function matchesIgnoreCase(text: string, pattern: string): boolean {
  return text.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Extract over/under from text: "o4.5" -> { isOver: true, line: 4.5 }
 */
export function parseOverUnder(ouStr: string, rawInput: string): { isOver: boolean; line: number } {
  const match = ouStr.toLowerCase().match(/^([ou])(.+)$/);
  if (!match) {
    throw new InvalidLineValueError(rawInput, parseFloat(ouStr));
  }

  const isOver = match[1] === 'o';
  const line = parseLine(match[2], rawInput);

  return { isOver, line };
}

// ==============================================================================
// PROP TYPE DETECTION
// ==============================================================================

export type PropCategory = 'PropOU' | 'PropYN';

export interface PropTypeInfo {
  standardName: string;
  category: PropCategory;
}

/**
 * Map of prop keywords to their standardized names and categories
 * Based on the provided prop type table
 */
const PROP_TYPE_MAP: Record<string, PropTypeInfo> = {
  // PropOU (Over/Under) - MUST have line
  'passing yards': { standardName: 'PassingYards', category: 'PropOU' },
  passingyards: { standardName: 'PassingYards', category: 'PropOU' },
  rbi: { standardName: 'RBI', category: 'PropOU' },
  rbis: { standardName: 'RBI', category: 'PropOU' },
  rebounds: { standardName: 'Rebounds', category: 'PropOU' },
  rebs: { standardName: 'Rebounds', category: 'PropOU' },
  'receiving yards': { standardName: 'ReceivingYards', category: 'PropOU' },
  receivingyards: { standardName: 'ReceivingYards', category: 'PropOU' },
  ks: { standardName: 'Ks', category: 'PropOU' },
  strikeouts: { standardName: 'Ks', category: 'PropOU' },

  // PropYN (Yes/No) - MAY NOT have line
  'first team to score': { standardName: 'FirstToScore', category: 'PropYN' },
  '1st team to score': { standardName: 'FirstToScore', category: 'PropYN' },
  'first to score': { standardName: 'FirstToScore', category: 'PropYN' },
  'last team to score': { standardName: 'LastToScore', category: 'PropYN' },
  'last to score': { standardName: 'LastToScore', category: 'PropYN' },
};

/**
 * Detect prop type from text and return standardized info
 */
export function detectPropType(propText: string): PropTypeInfo | null {
  const cleanText = propText.toLowerCase().trim();

  // Check for exact matches first
  for (const [keyword, info] of Object.entries(PROP_TYPE_MAP)) {
    // Use word boundaries to ensure we match the complete phrase, not just substrings
    // This prevents "1st inning" from matching "1st team to score"
    const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`);
    if (regex.test(cleanText)) {
      return info;
    }
  }

  return null;
}

/**
 * Validate prop format based on category
 */
export function validatePropFormat(propText: string, hasLine: boolean, rawInput: string): void {
  const propInfo = detectPropType(propText);

  if (!propInfo) {
    throw new InvalidContractTypeError(rawInput, `Unsupported prop type: ${propText}`);
  }

  if (propInfo.category === 'PropOU' && !hasLine) {
    throw new InvalidContractTypeError(
      rawInput,
      `${propInfo.standardName} props require an over/under line (e.g., "o12.5")`
    );
  }

  if (propInfo.category === 'PropYN' && hasLine) {
    throw new InvalidContractTypeError(
      rawInput,
      `${propInfo.standardName} props cannot have a line - they are yes/no bets only`
    );
  }
}
