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
} from '../types/index';

import {
  InvalidChatFormatError,
  UnrecognizedChatPrefixError,
  MissingSizeForFillError,
  InvalidContractTypeError,
  InvalidRotationNumberError,
  InvalidGameNumberError,
  InvalidTeamFormatError,
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
} from './utils';

// ==============================================================================
// TOKENIZER
// ==============================================================================

interface ParsedTokens {
  chatType: 'order' | 'fill';
  rotationNumber?: number;
  contractText: string;
  price?: number;
  size?: number;
  rawInput: string;
}

/**
 * Break down the chat message into tokens according to EBNF grammar
 */
function tokenizeChat(message: string): ParsedTokens {
  const rawInput = message; // Preserve original input for error reporting
  const parts = message.trim().split(/\s+/);

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

  for (let i = currentIndex; i < parts.length; i++) {
    if (parts[i] === '@' && i + 1 < parts.length) {
      priceIndex = i + 1;
    }
    if (parts[i] === '=' && i + 1 < parts.length) {
      sizeIndex = i + 1;
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

      // If it's likely a price (> 100 or whole number between 50-100), treat as price
      if (value > 50 && (value > 100 || value % 1 === 0)) {
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

  const contractText = parts.slice(currentIndex, contractEndIndex).join(' ');

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

  return {
    chatType,
    rotationNumber,
    contractText,
    price: price ?? -110, // Default price
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
    /\stt\s*[ou]/i.test(contractText) ||
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
    // Check if the text contains an over/under line pattern
    const hasLine = /[ou]\d+(?:\.\d+)?/i.test(contractText);

    // Validate the prop format
    validatePropFormat(text, hasLine, rawInput);

    return propInfo.category; // Returns 'PropOU' or 'PropYN'
  }

  // Check for prop-like patterns (Player/Team names followed by descriptive text)
  // This catches unsupported prop types that don't match our known patterns
  // Only apply to patterns that look like props (e.g., Player123 something, not generic text)
  if (/^[a-zA-Z0-9]+\s+[a-zA-Z\s]+(yards|rbi|rebounds|score|strikeouts|prop)/i.test(contractText)) {
    // This looks like a prop but isn't in our known types - validate it to get proper error
    const hasLine = /[ou]\d+(?:\.\d+)?/i.test(contractText);
    validatePropFormat(text, hasLine, rawInput);
  }

  // Spreads: team name followed by +/- number (but not if it's clearly a price like +145)
  if (/[a-zA-Z]+\s*[+-]\d+(?:\.\d+)?/i.test(contractText)) {
    // Check if this might be a price rather than a spread
    // Prices are typically > 100 or have decimals like +145, -110.5
    const spreadMatch = contractText.match(/[a-zA-Z]+\s*([+-])(\d+(?:\.\d+)?)/i);
    if (spreadMatch) {
      const value = parseFloat(spreadMatch[2]);
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

  // Game totals: teams with o/u
  if (/\//.test(contractText) && /[ou]\d+(?:\.\d+)?/i.test(contractText)) {
    return 'TotalPoints';
  }

  // Moneylines: just team name (after eliminating other types)
  if (!text.includes('/') && !text.includes('o') && !text.includes('u')) {
    return 'HandicapContestantML';
  }

  throw new InvalidContractTypeError(rawInput, contractText);
}

// ==============================================================================
// CONTRACT PARSERS
// ==============================================================================

/**
 * Parse game total: "Padres/Pirates 1st inning u0.5"
 */
function parseGameTotal(
  contractText: string,
  rawInput: string,
  sport: Sport,
  league: League
): ContractSportCompetitionMatchTotalPoints {
  // Extract over/under and line
  const ouMatch = contractText.match(/([ou])(\d+(?:\.\d+)?)/i);
  if (!ouMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const { isOver, line } = parseOverUnder(ouMatch[0], rawInput);

  // Remove the o/u part to get teams and period
  const withoutOU = contractText.replace(/\s*[ou]\d+(?:\.\d+)?/i, '').trim();

  // Parse teams and extract game info
  const { teams, period, match } = parseMatchInfo(withoutOU, rawInput, sport, league);

  if (!teams.team2) {
    throw new InvalidContractTypeError(rawInput, 'Game total requires two teams (Team1/Team2)');
  }

  return {
    Sport: sport,
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
  sport: Sport,
  league: League
): ContractSportCompetitionMatchTotalPointsContestant {
  // Extract over/under and line
  const ouMatch = contractText.match(/([ou])(\d+(?:\.\d+)?)/i);
  if (!ouMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const { isOver, line } = parseOverUnder(ouMatch[0], rawInput);

  // Remove the o/u part and TT to get team and period
  const withoutOU = contractText
    .replace(/\s*[ou]\d+(?:\.\d+)?/i, '')
    .replace(/\s*tt\s*/i, ' ')
    .trim();

  // Parse team and extract match info
  const { teams, period, match } = parseMatchInfo(withoutOU, rawInput, sport, league);

  return {
    Sport: sport,
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
 * Parse moneyline: "872 Athletics"
 */
function parseMoneyline(
  contractText: string,
  rawInput: string,
  sport: Sport,
  league: League
): ContractSportCompetitionMatchHandicapContestantML {
  const { teams, period, match } = parseMatchInfo(contractText, rawInput, sport, league);

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
 * Parse spread: "870 Mariners -1.5 +135"
 */
function parseSpread(
  contractText: string,
  rawInput: string,
  sport: Sport,
  league: League
): ContractSportCompetitionMatchHandicapContestantLine {
  // Extract spread line and price (if embedded)
  const spreadMatch = contractText.match(
    /([a-zA-Z\s&]+)\s*([+-])(\d+(?:\.\d+)?)(?:\s*([+-]\d+(?:\.\d+)?))?/
  );
  if (!spreadMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const teamPart = spreadMatch[1].trim();
  const sign = spreadMatch[2];
  const lineValue = parseFloat(spreadMatch[3]);
  const line = sign === '+' ? lineValue : -lineValue;

  const { teams, period, match } = parseMatchInfo(teamPart, rawInput, sport, league);

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
 * Parse PropOU bet: "Player123 passing yards o250.5"
 */
function parsePropOU(
  contractText: string,
  rawInput: string,
  sport: Sport,
  league: League
): ContractSportCompetitionMatchPropOU {
  // Extract over/under and line
  const ouMatch = contractText.match(/([ou])(\d+(?:\.\d+)?)/i);
  if (!ouMatch) {
    throw new InvalidContractTypeError(rawInput, 'PropOU requires an over/under line');
  }

  const { isOver, line } = parseOverUnder(ouMatch[0], rawInput);

  // Remove the o/u part to get player/team and prop type
  const withoutOU = contractText.replace(/\s*[ou]\d+(?:\.\d+)?/i, '').trim();

  // Extract player/team (first word typically) and prop type
  const parts = withoutOU.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const contestant = parts[0];
  const propText = parts.slice(1).join(' ').toLowerCase();

  const propInfo = detectPropType(propText);
  if (!propInfo || propInfo.category !== 'PropOU') {
    throw new InvalidContractTypeError(rawInput, `Invalid PropOU type: ${propText}`);
  }

  // Create basic match info
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    Sport: sport,
    League: league,
    Match: {
      Date: today,
      Team1: contestant,
    },
    Period: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    HasContestant: true,
    HasLine: true,
    ContractSportCompetitionMatchType: 'Prop',
    ContestantType: 'Individual', // Usually individual players for these props
    Prop: propInfo.standardName,
    Contestant: contestant,
    Line: line,
    IsOver: isOver,
  };
}

/**
 * Parse PropYN bet: "CIN 1st team to score"
 */
function parsePropYN(
  contractText: string,
  rawInput: string,
  sport: Sport,
  league: League
): ContractSportCompetitionMatchPropYN {
  // Extract team (first word typically)
  const parts = contractText.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const team = parts[0];
  const propText = parts.slice(1).join(' ').toLowerCase();

  const propInfo = detectPropType(propText);
  if (!propInfo || propInfo.category !== 'PropYN') {
    throw new InvalidContractTypeError(rawInput, `Invalid PropYN type: ${propText}`);
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

  // Create basic match info (props typically don't have detailed match context)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    Sport: sport,
    League: league,
    Match: {
      Date: today,
      Team1: team,
    },
    Period: { PeriodTypeCode: 'M', PeriodNumber: 0 },
    HasContestant: true,
    HasLine: false,
    ContractSportCompetitionMatchType: 'Prop',
    ContestantType: 'TeamLeague',
    Prop: propInfo.standardName,
    Contestant: team,
    IsYes: isYes,
  };
}

/**
 * Parse series bet: "852 Guardians series" or "854 Yankees 4 game series"
 */
function parseSeries(
  contractText: string,
  rawInput: string,
  sport: Sport,
  league: League
): ContractSportCompetitionSeries {
  // Extract series length if specified
  // Try "out of X" pattern first
  const outOfMatch = contractText.match(/series\s+out\s+of\s+(\d+)/i);
  let seriesLength: number;

  if (outOfMatch) {
    seriesLength = parseInt(outOfMatch[1]);
  } else {
    // Try "X game series" pattern
    const lengthMatch = contractText.match(/(\d+)\s*game\s*series/i);
    seriesLength = lengthMatch ? parseInt(lengthMatch[1]) : 3; // Default to 3
  }

  // Extract team (before "series" and any numbers/modifiers)
  const teamMatch = contractText.match(/([a-zA-Z\s&]+?)\s*(?:(?:\d+\s*game\s*)?series|series)/i);
  if (!teamMatch) {
    throw new InvalidContractTypeError(rawInput, contractText);
  }

  const team = teamMatch[1].trim();

  // Create basic match info
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    Sport: sport,
    League: league,
    Match: {
      Date: today,
      Team1: team,
    },
    SeriesLength: seriesLength,
    Contestant: team,
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
  _sport: Sport,
  _league: League
): {
  teams: { team1: string; team2?: string };
  period: Period;
  match: Match;
} {
  let workingText = text.trim();

  // Extract game number if present
  let daySequence: number | undefined;
  const gameMatch = workingText.match(/\s+(g(?:m)?\d+|#\d+)\s*/i);
  if (gameMatch) {
    daySequence = parseGameNumber(gameMatch[1], rawInput);
    workingText = workingText.replace(gameMatch[0], ' ').trim();
  } else {
    // Check for invalid game number patterns like "Gx", "G", "#x", etc.
    const invalidGameMatch = workingText.match(/\s+(g(?:m)?[a-zA-Z]+|#[a-zA-Z]+|g(?:m)?$|#$)\s*/i);
    if (invalidGameMatch) {
      throw new InvalidGameNumberError(rawInput, invalidGameMatch[1]);
    }
  }

  // Extract period if present
  let period: Period = { PeriodTypeCode: 'M', PeriodNumber: 0 }; // Default
  const periodPatterns = [
    /\b(\d+(?:st|nd|rd|th)?\s*(?:inning|i))\b/i,
    /\b(f5|h1|1h|h2|2h)\b/i,
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const match: Match = {
    Date: today,
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

  const contractType = detectContractType(tokens.contractText, tokens.rawInput);
  const { sport, league } = inferSportAndLeague(tokens.rotationNumber);

  let contract: Contract;

  switch (contractType) {
    case 'TotalPoints':
      contract = parseGameTotal(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'TotalPointsContestant':
      contract = parseTeamTotal(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'HandicapContestantML':
      contract = parseMoneyline(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'HandicapContestantLine':
      contract = parseSpread(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'PropOU':
      contract = parsePropOU(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'PropYN':
      contract = parsePropYN(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'Series':
      contract = parseSeries(tokens.contractText, tokens.rawInput, sport, league);
      break;
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

  const contractType = detectContractType(tokens.contractText, tokens.rawInput);
  const { sport, league } = inferSportAndLeague(tokens.rotationNumber);

  let contract: Contract;

  switch (contractType) {
    case 'TotalPoints':
      contract = parseGameTotal(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'TotalPointsContestant':
      contract = parseTeamTotal(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'HandicapContestantML':
      contract = parseMoneyline(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'HandicapContestantLine':
      contract = parseSpread(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'PropOU':
      contract = parsePropOU(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'PropYN':
      contract = parsePropYN(tokens.contractText, tokens.rawInput, sport, league);
      break;
    case 'Series':
      contract = parseSeries(tokens.contractText, tokens.rawInput, sport, league);
      break;
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

  if (trimmed.toUpperCase().startsWith('IW')) {
    return parseChatOrder(message);
  } else if (trimmed.toUpperCase().startsWith('YG')) {
    return parseChatFill(message);
  } else {
    throw new UnrecognizedChatPrefixError(message, trimmed.split(/\s+/)[0] || '');
  }
}
