/**
 * Main parsing engine for chat-bet-parse
 * Implements the EBNF grammar from README.md
 */

import type {
  ParseResult,
  ChatOrderResult,
  ChatFillResult,
  Contract,
  ContractType,
  Match,
  Period,
  Sport,
  League,
  ContractSportCompetitionMatchTotalPoints,
  ContractSportCompetitionMatchTotalPointsContestant,
  ContractSportCompetitionMatchHandicapContestantML,
  ContractSportCompetitionMatchHandicapContestantLine,
  ContractSportCompetitionMatchPropYN,
  ContractSportCompetitionMatchPropOU,
  ContractSportCompetitionSeries,
  ContractWritein,
  KnownLeague,
} from '../types/index';

import { knownLeagues, knownSports } from '../types/index';

import {
  InvalidChatFormatError,
  UnrecognizedChatPrefixError,
  MissingSizeForFillError,
  InvalidContractTypeError,
  InvalidRotationNumberError,
  InvalidTeamFormatError,
  InvalidWriteinFormatError,
} from '../errors/index';

import {
  parsePrice,
  parseOrderSize,
  parseFillSize,
  parsePeriod,
  parseGameNumber,
  parseRotationNumber,
  parseTeams,
  parseOverUnder,
  inferSportAndLeague,
  detectPropType,
  validatePropFormat,
  detectContestantType,
  parseWriteinDate,
  validateWriteinDescription,
} from './utils';

// ==============================================================================
// TOKENIZER
// ==============================================================================

interface ParsedTokens {
  chatType: 'order' | 'fill';
  rotationNumber?: number;
  gameNumber?: number;
  contractText: string;
  explicitLeague?: KnownLeague;
  explicitSport?: Sport;
  price?: number;
  size?: number;
  rawInput: string;
}

interface WriteInTokens {
  chatType: 'order' | 'fill';
  isWritein: true;
  dateString: string;
  description: string;
  price?: number;
  size?: number;
  rawInput: string;
}

type TokenResult = ParsedTokens | WriteInTokens;

/**
 * Type guard to check if tokens are writein
 */
function isWriteinTokens(tokens: TokenResult): tokens is WriteInTokens {
  return 'isWritein' in tokens;
}

/**
 * Tokenize writein contracts
 */
function tokenizeWritein(
  parts: string[],
  chatType: 'order' | 'fill',
  rawInput: string
): WriteInTokens {
  // Expected format: IW/YG writein DATE DESCRIPTION [@ price] [= size]

  if (parts.length < 4) {
    throw new InvalidWriteinFormatError(
      rawInput,
      'Writein contracts require at least a date and description'
    );
  }

  // Check that there's a space between writein and the date
  if (parts[1].toLowerCase() !== 'writein') {
    throw new InvalidWriteinFormatError(
      rawInput,
      'Writein must be separated from date by whitespace'
    );
  }

  let currentIndex = 2; // Start after "writein"

  // Extract date (next token)
  const dateString = parts[currentIndex];
  currentIndex++;

  // Find price and size markers
  let priceIndex = -1;
  let sizeIndex = -1;

  for (let i = currentIndex; i < parts.length; i++) {
    if (parts[i] === '@' && i + 1 < parts.length) {
      priceIndex = i + 1;
    }
    if (parts[i] === '=' && i + 1 < parts.length) {
      sizeIndex = i + 1;
    }
  }

  // Extract description (everything between date and price/size markers)
  let descriptionEndIndex = parts.length;

  // Find the first @ or = to determine where description ends
  for (let i = currentIndex; i < parts.length; i++) {
    if (parts[i] === '@' || parts[i] === '=') {
      descriptionEndIndex = i;
      break;
    }
  }

  if (descriptionEndIndex <= currentIndex) {
    throw new InvalidWriteinFormatError(rawInput, 'Writein contracts must include a description');
  }

  const description = parts.slice(currentIndex, descriptionEndIndex).join(' ');

  // Parse price if present
  let price: number | undefined;
  if (priceIndex > 0 && priceIndex < parts.length) {
    const priceStr = parts[priceIndex];
    // Handle k-notation where price might be missing (default to -110)
    if (priceStr.toLowerCase().endsWith('k') || priceStr.startsWith('$')) {
      price = -110; // Default price for k-notation
      // Adjust sizeIndex since this is actually the size
      if (sizeIndex === -1) {
        sizeIndex = priceIndex;
      }
    } else {
      price = parsePrice(priceStr, rawInput);
    }
  }

  // Parse size if present
  let size: number | undefined;
  if (sizeIndex > 0 && sizeIndex < parts.length) {
    const sizeStr = parts[sizeIndex];
    if (chatType === 'order') {
      const parsed = parseOrderSize(sizeStr, rawInput);
      size = parsed.value;
    } else {
      const parsed = parseFillSize(sizeStr, rawInput);
      size = parsed.value;
    }
  }

  // Validate fill requirements
  if (chatType === 'fill' && size === undefined) {
    throw new MissingSizeForFillError(rawInput);
  }

  return {
    chatType,
    isWritein: true,
    dateString,
    description,
    price: price ?? -110, // Default price
    size,
    rawInput,
  };
}

/**
 * Break down the chat message into tokens according to EBNF grammar
 */
function tokenizeChat(message: string): TokenResult {
  const rawInput = message; // Preserve original input for error reporting

  // Pre-process to handle spacing around = sign
  let processedMessage = message.trim();

  // Handle IWW/YGW shorthand for writeins
  if (processedMessage.toUpperCase().startsWith('IWW ')) {
    processedMessage = 'IW writein ' + processedMessage.substring(4);
  } else if (processedMessage.toUpperCase().startsWith('YGW ')) {
    processedMessage = 'YG writein ' + processedMessage.substring(4);
  }

  // Add spaces around = if they're missing
  processedMessage = processedMessage.replace(/([^=\s])=([^=\s])/g, '$1 = $2'); // no space before or after
  processedMessage = processedMessage.replace(/([^=\s])=(\s)/g, '$1 = $2'); // no space before
  processedMessage = processedMessage.replace(/(\s)=([^=\s])/g, '$1 = $2'); // no space after

  const parts = processedMessage.split(/\s+/);

  if (parts.length < 2) {
    throw new InvalidChatFormatError(rawInput, 'Message too short');
  }

  // Determine chat type
  const prefix = parts[0].toUpperCase();
  let chatType: 'order' | 'fill';

  if (prefix === 'IW') {
    chatType = 'order';
  } else if (prefix === 'YG') {
    chatType = 'fill';
  } else {
    throw new UnrecognizedChatPrefixError(rawInput, prefix);
  }

  // Early detection of writein contracts
  if (parts.length >= 2 && parts[1].toLowerCase() === 'writein') {
    return tokenizeWritein(parts, chatType, rawInput);
  }

  let currentIndex = 1;
  let rotationNumber: number | undefined;
  let price: number | undefined;

  // Check for rotation number (must be immediately after IW/YG)
  if (currentIndex < parts.length && /^\d+$/.test(parts[currentIndex])) {
    rotationNumber = parseRotationNumber(parts[currentIndex], rawInput);
    currentIndex++;
  } else if (currentIndex < parts.length && parts[currentIndex] === 'abc') {
    // Check for specific invalid rotation number test case
    throw new InvalidRotationNumberError(rawInput, parts[currentIndex]);
  }

  // Find price and size markers
  let priceIndex = -1;
  let sizeIndex = -1;
  let atSymbolCount = 0;

  for (let i = currentIndex; i < parts.length; i++) {
    if (parts[i] === '@') {
      atSymbolCount++;
      if (i + 1 < parts.length) {
        priceIndex = i + 1;
      }
    }
    if (parts[i] === '=' && i + 1 < parts.length) {
      sizeIndex = i + 1;
    }
  }

  // Check for multiple @ symbols
  if (atSymbolCount > 1) {
    if (chatType === 'fill') {
      throw new InvalidChatFormatError(
        rawInput,
        'Expected format for fills is: "YG" [rotation_number] contract ["@" usa_price] "=" fill_size'
      );
    } else {
      throw new InvalidChatFormatError(
        rawInput,
        'Expected format for orders is: "IW" [rotation_number] contract ["@" usa_price] ["=" unit_size]'
      );
    }
  }

  // Check for empty price (@ with nothing after it or only whitespace)
  for (let i = currentIndex; i < parts.length; i++) {
    if (parts[i] === '@') {
      if (i + 1 >= parts.length || parts[i + 1] === '' || parts[i + 1].trim() === '') {
        throw new InvalidChatFormatError(rawInput, 'No contract details found');
      }
    }
  }

  // Extract contract text (everything between rotation number and price/@)
  let contractEndIndex = parts.length;

  // Find the first @ or = to determine where contract text ends
  for (let i = currentIndex; i < parts.length; i++) {
    if (parts[i] === '@' || parts[i] === '=') {
      contractEndIndex = i;
      break;
    }
  }

  // Handle special case where price is embedded in contract text (e.g., "Mariners -1.5 +135")
  // Look for USA odds patterns in the contract text
  for (let i = currentIndex; i < contractEndIndex; i++) {
    if (/^[+-]\d+(?:\.\d+)?$/.test(parts[i])) {
      // Check if this is a spread line (small number <= 50 or fractional) or a price (> 100)
      const value = parseFloat(parts[i].substring(1)); // Remove +/- sign

      // Special case: +0 or -0 is always a moneyline - keep it in contract text for type detection
      if (value === 0) {
        // Don't change contractEndIndex - keep +0/-0 in contract text
        // Don't set price here, let the @ price be used instead
        break;
      }
      // If it's likely a price (> 100 or whole number between 50-100), treat as price
      else if (value > 50 && (value > 100 || value % 1 === 0)) {
        // This looks like a price - split the contract text here
        contractEndIndex = i;
        price = parsePrice(parts[i], rawInput);
        break;
      }
      // Otherwise, it's likely a spread line, keep it in the contract text
    }
  }

  if (contractEndIndex <= currentIndex) {
    throw new InvalidChatFormatError(rawInput, 'No contract details found');
  }

  let contractText = parts.slice(currentIndex, contractEndIndex).join(' ');
  let gameNumber: number | undefined;

  // Check for game number at the beginning of contract text (after rotation number)
  // Patterns: G2, GM1, #2, G 2, GM 1, # 2
  const gameNumberAtBeginningMatch = contractText.match(/^(g(?:m)?\s*\d+|#\s*\d+)\s+(.+)$/i);
  if (gameNumberAtBeginningMatch) {
    const gameNumberStr = gameNumberAtBeginningMatch[1];
    const remainingContractText = gameNumberAtBeginningMatch[2];

    try {
      gameNumber = parseGameNumber(gameNumberStr, rawInput);
      contractText = remainingContractText; // Remove game number from contract text
    } catch (error) {
      // If parsing fails, treat it as part of the contract text (not a game number)
      // This handles edge cases where something looks like a game number but isn't
    }
  }

  // Check for attached prices in over/under patterns (e.g., "u2.5-125", "o2.5+125")
  if (price === undefined) {
    const attachedPriceMatch = contractText.match(/([ou])(\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/i);
    if (attachedPriceMatch) {
      // Extract the attached price and clean the contract text
      const attachedPriceStr = attachedPriceMatch[3];
      price = parsePrice(attachedPriceStr, rawInput);
      // Remove the attached price from contract text
      contractText = contractText.replace(
        attachedPriceMatch[0],
        attachedPriceMatch[1] + attachedPriceMatch[2]
      );
    }
  }

  // Parse price if present and not already found
  if (price === undefined && priceIndex > 0 && priceIndex < parts.length) {
    const priceStr = parts[priceIndex];
    // Handle k-notation where price might be missing (default to -110)
    if (priceStr.toLowerCase().endsWith('k') || priceStr.startsWith('$')) {
      price = -110; // Default price for k-notation
      // Adjust sizeIndex since this is actually the size
      if (sizeIndex === -1) {
        sizeIndex = priceIndex;
      }
    } else {
      price = parsePrice(priceStr, rawInput);
    }
  }

  // Parse size if present
  let size: number | undefined;
  if (sizeIndex > 0 && sizeIndex < parts.length) {
    const sizeStr = parts[sizeIndex];
    if (chatType === 'order') {
      const parsed = parseOrderSize(sizeStr, rawInput);
      size = parsed.value;
    } else {
      const parsed = parseFillSize(sizeStr, rawInput);
      size = parsed.value;
    }
  }

  // Validate fill requirements
  if (chatType === 'fill' && size === undefined) {
    throw new MissingSizeForFillError(rawInput);
  }

  // Extract explicit league if at beginning
  let explicitLeague: KnownLeague | undefined;
  const leagueMatch = contractText.match(/^([A-Z]{2,3})\s+(.+)$/);
  if (leagueMatch && knownLeagues.has(leagueMatch[1] as any)) {
    explicitLeague = leagueMatch[1] as KnownLeague;
    contractText = leagueMatch[2];
  }

  // Extract explicit sport if at beginning
  let explicitSport: Sport | undefined;
  const sportMatch = contractText.match(/^([a-zA-Z]+)\s+(.+)$/i);
  if (sportMatch) {
    const potentialSport =
      sportMatch[1].charAt(0).toUpperCase() + sportMatch[1].slice(1).toLowerCase();
    if (knownSports.has(potentialSport as any)) {
      explicitSport = potentialSport as Sport;
      contractText = sportMatch[2];
    }
  }

  // Extract period if at beginning (e.g., "2h Vanderbilt +2.5")
  // Check for common period patterns at the start
  const periodAtStartMatch = contractText.match(
    /^(f5|f3|f7|h1|1h|h2|2h|q1|q2|q3|q4|p1|p2|p3)\s+(.+)$/i
  );
  if (periodAtStartMatch) {
    // Keep the period in the contract text but in a normalized position
    // Move it after the team name so parseMatchInfo can find it properly
    const period = periodAtStartMatch[1];
    const restOfContract = periodAtStartMatch[2];

    // Check if this looks like a spread bet (team name followed by +/- line)
    const spreadMatch = restOfContract.match(/^([a-zA-Z\s&.-]+)\s*([+-]\d+(?:\.\d+)?)/);
    if (spreadMatch) {
      // Insert period between team and line: "Vanderbilt 2h +2.5"
      contractText = `${spreadMatch[1]} ${period} ${spreadMatch[2]}`;
    } else {
      // For other patterns, just append period at the end
      contractText = `${restOfContract} ${period}`;
    }
  }

  return {
    chatType,
    rotationNumber,
    gameNumber,
    contractText,
    price: price ?? -110, // Default price
    explicitLeague,
    explicitSport,
    size,
    rawInput,
  };
}

// ==============================================================================
// CONTRACT TYPE DETECTION
// ==============================================================================

/**
 * Determine contract type from contract text
 */
function detectContractType(contractText: string, rawInput: string): ContractType {
  const text = contractText.toLowerCase().trim();

  // Series bets: contain "series"
  if (text.includes('series')) {
    return 'Series';
  }

  // Team totals: contain " tt " or " tt o/u" or start with "tt"
  if (
    /\stt\s/i.test(contractText) ||
    /\stt\s*[ou]\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?/i.test(contractText) ||
    /^tt\s/i.test(contractText)
  ) {
    // Check if TT appears at the beginning (no team name before it)
    if (/^tt\s/i.test(contractText.trim())) {
      throw new InvalidTeamFormatError(rawInput, '', 'Team name cannot be empty');
    }
    return 'TotalPointsContestant';
  }

  // Props: detect specific prop types and check for over/under lines
  const propInfo = detectPropType(text);
  if (propInfo) {
    // Check if the text contains an over/under line pattern (with or without attached prices)
    const hasLine = /[ou]\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?/i.test(contractText);

    // Validate the prop format
    validatePropFormat(text, hasLine, rawInput);

    return propInfo.category; // Returns 'PropOU' or 'PropYN'
  }

  // Check for prop-like patterns (Player/Team names followed by descriptive text)
  // This catches unsupported prop types that don't match our known patterns
  // Only apply to patterns that look like props (e.g., Player123 something, not generic text)
  if (/^[a-zA-Z0-9]+\s+[a-zA-Z\s]+(yards|rbi|rebounds|score|strikeouts|prop)/i.test(contractText)) {
    // This looks like a prop but isn't in our known types - validate it to get proper error
    const hasLine = /[ou]\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?/i.test(contractText);
    validatePropFormat(text, hasLine, rawInput);
  }

  // Spreads: team name followed by +/- number (but not if it's clearly a price like +145)
  // Can include periods like F5 between team and line
  if (/[a-zA-Z]+(?:\s+[a-zA-Z0-9]+)*\s*[+-]\d+(?:\.\d+)?/i.test(contractText)) {
    // Check if this might be a price rather than a spread
    // Prices are typically > 100 or have decimals like +145, -110.5
    const spreadMatch = contractText.match(
      /([a-zA-Z]+(?:\s+[a-zA-Z0-9]+)*)\s*([+-])(\d+(?:\.\d+)?)/i
    );
    if (spreadMatch) {
      const value = parseFloat(spreadMatch[3]);
      // Special case: +0 or -0 is always a moneyline
      if (value === 0) {
        return 'HandicapContestantML';
      }
      // If it's a decimal number <= 50, it's likely a spread line
      // If it's a whole number > 100, it's likely a price
      if (value <= 50 || value % 1 !== 0) {
        // This is likely a spread (fractional lines like 1.5, 2.5 or low numbers)
        return 'HandicapContestantLine';
      } else if (value > 100 && value % 1 === 0) {
        // This is likely a moneyline with embedded price
        return 'HandicapContestantML';
      } else {
        // For edge cases between 50-100, default to spread
        return 'HandicapContestantLine';
      }
    }
  }

  // Game totals: teams with o/u OR single team with period and o/u
  // Also handle cases where period comes after the total (e.g., "Rangers/Devils u.5 p3")
  // Allow optional leading digit (e.g., "u.5" or "u0.5")
  if (
    /\//.test(contractText) &&
    (/[ou]\d*\.?\d+(?:[+-]\d+(?:\.\d+)?)?(\s+runs)?/i.test(contractText) ||
      /[ou]\d*\.?\d+(?:[+-]\d+(?:\.\d+)?)?\s+(f5|f3|f7|h1|1h|h2|2h|q1|q2|q3|q4|p1|p2|p3)/i.test(
        contractText
      ))
  ) {
    return 'TotalPoints';
  }

  // Single team game totals: team with period and over/under (e.g., "Pirates F5 u4.5")
  if (
    /^[a-zA-Z\s&.-]+\s+(f5|f3|h1|1h|h2|2h|\d+(?:st|nd|rd|th)?\s*(?:inning|i|quarter|q|period|p))\s+[ou]\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?/i.test(
      contractText
    )
  ) {
    return 'TotalPoints';
  }

  // Single team game totals shorthand: just team name with o/u (e.g., "Bucknell o55.5")
  // This is for cases where sport/league context makes it clear it's a full game total
  if (
    /^[a-zA-Z\s&.-]+\s+[ou]\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?/i.test(contractText) &&
    !contractText.includes('TT') &&
    !contractText.toLowerCase().includes(' tt ')
  ) {
    return 'TotalPoints';
  }

  // Moneylines: just team name (after eliminating other types), team name with +0/-0, or team name with "ML"
  // Also handles cases where only team and period remain (e.g., "COL F5" after price extraction)
  // Or just team name alone (e.g., "COL" after price extraction)
  if (
    (!contractText.includes('/') &&
      !/\s[ou]\d/i.test(contractText) &&
      !/^[ou]\d/i.test(contractText)) ||
    /[a-zA-Z]+\s*[+-]0(?:\s|$)/i.test(contractText) ||
    /\sml\s*$/i.test(contractText) ||
    /\sml\s+/i.test(contractText) ||
    /^[a-zA-Z]+\s+(f5|f3|h1|1h|h2|2h|\d+(?:st|nd|rd|th)?\s*(?:inning|i|quarter|q|period|p))\s*$/i.test(
      contractText
    )
  ) {
    return 'HandicapContestantML';
  }

  throw new InvalidContractTypeError(rawInput, contractText);
}

// ==============================================================================
// CONTRACT PARSERS
// ==============================================================================

/**
 * Parse game total: "Padres/Pirates 1st inning u0.5" or single team game total: "Pirates F5 u4.5"
 */
function parseGameTotal(
  contractText: string,
  rawInput: string,
  sport?: Sport,
  league?: League,
  gameNumber?: number
): ContractSportCompetitionMatchTotalPoints {
  // Extract over/under and line, with optional "runs" suffix
  // Allow optional leading digit (e.g., "u.5" or "u0.5")
  const ouMatch = contractText.match(/([ou])(\d*\.?\d+)(\s+runs)?/i);
  if (!ouMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const { isOver, line } = parseOverUnder(ouMatch[1] + ouMatch[2], rawInput);
  const hasRunsSuffix = !!ouMatch[3];

  // Remove the o/u part (and optional "runs") to get teams and period
  // Allow optional leading digit (e.g., "u.5" or "u0.5")
  const withoutOU = contractText
    .replace(/\s*[ou]\d*\.?\d+(?:[+-]\d+(?:\.\d+)?)?(\s+runs)?/i, '')
    .trim();

  // Parse teams and extract game info
  const { period, match } = parseMatchInfo(withoutOU, rawInput, sport, league, gameNumber);

  // If "runs" suffix was detected OR inning period detected, set sport to Baseball
  let finalSport = sport;
  if ((hasRunsSuffix || period.PeriodTypeCode === 'I') && !sport) {
    finalSport = 'Baseball';
  }

  // For game totals, we can have either two teams (traditional game total) or one team (single team game total)
  // Single team game totals are still considered TotalPoints, not TotalPointsContestant

  return {
    Sport: finalSport,
    League: league,
    Match: match,
    Period: period,
    HasContestant: false,
    HasLine: true,
    ContractSportCompetitionMatchType: 'TotalPoints',
    Line: line,
    IsOver: isOver,
  };
}

/**
 * Parse team total: "LAA TT o3.5" or "MIA F5 TT u1.5"
 */
function parseTeamTotal(
  contractText: string,
  rawInput: string,
  sport?: Sport,
  league?: League,
  gameNumber?: number
): ContractSportCompetitionMatchTotalPointsContestant {
  // Extract over/under and line, with optional "runs" suffix
  // Allow optional leading digit (e.g., "u.5" or "u0.5")
  const ouMatch = contractText.match(/([ou])(\d*\.?\d+)(\s+runs)?/i);
  if (!ouMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const { isOver, line } = parseOverUnder(ouMatch[1] + ouMatch[2], rawInput);
  const hasRunsSuffix = !!ouMatch[3];

  // If "runs" suffix was detected, set sport to Baseball
  let finalSport = sport;
  if (hasRunsSuffix && !sport) {
    finalSport = 'Baseball';
  }

  // Remove the o/u part (and optional "runs") and TT to get team and period
  const withoutOU = contractText
    .replace(/\s*[ou]\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?(\s+runs)?/i, '')
    .replace(/\s*tt\s*/i, ' ')
    .trim();

  // Parse team and extract match info
  const { teams, period, match } = parseMatchInfo(
    withoutOU,
    rawInput,
    finalSport,
    league,
    gameNumber
  );

  return {
    Sport: finalSport,
    League: league,
    Match: match,
    Period: period,
    HasContestant: true,
    HasLine: true,
    ContractSportCompetitionMatchType: 'TotalPoints',
    Line: line,
    IsOver: isOver,
    Contestant: teams.team1,
  };
}

/**
 * Parse moneyline: "872 Athletics" or "COL +0"
 */
function parseMoneyline(
  contractText: string,
  rawInput: string,
  sport?: Sport,
  league?: League,
  gameNumber?: number
): ContractSportCompetitionMatchHandicapContestantML {
  // Remove +0/-0 or ML from contract text if present (they're just moneyline indicators)
  const cleanedContractText = contractText
    .replace(/\s*[+-]0(?:\s|$)/i, '') // Remove +0/-0 patterns
    .replace(/\s+ml\s*$/i, '') // Remove trailing " ML"
    .replace(/\s+ml\s+/i, ' ') // Remove " ML " in middle
    .trim();

  const { teams, period, match } = parseMatchInfo(
    cleanedContractText,
    rawInput,
    sport,
    league,
    gameNumber
  );

  return {
    Sport: sport,
    League: league,
    Match: match,
    Period: period,
    HasContestant: true,
    HasLine: false,
    ContractSportCompetitionMatchType: 'Handicap',
    Contestant: teams.team1,
    TiesLose: false, // Default for MLB
  };
}

/**
 * Parse spread: "870 Mariners -1.5 +135" or "SD F5 +0.5"
 */
function parseSpread(
  contractText: string,
  rawInput: string,
  sport?: Sport,
  league?: League,
  gameNumber?: number
): ContractSportCompetitionMatchHandicapContestantLine {
  // Extract spread line and price (if embedded) - handle periods like F5 between team and line
  const spreadMatch = contractText.match(/^(.*?)\s*([+-]\d+(?:\.\d+)?)$/);
  if (!spreadMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const teamPart = spreadMatch[1].trim();
  const lineStr = spreadMatch[2];
  const sign = lineStr.startsWith('+') ? '+' : '-';
  const lineValue = parseFloat(lineStr.substring(1));
  const line = sign === '+' ? lineValue : -lineValue;

  const { teams, period, match } = parseMatchInfo(teamPart, rawInput, sport, league, gameNumber);

  return {
    Sport: sport,
    League: league,
    Match: match,
    Period: period,
    HasContestant: true,
    HasLine: true,
    ContractSportCompetitionMatchType: 'Handicap',
    Contestant: teams.team1,
    Line: line,
  };
}

/**
 * Parse PropOU bet: "Player123 passing yards o250.5" or "B. Falter Ks o1.5"
 */
function parsePropOU(
  contractText: string,
  rawInput: string,
  sport?: Sport,
  league?: League,
  gameNumber?: number
): ContractSportCompetitionMatchPropOU {
  // Extract over/under and line, with optional "runs" suffix
  // Allow optional leading digit (e.g., "u.5" or "u0.5")
  const ouMatch = contractText.match(/([ou])(\d*\.?\d+)(\s+runs)?/i);
  if (!ouMatch) {
    throw new InvalidContractTypeError(rawInput, 'PropOU requires an over/under line');
  }

  const { isOver, line } = parseOverUnder(ouMatch[1] + ouMatch[2], rawInput);
  const hasRunsSuffix = !!ouMatch[3];

  // If "runs" suffix was detected, set sport to Baseball
  let finalSport = sport;
  if (hasRunsSuffix && !sport) {
    finalSport = 'Baseball';
  }

  // Remove the o/u part (and optional "runs") to get player/team and prop type
  const withoutOU = contractText
    .replace(/\s*[ou]\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?(\s+runs)?/i, '')
    .trim();

  // Check for individual pattern first: "B. Falter" (single letter, dot, space, name)
  const individualMatch = withoutOU.match(/^([A-Z]\.\s+[A-Za-z]+)\s+(.+)$/);

  let contestant: string;
  let propText: string;

  if (individualMatch) {
    // Handle individual pattern like "B. Falter Ks"
    contestant = individualMatch[1]; // "B. Falter"
    propText = individualMatch[2].toLowerCase(); // "ks"
  } else {
    // Handle regular pattern like "Player123 passing yards"
    const parts = withoutOU.trim().split(/\s+/);
    if (parts.length < 2) {
      throw new InvalidContractTypeError(rawInput, contractText);
    }
    contestant = parts[0];
    propText = parts.slice(1).join(' ').toLowerCase();
  }

  const propInfo = detectPropType(propText);
  if (!propInfo || propInfo.category !== 'PropOU') {
    throw new InvalidContractTypeError(rawInput, `Invalid PropOU type: ${propText}`);
  }

  // Detect contestant type
  const contestantType = detectContestantType(contestant);

  return {
    Sport: finalSport,
    League: league,
    Match: {
      Team1: contestant,
      DaySequence: gameNumber,
    },
    Period: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    HasContestant: true,
    HasLine: true,
    ContractSportCompetitionMatchType: 'Prop',
    ContestantType: contestantType,
    Prop: propInfo.standardName,
    Contestant: contestant,
    Line: line,
    IsOver: isOver,
  };
}

/**
 * Parse PropYN bet: "CIN 1st team to score" or "DET #1 first team to score"
 */
function parsePropYN(
  contractText: string,
  rawInput: string,
  sport?: Sport,
  league?: League,
  gameNumber?: number
): ContractSportCompetitionMatchPropYN {
  // Find the prop type first to know where it starts
  const propInfo = detectPropType(contractText.toLowerCase());
  if (!propInfo || propInfo.category !== 'PropYN') {
    throw new InvalidContractTypeError(rawInput, `Invalid PropYN type: ${contractText}`);
  }

  // Extract the team/game info by removing the prop text from the end
  const propPatterns = [
    /\s+(1st team to score|first team to score|to score first|first to score)$/i,
    /\s+(last team to score|to score last|last to score)$/i,
  ];

  let teamAndGameInfo = contractText;
  for (const pattern of propPatterns) {
    if (pattern.test(contractText)) {
      teamAndGameInfo = contractText.replace(pattern, '').trim();
      break;
    }
  }

  if (!teamAndGameInfo) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  // Use parseMatchInfo to extract team and game number
  const { teams, match } = parseMatchInfo(teamAndGameInfo, rawInput, sport, league, gameNumber);

  // Detect contestant type
  const contestantType = detectContestantType(teams.team1);

  // Determine IsYes value based on prop type
  let isYes: boolean;
  if (propInfo.standardName === 'FirstToScore') {
    isYes = true;
  } else if (propInfo.standardName === 'LastToScore') {
    isYes = true; // Both first and last are typically "yes" bets
  } else {
    isYes = true; // Default to yes for other yes/no props
  }

  return {
    Sport: sport,
    League: league,
    Match: match,
    Period: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    HasContestant: true,
    HasLine: false,
    ContractSportCompetitionMatchType: 'Prop',
    ContestantType: contestantType,
    Prop: propInfo.standardName,
    Contestant: teams.team1,
    IsYes: isYes,
  };
}

/**
 * Parse series bet: "852 Guardians series" or "854 Yankees 4 game series" or "Lakers 7-Game Series" or "Cardinals series/5"
 */
function parseSeries(
  contractText: string,
  rawInput: string,
  sport?: Sport,
  league?: League,
  gameNumber?: number
): ContractSportCompetitionSeries {
  // Extract series length if specified
  // Try "series/X" pattern first
  const seriesSlashMatch = contractText.match(/series\/(\d+)/i);
  let seriesLength: number;

  if (seriesSlashMatch) {
    seriesLength = parseInt(seriesSlashMatch[1]);
  } else {
    // Try "out of X" pattern
    const outOfMatch = contractText.match(/series\s+out\s+of\s+(\d+)/i);
    if (outOfMatch) {
      seriesLength = parseInt(outOfMatch[1]);
    } else {
      // Try "X game series" pattern
      const lengthMatch = contractText.match(/(\d+)\s*game\s*series/i);
      if (lengthMatch) {
        seriesLength = parseInt(lengthMatch[1]);
      } else {
        // Try "X-Game Series" pattern (with hyphen and capital G)
        const hyphenMatch = contractText.match(/(\d+)-game\s*series/i);
        if (hyphenMatch) {
          seriesLength = parseInt(hyphenMatch[1]);
        } else {
          seriesLength = 3; // Default to 3
        }
      }
    }
  }

  // Extract team (before "series" and any numbers/modifiers)
  // Handle different series format patterns - try most specific patterns first
  let teamMatch = contractText.match(/([a-zA-Z\s&.]+?)\s*\d+-game\s*series/i);

  if (!teamMatch) {
    // Try pattern for "series/X" format
    teamMatch = contractText.match(/([a-zA-Z\s&.]+?)\s*series\/\d+/i);
  }

  if (!teamMatch) {
    // Try regular patterns
    teamMatch = contractText.match(/([a-zA-Z\s&.]+?)\s*(?:(?:\d+\s*game\s*)?series|series)/i);
  }

  if (!teamMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const team = teamMatch[1].trim();

  return {
    Sport: sport,
    League: league,
    Match: {
      Team1: team,
      DaySequence: gameNumber,
    },
    SeriesLength: seriesLength,
    Contestant: team,
  };
}

/**
 * Parse writein contract: "IW/YG writein 2024/11/5 Trump to win presidency"
 */
function parseWritein(dateString: string, description: string, rawInput: string): ContractWritein {
  // Parse and validate the event date
  const eventDate = parseWriteinDate(dateString, rawInput);

  // Validate and clean the description
  const validatedDescription = validateWriteinDescription(description, rawInput);

  return {
    EventDate: eventDate,
    Description: validatedDescription,
  };
}

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Parse match information (teams, period, game number) from text
 */
function parseMatchInfo(
  text: string,
  rawInput: string,
  _sport?: Sport,
  _league?: League,
  gameNumberFromTokens?: number
): {
  teams: { team1: string; team2?: string };
  period: Period;
  match: Match;
} {
  let workingText = text.trim();

  // Use game number from tokens if available, otherwise try to extract from text
  let daySequence: number | undefined = gameNumberFromTokens;

  // Only try to extract game number from text if we don't already have one from tokens
  if (daySequence === undefined) {
    // Look for valid game number patterns: g2, gm2, game2, g 2, gm 1, game 3, #2, # 2
    const gameMatch = workingText.match(/\s+((?:game|gm|g)\s*\d+|#\s*\d+)\s*/i);
    if (gameMatch) {
      daySequence = parseGameNumber(gameMatch[1], rawInput);
      workingText = workingText.replace(gameMatch[0], ' ').trim();
    }
    // If no valid game number found, just continue - don't throw errors for things like "Bowling green"
  }

  // Extract period if present
  let period: Period = { PeriodTypeCode: 'M', PeriodNumber: 0 }; // Default
  const periodPatterns = [
    /\b(\d+(?:st|nd|rd|th)?\s*(?:inning|i))\b/i,
    /\b(f5|f3|f7|h1|1h|h2|2h|q1|q2|q3|q4|p1|p2|p3)\b/i,
    /\b(\d+(?:st|nd|rd|th)?\s*(?:quarter|q))\b/i,
    /\b(\d+(?:st|nd|rd|th)?\s*(?:period|p))\b/i,
    /\b(first\s*(?:half|five|5|inning|i))\b/i,
    /\b(second\s*(?:half|h))\b/i,
  ];

  for (const pattern of periodPatterns) {
    const match = workingText.match(pattern);
    if (match) {
      period = parsePeriod(match[1], rawInput);
      workingText = workingText.replace(match[0], ' ').trim();
      break;
    }
  }

  // Parse teams from remaining text
  const teams = parseTeams(workingText, rawInput);

  // Create match object
  const match: Match = {
    Team1: teams.team1,
    Team2: teams.team2,
    DaySequence: daySequence,
  };

  return { teams, period, match };
}

// ==============================================================================
// MAIN PARSING FUNCTIONS
// ==============================================================================

/**
 * Parse a chat order (IW message)
 */
export function parseChatOrder(message: string): ChatOrderResult {
  const tokens = tokenizeChat(message);

  if (tokens.chatType !== 'order') {
    throw new InvalidChatFormatError(tokens.rawInput, 'Expected order (IW) message');
  }

  // Handle writein contracts
  if (isWriteinTokens(tokens)) {
    const contract = parseWritein(tokens.dateString, tokens.description, tokens.rawInput);

    return {
      chatType: 'order',
      contractType: 'Writein',
      contract,
      rotationNumber: undefined,
      bet: {
        Price: tokens.price!,
        Size: tokens.size,
      },
    };
  }

  // Handle regular contracts
  const contractType = detectContractType(tokens.contractText, tokens.rawInput);
  const { sport, league } = inferSportAndLeague(
    tokens.rotationNumber,
    tokens.explicitLeague,
    tokens.explicitSport
  );

  let contract: Contract;

  switch (contractType) {
    case 'TotalPoints':
      contract = parseGameTotal(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'TotalPointsContestant':
      contract = parseTeamTotal(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'HandicapContestantML':
      contract = parseMoneyline(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'HandicapContestantLine':
      contract = parseSpread(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'PropOU':
      contract = parsePropOU(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'PropYN':
      contract = parsePropYN(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'Series':
      contract = parseSeries(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'Writein':
      throw new InvalidContractTypeError(
        tokens.rawInput,
        'Writein contracts should have been handled earlier'
      );
    default:
      throw new InvalidContractTypeError(tokens.rawInput, tokens.contractText);
  }

  // Add rotation number to contract if present
  if (tokens.rotationNumber && 'RotationNumber' in contract) {
    contract.RotationNumber = tokens.rotationNumber;
  }

  return {
    chatType: 'order',
    contractType,
    contract,
    rotationNumber: tokens.rotationNumber,
    bet: {
      Price: tokens.price!,
      Size: tokens.size,
    },
  };
}

/**
 * Parse a chat fill (YG message)
 */
export function parseChatFill(message: string): ChatFillResult {
  const tokens = tokenizeChat(message);

  if (tokens.chatType !== 'fill') {
    throw new InvalidChatFormatError(tokens.rawInput, 'Expected fill (YG) message');
  }

  // Handle writein contracts
  if (isWriteinTokens(tokens)) {
    const contract = parseWritein(tokens.dateString, tokens.description, tokens.rawInput);

    return {
      chatType: 'fill',
      contractType: 'Writein',
      contract,
      rotationNumber: undefined,
      bet: {
        ExecutionDtm: new Date(), // Current time for fills
        Price: tokens.price!,
        Size: tokens.size!,
      },
    };
  }

  // Handle regular contracts
  const contractType = detectContractType(tokens.contractText, tokens.rawInput);
  const { sport, league } = inferSportAndLeague(
    tokens.rotationNumber,
    tokens.explicitLeague,
    tokens.explicitSport
  );

  let contract: Contract;

  switch (contractType) {
    case 'TotalPoints':
      contract = parseGameTotal(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'TotalPointsContestant':
      contract = parseTeamTotal(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'HandicapContestantML':
      contract = parseMoneyline(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'HandicapContestantLine':
      contract = parseSpread(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'PropOU':
      contract = parsePropOU(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'PropYN':
      contract = parsePropYN(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'Series':
      contract = parseSeries(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber
      );
      break;
    case 'Writein':
      throw new InvalidContractTypeError(
        tokens.rawInput,
        'Writein contracts should have been handled earlier'
      );
    default:
      throw new InvalidContractTypeError(tokens.rawInput, tokens.contractText);
  }

  // Add rotation number to contract if present
  if (tokens.rotationNumber && 'RotationNumber' in contract) {
    contract.RotationNumber = tokens.rotationNumber;
  }

  return {
    chatType: 'fill',
    contractType,
    contract,
    rotationNumber: tokens.rotationNumber,
    bet: {
      ExecutionDtm: new Date(), // Current time for fills
      Price: tokens.price!,
      Size: tokens.size!,
    },
  };
}

/**
 * Main entry point - automatically detects order vs fill
 */
export function parseChat(message: string): ParseResult {
  const trimmed = message.trim();
  const upperTrimmed = trimmed.toUpperCase();

  if (upperTrimmed.startsWith('IW') || upperTrimmed.startsWith('IWW')) {
    return parseChatOrder(message);
  } else if (upperTrimmed.startsWith('YG') || upperTrimmed.startsWith('YGW')) {
    return parseChatFill(message);
  } else {
    throw new UnrecognizedChatPrefixError(message, trimmed.split(/\s+/)[0] || '');
  }
}
