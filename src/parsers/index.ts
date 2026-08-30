/**
 * Main parsing engine for chat-bet-parse
 * Implements the EBNF grammar from README.md
 */

import type {
  ParseResult,
  ParseResultStraight,
  ParseResultParlay,
  ParseResultRoundRobin,
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
import { BET_CANDIDATE_SIGNAL } from '../signals';

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
  MissingNcrNotationError,
  LegCountMismatchError,
  InvalidRoundRobinLegError,
  InvalidRoundRobinToWinError,
} from '../errors/index';

import { parseNcrNotation } from './ncr';

import {
  parsePrice,
  parseOrderSize,
  parseFillSize,
  parseStraightSize,
  calculateRiskAndToWin,
  calculateToWinFromRisk,
  calculateRiskFromToWin,
  parsePeriod,
  parseGameNumber,
  parseRotationNumber,
  parseTeams,
  parseOverUnder,
  inferSportAndLeague,
  detectPropType,
  validatePropFormat,
  detectContestantType,
  parsePlayerWithTeam,
  extractContestantAndProp,
  parseWriteinDate,
  validateWriteinDescription,
  parseKeywords,
  parseParlayKeywords,
  parseParlaySize,
  parseRoundRobinSize,
  calculateTotalParlays,
  calculateParlayFairToWin,
  calculateRoundRobinFairToWin,
  PROP_PHRASES_WITH_AND,
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
  size?: number; // Backward compat: when simple size syntax used
  risk?: number; // When risk specified explicitly or via tw/tp syntax
  toWin?: number; // When toWin specified explicitly or via tw/tp syntax
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
  size?: number; // Backward compat: when simple size syntax used
  risk?: number; // When risk specified explicitly or via tw/tp syntax
  toWin?: number; // When toWin specified explicitly or via tw/tp syntax
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

  // Handle IWW/YGW shorthand for writeins (any whitespace delimiter)
  if (/^IWW\s/i.test(processedMessage)) {
    processedMessage = 'IW writein ' + processedMessage.substring(4);
  } else if (/^YGW\s/i.test(processedMessage)) {
    processedMessage = 'YG writein ' + processedMessage.substring(4);
  }

  // Add spaces around @ if they're missing
  processedMessage = processedMessage.replace(/([^@\s])@([^@\s])/g, '$1 @ $2'); // no space before or after
  processedMessage = processedMessage.replace(/([^@\s])@(\s)/g, '$1 @ $2'); // no space before
  processedMessage = processedMessage.replace(/(\s)@([^@\s])/g, '$1 @ $2'); // no space after

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

  // Normalize period word-phrases to the compact codes every later stage
  // (attached-price extraction, contract-type detection, period-at-start
  // reordering) already recognizes. parsePeriod accepts both spellings, so
  // this only widens recognition — "first 5 under 4" used to route to
  // contestant-ML with the whole tail swallowed as a contestant name
  // (live 🙈, 2026-08-28). The optional "innings" suffix mirrors the
  // side-first pattern's vocabulary.
  contractText = contractText
    .replace(/\b(?:first|1st)\s+(?:five|5)(?:\s+innings?)?\b/gi, 'F5')
    .replace(/\b(?:first|1st)\s+(?:half|h)\b/gi, 'H1')
    .replace(/\b(?:second|2nd)\s+(?:half|h)\b/gi, 'H2');

  // Check for attached prices in over/under patterns (e.g., "u2.5-125",
  // "o2.5+125", "under 4-105"). The [ou] shorthand pattern runs first so its
  // behavior stays byte-identical; the word-form fallback covers prices glued
  // to spelled-out totals, which previously stayed in the text and let the
  // -110 default book a wrong risk.
  if (price === undefined) {
    const attachedPriceMatch =
      contractText.match(/([ou])(\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/i) ??
      contractText.match(/\b(over|under)\s*(\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/i);
    if (attachedPriceMatch) {
      // Extract the attached price and clean the contract text
      const attachedPriceStr = attachedPriceMatch[3];
      price = parsePrice(attachedPriceStr, rawInput);
      // Strip just the price, preserving the indicator+line exactly as
      // written (for [ou] shorthand this equals the old m[1]+m[2] rebuild).
      contractText = contractText.replace(
        attachedPriceMatch[0],
        attachedPriceMatch[0].slice(0, -attachedPriceMatch[3].length)
      );
    }
  }

  // Parse price if present and not already found
  let priceSlotWasSize = false;
  if (price === undefined && priceIndex > 0 && priceIndex < parts.length) {
    const priceStr = parts[priceIndex];
    if (priceStr.toLowerCase().endsWith('k') || priceStr.startsWith('$')) {
      // k-notation/$ after @ is a SIZE, not a price — record it and leave
      // price unset so a team-glued price below can still claim the slot
      // (the -110 default applies after, preserving prior behavior).
      priceSlotWasSize = true;
      if (sizeIndex === -1) {
        sizeIndex = priceIndex;
      }
    } else {
      price = parsePrice(priceStr, rawInput);
    }
  }

  // Check for a price glued to a team name (e.g., "gurdians-128", "Yankees+105"):
  // a letter-ending stem immediately followed by a signed 3+ digit INTEGER at a
  // token end. Three digits keeps glued decimals/small numbers ("Angels+1.5")
  // as spread lines, and the letter requirement keeps digit-glued ranges and
  // dates ("8-20", "F5-128") untouched. Runs only when no explicit or
  // standalone price was found — a real price token always wins, and a
  // contradictory glued number then stays in the team text to fail loudly
  // rather than being silently reinterpreted.
  if (price === undefined) {
    const gluedTeamPriceMatch = contractText.match(/([A-Za-z])([+-]\d{3,5})(?=\s|$)/);
    if (gluedTeamPriceMatch) {
      price = parsePrice(gluedTeamPriceMatch[2], rawInput);
      contractText = contractText.replace(gluedTeamPriceMatch[0], gluedTeamPriceMatch[1]);
    }
  }

  // k-notation default price (unchanged behavior when no glued price claimed it)
  if (price === undefined && priceSlotWasSize) {
    price = -110;
  }

  // Parse size if present (using extended syntax support)
  let size: number | undefined;
  let risk: number | undefined;
  let toWin: number | undefined;

  if (sizeIndex > 0 && sizeIndex < parts.length) {
    // Check if there's a '=' sign before the size (normal syntax vs k-notation shorthand)
    if (sizeIndex > 0 && parts[sizeIndex - 1] === '=') {
      // Extended syntax with '=' sign: "= $110 tw $100", "= $120 tp $220", "= risk $110", etc.
      // Collect all parts from '=' onwards
      const sizeStr = parts.slice(sizeIndex - 1).join(' ');
      const interpretation = chatType === 'order' ? 'unit' : 'decimal_thousands';
      const parsed = parseStraightSize(sizeStr, rawInput, interpretation);

      size = parsed.size;
      risk = parsed.risk;
      toWin = parsed.toWin;
    } else {
      // K-notation shorthand without '=' (e.g., "@ 4k")
      // Use old simple parsing
      const sizeStr = parts[sizeIndex];
      if (chatType === 'order') {
        const parsed = parseOrderSize(sizeStr, rawInput);
        size = parsed.value;
      } else {
        const parsed = parseFillSize(sizeStr, rawInput);
        size = parsed.value;
      }
    }
  }

  // Validate fill requirements
  if (chatType === 'fill' && size === undefined && risk === undefined && toWin === undefined) {
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
    const spreadMatch = restOfContract.match(/^((?:49|76)?[a-zA-Z\s&.-]+?)\s+([+-](?:\d+)?\.?\d+)/);
    if (spreadMatch) {
      // Insert period between team and line: "Vanderbilt 2h +2.5"
      const teamName = spreadMatch[1].trim();
      contractText = `${teamName} ${period} ${spreadMatch[2]}`;
    } else {
      // Check if this looks like a total (team name followed by o/u or Over/Under)
      // Use non-greedy match for team name to avoid including the total indicator
      // Also handle team totals (TT) - stop before TT marker
      const teamTotalMatch = restOfContract.match(
        /^((?:49|76)?[a-zA-Z\s&.-]+?)\s+tt\s+([ou]|over|under)\s*(\d+(?:\.\d+)?)/i
      );
      const totalMatch = restOfContract.match(
        /^((?:49|76)?[a-zA-Z\s&.-]+?)\s+([ou]|over|under)\s*(\d+(?:\.\d+)?)/i
      );
      if (teamTotalMatch) {
        // Team total: insert period before TT: "Dolphins 2h TT u10.5"
        const teamName = teamTotalMatch[1].trim();
        contractText = `${teamName} ${period} TT ${teamTotalMatch[2]}${teamTotalMatch[3]}`;
      } else if (totalMatch) {
        // Insert period between team and total: "Utah State 1Q u10.5"
        const teamName = totalMatch[1].trim();
        contractText = `${teamName} ${period} ${totalMatch[2]}${totalMatch[3]}`;
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
    const leagueMatch = contractText.match(/^([A-Za-z]{2,3})\s+(.+)$/);
    if (leagueMatch && knownLeagues.has(leagueMatch[1].toUpperCase() as any)) {
      explicitLeague = leagueMatch[1].toUpperCase() as KnownLeague;
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
    const spreadMatch = restOfContract.match(/^((?:49|76)?[a-zA-Z\s&.-]+?)\s+([+-](?:\d+)?\.?\d+)/);
    if (spreadMatch) {
      // Insert period between team and line: "Vanderbilt 2h +2.5"
      const teamName = spreadMatch[1].trim();
      contractText = `${teamName} ${period} ${spreadMatch[2]}`;
    } else {
      // Check if this looks like a total (team name followed by o/u or Over/Under)
      // Use non-greedy match for team name to avoid including the total indicator
      // Also handle team totals (TT) - stop before TT marker
      const teamTotalMatch = restOfContract.match(
        /^((?:49|76)?[a-zA-Z\s&.-]+?)\s+tt\s+([ou]|over|under)\s*(\d+(?:\.\d+)?)/i
      );
      const totalMatch = restOfContract.match(
        /^((?:49|76)?[a-zA-Z\s&.-]+?)\s+([ou]|over|under)\s*(\d+(?:\.\d+)?)/i
      );
      if (teamTotalMatch) {
        // Team total: insert period before TT: "Dolphins 2h TT u10.5"
        const teamName = teamTotalMatch[1].trim();
        contractText = `${teamName} ${period} TT ${teamTotalMatch[2]}${teamTotalMatch[3]}`;
      } else if (totalMatch) {
        // Insert period between team and total: "Utah State 1Q u10.5"
        const teamName = totalMatch[1].trim();
        contractText = `${teamName} ${period} ${totalMatch[2]}${totalMatch[3]}`;
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
    risk,
    toWin,
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
  // Check these BEFORE generic game totals to avoid false matches
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
    /^(?:49|76)?[a-zA-Z\s&.-]+\s+(f5|f3|h1|1h|h2|2h|q1|q2|q3|q4|p1|p2|p3|\d+(?:st|nd|rd|th)?\s*(?:inning|i|quarter|q|period|p))\s+(over|under|[ou])\s*\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?/i.test(
      contractText
    )
  ) {
    return 'TotalPoints';
  }

  // Single team game totals shorthand: just team name with o/u (e.g., "Bucknell o55.5")
  // This is for cases where sport/league context makes it clear it's a full game total
  if (
    /^(?:49|76)?[a-zA-Z\s&.-]+\s+(over|under|[ou])\s*\d+(?:\.\d+)?(?:[+-]\d+(?:\.\d+)?)?/i.test(
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
    .replace(/\s+tt\s*/i, ' ')
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

  // Extract contestant and prop using the helper function
  const extracted = extractContestantAndProp(withoutOU);
  if (!extracted) {
    throw new InvalidContractTypeError(
      rawInput,
      `Could not extract contestant and prop from: ${withoutOU}`
    );
  }

  let contestant = extracted.contestant;
  const propText = extracted.propText;

  const propInfo = detectPropType(propText);
  if (!propInfo || propInfo.category !== 'PropOU') {
    throw new InvalidContractTypeError(rawInput, `Invalid PropOU type: ${propText}`);
  }

  // Detect contestant type - use keyword-based type first, fallback to pattern detection
  const contestantType = propInfo.contestantType || detectContestantType(contestant);

  // Construct Match differently based on ContestantType
  let match: Match;
  let finalContestant: string;

  if (contestantType === 'Individual') {
    // Individual player prop - use Player field
    const { player, team } = parsePlayerWithTeam(contestant);
    match = {
      Date: eventDate,
      Player: player,
      PlayerTeam: team,
      DaySequence: gameNumber,
    };
    // Remove team affiliation from contestant name for storage
    finalContestant = player;
  } else {
    // Team-level prop - use existing Team1 logic
    match = {
      Date: eventDate,
      Team1: contestant,
      DaySequence: gameNumber,
    };
    finalContestant = contestant;
  }

  return {
    Sport: finalSport,
    League: league,
    Match: match,
    Period: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    HasContestant: true,
    HasLine: true,
    ContractSportCompetitionMatchType: 'Prop',
    ContestantType: contestantType,
    Prop: propInfo.standardName,
    Contestant: finalContestant,
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

  // Extract the team/game info by removing the prop keyword from the contract text
  // Build a list of all PropYN keywords sorted by length (longest first)
  const propYNKeywords = [
    'first team to score',
    '1st team to score',
    'to score first',
    'first to score',
    'last team to score',
    'to score last',
    'last to score',
    'anytime td',
    'anytime touchdown',
    'to score a touchdown',
    'first td',
    'first touchdown',
    'last td',
    'last touchdown',
    '2+ tds',
    '3+ tds',
    'to record a hit',
    'to get a hit',
    'to hit a home run',
    'to hit a hr',
    'to steal a base',
    'to record a win',
    'double double',
    'to record a double double',
    'triple double',
    'to record a triple double',
  ].sort((a, b) => b.length - a.length);

  let teamAndGameInfo = contractText;

  // Find and remove the prop keyword from the end
  for (const keyword of propYNKeywords) {
    const regex = new RegExp(`\\s+${keyword.replace(/\s+/g, '\\s+')}$`, 'i');
    if (regex.test(contractText)) {
      teamAndGameInfo = contractText.replace(regex, '').trim();
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

  // Detect contestant type - use keyword-based type first, fallback to pattern detection
  const contestantType = propInfo.contestantType || detectContestantType(teams.team1);

  // Construct Match differently based on ContestantType
  let finalMatch: Match;
  let finalContestant: string;

  if (contestantType === 'Individual') {
    // Individual player prop - use Player field
    const { player, team } = parsePlayerWithTeam(teams.team1);
    finalMatch = {
      Date: eventDate,
      Player: player,
      PlayerTeam: team,
      DaySequence: gameNumber,
    };
    finalContestant = player;
  } else {
    // Team-level prop - use existing match logic
    finalMatch = match;
    finalContestant = teams.team1;
  }

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
    Match: finalMatch,
    Period: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    HasContestant: true,
    HasLine: false,
    ContractSportCompetitionMatchType: 'Prop',
    ContestantType: contestantType,
    Prop: propInfo.standardName,
    Contestant: finalContestant,
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
    /\b(\d+(?:(?:st|nd|rd|th)\.?)?\s*(?:inning|i))\b/i,
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
// CONTRACT PARSER FACTORY
// ==============================================================================

/**
 * Contract parser function type
 */
type ContractParserFn = (
  contractText: string,
  rawInput: string,
  sport?: Sport,
  league?: League,
  gameNumber?: number,
  eventDate?: Date
) => Contract;

/**
 * Map of contract types to their parser functions
 */
const CONTRACT_PARSERS: Record<ContractType, ContractParserFn> = {
  TotalPoints: parseGameTotal,
  TotalPointsContestant: parseTeamTotal,
  HandicapContestantML: parseMoneyline,
  HandicapContestantLine: parseSpread,
  PropOU: parsePropOU,
  PropYN: parsePropYN,
  Series: parseSeries,
  Writein: () => {
    throw new Error('Writein contracts should have been handled earlier');
  },
};

/**
 * Parse contract using factory pattern
 */
function parseContractByType(
  contractType: ContractType,
  tokens: ParsedTokens,
  sport?: Sport,
  league?: League
): Contract {
  const parser = CONTRACT_PARSERS[contractType];

  if (!parser) {
    throw new InvalidContractTypeError(tokens.rawInput, tokens.contractText);
  }

  if (contractType === 'Writein') {
    throw new InvalidContractTypeError(
      tokens.rawInput,
      'Writein contracts should have been handled earlier'
    );
  }

  return parser(
    tokens.contractText,
    tokens.rawInput,
    sport,
    league,
    tokens.gameNumber,
    tokens.eventDate
  );
}

// ==============================================================================
// MAIN PARSING FUNCTIONS
// ==============================================================================

/**
 * Calculate final Risk and ToWin from parsed size tokens and price
 */
function calculateFinalRiskAndToWin(
  price: number,
  size?: number,
  risk?: number,
  toWin?: number
): { risk?: number; toWin?: number; size?: number } {
  // If both risk and toWin are specified, use them as-is
  if (risk !== undefined && toWin !== undefined) {
    return { risk, toWin };
  }

  // If only risk is specified, calculate toWin from price
  if (risk !== undefined && toWin === undefined) {
    return { risk, toWin: calculateToWinFromRisk(price, risk) };
  }

  // If only toWin is specified, calculate risk from price
  if (toWin !== undefined && risk === undefined) {
    return { risk: calculateRiskFromToWin(price, toWin), toWin };
  }

  // If only size is specified (backward compat), calculate both risk and toWin
  if (size !== undefined) {
    const calculated = calculateRiskAndToWin(price, size);
    return { risk: calculated.risk, toWin: calculated.toWin, size };
  }

  // No size info provided
  return {};
}

/**
 * Parse a chat order (IW message)
 */
export function parseChatOrder(message: string, options?: ParseOptions): ParseResultStraight {
  // A leading Parlay keyword is free-form parlay text (parseChat routes it);
  // letting it fall through would contestant-swallow the whole message into
  // a moneyline on "Parlay ..." at the default price — fail loudly instead.
  if (/^(?:iw|yg)\s+parlay\b/i.test(message.trim())) {
    throw new InvalidChatFormatError(message, 'Free-form parlay text must be parsed via parseChat');
  }

  const tokens = tokenizeChat(message, options);

  if (tokens.chatType !== 'order') {
    throw new InvalidChatFormatError(tokens.rawInput, 'Expected order (IW) message');
  }

  // Calculate final risk and toWin from tokens
  const amounts = calculateFinalRiskAndToWin(tokens.price!, tokens.size, tokens.risk, tokens.toWin);

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
        Size: amounts.size,
        Risk: amounts.risk,
        ToWin: amounts.toWin,
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

  // Parse contract using factory
  const contract = parseContractByType(contractType, tokens, sport, league);

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
      Size: amounts.size,
      Risk: amounts.risk,
      ToWin: amounts.toWin,
      IsFreeBet: tokens.isFreeBet,
    },
  };
}

/**
 * Parse a chat fill (YG message)
 */
export function parseChatFill(message: string, options?: ParseOptions): ParseResultStraight {
  // See parseChatOrder: leading Parlay keyword = free-form parlay text.
  if (/^(?:iw|yg)\s+parlay\b/i.test(message.trim())) {
    throw new InvalidChatFormatError(message, 'Free-form parlay text must be parsed via parseChat');
  }

  const tokens = tokenizeChat(message, options);

  if (tokens.chatType !== 'fill') {
    throw new InvalidChatFormatError(tokens.rawInput, 'Expected fill (YG) message');
  }

  // Calculate final risk and toWin from tokens
  const amounts = calculateFinalRiskAndToWin(tokens.price!, tokens.size, tokens.risk, tokens.toWin);

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
        Size: amounts.size,
        Risk: amounts.risk,
        ToWin: amounts.toWin,
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

  // Parse contract using factory
  const contract = parseContractByType(contractType, tokens, sport, league);

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
      Size: amounts.size,
      Risk: amounts.risk,
      ToWin: amounts.toWin,
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
  let text = rawInput.trim().slice(3).trim();

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
  const legPrices: number[] = []; // Extract prices immediately to avoid using deprecated field later
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
      // Extract price immediately (from tokenization) before deprecated field is no longer needed
      legPrices.push(legResult.bet.Price!);
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

  // 8. Calculate fair ToWin if not explicitly provided
  let finalToWin = toWin;
  if (useFair && risk !== undefined) {
    // Use prices array extracted during leg parsing
    finalToWin = calculateParlayFairToWin(legPrices, risk);
  }

  // 9. Build result
  return {
    chatType: 'fill',
    betType: 'parlay',
    bet: {
      Risk: risk,
      ToWin: finalToWin,
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
  let text = rawInput.trim().slice(3).trim();

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

// ==============================================================================
// ROUND ROBIN PARSING (Stage 3)
// ==============================================================================

/**
 * Parse YGRR (You Got Round Robin) fill message
 * Format: YGRR <ncr> [keywords] leg1 & leg2 [& leg3...] = $risk <type> [tw $towin]
 */
function parseRoundRobinFill(rawInput: string, options?: ParseOptions): ParseResultRoundRobin {
  // 1. Extract "YGRR" prefix
  let text = rawInput.trim().slice(4).trim();

  // 2. Parse round robin-level keywords (same as parlays)
  const allowedKeys = ['pusheslose', 'tieslose', 'freebet'];
  let keywordResult;
  try {
    keywordResult = parseParlayKeywords(text, rawInput, allowedKeys);
  } catch (error) {
    // Check if this is an unknown keyword error for "towin"
    if (
      (error as Error).name === 'UnknownKeywordError' &&
      (error as Error).message.includes('towin')
    ) {
      throw new InvalidRoundRobinToWinError(
        rawInput,
        'Invalid to-win format: use "tw $500" not "towin:500"'
      );
    }
    throw error;
  }
  const { pusheslose, tieslose, freebet, cleanedText } = keywordResult;

  // 3. Extract nCr notation (must be first token after keywords)
  const firstToken = cleanedText.match(/^\S+/);
  if (!firstToken) {
    throw new MissingNcrNotationError(rawInput);
  }

  const ncrNotation = firstToken[0];

  // Validate it looks like nCr notation (more lenient check)
  // Must have digits, a letter, and more content
  if (!/^\d+[a-zA-Z]/.test(ncrNotation)) {
    // Check if there's a valid nCr notation later in the text
    if (/\d+[cC]\d+/.test(cleanedText)) {
      throw new MissingNcrNotationError(rawInput, 'nCr notation must appear before legs');
    }
    throw new MissingNcrNotationError(rawInput);
  }

  // Now validate with parseNcrNotation (will throw InvalidNcrNotationError for bad formats)
  const { totalLegs, parlaySize, isAtMost } = parseNcrNotation(ncrNotation, rawInput);

  // Remove nCr from text (preserving newlines)
  const afterNcr = cleanedText.slice(ncrNotation.length).trim();

  // 4. Detect format: ampersand or multiline
  const isMultiline = afterNcr.includes('\n');

  // 5. Extract legs and size
  let legTexts: string[];
  let sizeText: string;

  if (isMultiline) {
    const lines = afterNcr
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
    const sizeIndex = afterNcr.indexOf('=');
    if (sizeIndex === -1) {
      throw new MissingSizeForFillError(rawInput);
    }
    const legsText = afterNcr.slice(0, sizeIndex).trim();
    sizeText = afterNcr.slice(sizeIndex).trim();
    legTexts = legsText.split('&').map(l => l.trim());
  }

  // 6. Validate leg count matches nCr notation
  if (legTexts.length !== totalLegs) {
    throw new LegCountMismatchError(rawInput, totalLegs, legTexts.length);
  }

  // 7. Validate legs are not empty and have prices
  for (let i = 0; i < legTexts.length; i++) {
    const leg = legTexts[i];
    if (!leg || leg.trim() === '') {
      throw new InvalidRoundRobinLegError(rawInput, i + 1, 'Empty round robin leg');
    }
    // Check if leg has a price (must have @ symbol)
    if (!leg.includes('@')) {
      throw new InvalidRoundRobinLegError(
        rawInput,
        i + 1,
        'Each round robin leg must have a price'
      );
    }
  }

  // 8. Parse each leg as IW order (reuse existing logic!)
  const legs: ParseResultStraight[] = [];
  const legPrices: number[] = []; // Extract prices immediately to avoid using deprecated field later
  for (let i = 0; i < legTexts.length; i++) {
    try {
      const legInput = `IW ${legTexts[i]}`;
      const legResult = parseChatOrder(legInput, options);
      legs.push(legResult);
      // Extract price immediately (from tokenization) before deprecated field is no longer needed
      legPrices.push(legResult.bet.Price!);
    } catch (error) {
      const errorMsg = (error as Error).message;
      throw new InvalidRoundRobinLegError(rawInput, i + 1, errorMsg);
    }
  }

  // 9. Parse size with risk type
  const { risk, toWin, useFair, riskType } = parseRoundRobinSize(sizeText, rawInput);

  // 10. Calculate total risk for per-selection mode
  // For per-selection mode: total risk = per-parlay risk × number of parlays
  let totalRisk = risk;
  if (riskType === 'perSelection' && risk !== undefined) {
    const totalParlays = calculateTotalParlays(totalLegs, parlaySize, isAtMost);
    totalRisk = risk * totalParlays;
  }

  // 11. Calculate fair ToWin if not explicitly provided
  let finalToWin = toWin;
  if (useFair && totalRisk !== undefined) {
    // Use prices array extracted during leg parsing
    finalToWin = calculateRoundRobinFairToWin(legPrices, totalRisk, riskType, parlaySize, isAtMost);
  }

  // 11. Build result
  return {
    chatType: 'fill',
    betType: 'roundRobin',
    bet: {
      Risk: totalRisk,
      ToWin: finalToWin,
      ExecutionDtm: new Date(),
      IsFreeBet: freebet || false,
    },
    useFair,
    pushesLose: pusheslose || tieslose || undefined,
    parlaySize,
    isAtMost,
    riskType,
    legs,
  };
}

/**
 * Parse IWRR (I Want Round Robin) order message
 * Format: IWRR <ncr> [keywords] leg1 & leg2 [& leg3...]
 */
function parseRoundRobinOrder(rawInput: string, options?: ParseOptions): ParseResultRoundRobin {
  // 1. Extract "IWRR" prefix
  let text = rawInput.trim().slice(4).trim();

  // 2. Parse round robin-level keywords (same as parlays)
  const allowedKeys = ['pusheslose', 'tieslose', 'freebet'];
  let keywordResult;
  try {
    keywordResult = parseParlayKeywords(text, rawInput, allowedKeys);
  } catch (error) {
    // Check if this is an unknown keyword error for "towin"
    if (
      (error as Error).name === 'UnknownKeywordError' &&
      (error as Error).message.includes('towin')
    ) {
      throw new InvalidRoundRobinToWinError(
        rawInput,
        'Invalid to-win format: use "tw $500" not "towin:500"'
      );
    }
    throw error;
  }
  const { pusheslose, tieslose, freebet, cleanedText } = keywordResult;

  // 3. Extract nCr notation (must be first token after keywords)
  const firstToken = cleanedText.match(/^\S+/);
  if (!firstToken) {
    throw new MissingNcrNotationError(rawInput);
  }

  const ncrNotation = firstToken[0];

  // Validate it looks like nCr notation (more lenient check)
  // Must have digits, a letter, and more content
  if (!/^\d+[a-zA-Z]/.test(ncrNotation)) {
    // Check if there's a valid nCr notation later in the text
    if (/\d+[cC]\d+/.test(cleanedText)) {
      throw new MissingNcrNotationError(rawInput, 'nCr notation must appear before legs');
    }
    throw new MissingNcrNotationError(rawInput);
  }

  // Now validate with parseNcrNotation (will throw InvalidNcrNotationError for bad formats)
  const { totalLegs, parlaySize, isAtMost } = parseNcrNotation(ncrNotation, rawInput);

  // Remove nCr from text (preserving newlines)
  const afterNcr = cleanedText.slice(ncrNotation.length).trim();

  // 4. Detect format: ampersand or multiline
  const isMultiline = afterNcr.includes('\n');

  // 5. Extract legs
  let legTexts: string[];

  if (isMultiline) {
    legTexts = afterNcr
      .split('\n')
      .map(l => l.trim())
      .filter(l => l);
  } else {
    // Ampersand format
    legTexts = afterNcr.split('&').map(l => l.trim());
  }

  // 6. Validate leg count matches nCr notation
  if (legTexts.length !== totalLegs) {
    throw new LegCountMismatchError(rawInput, totalLegs, legTexts.length);
  }

  // 7. Validate legs are not empty and have prices
  for (let i = 0; i < legTexts.length; i++) {
    const leg = legTexts[i];
    if (!leg || leg.trim() === '') {
      throw new InvalidRoundRobinLegError(rawInput, i + 1, 'Empty round robin leg');
    }
    // Check if leg has a price (must have @ symbol)
    if (!leg.includes('@')) {
      throw new InvalidRoundRobinLegError(
        rawInput,
        i + 1,
        'Each round robin leg must have a price'
      );
    }
  }

  // 8. Parse each leg as IW order (reuse existing logic!)
  const legs: ParseResultStraight[] = [];
  for (let i = 0; i < legTexts.length; i++) {
    try {
      const legInput = `IW ${legTexts[i]}`;
      const legResult = parseChatOrder(legInput, options);
      legs.push(legResult);
    } catch (error) {
      const errorMsg = (error as Error).message;
      throw new InvalidRoundRobinLegError(rawInput, i + 1, errorMsg);
    }
  }

  // 8. Build result (no size for orders, default riskType to 'perSelection')
  return {
    chatType: 'order',
    betType: 'roundRobin',
    bet: {
      Risk: undefined,
      ToWin: undefined,
      ExecutionDtm: undefined,
      IsFreeBet: freebet || false,
    },
    useFair: true, // Default to true for orders
    pushesLose: pusheslose || tieslose || undefined,
    parlaySize,
    isAtMost,
    riskType: 'perSelection', // Default for orders
    legs,
  };
}

/**
 * Free-form parlay: `Parlay <leg> and|& <leg> [...] @ <combined price>
 * [= size]` after a bare YG/IW prefix (or implied). Live sample 2026-08-26:
 * "yg Parlay Cubs ml and over 8.5 @ +265 = $3500" — before this grammar the
 * straight path contestant-swallowed the whole text into a moneyline on
 * "Parlay Cubs ml and" at the default -110, a wrong-contract fill.
 *
 * Unlike YGP/IWP, legs carry NO individual prices — the single @ price
 * prices the whole ticket — so a leg containing `@` or a price-shaped
 * signed integer fails loudly toward the per-leg-priced grammar instead of
 * being reinterpreted. A team-less total leg ("over 8.5") inherits the
 * nearest prior leg's team: that is the human reading (the same game's
 * total), and without it the leg would contestant-swallow AND be
 * un-matchable downstream (combo legs must carry participants).
 */
/**
 * Split free-form parlay legs on the word `and`. `and` alone is the
 * separator — `&` is legal INSIDE team names (Texas A&M, William & Mary),
 * so treating it as a separator silently corrupts those into fake legs;
 * an &-separated message instead keeps `&` in the leg text and dies loudly
 * on the 2-leg minimum. Two protected `and` contexts never split:
 * spoken half-lines ("over 8 and a half" → normalized to 8.5) and combo
 * prop phrases from the grammar's own vocabulary ("points and assists").
 */
function splitFreeformLegs(legsText: string): string[] {
  const AND_MARK = '\u0001';
  let text = legsText;
  for (const phrase of PROP_PHRASES_WITH_AND) {
    const re = new RegExp(phrase.replace(/ /g, '\\s+'), 'gi');
    text = text.replace(re, m => m.replace(/\s+and\s+/gi, AND_MARK));
  }
  text = text.replace(/(\d+)\s+and\s+a\s+half\b/gi, '$1.5');
  return text
    .split(/\s+and\s+/i)
    .map(part => part.split(AND_MARK).join(' and ').trim())
    .filter(part => part);
}

/**
 * Leading-Parlay detection, shared by the parseChat router, the implied
 * router, and the straight-path guards. Must recognize the SAME boundary as
 * BET_CANDIDATE_SIGNAL's `^\s*parlay\b` branch — a narrower check here lets
 * punctuated forms ("Parlay. Cubs ml …") fall through to straight parsing,
 * where '.' is legal team text and the missing price defaults to -110: the
 * silent wrong-contract class again.
 */
const LEADING_PARLAY = /^parlay\b/i;

function parseFreeformParlay(
  text: string,
  rawInput: string,
  chatType: 'order' | 'fill',
  options?: ParseOptions
): ParseResultParlay {
  // Strip the keyword plus any adjacent junk. The junk class must consume
  // at least everything LEADING_PARLAY's \b boundary admits — a narrower
  // strip leaves "&"/"'" behind, which are legal team characters and would
  // silently dirty the first leg's contestant ("& Cubs"). Structural @ and
  // = survive so a degenerate "Parlay @ +265" still reaches the 2-leg check.
  let body = text.trim().replace(/^parlay\b[^\w@=]*/i, '');

  // Parlay-level keywords, leading position only (YGP semantics).
  let pusheslose: boolean | undefined;
  let tieslose: boolean | undefined;
  let freebet: boolean | undefined;
  const KEYWORD_TOKEN = /^(pusheslose|tieslose|freebet):(\S+)\s+/i;
  let keywordMatch;
  while ((keywordMatch = body.match(KEYWORD_TOKEN))) {
    const key = keywordMatch[1].toLowerCase();
    const value = keywordMatch[2];
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
    body = body.slice(keywordMatch[0].length);
  }

  // Size section first (fills: `= $risk [tw $x]`).
  const eqIndex = body.indexOf('=');
  const sizeText = eqIndex === -1 ? undefined : body.slice(eqIndex).trim();
  const priced = eqIndex === -1 ? body : body.slice(0, eqIndex);

  if (chatType === 'order' && sizeText !== undefined) {
    throw new InvalidParlayStructureError(
      rawInput,
      'Free-form parlay orders take no size — price the ticket with @ only'
    );
  }

  // Combined price after the LAST @; legs themselves must not contain @.
  const atIndex = priced.lastIndexOf('@');
  let price: number | undefined;
  let legsText: string;
  if (atIndex === -1) {
    legsText = priced.trim();
  } else {
    legsText = priced.slice(0, atIndex).trim();
    const priceStr = priced.slice(atIndex + 1).trim();
    if (!priceStr) {
      throw new InvalidParlayStructureError(rawInput, 'Free-form parlay @ needs a combined price');
    }
    price = parsePrice(priceStr, rawInput);
  }

  if (legsText.includes('@')) {
    throw new InvalidParlayStructureError(
      rawInput,
      'Free-form parlay legs carry no per-leg @ prices — use YGP/IWP for per-leg pricing'
    );
  }
  if (/\b(?:pusheslose|tieslose|freebet):/i.test(legsText)) {
    throw new InvalidParlayStructureError(rawInput, 'Parlay keywords go before the first leg');
  }

  const legTexts = splitFreeformLegs(legsText);
  if (legTexts.length < 2) {
    throw new InvalidParlayStructureError(rawInput, 'Parlay requires at least 2 legs');
  }

  const legs: ParseResultStraight[] = [];
  let lastTeam: string | undefined;
  for (let i = 0; i < legTexts.length; i++) {
    let legText = legTexts[i];
    if (/[+-]\d{3,5}(?!\d)/.test(legText)) {
      throw new InvalidParlayLegError(
        rawInput,
        i + 1,
        'Free-form parlay legs carry no prices — use YGP/IWP for per-leg pricing'
      );
    }
    if (/^(?:over|under|[ou])\s*\d/i.test(legText)) {
      if (lastTeam === undefined) {
        throw new InvalidParlayLegError(
          rawInput,
          i + 1,
          'Team-less total leg has no prior leg to inherit a game from'
        );
      }
      legText = `${lastTeam} ${legText}`;
    }
    try {
      const legResult = parseChatOrder(`IW ${legText}`, options);
      const match = (legResult.contract as { Match?: { Team1?: string } }).Match;
      if (match?.Team1) {
        lastTeam = match.Team1;
      }
      // The straight grammar default-prices bare orders at -110; a
      // free-form leg is proven price-free above, so undefined is the
      // truth and -110 would be fabrication.
      legs.push({ ...legResult, bet: { ...legResult.bet, Price: undefined } });
    } catch (error) {
      if (error instanceof InvalidParlayLegError) throw error;
      throw new InvalidParlayLegError(rawInput, i + 1, (error as Error).message);
    }
  }

  if (chatType === 'order') {
    if (price === undefined) {
      throw new InvalidParlayStructureError(
        rawInput,
        'Free-form parlay orders need a combined @ price'
      );
    }
    return {
      chatType: 'order',
      betType: 'parlay',
      bet: {
        Price: price,
        Risk: undefined,
        ToWin: undefined,
        ExecutionDtm: undefined,
        IsFreeBet: freebet || false,
      },
      useFair: true,
      pushesLose: pusheslose || tieslose || undefined,
      legs,
    };
  }

  if (sizeText === undefined) {
    throw new MissingSizeForFillError(rawInput);
  }
  const { risk, toWin, useFair } = parseParlaySize(sizeText, rawInput);
  let finalToWin = toWin;
  if (useFair) {
    if (price === undefined || risk === undefined) {
      throw new InvalidParlayStructureError(
        rawInput,
        'Free-form parlay fill needs a combined @ price or an explicit tw'
      );
    }
    finalToWin = calculateParlayFairToWin([price], risk);
  }
  return {
    chatType: 'fill',
    betType: 'parlay',
    bet: {
      Price: price,
      Risk: risk,
      ToWin: finalToWin,
      ExecutionDtm: new Date(),
      IsFreeBet: freebet || false,
    },
    useFair,
    pushesLose: pusheslose || tieslose || undefined,
    legs,
  };
}

export function parseChat(message: string, options?: ParseOptions): ParseResult {
  const trimmed = message.trim();
  const upperTrimmed = trimmed.toUpperCase();

  // Check for round robin first (before parlay); any whitespace delimiter
  if (/^YGRR\s/.test(upperTrimmed)) {
    return parseRoundRobinFill(message, options);
  }

  if (/^IWRR\s/.test(upperTrimmed)) {
    return parseRoundRobinOrder(message, options);
  }

  // Check for parlay prefixes
  if (/^YGP\s/.test(upperTrimmed)) {
    return parseParlayFill(message, options);
  }

  if (/^IWP\s/.test(upperTrimmed)) {
    return parseParlayOrder(message, options);
  }

  // Free-form parlays: bare YG/IW + leading Parlay keyword (combined price).
  const freeform = upperTrimmed.match(/^(YG|IW)\s+PARLAY\b/);
  if (freeform) {
    return parseFreeformParlay(
      trimmed.replace(/^(?:yg|iw)\s+/i, ''),
      message,
      freeform[1] === 'YG' ? 'fill' : 'order',
      options
    );
  }

  // Existing straight bet logic
  if (upperTrimmed.startsWith('IW') || upperTrimmed.startsWith('IWW')) {
    return parseChatOrder(message, options);
  } else if (upperTrimmed.startsWith('YG') || upperTrimmed.startsWith('YGW')) {
    return parseChatFill(message, options);
  } else if (options?.impliedPrefix) {
    return parseWithImpliedPrefix(trimmed, options.impliedPrefix, options);
  } else {
    throw new UnrecognizedChatPrefixError(message, trimmed.split(/\s+/)[0] || '');
  }
}

// ==============================================================================
// IMPLIED PREFIX (unprefixed messages in designated chats)
// ==============================================================================

/**
 * Side-first order pattern observed live (2026-08-19):
 * "Over 4 first five -105 Red Sox" — side word, line, first-five period
 * phrase, bare signed American price, trailing team. Rewritten to the
 * canonical single-team game-total form before the standard grammar runs.
 * Deliberately the ONLY nonstandard word order supported — new patterns are
 * added when a real sample forces them, never speculatively.
 */
const SIDE_FIRST_F5_TOTAL =
  /^(over|under)\s+(\d+(?:\.\d+)?)\s+(?:first\s*(?:5|five)|1st\s*(?:5|five))(?:\s*innings?)?\s+([+-]\d+(?:\.\d+)?)\s+(\S.*)$/i;

/**
 * Bet-signal gate for implied-prefix parsing: an explicit price/size marker
 * (`@`) or a candidate signed number (BET_CANDIDATE_SIGNAL). Without one,
 * unprefixed text is conversation, not a bet — the grammar's default-price
 * paths would otherwise silently turn chatter like "will lyk when im ready"
 * into a moneyline order on a nonsense team.
 */
const IMPLIED_BET_SIGNAL = new RegExp(
  `@|${BET_CANDIDATE_SIGNAL.source}`,
  BET_CANDIDATE_SIGNAL.flags
);

/**
 * Parse an unprefixed message as if `impliedPrefix` were present, using the
 * full existing straight-bet grammar. Multi-line parlay/round-robin forms are
 * not implied — those keep their explicit YGP/IWP/YGRR/IWRR prefixes.
 */
function parseWithImpliedPrefix(
  trimmed: string,
  impliedPrefix: 'IW' | 'YG',
  options?: ParseOptions
): ParseResult {
  if (!IMPLIED_BET_SIGNAL.test(trimmed)) {
    throw new UnrecognizedChatPrefixError(trimmed, trimmed.split(/\s+/)[0] || '');
  }
  if (LEADING_PARLAY.test(trimmed)) {
    return parseFreeformParlay(
      trimmed,
      trimmed,
      impliedPrefix === 'YG' ? 'fill' : 'order',
      options
    );
  }
  if (impliedPrefix === 'IW') {
    const sideFirst = trimmed.match(SIDE_FIRST_F5_TOTAL);
    if (sideFirst) {
      const [, side, line, price, team] = sideFirst;
      const canonical = `IW ${team.trim()} F5 ${side[0].toLowerCase()}${line} @ ${price}`;
      return parseChatOrder(canonical, options);
    }
    return parseChatOrder(`IW ${trimmed}`, options);
  }
  return parseChatFill(`YG ${trimmed}`, options);
}
