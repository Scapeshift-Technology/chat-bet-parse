/**
 * Utility functions for parsing chat betting messages
 * Implements core patterns from EBNF grammar
 */

import {
  type Period,
  type Sport,
  type League,
  leagueSportMap,
  type KnownLeague,
} from '../types/index';
import {
  InvalidPriceFormatError,
  InvalidSizeFormatError,
  InvalidLineValueError,
  InvalidPeriodFormatError,
  InvalidGameNumberError,
  InvalidRotationNumberError,
  InvalidTeamFormatError,
  InvalidContractTypeError,
  InvalidWriteinDateError,
  InvalidWriteinDescriptionError,
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

export type SizeFormat = 'unit' | 'decimal_thousands' | 'k_notation' | 'dollar' | 'plain_number';

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

  // Plain number or decimal thousands format
  const value = parseFloat(cleaned);
  if (isNaN(value) || value < 0) {
    throw new InvalidSizeFormatError(
      rawInput,
      sizeStr,
      'positive number like 100 (=$100) or 2.5 (=$2500)'
    );
  }

  // Only multiply by 1000 if there's a decimal point in the input
  // e.g., "2.0" -> 2000, "2.5" -> 2500, but "100" -> 100, "999" -> 999
  if (cleaned.includes('.')) {
    return { value: value * 1000, format: 'decimal_thousands' };
  } else {
    return { value: value, format: 'plain_number' };
  }
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

  // First three innings pattern: f3
  if (cleaned === 'f3') {
    return { PeriodTypeCode: 'H', PeriodNumber: 13 };
  }

  // First seven innings pattern: f7
  if (cleaned === 'f7') {
    return { PeriodTypeCode: 'H', PeriodNumber: 17 };
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
 * Parse game number: G2, GM1, #2, G 2, GM 1, # 2, etc.
 */
export function parseGameNumber(gameStr: string, rawInput: string): number {
  const cleaned = gameStr.toLowerCase().trim();

  // Patterns: g2, gm1, #2, g 2, gm 1, # 2
  const match = cleaned.match(/^(?:g(?:m)?\s*(\d+)|#\s*(\d+))$/);
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
 * Clean and validate team name, with detection for individual contestants
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
 * Detect if a contestant name is an individual (follows pattern like "B. Falter")
 */
export function detectContestantType(
  contestant: string
): import('../types/index').ContestantType | undefined {
  // Check for individual pattern: single letter, dot, space, then name
  if (/^[A-Z]\.\s+[A-Za-z]+/.test(contestant)) {
    return 'Individual';
  }

  return undefined;
}

/**
 * Parse teams string: "Team1/Team2" or just "Team1"
 */
export function parseTeams(teamsStr: string, rawInput: string): { team1: string; team2?: string } {
  const parts = teamsStr.split('/');

  if (parts.length === 1) {
    return { team1: parseTeam(parts[0], rawInput) };
  } else if (parts.length === 2) {
    const team1 = parseTeam(parts[0], rawInput);
    const team2 = parseTeam(parts[1], rawInput);

    // Check for duplicate teams
    if (team1 === team2) {
      throw new InvalidTeamFormatError(
        rawInput,
        teamsStr,
        `Team1 and Team2 cannot be the same: "${team1}"`
      );
    }

    return {
      team1,
      team2,
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
export function inferSportAndLeague(
  rotationNumber?: number,
  explicitLeague?: KnownLeague,
  explicitSport?: Sport
): { sport?: Sport; league?: League } {
  let sport = explicitSport;
  let league = explicitLeague;

  if (explicitLeague && explicitSport && leagueSportMap[explicitLeague] !== explicitSport) {
    throw new Error('Conflicting explicit league and sport specifications');
  }

  if (explicitLeague && !sport) {
    sport = leagueSportMap[explicitLeague];
  }
  if (league === 'FCS') {
    league = 'CFB';
  }

  // Infer from rotation if needed
  if ((!sport || !league) && rotationNumber) {
    // Existing inference logic
    // use rotation number ranges and other heuristics to determine sport/league
    if (rotationNumber >= 100 && rotationNumber < 499) {
      const inferredSport = 'Football';
      // TODO: Enhance to infer specific league based on range
      if (!sport) sport = inferredSport;
      return { sport: 'Football' }; // observed 169,215 -> CFB, 709 -> CFL, 103,277,455 -> NFL
    }
    if (rotationNumber >= 500 && rotationNumber < 700) {
      const inferredSport = 'Basketball';
      if (!sport) sport = inferredSport;
      return { sport: 'Basketball' }; // observed 611-628 -> wnba, 500-600 -> nba
    }
    if (
      (rotationNumber >= 800 && rotationNumber < 900) ||
      (rotationNumber >= 9900 && rotationNumber < 10000)
    ) {
      const inferredSport = 'Baseball';
      if (!sport) sport = inferredSport;
      return { sport: 'Baseball' }; // observed 872, 901-926 -> mlb.. todo observer college baseball
    }
  }

  // Default
  return { sport, league };
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
 * Also handles attached prices: "u2.5-125" -> { isOver: false, line: 2.5, attachedPrice: -125 }
 */
export function parseOverUnder(
  ouStr: string,
  rawInput: string
): {
  isOver: boolean;
  line: number;
  attachedPrice?: number;
} {
  const match = ouStr.toLowerCase().match(/^([ou])(.+)$/);
  if (!match) {
    throw new InvalidLineValueError(rawInput, parseFloat(ouStr));
  }

  const isOver = match[1] === 'o';
  const lineAndPrice = match[2];

  // Check if there's a price attached directly to the line (e.g., "2.5-125" or "2.5+125")
  const attachedPriceMatch = lineAndPrice.match(/^(\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)$/);
  if (attachedPriceMatch) {
    const line = parseLine(attachedPriceMatch[1], rawInput);
    const priceStr = attachedPriceMatch[2];
    const attachedPrice = parsePrice(priceStr, rawInput);
    return { isOver, line, attachedPrice };
  }

  // No attached price, parse normally
  const line = parseLine(lineAndPrice, rawInput);
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
  'to score first': { standardName: 'FirstToScore', category: 'PropYN' },
  'last team to score': { standardName: 'LastToScore', category: 'PropYN' },
  'last to score': { standardName: 'LastToScore', category: 'PropYN' },
  'to score last': { standardName: 'LastToScore', category: 'PropYN' },
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

// ==============================================================================
// WRITEIN CONTRACT UTILITIES
// ==============================================================================

/**
 * Parse writein date with multiple format support and smart year inference
 */
export function parseWriteinDate(dateString: string, rawInput: string): Date {
  const cleaned = dateString.trim();

  if (!cleaned) {
    throw new InvalidWriteinDateError(rawInput, dateString, 'Date cannot be empty');
  }

  // Try parsing various date formats
  let parsedDate: Date | null = null;
  const currentYear = new Date().getFullYear();
  const today = new Date();

  // Format patterns to try
  const patterns = [
    // Full date patterns with year
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/, // YYYY/MM/DD or YYYY-MM-DD
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/, // MM/DD/YYYY or MM-DD-YYYY

    // Date patterns without year
    /^(\d{1,2})[/-](\d{1,2})$/, // MM/DD or MM-DD
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let year: number, month: number, day: number;

      if (match.length === 4) {
        // Full date with year
        if (pattern.source.startsWith('^(\\d{4})')) {
          // YYYY/MM/DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]);
          day = parseInt(match[3]);
        } else {
          // MM/DD/YYYY format
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        }
      } else {
        // Date without year - smart year inference
        month = parseInt(match[1]);
        day = parseInt(match[2]);

        // Create a date with current year first
        const dateThisYear = new Date(currentYear, month - 1, day);

        if (dateThisYear >= today) {
          // If date is today or in the future, use current year
          year = currentYear;
        } else {
          // If date is in the past, use next year
          year = currentYear + 1;
        }
      }

      // Create and validate the date
      const testDate = new Date(year, month - 1, day);

      // Check if the date is valid (handles invalid dates like Feb 30)
      if (
        testDate.getFullYear() === year &&
        testDate.getMonth() === month - 1 &&
        testDate.getDate() === day
      ) {
        parsedDate = testDate;
        break;
      } else {
        throw new InvalidWriteinDateError(
          rawInput,
          dateString,
          `Invalid calendar date (e.g., February 30th doesn't exist)`
        );
      }
    }
  }

  if (!parsedDate) {
    throw new InvalidWriteinDateError(
      rawInput,
      dateString,
      'Unable to parse date. Supported formats: YYYY-MM-DD, MM/DD/YYYY, YYYY/MM/DD, MM-DD-YYYY, MM/DD, MM-DD'
    );
  }

  return parsedDate;
}

/**
 * Validate writein description
 */
export function validateWriteinDescription(description: string, rawInput: string): string {
  const trimmed = description.trim();

  if (!trimmed) {
    throw new InvalidWriteinDescriptionError(rawInput, description, 'Description cannot be empty');
  }

  if (trimmed.length < 10) {
    throw new InvalidWriteinDescriptionError(
      rawInput,
      description,
      `Description must be at least 10 characters long (currently ${trimmed.length})`
    );
  }

  if (trimmed.length > 255) {
    throw new InvalidWriteinDescriptionError(
      rawInput,
      description,
      `Description cannot exceed 255 characters (currently ${trimmed.length})`
    );
  }

  // Check for newlines
  if (trimmed.includes('\n') || trimmed.includes('\r')) {
    throw new InvalidWriteinDescriptionError(
      rawInput,
      description,
      'Description cannot contain newlines'
    );
  }

  return trimmed;
}
