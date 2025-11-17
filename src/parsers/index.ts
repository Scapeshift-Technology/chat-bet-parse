/**
 * Main parsing engine for chat-bet-parse
 * Implements the EBNF grammar from README.md
 */

import type {
  ParseResult,
  ParseResultStraight,
  ParseResultParlay,
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
  ParseOptions,
} from '../types/index';

import { knownLeagues, knownSports, leagueSportMap } from '../types/index';

import {
  InvalidChatFormatError,
  UnrecognizedChatPrefixError,
  MissingSizeForFillError,
  InvalidContractTypeError,
  InvalidRotationNumberError,
  InvalidTeamFormatError,
  InvalidWriteinFormatError,
  InvalidDateError,
  InvalidKeywordValueError,
  InvalidKeywordSyntaxError,
  InvalidParlayStructureError,
  InvalidParlayLegError,
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
  parseKeywords,
  parseParlayKeywords,
  parseParlaySize,
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
  eventDate?: Date; // Parsed event date
  isFreeBet?: boolean; // Free bet flag
  price?: number;
  size?: number;
  rawInput: string;
}

interface WriteInTokens {
  chatType: 'order' | 'fill';
  isWritein: true;
  dateString: string;
  description: string;
  league?: League;
  sport?: Sport;
  isFreeBet?: boolean; // Free bet flag
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
  rawInput: string,
  options?: ParseOptions
): WriteInTokens {
  // Expected format: IW/YG writein [keywords] [LEAGUE] DATE DESCRIPTION [@ price] [= size]
  const referenceDate = options?.referenceDate;

  if (parts.length < 4) {
    throw new InvalidWriteinFormatError(
      rawInput,
      'Writein contracts require at least a date and description'
    );
  }

  // Check that there's a space between writein and the rest
  if (parts[1].toLowerCase() !== 'writein') {
    throw new InvalidWriteinFormatError(
      rawInput,
      'Writein must be separated from date by whitespace'
    );
  }

  let currentIndex = 2; // Start after "writein"

  // Find price and size markers first to know where the description ends
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

  // Extract the text before price/size markers
  let descriptionEndIndex = parts.length;
  for (let i = currentIndex; i < parts.length; i++) {
    if (parts[i] === '@' || parts[i] === '=') {
      descriptionEndIndex = i;
      break;
    }
  }

  // Parse keywords from the beginning
  const textBeforeMarkers = parts.slice(currentIndex, descriptionEndIndex).join(' ');
  const allowedKeys = ['date', 'league', 'freebet'];
  const {
    date: dateKeyword,
    league: leagueKeyword,
    freebet,
    cleanedText,
  } = parseKeywords(textBeforeMarkers, rawInput, allowedKeys);

  // Now parse positional date and league from cleaned text
  const cleanedParts = cleanedText.trim().split(/\s+/);

  let dateString: string | undefined = dateKeyword;
  let leagueString: string | undefined = leagueKeyword;
  let descriptionStartIndex = 0;

  // Helper function to check if a string looks like a date
  const looksLikeDate = (str: string): boolean => {
    return (
      /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(str) || // YYYY-MM-DD or YYYY/MM/DD
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(str) || // MM/DD/YYYY or MM/DD/YY or MM-DD-YYYY or MM-DD-YY
      /^\d{1,2}[/-]\d{1,2}$/.test(str)
    ); // MM/DD or MM-DD
  };

  // Parse positional date and league (in any order)
  let firstNonLeagueToken: string | undefined;
  for (let i = 0; i < cleanedParts.length && i < 2; i++) {
    const part = cleanedParts[i];

    // Check if it's a league
    if (!leagueString && knownLeagues.has(part.toUpperCase() as any)) {
      leagueString = part.toUpperCase();
      descriptionStartIndex = i + 1;
    }
    // Check if it's a date
    else if (!dateString && looksLikeDate(part)) {
      dateString = part;
      descriptionStartIndex = i + 1;
    }
    // Otherwise, this might be the date or start of description
    else {
      if (!firstNonLeagueToken) {
        firstNonLeagueToken = part;
      }
      break;
    }
  }

  // If we still don't have a date from keywords or recognized format,
  // use the first non-league token as the date candidate
  if (!dateString && firstNonLeagueToken) {
    dateString = firstNonLeagueToken;
    descriptionStartIndex++;
  }

  // If we still don't have any date candidate, throw format error
  if (!dateString || dateString.trim() === '') {
    // Try to parse empty/whitespace as date to get proper error
    parseWriteinDate(dateString || '', rawInput, true, referenceDate);
  }

  // At this point, dateString is guaranteed to be a non-empty string
  // (the above check would have thrown otherwise)
  // Using non-null assertion since TypeScript can't infer that parseWriteinDate throws
  const validatedDateString: string = dateString!;

  // Validate the date string by parsing it (will throw InvalidWriteinDateError if invalid)
  // This ensures proper error types for empty, invalid, or malformed dates
  parseWriteinDate(validatedDateString, rawInput, true, referenceDate);

  // Extract description
  const description = cleanedParts.slice(descriptionStartIndex).join(' ');

  if (!description || description.trim().length === 0) {
    throw new InvalidWriteinFormatError(rawInput, 'Writein contracts must include a description');
  }

  // Determine sport from league if provided
  let sport: Sport | undefined;
  let league: League | undefined;
  if (leagueString) {
    league = leagueString as League;
    sport = leagueSportMap[league];
  }

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
    dateString: validatedDateString,
    description,
    league,
    sport,
    isFreeBet: freebet,
    price: price ?? -110, // Default price
    size,
    rawInput,
  };
}

/**
 * Break down the chat message into tokens according to EBNF grammar
 */
function tokenizeChat(message: string, options?: ParseOptions): TokenResult {
  const rawInput = message; // Preserve original input for error reporting
  const referenceDate = options?.referenceDate;

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
    return tokenizeWritein(parts, chatType, rawInput, options);
  }

  let currentIndex = 1;
  let rotationNumber: number | undefined;
  let price: number | undefined;
  let eventDate: Date | undefined;
  let isFreeBet: boolean | undefined;

  // Parse keywords from the text after prefix (before rotation number extraction)
  // First, get all text before @ and = markers
  let textBeforeMarkers = parts.slice(currentIndex).join(' ');
  const atIndex = textBeforeMarkers.indexOf('@');
  const eqIndex = textBeforeMarkers.indexOf('=');
  let endIndex = textBeforeMarkers.length;
  if (atIndex !== -1 && (eqIndex === -1 || atIndex < eqIndex)) {
    endIndex = atIndex;
  } else if (eqIndex !== -1) {
    endIndex = eqIndex;
  }
  textBeforeMarkers = textBeforeMarkers.substring(0, endIndex).trim();

  // Parse keywords
  const allowedKeys = ['date', 'league', 'freebet'];
  const keywordResult = parseKeywords(textBeforeMarkers, rawInput, allowedKeys);
  isFreeBet = keywordResult.freebet;

  // Parse league from keyword if provided
  let keywordLeague: KnownLeague | undefined;
  if (keywordResult.league) {
    const upperLeague = keywordResult.league.toUpperCase();
    if (knownLeagues.has(upperLeague as any)) {
      keywordLeague = upperLeague as KnownLeague;
    } else {
      throw new InvalidKeywordValueError(
        rawInput,
        'league',
        keywordResult.league,
        `Invalid league: ${keywordResult.league}. Must be a known league code (e.g., MLB, NBA, NHL)`
      );
    }
  }

  // Parse date from keyword if provided
  if (keywordResult.date) {
    eventDate = parseWriteinDate(keywordResult.date, rawInput, false, referenceDate);
  }

  // Update parts array to remove keywords - reconstruct from cleaned text
  const cleanedTextParts = keywordResult.cleanedText
    .trim()
    .split(/\s+/)
    .filter(p => p.length > 0);

  // Reconstruct parts: [prefix, rotation?, ...cleanedParts, ...priceAndSizeParts]
  const priceAndSizeParts: string[] = [];
  const originalParts = parts.slice(currentIndex);
  let foundMarker = false;
  for (let i = 0; i < originalParts.length; i++) {
    if (originalParts[i] === '@' || originalParts[i] === '=') {
      foundMarker = true;
    }
    if (foundMarker) {
      priceAndSizeParts.push(originalParts[i]);
    }
  }

  // Extract positional date from cleaned parts (before rebuilding parts array)
  // Date regex pattern (includes 2-digit and 4-digit year formats)
  const datePattern =
    /^(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[/-]\d{1,2})$/;
  const cleanedPartsWithoutDate: string[] = [];

  for (const part of cleanedTextParts) {
    if (!eventDate && datePattern.test(part)) {
      // Found a positional date - parse it (false = not a writein)
      eventDate = parseWriteinDate(part, rawInput, false, referenceDate);
    } else {
      cleanedPartsWithoutDate.push(part);
    }
  }

  // Rebuild parts array (without rotation number yet - we'll extract it next)
  const newParts = [parts[0]]; // prefix
  newParts.push(...cleanedPartsWithoutDate);
  newParts.push(...priceAndSizeParts);

  // Reset parts to use cleaned version
  parts.length = 0;
  parts.push(...newParts);

  // Reset currentIndex
  currentIndex = 1;

  // Now check for rotation number (after date extraction)
  if (currentIndex < parts.length && /^\d+$/.test(parts[currentIndex])) {
    const numStr = parts[currentIndex];
    // Check if this looks like a date without separators (6-8 digits)
    // Rotation numbers are typically 3-4 digits (100s-900s range)
    if (numStr.length >= 6 && numStr.length <= 8) {
      throw new InvalidDateError(
        rawInput,
        numStr,
        'Unable to parse date. Dates must use separators (/ or -). Supported formats: YYYY-MM-DD, MM/DD/YYYY, etc.'
      );
    }
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
      // Numbers with absolute value 0-99 should NEVER be treated as prices
      // Only values >= 100 are likely prices (e.g., +145, -110)
      else if (value >= 100) {
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

  // Extract period if at beginning (e.g., "2h Vanderbilt +2.5")
  // Check for common period patterns at the start
  const periodAtStartMatch = contractText.match(
    /^(f5|f3|f7|h1|1h|h2|2h|q1|q2|q3|q4|1q|2q|3q|4q|p1|p2|p3)\s+(.+)$/i
  );
  if (periodAtStartMatch) {
    // Keep the period in the contract text but in a normalized position
    // Move it after the team name so parseMatchInfo can find it properly
    const period = periodAtStartMatch[1];
    const restOfContract = periodAtStartMatch[2];
    // Check if this looks like a spread bet (team name followed by +/- line)
    // Handle both formats: +1.5 and +.5
    // Use non-greedy match for team name to avoid including the spread
    const spreadMatch = restOfContract.match(/^([a-zA-Z\s&.-]+?)\s+([+-](?:\d+)?\.?\d+)/);
    if (spreadMatch) {
      // Insert period between team and line: "Vanderbilt 2h +2.5"
      const teamName = spreadMatch[1].trim();
      contractText = `${teamName} ${period} ${spreadMatch[2]}`;
    } else {
      // Check if this looks like a total (team name followed by o/u or Over/Under)
      // Use non-greedy match for team name to avoid including the total indicator
      const totalMatch = restOfContract.match(
        /^([a-zA-Z\s&.-]+?)\s+([ou]|over|under)\s*(\d+(?:\.\d+)?)/i
      );
      if (totalMatch) {
        // Insert period between team and total: "Utah State 1Q u10.5"
        const teamName = totalMatch[1].trim();
        contractText = `${teamName} ${period} ${totalMatch[2]} ${totalMatch[3]}`;
      } else {
        // For other patterns (like moneylines), just append period at the end
        contractText = `${restOfContract} ${period}`;
      }
    }
  }

  // Extract explicit league if at beginning (after period processing)
  // Prefer keyword league over positional league
  let explicitLeague: KnownLeague | undefined = keywordLeague;
  if (!explicitLeague) {
    const leagueMatch = contractText.match(/^([A-Z]{2,3})\s+(.+)$/);
    if (leagueMatch && knownLeagues.has(leagueMatch[1] as any)) {
      explicitLeague = leagueMatch[1] as KnownLeague;
      contractText = leagueMatch[2];
    }
  }

  // Extract explicit sport if at beginning (after period and league processing)
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

  // Extract period if at beginning AGAIN (after league/sport extraction)
  // This handles cases like "CFB 1Q Utah State u10.5" where league extraction reveals the period
  const periodAtStartMatch2 = contractText.match(
    /^(f5|f3|f7|h1|1h|h2|2h|q1|q2|q3|q4|1q|2q|3q|4q|p1|p2|p3)\s+(.+)$/i
  );
  if (periodAtStartMatch2) {
    // Keep the period in the contract text but in a normalized position
    // Move it after the team name so parseMatchInfo can find it properly
    const period = periodAtStartMatch2[1];
    const restOfContract = periodAtStartMatch2[2];
    // Check if this looks like a spread bet (team name followed by +/- line)
    // Handle both formats: +1.5 and +.5
    // Use non-greedy match for team name to avoid including the spread
    const spreadMatch = restOfContract.match(/^([a-zA-Z\s&.-]+?)\s+([+-](?:\d+)?\.?\d+)/);
    if (spreadMatch) {
      // Insert period between team and line: "Vanderbilt 2h +2.5"
      const teamName = spreadMatch[1].trim();
      contractText = `${teamName} ${period} ${spreadMatch[2]}`;
    } else {
      // Check if this looks like a total (team name followed by o/u or Over/Under)
      // Use non-greedy match for team name to avoid including the total indicator
      const totalMatch = restOfContract.match(
        /^([a-zA-Z\s&.-]+?)\s+([ou]|over|under)\s*(\d+(?:\.\d+)?)/i
      );
      if (totalMatch) {
        // Insert period between team and total: "Utah State 1Q u10.5"
        const teamName = totalMatch[1].trim();
        contractText = `${teamName} ${period} ${totalMatch[2]} ${totalMatch[3]}`;
      } else {
        // For other patterns (like moneylines), just append period at the end
        contractText = `${restOfContract} ${period}`;
      }
    }
  }

  return {
    chatType,
    rotationNumber,
    gameNumber,
    contractText,
    eventDate,
    isFreeBet,
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
  // Handle both +1.5 and +.5 formats
  if (/[a-zA-Z]+(?:\s+[a-zA-Z0-9]+)*\s*[+-](?:\d+)?\.?\d+/i.test(contractText)) {
    // Check if this might be a price rather than a spread
    // Prices are typically > 100 or have decimals like +145, -110.5
    const spreadMatch = contractText.match(
      /([a-zA-Z]+(?:\s+[a-zA-Z0-9]+)*)\s*([+-])((?:\d+)?\.?\d+)/i
    );
    if (spreadMatch) {
      const value = parseFloat(spreadMatch[3]);
      // Special case: +0 or -0 is always a moneyline
      if (value === 0) {
        return 'HandicapContestantML';
      }
      // Numbers with absolute value 0-99 should NEVER be interpreted as moneyline
      // They are always spreads (e.g., -51, +21.5, -1.5, etc.)
      if (value < 100) {
        return 'HandicapContestantLine';
      } else {
        // Values >= 100 are likely moneyline prices (e.g., +145, -110)
        return 'HandicapContestantML';
      }
    }
  }

  // Game totals: teams with o/u OR single team with period and o/u
  // Also handle cases where period comes after the total (e.g., "Rangers/Devils u.5 p3")
  // Allow optional leading digit (e.g., "u.5" or "u0.5")
  // Support both short form (o/u) and full words (Over/Under)
  if (
    /\//.test(contractText) &&
    (/(over|under|[ou])\s*\d*\.?\d+(?:[+-]\d+(?:\.\d+)?)?(\s+runs)?/i.test(contractText) ||
      /(over|under|[ou])\s*\d*\.?\d+(?:[+-]\d+(?:\.\d+)?)?\s+(f5|f3|f7|h1|1h|h2|2h|q1|q2|q3|q4|p1|p2|p3)/i.test(
        contractText
      ))
  ) {
    return 'TotalPoints';
  }

  // Single team game totals: team with period and over/under (e.g., "Pirates F5 u4.5")
  if (
    /^[a-zA-Z\s&.-]+\s+(f5|f3|h1|1h|h2|2h|\d+(?:st|nd|rd|th)?\s*(?:inning|i|quarter|q|period|p))\s+(over|under|[ou])\s*\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?/i.test(
      contractText
    )
  ) {
    return 'TotalPoints';
  }

  // Single team game totals shorthand: just team name with o/u (e.g., "Bucknell o55.5")
  // This is for cases where sport/league context makes it clear it's a full game total
  if (
    /^[a-zA-Z\s&.-]+\s+(over|under|[ou])\s*\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?/i.test(
      contractText
    ) &&
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
  gameNumber?: number,
  eventDate?: Date
): ContractSportCompetitionMatchTotalPoints {
  // Extract over/under and line, with optional "runs" suffix
  // Allow optional leading digit (e.g., "u.5" or "u0.5")
  // Support both short form (o/u) and full words (Over/Under)
  // Require word boundary before o/u to prevent matching team names ending in o/u
  const ouMatch = contractText.match(/\b(over|under|[ou])\s*(\d*\.?\d+)(\s+runs)?/i);
  if (!ouMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  // Convert full words to single letters for parseOverUnder function
  const ouIndicator = ouMatch[1].toLowerCase();
  const normalizedOU = ouIndicator === 'over' ? 'o' : ouIndicator === 'under' ? 'u' : ouIndicator;
  const { isOver, line } = parseOverUnder(normalizedOU + ouMatch[2], rawInput);
  const hasRunsSuffix = !!ouMatch[3];

  // Remove the o/u part (and optional "runs") to get teams and period
  // Allow optional leading digit (e.g., "u.5" or "u0.5")
  // Support both short form (o/u) and full words (Over/Under)
  // Require word boundary before o/u to prevent matching team names ending in o/u
  const withoutOU = contractText
    .replace(/\b(over|under|[ou])\s*\d*\.?\d+(?:[+-]\d+(?:\.\d+)?)?(\s+runs)?/i, '')
    .trim();

  // Parse teams and extract game info
  const { period, match } = parseMatchInfo(
    withoutOU,
    rawInput,
    sport,
    league,
    gameNumber,
    eventDate
  );

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
  gameNumber?: number,
  eventDate?: Date
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
    gameNumber,
    eventDate
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
  gameNumber?: number,
  eventDate?: Date
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
    gameNumber,
    eventDate
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
  gameNumber?: number,
  eventDate?: Date
): ContractSportCompetitionMatchHandicapContestantLine {
  // Extract spread line and price (if embedded) - handle periods like F5 between team and line
  // Handle both +1.5 and +.5 formats
  const spreadMatch = contractText.match(/^(.*?)\s*([+-](?:\d+)?\.?\d+)$/);
  if (!spreadMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const teamPart = spreadMatch[1].trim();
  const lineStr = spreadMatch[2];
  const sign = lineStr.startsWith('+') ? '+' : '-';
  const lineValue = parseFloat(lineStr.substring(1));
  const line = sign === '+' ? lineValue : -lineValue;

  const { teams, period, match } = parseMatchInfo(
    teamPart,
    rawInput,
    sport,
    league,
    gameNumber,
    eventDate
  );

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
  gameNumber?: number,
  eventDate?: Date
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
      Date: eventDate,
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
  gameNumber?: number,
  eventDate?: Date
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
  const { teams, match } = parseMatchInfo(
    teamAndGameInfo,
    rawInput,
    sport,
    league,
    gameNumber,
    eventDate
  );

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
  gameNumber?: number,
  eventDate?: Date
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
      Date: eventDate,
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
function parseWritein(
  dateString: string,
  description: string,
  rawInput: string,
  league?: League,
  sport?: Sport,
  referenceDate?: Date
): ContractWritein {
  // Parse and validate the event date
  const eventDate = parseWriteinDate(dateString, rawInput, true, referenceDate);

  // Validate and clean the description
  const validatedDescription = validateWriteinDescription(description, rawInput);

  return {
    EventDate: eventDate,
    Description: validatedDescription,
    Sport: sport,
    League: league,
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
  gameNumberFromTokens?: number,
  eventDate?: Date
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
    Date: eventDate,
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
export function parseChatOrder(message: string, options?: ParseOptions): ParseResultStraight {
  const tokens = tokenizeChat(message, options);

  if (tokens.chatType !== 'order') {
    throw new InvalidChatFormatError(tokens.rawInput, 'Expected order (IW) message');
  }

  // Handle writein contracts
  if (isWriteinTokens(tokens)) {
    const contract = parseWritein(
      tokens.dateString,
      tokens.description,
      tokens.rawInput,
      tokens.league,
      tokens.sport,
      options?.referenceDate
    );

    return {
      chatType: 'order',
      betType: 'straight',
      contractType: 'Writein',
      contract,
      rotationNumber: undefined,
      bet: {
        Price: tokens.price!,
        Size: tokens.size,
        IsFreeBet: tokens.isFreeBet,
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
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'TotalPointsContestant':
      contract = parseTeamTotal(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'HandicapContestantML':
      contract = parseMoneyline(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'HandicapContestantLine':
      contract = parseSpread(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'PropOU':
      contract = parsePropOU(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'PropYN':
      contract = parsePropYN(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'Series':
      contract = parseSeries(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
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
    betType: 'straight',
    contractType,
    contract,
    rotationNumber: tokens.rotationNumber,
    bet: {
      Price: tokens.price!,
      Size: tokens.size,
      IsFreeBet: tokens.isFreeBet,
    },
  };
}

/**
 * Parse a chat fill (YG message)
 */
export function parseChatFill(message: string, options?: ParseOptions): ParseResultStraight {
  const tokens = tokenizeChat(message, options);

  if (tokens.chatType !== 'fill') {
    throw new InvalidChatFormatError(tokens.rawInput, 'Expected fill (YG) message');
  }

  // Handle writein contracts
  if (isWriteinTokens(tokens)) {
    const contract = parseWritein(
      tokens.dateString,
      tokens.description,
      tokens.rawInput,
      tokens.league,
      tokens.sport,
      options?.referenceDate
    );

    return {
      chatType: 'fill',
      betType: 'straight',
      contractType: 'Writein',
      contract,
      rotationNumber: undefined,
      bet: {
        ExecutionDtm: new Date(), // Current time for fills
        Price: tokens.price!,
        Size: tokens.size!,
        IsFreeBet: tokens.isFreeBet,
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
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'TotalPointsContestant':
      contract = parseTeamTotal(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'HandicapContestantML':
      contract = parseMoneyline(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'HandicapContestantLine':
      contract = parseSpread(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'PropOU':
      contract = parsePropOU(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'PropYN':
      contract = parsePropYN(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
      );
      break;
    case 'Series':
      contract = parseSeries(
        tokens.contractText,
        tokens.rawInput,
        sport,
        league,
        tokens.gameNumber,
        tokens.eventDate
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
    betType: 'straight',
    contractType,
    contract,
    rotationNumber: tokens.rotationNumber,
    bet: {
      ExecutionDtm: new Date(), // Current time for fills
      Price: tokens.price!,
      Size: tokens.size!,
      IsFreeBet: tokens.isFreeBet,
    },
  };
}

/**
 * Main entry point - automatically detects order vs fill
 */
// ==============================================================================
// PARLAY PARSING (Stage 2)
// ==============================================================================

/**
 * Parse YGP (You Got Parlay) fill message
 * Format: YGP [keywords] leg1 & leg2 [& leg3...] = $risk [tw $towin]
 */
function parseParlayFill(rawInput: string, options?: ParseOptions): ParseResultParlay {
  // 1. Extract "YGP" prefix
  let text = rawInput.slice(3).trim();

  // 2. Parse parlay-level keywords (pusheslose, tieslose, freebet)
  // Only parse keywords from the first line before legs start
  const allowedKeys = ['pusheslose', 'tieslose', 'freebet'];
  let pusheslose: boolean | undefined;
  let tieslose: boolean | undefined;
  let freebet: boolean | undefined;
  let cleanedText = text;

  // Detect if multiline or ampersand format
  const hasNewline = text.includes('\n');
  const hasAmpersand = text.includes('&');

  if (hasNewline) {
    // Multiline: only parse keywords from first line
    const parsed = parseParlayKeywords(text, rawInput, allowedKeys);
    pusheslose = parsed.pusheslose;
    tieslose = parsed.tieslose;
    freebet = parsed.freebet;
    cleanedText = parsed.cleanedText;
  } else if (hasAmpersand) {
    // Ampersand format: only parse keywords before first ampersand
    const ampIndex = text.indexOf('&');
    const firstPart = text.slice(0, ampIndex);
    const restPart = text.slice(ampIndex);

    // Only parse keywords from the part before the first leg
    const beforeLegs = firstPart.trim().split(/\s+/);
    const keywordsFound: string[] = [];
    const nonKeywords: string[] = [];

    for (const part of beforeLegs) {
      // Check if this looks like a keyword without colon (e.g., "pusheslose")
      if (allowedKeys.includes(part)) {
        throw new InvalidKeywordSyntaxError(rawInput, part, 'Invalid keyword syntax');
      }

      if (part.includes(':')) {
        const [key] = part.split(':');
        if (allowedKeys.includes(key)) {
          keywordsFound.push(part);
          // Parse the keyword
          const [, ...valueParts] = part.split(':');
          const value = valueParts.join(':');

          // Validate value is 'true'
          if (value !== 'true') {
            throw new InvalidKeywordValueError(
              rawInput,
              key,
              value,
              `Invalid ${key} value: must be "true"`
            );
          }

          if (key === 'pusheslose') pusheslose = true;
          if (key === 'tieslose') tieslose = true;
          if (key === 'freebet') freebet = true;
        } else {
          // Not a parlay-level keyword, keep it
          nonKeywords.push(part);
        }
      } else {
        nonKeywords.push(part);
      }
    }

    cleanedText = (nonKeywords.join(' ') + ' ' + restPart).trim();
  }

  // 3. Detect format: ampersand or multiline
  const isMultiline = cleanedText.includes('\n');

  // 4. Extract legs and size
  let legTexts: string[];
  let sizeText: string;

  if (isMultiline) {
    const lines = cleanedText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l);
    const sizeLineIndex = lines.findIndex(l => l.startsWith('='));
    if (sizeLineIndex === -1) {
      throw new MissingSizeForFillError(rawInput);
    }
    legTexts = lines.slice(0, sizeLineIndex);
    sizeText = lines[sizeLineIndex];
  } else {
    // Ampersand format
    const sizeIndex = cleanedText.indexOf('=');
    if (sizeIndex === -1) {
      throw new MissingSizeForFillError(rawInput);
    }
    const legsText = cleanedText.slice(0, sizeIndex).trim();
    sizeText = cleanedText.slice(sizeIndex).trim();
    legTexts = legsText.split('&').map(l => l.trim());
  }

  // 5. Validate leg count
  if (legTexts.length < 2) {
    // Check if user used comma instead of ampersand
    if (cleanedText.includes(',')) {
      throw new InvalidParlayStructureError(rawInput, 'Parlay legs must be separated by &');
    }
    throw new InvalidParlayStructureError(rawInput, 'Parlay requires at least 2 legs');
  }

  // Check for empty legs
  for (let i = 0; i < legTexts.length; i++) {
    if (!legTexts[i]) {
      throw new InvalidParlayLegError(rawInput, i + 1, 'Empty parlay leg');
    }
  }

  // 6. Parse each leg as IW order (reuse existing logic!)
  const legs: ParseResultStraight[] = [];
  for (let i = 0; i < legTexts.length; i++) {
    try {
      const legText = legTexts[i];

      // Check if leg has @ symbol
      if (!legText.includes('@')) {
        // Check if it looks like it's missing a price entirely vs missing @ symbol
        // If it has no symbols at all, it's likely missing price
        if (!legText.match(/[@+-]/)) {
          throw new Error('Each parlay leg must have a price');
        }
        throw new Error('Invalid leg format: missing @ symbol');
      }

      // Check if leg has a price after @
      const atIndex = legText.lastIndexOf('@');
      const afterAt = legText.slice(atIndex + 1).trim();
      if (!afterAt || afterAt.length === 0) {
        throw new Error('Each parlay leg must have a price');
      }

      const legInput = `IW ${legText}`;
      const legResult = parseChatOrder(legInput, options);
      legs.push(legResult);
    } catch (error) {
      const errorMsg = (error as Error).message;
      // Clean up error messages for better parlay context
      if (errorMsg.includes('Invalid chat format') || errorMsg.includes('Expected order')) {
        throw new InvalidParlayLegError(rawInput, i + 1, 'Invalid leg format: missing @ symbol');
      }
      throw new InvalidParlayLegError(rawInput, i + 1, errorMsg);
    }
  }

  // 7. Parse size and optional to-win
  const { risk, toWin, useFair } = parseParlaySize(sizeText, rawInput);

  // 8. Build result
  return {
    chatType: 'fill',
    betType: 'parlay',
    bet: {
      Risk: risk,
      ToWin: toWin,
      ExecutionDtm: new Date(),
      IsFreeBet: freebet || false,
    },
    useFair,
    pushesLose: pusheslose || tieslose || undefined,
    legs,
  };
}

/**
 * Parse IWP (I Want Parlay) order message
 * Format: IWP [keywords] leg1 & leg2 [& leg3...]
 */
function parseParlayOrder(rawInput: string, options?: ParseOptions): ParseResultParlay {
  // 1. Extract "IWP" prefix
  let text = rawInput.slice(3).trim();

  // 2. Parse parlay-level keywords (pusheslose, tieslose, freebet)
  // Only parse keywords from the first line before legs start
  const allowedKeys = ['pusheslose', 'tieslose', 'freebet'];
  let pusheslose: boolean | undefined;
  let tieslose: boolean | undefined;
  let freebet: boolean | undefined;
  let cleanedText = text;

  // Detect if multiline or ampersand format
  const hasNewline = text.includes('\n');
  const hasAmpersand = text.includes('&');

  if (hasNewline) {
    // Multiline: only parse keywords from first line
    const parsed = parseParlayKeywords(text, rawInput, allowedKeys);
    pusheslose = parsed.pusheslose;
    tieslose = parsed.tieslose;
    freebet = parsed.freebet;
    cleanedText = parsed.cleanedText;
  } else if (hasAmpersand) {
    // Ampersand format: only parse keywords before first ampersand
    const ampIndex = text.indexOf('&');
    const firstPart = text.slice(0, ampIndex);
    const restPart = text.slice(ampIndex);

    // Only parse keywords from the part before the first leg
    const beforeLegs = firstPart.trim().split(/\s+/);
    const keywordsFound: string[] = [];
    const nonKeywords: string[] = [];

    for (const part of beforeLegs) {
      // Check if this looks like a keyword without colon (e.g., "pusheslose")
      if (allowedKeys.includes(part)) {
        throw new InvalidKeywordSyntaxError(rawInput, part, 'Invalid keyword syntax');
      }

      if (part.includes(':')) {
        const [key] = part.split(':');
        if (allowedKeys.includes(key)) {
          keywordsFound.push(part);
          // Parse the keyword
          const [, ...valueParts] = part.split(':');
          const value = valueParts.join(':');

          // Validate value is 'true'
          if (value !== 'true') {
            throw new InvalidKeywordValueError(
              rawInput,
              key,
              value,
              `Invalid ${key} value: must be "true"`
            );
          }

          if (key === 'pusheslose') pusheslose = true;
          if (key === 'tieslose') tieslose = true;
          if (key === 'freebet') freebet = true;
        } else {
          // Not a parlay-level keyword, keep it
          nonKeywords.push(part);
        }
      } else {
        nonKeywords.push(part);
      }
    }

    cleanedText = (nonKeywords.join(' ') + ' ' + restPart).trim();
  }

  // 3. Detect format: ampersand or multiline
  const isMultiline = cleanedText.includes('\n');

  // 4. Extract legs
  let legTexts: string[];

  if (isMultiline) {
    legTexts = cleanedText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l);
  } else {
    // Ampersand format
    legTexts = cleanedText.split('&').map(l => l.trim());
  }

  // 5. Validate leg count
  if (legTexts.length < 2) {
    // Check if user used comma instead of ampersand
    if (cleanedText.includes(',')) {
      throw new InvalidParlayStructureError(rawInput, 'Parlay legs must be separated by &');
    }
    throw new InvalidParlayStructureError(rawInput, 'Parlay requires at least 2 legs');
  }

  // Check for empty legs
  for (let i = 0; i < legTexts.length; i++) {
    if (!legTexts[i]) {
      throw new InvalidParlayLegError(rawInput, i + 1, 'Empty parlay leg');
    }
  }

  // 6. Parse each leg as IW order (reuse existing logic!)
  const legs: ParseResultStraight[] = [];
  for (let i = 0; i < legTexts.length; i++) {
    try {
      const legText = legTexts[i];

      // Check if leg has @ symbol
      if (!legText.includes('@')) {
        // Check if it looks like it's missing a price entirely vs missing @ symbol
        // If it has no symbols at all, it's likely missing price
        if (!legText.match(/[@+-]/)) {
          throw new Error('Each parlay leg must have a price');
        }
        throw new Error('Invalid leg format: missing @ symbol');
      }

      // Check if leg has a price after @
      const atIndex = legText.lastIndexOf('@');
      const afterAt = legText.slice(atIndex + 1).trim();
      if (!afterAt || afterAt.length === 0) {
        throw new Error('Each parlay leg must have a price');
      }

      const legInput = `IW ${legText}`;
      const legResult = parseChatOrder(legInput, options);
      legs.push(legResult);
    } catch (error) {
      const errorMsg = (error as Error).message;
      // Clean up error messages for better parlay context
      if (errorMsg.includes('Invalid chat format') || errorMsg.includes('Expected order')) {
        throw new InvalidParlayLegError(rawInput, i + 1, 'Invalid leg format: missing @ symbol');
      }
      throw new InvalidParlayLegError(rawInput, i + 1, errorMsg);
    }
  }

  // 7. Build result (no size for orders)
  return {
    chatType: 'order',
    betType: 'parlay',
    bet: {
      Risk: undefined,
      ToWin: undefined,
      ExecutionDtm: undefined,
      IsFreeBet: freebet || false,
    },
    useFair: true, // Default to true for orders
    pushesLose: pusheslose || tieslose || undefined,
    legs,
  };
}

export function parseChat(message: string, options?: ParseOptions): ParseResult {
  const trimmed = message.trim();
  const upperTrimmed = trimmed.toUpperCase();

  // Check for parlay prefixes first
  if (upperTrimmed.startsWith('YGP ') || upperTrimmed.startsWith('YGP\n')) {
    return parseParlayFill(message, options);
  }

  if (upperTrimmed.startsWith('IWP ') || upperTrimmed.startsWith('IWP\n')) {
    return parseParlayOrder(message, options);
  }

  // Check for round robin (Stage 3)
  if (upperTrimmed.startsWith('YGRR ') || upperTrimmed.startsWith('IWRR ')) {
    throw new InvalidChatFormatError(message, 'Round robin not yet implemented (Stage 3)');
  }

  // Existing straight bet logic
  if (upperTrimmed.startsWith('IW') || upperTrimmed.startsWith('IWW')) {
    return parseChatOrder(message, options);
  } else if (upperTrimmed.startsWith('YG') || upperTrimmed.startsWith('YGW')) {
    return parseChatFill(message, options);
  } else {
    throw new UnrecognizedChatPrefixError(message, trimmed.split(/\s+/)[0] || '');
  }
}
