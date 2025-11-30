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
  InvalidDateError,
  InvalidWriteinDateError,
  InvalidWriteinDescriptionError,
  InvalidKeywordSyntaxError,
  InvalidKeywordValueError,
  UnknownKeywordError,
  InvalidParlayToWinError,
  MissingRiskTypeError,
  InvalidRiskTypeError,
  InvalidRoundRobinToWinError,
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
// RISK AND TOWIN CALCULATION
// ==============================================================================

/**
 * Calculate risk and toWin amounts from American odds price and size
 *
 * American odds work as follows:
 * - Positive odds (e.g., +150): Size is risk amount → risk = size, toWin = size * odds / 100
 * - Negative odds (e.g., -150): Size is to-win amount → risk = size * abs(odds) / 100, toWin = size
 *
 * @param price - American odds price (must be >= 100 or <= -100)
 * @param size - The bet size/stake amount (interpreted based on odds sign)
 * @returns Object containing risk and toWin amounts, both rounded to 2 decimal places
 */
export function calculateRiskAndToWin(
  price: number,
  size: number
): { risk: number; toWin: number } {
  if (price >= 100) {
    // Positive odds: risk the size to win (size * odds / 100)
    const risk = size;
    const toWin = Math.round(((size * price) / 100) * 100) / 100;
    return { risk, toWin };
  } else if (price <= -100) {
    // Negative odds: risk (size * abs(odds) / 100) to win size
    const absOdds = Math.abs(price);
    const risk = Math.round(((size * absOdds) / 100) * 100) / 100;
    const toWin = size;
    return { risk, toWin };
  } else {
    // Price between -99 and 99 is invalid for American odds
    throw new Error(`Invalid price ${price}: must be >= 100 or <= -100`);
  }
}

/**
 * Calculate toWin from risk amount and price
 */
export function calculateToWinFromRisk(price: number, risk: number): number {
  if (price >= 100) {
    // Positive odds: toWin = risk * odds / 100
    return Math.round(((risk * price) / 100) * 100) / 100;
  } else if (price <= -100) {
    // Negative odds: toWin = risk / (abs(odds) / 100)
    const absOdds = Math.abs(price);
    return Math.round((risk / (absOdds / 100)) * 100) / 100;
  } else {
    throw new Error(`Invalid price ${price}: must be >= 100 or <= -100`);
  }
}

/**
 * Calculate risk from toWin amount and price
 */
export function calculateRiskFromToWin(price: number, toWin: number): number {
  if (price >= 100) {
    // Positive odds: risk = toWin / (odds / 100)
    return Math.round((toWin / (price / 100)) * 100) / 100;
  } else if (price <= -100) {
    // Negative odds: risk = toWin * (abs(odds) / 100)
    const absOdds = Math.abs(price);
    return Math.round(toWin * (absOdds / 100) * 100) / 100;
  } else {
    throw new Error(`Invalid price ${price}: must be >= 100 or <= -100`);
  }
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
 * Shared size parsing implementation
 */
type SizeInterpretation = 'unit' | 'decimal_thousands';

interface SizeParsingConfig {
  interpretation: SizeInterpretation;
}

/**
 * Validates that commas in a number follow American thousands formatting
 * Valid: 1,234 or 12,345 or 1,234,567
 * Invalid: 1,23 or 123,45 or 1,2345 or 20,30
 */
function validateCommaPlacement(str: string): boolean {
  // If no commas, it's valid
  if (!str.includes(',')) {
    return true;
  }

  // Remove leading $ if present for validation
  const numPart = str.startsWith('$') ? str.substring(1) : str;

  // Remove trailing 'k' if present for validation
  const withoutK = numPart.toLowerCase().endsWith('k') ? numPart.slice(0, -1) : numPart;

  // American thousands format: optional 1-3 digits, then groups of exactly 3 digits separated by commas
  // Examples: 1,234 | 12,345 | 123,456 | 1,234,567 | 12,345,678
  // The pattern is: 1-3 digits, followed by one or more groups of (comma + exactly 3 digits)
  const commaPattern = /^\d{1,3}(,\d{3})+$/;

  return commaPattern.test(withoutK);
}

function parseSize(sizeStr: string, rawInput: string, config: SizeParsingConfig): ParsedSize {
  const cleaned = sizeStr.trim();

  // Validate comma placement before processing
  if (!validateCommaPlacement(cleaned)) {
    throw new InvalidSizeFormatError(
      rawInput,
      sizeStr,
      `Invalid comma placement in number: "${sizeStr}". Use American thousands format (e.g., 1,234 or 12,345)`
    );
  }

  // Remove commas from the string for comma-thousands syntax (e.g., "20,000" or "$15,550")
  const withoutCommas = cleaned.replace(/,/g, '');

  // Dollar + K-notation combination: $11k, $2.5k
  if (withoutCommas.startsWith('$') && withoutCommas.toLowerCase().endsWith('k')) {
    const numPart = withoutCommas.substring(1, withoutCommas.length - 1);
    const value = parseFloat(numPart);
    if (isNaN(value) || value < 0) {
      throw new InvalidSizeFormatError(
        rawInput,
        sizeStr,
        'positive dollar amount with k like $11k or $2.5k'
      );
    }
    return { value: value * 1000, format: 'k_notation' };
  }

  // Dollar format: $200, $2.5, $15,550
  if (withoutCommas.startsWith('$')) {
    const value = parseFloat(withoutCommas.substring(1));
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
  if (withoutCommas.toLowerCase().endsWith('k')) {
    const value = parseFloat(withoutCommas.slice(0, -1));
    if (isNaN(value) || value < 0) {
      throw new InvalidSizeFormatError(rawInput, sizeStr, 'positive number with k like 4k or 2.5k');
    }
    return { value: value * 1000, format: 'k_notation' };
  }

  // Plain number or decimal format (including comma-thousands like 20,000)
  const value = parseFloat(withoutCommas);
  if (isNaN(value) || value < 0) {
    const errorHint =
      config.interpretation === 'decimal_thousands'
        ? 'positive number like 100 (=$100) or 2.5 (=$2500)'
        : 'positive decimal number like 2.0 or 0.50';
    throw new InvalidSizeFormatError(rawInput, sizeStr, errorHint);
  }

  // Apply interpretation based on config
  if (config.interpretation === 'decimal_thousands' && withoutCommas.includes('.')) {
    return { value: value * 1000, format: 'decimal_thousands' };
  } else if (config.interpretation === 'decimal_thousands') {
    return { value, format: 'plain_number' };
  } else {
    return { value, format: 'unit' };
  }
}

/**
 * Parse size for chat orders (unit interpretation)
 */
export function parseOrderSize(sizeStr: string, rawInput: string): ParsedSize {
  return parseSize(sizeStr, rawInput, { interpretation: 'unit' });
}

/**
 * Parse size for chat fills (thousands interpretation for decimals)
 */
export function parseFillSize(sizeStr: string, rawInput: string): ParsedSize {
  return parseSize(sizeStr, rawInput, { interpretation: 'decimal_thousands' });
}

// ==============================================================================
// STRAIGHT BET SIZE PARSING (Extended Syntax)
// ==============================================================================

export interface ParsedStraightSize {
  risk?: number;
  toWin?: number;
  size?: number; // For backward compatibility when using simple size syntax
}

/**
 * Parse straight bet size specification with support for extended syntax
 * Formats:
 *   Simple: "= 2.5" or "= $100" (sets size, caller infers risk/toWin from price)
 *   Risk + ToWin: "= $110 tw $100" or "= $110 to win $100"
 *   Risk + ToPay: "= $120 tp $220" or "= $120 to pay $220" (calculates toWin = toPay - risk)
 *   Risk only: "= risk $110" (caller calculates toWin from price)
 *   ToWin only: "= towin $150" (caller calculates risk from price)
 */
export function parseStraightSize(
  sizeText: string,
  rawInput: string,
  interpretation: SizeInterpretation
): ParsedStraightSize {
  // Remove leading '='
  if (!sizeText.startsWith('=')) {
    throw new InvalidSizeFormatError(rawInput, sizeText, 'Size must start with =');
  }

  const text = sizeText.slice(1).trim();

  // Check for "tw" or "to win" syntax: "= $110 tw $100" or "= $110 to win $100"
  const twMatch = text.match(/^([$\d.,]+k?)\s+(?:tw|to\s+win)\s+([$\d.,]+k?)$/i);
  if (twMatch) {
    const riskParsed = parseSize(twMatch[1], rawInput, { interpretation });
    const toWinParsed = parseSize(twMatch[2], rawInput, { interpretation });
    return { risk: riskParsed.value, toWin: toWinParsed.value };
  }

  // Check for "tp" or "to pay" syntax: "= $120 tp $220" or "= $120 to pay $220"
  const tpMatch = text.match(/^([$\d.,]+k?)\s+(?:tp|to\s+pay)\s+([$\d.,]+k?)$/i);
  if (tpMatch) {
    const riskParsed = parseSize(tpMatch[1], rawInput, { interpretation });
    const toPayParsed = parseSize(tpMatch[2], rawInput, { interpretation });
    const toWin = toPayParsed.value - riskParsed.value;
    if (toWin < 0) {
      throw new InvalidSizeFormatError(
        rawInput,
        sizeText,
        'To-pay amount must be greater than risk amount'
      );
    }
    return { risk: riskParsed.value, toWin: Math.round(toWin * 100) / 100 };
  }

  // Check for "risk" keyword: "= risk $110"
  const riskMatch = text.match(/^risk\s+([$\d.,]+k?)$/i);
  if (riskMatch) {
    const riskParsed = parseSize(riskMatch[1], rawInput, { interpretation });
    return { risk: riskParsed.value };
  }

  // Check for "towin" keyword: "= towin $150"
  const toWinMatch = text.match(/^towin\s+([$\d.,]+k?)$/i);
  if (toWinMatch) {
    const toWinParsed = parseSize(toWinMatch[1], rawInput, { interpretation });
    return { toWin: toWinParsed.value };
  }

  // Simple size format (backward compatibility): "= 2.5" or "= $100"
  const sizeMatch = text.match(/^([$\d.,]+k?)$/);
  if (sizeMatch) {
    const sizeParsed = parseSize(sizeMatch[1], rawInput, { interpretation });
    return { size: sizeParsed.value };
  }

  // No valid format matched
  throw new InvalidSizeFormatError(
    rawInput,
    sizeText,
    'Format: "= $100", "= $110 tw $100", "= $120 tp $220", "= risk $110", or "= towin $150"'
  );
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

  // Patterns: g2, gm1, game2, #2, g 2, gm 1, game 3, # 2
  const match = cleaned.match(/^(?:(?:game|gm|g)\s*(\d+)|#\s*(\d+))$/);
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
  // Normalize league aliases to their canonical forms
  if (league === 'FCS') {
    league = 'CFB';
  }
  if (league === 'CBB') {
    league = 'CBK';
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
    if (rotationNumber >= 500 && rotationNumber < 800) {
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
 * Extract player name and optional team affiliation
 * Pattern: "Cooper Flagg (DAL)" or "B. Falter"
 *
 * @param text - Player text potentially containing team in parentheses
 * @returns Object with player name and optional team
 */
export function parsePlayerWithTeam(text: string): { player: string; team?: string } {
  const trimmed = text.trim();

  // Pattern: "Name (TEAM)" where TEAM is 2-4 uppercase letters
  const match = trimmed.match(/^(.+?)\s*\(([A-Z]{2,4})\)$/);

  if (match) {
    return {
      player: match[1].trim(),
      team: match[2].trim(),
    };
  }

  // No team affiliation - just return player name
  return { player: trimmed };
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
  contestantType?: 'Individual' | 'TeamLeague';
}

/**
 * Map of prop keywords to their standardized names, categories, and contestant types
 * Based on the provided prop type table and comprehensive sports betting research
 */
const PROP_TYPE_MAP: Record<string, PropTypeInfo> = {
  // ============================================================================
  // BASEBALL PROPS
  // ============================================================================

  // Baseball - Hitting (Individual)
  hits: { standardName: 'Hits', category: 'PropOU', contestantType: 'Individual' },
  'total bases': { standardName: 'TotalBases', category: 'PropOU', contestantType: 'Individual' },
  singles: { standardName: 'Singles', category: 'PropOU', contestantType: 'Individual' },
  doubles: { standardName: 'Doubles', category: 'PropOU', contestantType: 'Individual' },
  triples: { standardName: 'Triples', category: 'PropOU', contestantType: 'Individual' },
  'home runs': { standardName: 'HomeRuns', category: 'PropOU', contestantType: 'Individual' },
  hrs: { standardName: 'HomeRuns', category: 'PropOU', contestantType: 'Individual' },
  'runs scored': { standardName: 'RunsScored', category: 'PropOU', contestantType: 'Individual' },
  // Note: "runs" is ambiguous (appears in game totals like "o0.5 runs"), so it's excluded
  rbi: { standardName: 'RBI', category: 'PropOU', contestantType: 'Individual' },
  rbis: { standardName: 'RBI', category: 'PropOU', contestantType: 'Individual' },
  walks: { standardName: 'Walks', category: 'PropOU', contestantType: 'Individual' },
  bb: { standardName: 'Walks', category: 'PropOU', contestantType: 'Individual' },
  'stolen bases': { standardName: 'StolenBases', category: 'PropOU', contestantType: 'Individual' },
  sb: { standardName: 'StolenBases', category: 'PropOU', contestantType: 'Individual' },

  // Baseball - Pitching (Individual)
  ks: { standardName: 'Ks', category: 'PropOU', contestantType: 'Individual' },
  strikeouts: { standardName: 'Ks', category: 'PropOU', contestantType: 'Individual' },
  'earned runs': { standardName: 'EarnedRuns', category: 'PropOU', contestantType: 'Individual' },
  er: { standardName: 'EarnedRuns', category: 'PropOU', contestantType: 'Individual' },
  'hits allowed': { standardName: 'HitsAllowed', category: 'PropOU', contestantType: 'Individual' },
  'walks allowed': {
    standardName: 'WalksAllowed',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  'innings pitched': {
    standardName: 'InningsPitched',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  ip: { standardName: 'InningsPitched', category: 'PropOU', contestantType: 'Individual' },
  'pitches thrown': {
    standardName: 'PitchesThrown',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  pitches: { standardName: 'PitchesThrown', category: 'PropOU', contestantType: 'Individual' },
  'outs recorded': {
    standardName: 'OutsRecorded',
    category: 'PropOU',
    contestantType: 'Individual',
  },

  // Baseball - Yes/No (Individual)
  'to record a hit': {
    standardName: 'ToRecordAHit',
    category: 'PropYN',
    contestantType: 'Individual',
  },
  'to get a hit': {
    standardName: 'ToRecordAHit',
    category: 'PropYN',
    contestantType: 'Individual',
  },
  'to hit a home run': {
    standardName: 'ToHitHomeRun',
    category: 'PropYN',
    contestantType: 'Individual',
  },
  'to hit a hr': { standardName: 'ToHitHomeRun', category: 'PropYN', contestantType: 'Individual' },
  'to steal a base': {
    standardName: 'ToStealBase',
    category: 'PropYN',
    contestantType: 'Individual',
  },
  'to record a win': {
    standardName: 'ToRecordWin',
    category: 'PropYN',
    contestantType: 'Individual',
  },

  // ============================================================================
  // FOOTBALL PROPS
  // ============================================================================

  // Football - Passing (Individual)
  'passing yards': {
    standardName: 'PassingYards',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  passingyards: { standardName: 'PassingYards', category: 'PropOU', contestantType: 'Individual' },
  'pass yards': { standardName: 'PassingYards', category: 'PropOU', contestantType: 'Individual' },
  'pass yds': { standardName: 'PassingYards', category: 'PropOU', contestantType: 'Individual' },
  'passing tds': { standardName: 'PassingTDs', category: 'PropOU', contestantType: 'Individual' },
  'pass tds': { standardName: 'PassingTDs', category: 'PropOU', contestantType: 'Individual' },
  completions: { standardName: 'Completions', category: 'PropOU', contestantType: 'Individual' },
  'pass completions': {
    standardName: 'Completions',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  'pass attempts': {
    standardName: 'PassAttempts',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  interceptions: {
    standardName: 'Interceptions',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  ints: { standardName: 'Interceptions', category: 'PropOU', contestantType: 'Individual' },
  'longest completion': {
    standardName: 'LongestCompletion',
    category: 'PropOU',
    contestantType: 'Individual',
  },

  // Football - Rushing (Individual)
  'rushing yards': {
    standardName: 'RushingYards',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  'rush yards': { standardName: 'RushingYards', category: 'PropOU', contestantType: 'Individual' },
  'rush yds': { standardName: 'RushingYards', category: 'PropOU', contestantType: 'Individual' },
  'rushing tds': { standardName: 'RushingTDs', category: 'PropOU', contestantType: 'Individual' },
  'rush tds': { standardName: 'RushingTDs', category: 'PropOU', contestantType: 'Individual' },
  'rush attempts': {
    standardName: 'RushAttempts',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  carries: { standardName: 'RushAttempts', category: 'PropOU', contestantType: 'Individual' },
  'longest rush': { standardName: 'LongestRush', category: 'PropOU', contestantType: 'Individual' },

  // Football - Receiving (Individual)
  'receiving yards': {
    standardName: 'ReceivingYards',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  receivingyards: {
    standardName: 'ReceivingYards',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  'rec yards': { standardName: 'ReceivingYards', category: 'PropOU', contestantType: 'Individual' },
  'rec yds': { standardName: 'ReceivingYards', category: 'PropOU', contestantType: 'Individual' },
  'receiving tds': {
    standardName: 'ReceivingTDs',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  'rec tds': { standardName: 'ReceivingTDs', category: 'PropOU', contestantType: 'Individual' },
  receptions: { standardName: 'Receptions', category: 'PropOU', contestantType: 'Individual' },
  catches: { standardName: 'Receptions', category: 'PropOU', contestantType: 'Individual' },
  'longest reception': {
    standardName: 'LongestReception',
    category: 'PropOU',
    contestantType: 'Individual',
  },

  // Football - Defense/Special Teams (Individual)
  tackles: { standardName: 'Tackles', category: 'PropOU', contestantType: 'Individual' },
  sacks: { standardName: 'Sacks', category: 'PropOU', contestantType: 'Individual' },
  'tackles and assists': {
    standardName: 'TacklesAndAssists',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  'field goals made': {
    standardName: 'FieldGoalsMade',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  'fgs made': { standardName: 'FieldGoalsMade', category: 'PropOU', contestantType: 'Individual' },
  'extra points': { standardName: 'ExtraPoints', category: 'PropOU', contestantType: 'Individual' },
  xp: { standardName: 'ExtraPoints', category: 'PropOU', contestantType: 'Individual' },
  'kicking points': {
    standardName: 'KickingPoints',
    category: 'PropOU',
    contestantType: 'Individual',
  },

  // Football - Yes/No (Individual)
  'anytime td': { standardName: 'AnytimeTD', category: 'PropYN', contestantType: 'Individual' },
  'anytime touchdown': {
    standardName: 'AnytimeTD',
    category: 'PropYN',
    contestantType: 'Individual',
  },
  'to score a touchdown': {
    standardName: 'AnytimeTD',
    category: 'PropYN',
    contestantType: 'Individual',
  },
  'first td': { standardName: 'FirstTD', category: 'PropYN', contestantType: 'Individual' },
  'first touchdown': { standardName: 'FirstTD', category: 'PropYN', contestantType: 'Individual' },
  'last td': { standardName: 'LastTD', category: 'PropYN', contestantType: 'Individual' },
  'last touchdown': { standardName: 'LastTD', category: 'PropYN', contestantType: 'Individual' },
  '2+ tds': { standardName: 'TwoOrMoreTDs', category: 'PropYN', contestantType: 'Individual' },
  '3+ tds': { standardName: 'ThreeOrMoreTDs', category: 'PropYN', contestantType: 'Individual' },

  // Football - Team Stats (TeamLeague)
  'team passing yards': {
    standardName: 'PassingYards',
    category: 'PropOU',
    contestantType: 'TeamLeague',
  },
  'team rushing yards': {
    standardName: 'TeamRushingYards',
    category: 'PropOU',
    contestantType: 'TeamLeague',
  },
  'team sacks': { standardName: 'TeamSacks', category: 'PropOU', contestantType: 'TeamLeague' },

  // ============================================================================
  // BASKETBALL PROPS
  // ============================================================================

  // Basketball - Scoring (Individual)
  points: { standardName: 'Points', category: 'PropOU', contestantType: 'Individual' },
  pts: { standardName: 'Points', category: 'PropOU', contestantType: 'Individual' },

  // Basketball - Rebounding (Individual)
  rebounds: { standardName: 'Rebounds', category: 'PropOU', contestantType: 'Individual' },
  rebs: { standardName: 'Rebounds', category: 'PropOU', contestantType: 'Individual' },
  'total rebounds': { standardName: 'Rebounds', category: 'PropOU', contestantType: 'Individual' },

  // Basketball - Assists (Individual)
  assists: { standardName: 'Assists', category: 'PropOU', contestantType: 'Individual' },
  ast: { standardName: 'Assists', category: 'PropOU', contestantType: 'Individual' },
  asts: { standardName: 'Assists', category: 'PropOU', contestantType: 'Individual' },

  // Basketball - Defense (Individual)
  steals: { standardName: 'Steals', category: 'PropOU', contestantType: 'Individual' },
  stls: { standardName: 'Steals', category: 'PropOU', contestantType: 'Individual' },
  blocks: { standardName: 'Blocks', category: 'PropOU', contestantType: 'Individual' },
  blks: { standardName: 'Blocks', category: 'PropOU', contestantType: 'Individual' },
  'steals and blocks': {
    standardName: 'StealsAndBlocks',
    category: 'PropOU',
    contestantType: 'Individual',
  },

  // Basketball - Other (Individual)
  turnovers: { standardName: 'Turnovers', category: 'PropOU', contestantType: 'Individual' },
  tos: { standardName: 'Turnovers', category: 'PropOU', contestantType: 'Individual' },
  'three pointers made': {
    standardName: 'ThreePointersMade',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  threes: { standardName: 'ThreePointersMade', category: 'PropOU', contestantType: 'Individual' },
  '3pm': { standardName: 'ThreePointersMade', category: 'PropOU', contestantType: 'Individual' },
  '3-pointers': {
    standardName: 'ThreePointersMade',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  '3pt shots made': {
    standardName: 'ThreePointersMade',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  'free throws made': {
    standardName: 'FreeThrowsMade',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  ftm: { standardName: 'FreeThrowsMade', category: 'PropOU', contestantType: 'Individual' },

  // Basketball - Combo Stats (Individual)
  'points rebounds assists': {
    standardName: 'PRA',
    category: 'PropOU',
    contestantType: 'Individual',
  },
  pra: { standardName: 'PRA', category: 'PropOU', contestantType: 'Individual' },
  'pts+reb+ast': { standardName: 'PRA', category: 'PropOU', contestantType: 'Individual' },
  'pts+rebs+asts': { standardName: 'PRA', category: 'PropOU', contestantType: 'Individual' },
  'points and rebounds': { standardName: 'PR', category: 'PropOU', contestantType: 'Individual' },
  'pts+rebs': { standardName: 'PR', category: 'PropOU', contestantType: 'Individual' },
  'points and assists': { standardName: 'PA', category: 'PropOU', contestantType: 'Individual' },
  'pts+ast': { standardName: 'PA', category: 'PropOU', contestantType: 'Individual' },
  'rebounds and assists': { standardName: 'RA', category: 'PropOU', contestantType: 'Individual' },
  'rebs+ast': { standardName: 'RA', category: 'PropOU', contestantType: 'Individual' },

  // Basketball - Yes/No (Individual)
  'double double': {
    standardName: 'DoubleDouble',
    category: 'PropYN',
    contestantType: 'Individual',
  },
  'to record a double double': {
    standardName: 'DoubleDouble',
    category: 'PropYN',
    contestantType: 'Individual',
  },
  'triple double': {
    standardName: 'TripleDouble',
    category: 'PropYN',
    contestantType: 'Individual',
  },
  'to record a triple double': {
    standardName: 'TripleDouble',
    category: 'PropYN',
    contestantType: 'Individual',
  },

  // ============================================================================
  // CROSS-SPORT TEAM PROPS (TeamLeague)
  // ============================================================================

  'first team to score': {
    standardName: 'FirstToScore',
    category: 'PropYN',
    contestantType: 'TeamLeague',
  },
  '1st team to score': {
    standardName: 'FirstToScore',
    category: 'PropYN',
    contestantType: 'TeamLeague',
  },
  'first to score': {
    standardName: 'FirstToScore',
    category: 'PropYN',
    contestantType: 'TeamLeague',
  },
  'to score first': {
    standardName: 'FirstToScore',
    category: 'PropYN',
    contestantType: 'TeamLeague',
  },
  'last team to score': {
    standardName: 'LastToScore',
    category: 'PropYN',
    contestantType: 'TeamLeague',
  },
  'last to score': {
    standardName: 'LastToScore',
    category: 'PropYN',
    contestantType: 'TeamLeague',
  },
  'to score last': {
    standardName: 'LastToScore',
    category: 'PropYN',
    contestantType: 'TeamLeague',
  },
};

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect prop type from text and return standardized info
 * Note: Matches longest phrases first to avoid partial matches
 */
export function detectPropType(propText: string): PropTypeInfo | null {
  const cleanText = propText.toLowerCase().trim();

  // Sort keywords by length (longest first) to match "team passing yards" before "passing yards"
  const sortedKeywords = Object.entries(PROP_TYPE_MAP).sort(([a], [b]) => b.length - a.length);

  // Check for exact matches, longest first
  for (const [keyword, info] of sortedKeywords) {
    // Use word boundaries to ensure we match the complete phrase, not just substrings
    // This prevents "1st inning" from matching "1st team to score"
    const escapedKeyword = escapeRegex(keyword).replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`);
    if (regex.test(cleanText)) {
      return info;
    }
  }

  return null;
}

/**
 * Extract contestant name and prop keyword from text
 * Handles multi-word names like "Cooper Flagg pts" or "Team123 passing yards"
 *
 * @param text - Text containing contestant and prop (e.g., "Cooper Flagg pts")
 * @returns Object with contestant name and prop keyword
 */
export function extractContestantAndProp(
  text: string
): { contestant: string; propText: string } | null {
  const cleanText = text.trim();

  // Sort keywords by length (longest first) to match "passing yards" before "yards"
  const sortedKeywords = Object.entries(PROP_TYPE_MAP).sort(([a], [b]) => b.length - a.length);

  // Try to find a prop keyword in the text
  for (const [keyword] of sortedKeywords) {
    // Match the keyword at word boundaries
    const escapedKeyword = escapeRegex(keyword).replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b(${escapedKeyword})\\b`, 'i');
    const match = cleanText.match(regex);

    if (match) {
      // Extract contestant (everything before the prop keyword)
      const contestant = cleanText.substring(0, match.index).trim();
      const propText = match[1].toLowerCase();

      if (contestant) {
        return { contestant, propText };
      }
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
export function parseWriteinDate(
  dateString: string,
  rawInput: string,
  isWritein: boolean = true,
  referenceDate?: Date
): Date {
  const cleaned = dateString.trim();

  const ErrorClass = isWritein ? InvalidWriteinDateError : InvalidDateError;

  if (!cleaned) {
    throw new ErrorClass(rawInput, dateString, 'Date cannot be empty');
  }

  // Try parsing various date formats
  let parsedDate: Date | null = null;
  const refDate = referenceDate || new Date();
  const currentYear = refDate.getUTCFullYear();
  // Normalize reference date to midnight UTC for date-only comparison
  const today = new Date(
    Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate())
  );

  // Format patterns to try
  const patterns = [
    // Full date patterns with 4-digit year
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/, // YYYY/MM/DD or YYYY-MM-DD
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/, // MM/DD/YYYY or MM-DD-YYYY

    // Full date patterns with 2-digit year
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/, // MM/DD/YY or MM-DD-YY

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
        } else if (pattern.source.includes('(\\d{2})$')) {
          // MM/DD/YY format with 2-digit year
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          const twoDigitYear = parseInt(match[3]);
          // Convert 2-digit year to 4-digit: 00-99 -> 2000-2099
          year = 2000 + twoDigitYear;
        } else {
          // MM/DD/YYYY format with 4-digit year
          month = parseInt(match[1]);
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        }
      } else {
        // Date without year - smart year inference
        month = parseInt(match[1]);
        day = parseInt(match[2]);

        // Create a date with current year first (using UTC to be timezone-agnostic)
        const dateThisYear = new Date(Date.UTC(currentYear, month - 1, day));

        if (dateThisYear >= today) {
          // If date is today or in the future, use current year
          year = currentYear;
        } else {
          // If date is in the past, use next year
          year = currentYear + 1;
        }
      }

      // Validate month and day ranges before creating Date
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        // Month or day out of valid range
        throw new ErrorClass(
          rawInput,
          dateString,
          'Unable to parse date. Supported formats: YYYY-MM-DD, MM/DD/YYYY, YYYY/MM/DD, MM-DD-YYYY, MM/DD, MM-DD'
        );
      }

      // Create and validate the date (using UTC to be timezone-agnostic)
      const testDate = new Date(Date.UTC(year, month - 1, day));

      // Check if the date is valid (handles invalid dates like Feb 30)
      // Use UTC methods for validation to match how we created the date
      if (
        testDate.getUTCFullYear() === year &&
        testDate.getUTCMonth() === month - 1 &&
        testDate.getUTCDate() === day
      ) {
        parsedDate = testDate;
        break;
      } else {
        throw new ErrorClass(
          rawInput,
          dateString,
          `Invalid calendar date (e.g., February 30th doesn't exist)`
        );
      }
    }
  }

  if (!parsedDate) {
    throw new ErrorClass(
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

// ==============================================================================
// KEYWORD PROPERTY PARSING
// ==============================================================================

export interface ParsedKeywords {
  date?: string;
  league?: string;
  freebet?: boolean;
  // Cleaned text with keywords removed
  cleanedText: string;
}

/**
 * Parse and extract keyword properties from contract text
 * Format: key:value (no spaces around colon)
 * Returns parsed keywords and text with keywords removed
 */
/**
 * Shared keyword extraction and validation logic
 * Returns parsed keywords and remaining text parts
 */
interface KeywordParsingResult<T> {
  keywords: Partial<T>;
  remainingParts: string[];
}

function extractAndValidateKeywords<T extends Record<string, any>>(
  text: string,
  rawInput: string,
  allowedKeys: string[],
  parser: (key: string, value: string, keywords: Partial<T>) => void
): KeywordParsingResult<T> {
  const parts = text.trim().split(/\s+/);
  const keywords: Partial<T> = {};
  const remainingParts: string[] = [];

  for (const part of parts) {
    if (part.includes(':')) {
      const [key, ...valueParts] = part.split(':');

      // Validate keyword syntax
      if (valueParts.length === 0 || key === '' || valueParts.join(':') === '') {
        throw new InvalidKeywordSyntaxError(
          rawInput,
          part,
          'Invalid keyword syntax: no spaces allowed around colon'
        );
      }

      const value = valueParts.join(':');

      // Check if keyword is allowed
      if (!allowedKeys.includes(key)) {
        throw new UnknownKeywordError(rawInput, key);
      }

      // Let the parser handle the specific keyword
      parser(key, value, keywords);
    } else {
      // Not a keyword, keep in remaining parts
      remainingParts.push(part);
    }
  }

  return { keywords, remainingParts };
}

export function parseKeywords(
  text: string,
  rawInput: string,
  allowedKeys: string[]
): ParsedKeywords {
  const { keywords, remainingParts } = extractAndValidateKeywords<ParsedKeywords>(
    text,
    rawInput,
    allowedKeys,
    (key, value, keywords) => {
      switch (key) {
        case 'date':
          keywords.date = value;
          break;
        case 'league':
          keywords.league = value;
          break;
        case 'freebet':
          if (value !== 'true') {
            throw new InvalidKeywordValueError(
              rawInput,
              key,
              value,
              'Invalid freebet value: must be "true"'
            );
          }
          keywords.freebet = true;
          break;
      }
    }
  );

  return {
    ...keywords,
    cleanedText: remainingParts.join(' '),
  };
}

// ==============================================================================
// PARLAY KEYWORD PARSING (Stage 2)
// ==============================================================================

export interface ParsedParlayKeywords {
  pusheslose?: boolean;
  tieslose?: boolean;
  freebet?: boolean;
  cleanedText: string;
}

/**
 * Parse parlay-specific keywords (appear on first line only)
 * Format: key:value (no spaces around colon)
 * Returns parsed keywords and text with keywords removed
 */
export function parseParlayKeywords(
  text: string,
  rawInput: string,
  allowedKeys: string[]
): ParsedParlayKeywords {
  // Extract first line (keywords appear on first line only)
  const lines = text.split('\n');
  const firstLine = lines[0];
  const remainingLines = lines.slice(1);

  // Use shared keyword extraction logic
  const { keywords, remainingParts } = extractAndValidateKeywords<ParsedParlayKeywords>(
    firstLine,
    rawInput,
    allowedKeys,
    (key, value, keywords) => {
      switch (key) {
        case 'pusheslose':
        case 'tieslose':
        case 'freebet':
          if (value !== 'true') {
            throw new InvalidKeywordValueError(
              rawInput,
              key,
              value,
              `Invalid ${key} value: must be "true"`
            );
          }
          keywords[key] = true;
          break;
      }
    }
  );

  // Rebuild cleaned text (multiline)
  const cleanedFirstLine = remainingParts.join(' ');
  const allLines = cleanedFirstLine ? [cleanedFirstLine, ...remainingLines] : remainingLines;

  return {
    ...keywords,
    cleanedText: allLines.join('\n'),
  };
}

// ==============================================================================
// PARLAY SIZE PARSING (Stage 2)
// ==============================================================================

export interface ParsedParlaySize {
  risk: number;
  toWin?: number;
  useFair: boolean;
}

export interface ParsedRoundRobinSize {
  risk: number;
  toWin?: number;
  useFair: boolean;
  riskType: 'perSelection' | 'total';
}

/**
 * Parse parlay size specification with optional to-win override
 * Format: "= $100" or "= $100 tw $500"
 */
export function parseParlaySize(sizeText: string, rawInput: string): ParsedParlaySize {
  // Remove leading '='
  if (!sizeText.startsWith('=')) {
    throw new InvalidSizeFormatError(rawInput, sizeText, 'Size must start with =');
  }

  const text = sizeText.slice(1).trim();

  // Check for invalid "towin:500" format
  if (text.match(/towin:/i)) {
    throw new InvalidParlayToWinError(
      rawInput,
      'Invalid to-win format: use "tw $500" not "towin:500"'
    );
  }

  // Check for to-win override (supports $, k-notation, decimal thousands, and comma-thousands)
  const twMatch = text.match(/^([$\d.,]+k?)\s+tw\s+([$\d.,]+k?)$/i);

  if (twMatch) {
    // Has to-win override - use parseFillSize for consistent parsing
    const riskStr = twMatch[1];
    const toWinStr = twMatch[2];

    const riskParsed = parseFillSize(riskStr, rawInput);
    const toWinParsed = parseFillSize(toWinStr, rawInput);

    return { risk: riskParsed.value, toWin: toWinParsed.value, useFair: false };
  }

  // Check for multiple tw (error case)
  if (text.toLowerCase().match(/\btw\b.*\btw\b/)) {
    throw new InvalidParlayToWinError(rawInput, 'To-win amount specified multiple times');
  }

  // Check for invalid tw usage (missing keyword)
  if (text.match(/^[$\d.,]+k?\s+[$\d.,]+k?$/i)) {
    throw new InvalidSizeFormatError(
      rawInput,
      sizeText,
      'Invalid to-win syntax: must use "tw" keyword'
    );
  }

  // No to-win, calculate from fair odds - use parseFillSize for consistent parsing
  const riskMatch = text.match(/^([$\d.,]+k?)$/i);
  if (!riskMatch) {
    throw new InvalidSizeFormatError(
      rawInput,
      sizeText,
      'Format: "= $100", "= 2.5", "= 3k" or "= $100 tw $500"'
    );
  }

  const riskParsed = parseFillSize(riskMatch[1], rawInput);

  return { risk: riskParsed.value, toWin: undefined, useFair: true };
}

/**
 * Parse round robin size with risk type specification
 * Format: "= $100 per" or "= $600 total" or "= $100 per tw $500"
 */
export function parseRoundRobinSize(sizeText: string, rawInput: string): ParsedRoundRobinSize {
  // Remove leading '='
  if (!sizeText.startsWith('=')) {
    throw new InvalidSizeFormatError(rawInput, sizeText, 'Size must start with =');
  }

  const text = sizeText.slice(1).trim();

  // Parse format: $<amount> <type> [tw $<towin>]
  // Example: "$100 per" or "$600 total tw $1500"

  // Check for invalid "towin:500" format (similar to parlay check)
  if (text.match(/towin:/i)) {
    throw new InvalidRoundRobinToWinError(
      rawInput,
      'Invalid to-win format: use "tw $500" not "towin:500"'
    );
  }

  // Check for risk type before size (e.g., "per $100")
  if (text.match(/^(per|total)\s+\$?[\d.]+/i)) {
    throw new InvalidSizeFormatError(rawInput, sizeText, 'Risk type must come after size amount');
  }

  // Check for to-win override (supports $, k-notation, and decimal thousands)
  const twMatch = text.match(/^([$\d.]+k?)\s+(per|total)\s+tw\s+([$\d.]+k?)$/i);

  if (twMatch) {
    // Has to-win override - use parseFillSize for consistent parsing
    const riskStr = twMatch[1];
    const riskTypeRaw = twMatch[2].toLowerCase();
    const toWinStr = twMatch[3];

    const riskParsed = parseFillSize(riskStr, rawInput);
    const toWinParsed = parseFillSize(toWinStr, rawInput);

    // Validate and normalize risk type
    if (riskTypeRaw !== 'per' && riskTypeRaw !== 'total') {
      throw new InvalidRiskTypeError(rawInput, riskTypeRaw);
    }

    // Normalize "per" to "perSelection"
    const riskType = riskTypeRaw === 'per' ? 'perSelection' : 'total';

    return { risk: riskParsed.value, toWin: toWinParsed.value, useFair: false, riskType };
  }

  // Check for missing tw keyword (e.g., "$100 per $500")
  if (text.match(/^[$\d.]+k?\s+(per|total)\s+[$\d.]+k?$/i)) {
    throw new InvalidSizeFormatError(
      rawInput,
      sizeText,
      'Invalid to-win syntax: must use "tw" keyword'
    );
  }

  // No to-win, parse risk and type (supports $, k-notation, and decimal thousands)
  const sizeMatch = text.match(/^([$\d.]+k?)\s+(per|total)$/i);

  if (!sizeMatch) {
    // Check if risk type is missing
    const hasRiskOnly = text.match(/^[$\d.]+k?$/i);
    if (hasRiskOnly) {
      throw new MissingRiskTypeError(rawInput);
    }

    // Check for invalid risk type (not "per" or "total")
    const hasInvalidType = text.match(/^([$\d.]+k?)\s+(\w+)$/i);
    if (hasInvalidType) {
      throw new InvalidRiskTypeError(rawInput, hasInvalidType[2]);
    }

    throw new InvalidSizeFormatError(
      rawInput,
      sizeText,
      'Format: "= $100 per", "= 2.5 total", "= 3k per"'
    );
  }

  const riskParsed = parseFillSize(sizeMatch[1], rawInput);
  const riskTypeRaw = sizeMatch[2].toLowerCase();

  // Validate risk type
  if (riskTypeRaw !== 'per' && riskTypeRaw !== 'total') {
    throw new InvalidRiskTypeError(rawInput, riskTypeRaw);
  }

  // Normalize "per" to "perSelection"
  const riskType = riskTypeRaw === 'per' ? 'perSelection' : 'total';

  return { risk: riskParsed.value, toWin: undefined, useFair: true, riskType };
}

/**
 * Calculate the combination C(n, r) = n! / (r! * (n-r)!)
 * This represents "n choose r" - the number of ways to choose r items from n items
 */
export function calculateCombination(n: number, r: number): number {
  // Handle edge cases
  if (r > n) return 0;
  if (r === 0 || r === n) return 1;

  // Optimize by using the smaller of r or n-r
  if (r > n - r) {
    r = n - r;
  }

  let result = 1;
  for (let i = 0; i < r; i++) {
    result *= n - i;
    result /= i + 1;
  }

  return Math.round(result);
}

/**
 * Calculate the total number of parlays for a round robin bet
 * For exact notation (e.g., 4c2): returns C(n, r)
 * For at-most notation (e.g., 4c3-): returns sum of C(n, 2) + C(n, 3) + ... + C(n, r)
 */
export function calculateTotalParlays(
  totalLegs: number,
  parlaySize: number,
  isAtMost: boolean
): number {
  if (isAtMost) {
    // At-most: sum all combinations from 2-leg parlays up to parlaySize-leg parlays
    let total = 0;
    for (let r = 2; r <= parlaySize; r++) {
      total += calculateCombination(totalLegs, r);
    }
    return total;
  } else {
    // Exact: just calculate C(totalLegs, parlaySize)
    return calculateCombination(totalLegs, parlaySize);
  }
}

/**
 * Convert American odds to decimal odds
 * Positive odds (e.g., +120): decimal = 1 + (odds / 100) → 2.20
 * Negative odds (e.g., -110): decimal = 1 + (100 / abs(odds)) → 1.909090...
 */
export function americanToDecimalOdds(americanOdds: number): number {
  if (americanOdds > 0) {
    return 1 + americanOdds / 100;
  } else {
    return 1 + 100 / Math.abs(americanOdds);
  }
}

/**
 * Calculate fair ToWin for a parlay given leg prices and risk amount
 * Formula: ToWin = Risk × (product of all decimal odds - 1)
 */
export function calculateParlayFairToWin(legPrices: number[], risk: number): number {
  let parlayMultiplier = 1;

  for (const price of legPrices) {
    const decimalOdds = americanToDecimalOdds(price);
    parlayMultiplier *= decimalOdds;
  }

  const toWin = risk * (parlayMultiplier - 1);
  return Math.round(toWin * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate all combinations of indices for nCr
 * Helper function for round robin ToWin calculation
 */
function* generateCombinations(arr: number[], r: number): Generator<number[]> {
  if (r === 0) {
    yield [];
    return;
  }
  if (arr.length === 0) {
    return;
  }

  const [first, ...rest] = arr;

  // Include first element
  for (const combo of generateCombinations(rest, r - 1)) {
    yield [first, ...combo];
  }

  // Exclude first element
  yield* generateCombinations(rest, r);
}

/**
 * Calculate fair ToWin for a round robin given leg prices, risk, and configuration
 * For per-selection: risk is per-parlay amount
 * For total: risk is total, need to divide by number of parlays
 */
export function calculateRoundRobinFairToWin(
  legPrices: number[],
  totalRisk: number,
  riskType: 'perSelection' | 'total',
  parlaySize: number,
  isAtMost: boolean
): number {
  const totalLegs = legPrices.length;
  const totalParlays = calculateTotalParlays(totalLegs, parlaySize, isAtMost);

  // Calculate per-parlay risk
  const perParlayRisk =
    riskType === 'perSelection' ? totalRisk / totalParlays : totalRisk / totalParlays;

  let totalToWin = 0;

  // Generate all parlay combinations
  const parlaysizes = isAtMost
    ? Array.from({ length: parlaySize - 1 }, (_, i) => i + 2)
    : [parlaySize];

  for (const size of parlaysizes) {
    const indices = Array.from({ length: totalLegs }, (_, i) => i);
    for (const combo of generateCombinations(indices, size)) {
      const comboPrices = combo.map(i => legPrices[i]);
      const parlayToWin = calculateParlayFairToWin(comboPrices, perParlayRisk);
      totalToWin += parlayToWin;
    }
  }

  return Math.round(totalToWin * 100) / 100; // Round to 2 decimal places
}
