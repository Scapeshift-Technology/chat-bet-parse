/**
 * Core type definitions for chat-bet-parse
 * Based on SQL Server schema with TypeScript enhancements
 */

// ==============================================================================
// BASIC TYPES
// ==============================================================================

export type Sport =
  | 'Baseball'
  | 'Basketball'
  | 'Boxing'
  | 'Football'
  | 'Golf'
  | 'Hockey'
  | 'MMA'
  | 'Motor'
  | 'Politics'
  | 'Soccer'
  | 'Tennis';

export type League =
  | 'MLB' // Baseball
  | 'WNBA' // Basketball
  | 'CBK' // Basketball (NCAA)
  | 'CBB' // Basketball (NCAA - alias for CBK)
  | 'NBA' // Basketball
  | 'CFL' // Football (Canadian)
  | 'CFB' // Football (NCAA)
  | 'NFL' // Football
  | 'UFL' // Football
  | 'FCS' // Football (NCAA - alias for CFB)
  | 'LPGA' // Golf
  | 'PGA' // Golf
  | 'NHL' // Hockey
  | 'UFC' // MMA
  | 'WTA' // Tennis
  | 'ATP'; // Tennis

export const leagueSportMap: Record<League, Sport> = {
  MLB: 'Baseball',
  WNBA: 'Basketball',
  CBK: 'Basketball',
  CBB: 'Basketball',
  NBA: 'Basketball',
  CFL: 'Football',
  CFB: 'Football',
  NFL: 'Football',
  UFL: 'Football',
  FCS: 'Football',
  LPGA: 'Golf',
  PGA: 'Golf',
  NHL: 'Hockey',
  UFC: 'MMA',
  WTA: 'Tennis',
  ATP: 'Tennis',
};

export const knownLeagues = new Set(Object.keys(leagueSportMap) as League[]);

export type KnownLeague = typeof knownLeagues extends Set<infer T> ? T : never;

export const knownSports = new Set(Object.values(leagueSportMap));

// ==============================================================================
// PERIOD TYPES
// ==============================================================================

export type PeriodTypeCode =
  | 'M' // Match (full game)
  | 'H' // Half
  | 'Q' // Quarter
  | 'I' // Inning
  | 'P'; // Period (hockey)

export interface Period {
  PeriodTypeCode: PeriodTypeCode;
  PeriodNumber: number;
}

// ==============================================================================
// MATCH TYPES
// ==============================================================================

export interface Match {
  Date?: Date;
  Team1?: string; // For team-based matches
  Team2?: string; // Optional for team totals, series, etc.
  DaySequence?: number; // Game number (G2, #2, etc.)

  // Player-specific fields for individual props
  Player?: string; // Player name (for individual props only)
  PlayerTeam?: string; // Optional team affiliation from "(TEAM)" syntax
}

// ==============================================================================
// CONTRACT DISCRIMINATOR TYPES
// ==============================================================================

export type ContractSportCompetitionMatchType = 'Handicap' | 'TotalPoints' | 'Prop';

export type ContestantType = 'Individual' | 'TeamAdHoc' | 'TeamLeague';

// ==============================================================================
// BASE CONTRACT INTERFACE
// ==============================================================================

export interface ContractSportCompetitionMatchBase {
  Sport?: Sport;
  League?: League;
  Match: Match;
  Period: Period;
  RotationNumber?: number;
  // Discriminator fields from SQL schema
  HasContestant: boolean;
  HasLine: boolean;
  ContractSportCompetitionMatchType: ContractSportCompetitionMatchType;
}

// ==============================================================================
// SPECIFIC CONTRACT TYPES (based on discriminator table)
// ==============================================================================

// HasContestant=0, HasLine=1, MatchType=TotalPoints
export interface ContractSportCompetitionMatchTotalPoints
  extends ContractSportCompetitionMatchBase {
  HasContestant: false;
  HasLine: true;
  ContractSportCompetitionMatchType: 'TotalPoints';
  Line: number; // Must be divisible by 0.5
  IsOver: boolean;
}

// HasContestant=1, HasLine=1, MatchType=TotalPoints
export interface ContractSportCompetitionMatchTotalPointsContestant
  extends ContractSportCompetitionMatchBase {
  HasContestant: true;
  HasLine: true;
  ContractSportCompetitionMatchType: 'TotalPoints';
  Line: number;
  IsOver: boolean;
  Contestant: string; // Team name for team totals
}

// HasContestant=1, HasLine=0, MatchType=Handicap
export interface ContractSportCompetitionMatchHandicapContestantML
  extends ContractSportCompetitionMatchBase {
  HasContestant: true;
  HasLine: false;
  ContractSportCompetitionMatchType: 'Handicap';
  Contestant: string;
  TiesLose: boolean; // Default false for MLB
}

// HasContestant=1, HasLine=1, MatchType=Handicap
export interface ContractSportCompetitionMatchHandicapContestantLine
  extends ContractSportCompetitionMatchBase {
  HasContestant: true;
  HasLine: true;
  ContractSportCompetitionMatchType: 'Handicap';
  Contestant: string;
  Line: number; // Spread line (+/-1.5)
}

// HasContestant=1, HasLine=1, MatchType=Prop
export interface ContractSportCompetitionMatchPropOU extends ContractSportCompetitionMatchBase {
  HasContestant: true;
  HasLine: true;
  ContractSportCompetitionMatchType: 'Prop';
  ContestantType?: ContestantType;
  Prop: string; // Standardized prop name
  Contestant: string;
  Line: number;
  IsOver: boolean;
}

// HasContestant=1, HasLine=0, MatchType=Prop
export interface ContractSportCompetitionMatchPropYN extends ContractSportCompetitionMatchBase {
  HasContestant: true;
  HasLine: false;
  ContractSportCompetitionMatchType: 'Prop';
  ContestantType?: ContestantType;
  Prop: string; // e.g., "FirstTeamToScore", "LastTeamToScore"
  Contestant: string;
  IsYes: boolean; // true for "first", false for "last" in first/last props
}

// ==============================================================================
// SERIES CONTRACT TYPE (separate table)
// ==============================================================================

export interface ContractSportCompetitionSeries {
  Sport?: Sport;
  League?: League;
  Match: Match;
  RotationNumber?: number;
  SeriesLength: number; // Default 3
  Contestant: string;
}

// ==============================================================================
// WRITEIN CONTRACT TYPE (separate table)
// ==============================================================================

export interface ContractWritein {
  EventDate: Date;
  Description: string;
  Sport?: Sport;
  League?: League;
}

// ==============================================================================
// UNION TYPES
// ==============================================================================

export type ContractSportCompetitionMatch =
  | ContractSportCompetitionMatchTotalPoints
  | ContractSportCompetitionMatchTotalPointsContestant
  | ContractSportCompetitionMatchHandicapContestantML
  | ContractSportCompetitionMatchHandicapContestantLine
  | ContractSportCompetitionMatchPropOU
  | ContractSportCompetitionMatchPropYN;

export type Contract =
  | ContractSportCompetitionMatch
  | ContractSportCompetitionSeries
  | ContractWritein;

// ==============================================================================
// BET TYPES
// ==============================================================================

export type ChatType = 'order' | 'fill';
export type BetType = 'straight' | 'parlay' | 'roundRobin';

export type ContractType =
  | 'TotalPoints'
  | 'TotalPointsContestant'
  | 'HandicapContestantML'
  | 'HandicapContestantLine'
  | 'PropOU'
  | 'PropYN'
  | 'Series'
  | 'Writein';

/**
 * Unified bet structure - fields populated based on chatType and betType
 * - Price/Size: Only for straight bets
 * - Risk/ToWin: Only for parlay/roundRobin fills
 * - ExecutionDtm: Only for fills (all betTypes)
 */
export interface Bet {
  // Straight bet fields
  Price?: number; // USA odds format (straight bets only)
  Size?: number; // Straight bets only (optional for orders, required for fills)

  // Parlay/RoundRobin fill fields
  Risk?: number; // Parlay/RR fills only (from "= $100")
  ToWin?: number; // Parlay/RR fills only (optional override from "tw $500")

  // Common fields
  ExecutionDtm?: Date; // Fills only (all betTypes)
  IsFreeBet?: boolean; // All types
}

// ==============================================================================
// PARSING RESULT TYPES
// ==============================================================================

/**
 * Base interface for all parse results
 */
export interface ParseResultBase {
  chatType: ChatType;
  betType: BetType;
  bet: Bet;
}

/**
 * Straight bet (normalized matchup or writein)
 * Discriminated by betType === 'straight'
 */
export interface ParseResultStraight extends ParseResultBase {
  betType: 'straight';
  contractType: ContractType;
  contract: Contract;
  rotationNumber?: number;
}

/**
 * Parlay bet (2+ legs combined)
 * Discriminated by betType === 'parlay'
 */
export interface ParseResultParlay extends ParseResultBase {
  betType: 'parlay';
  useFair: boolean; // true when ToWin not specified
  pushesLose?: boolean; // from "pusheslose:true" or "tieslose:true"
  legs: Array<ParseResultStraight>; // Each leg is a straight bet
}

/**
 * Round robin bet (Stage 3)
 * Discriminated by betType === 'roundRobin'
 */
export interface ParseResultRoundRobin extends ParseResultBase {
  betType: 'roundRobin';
  parlaySize: number; // e.g., 2 for 2-teamers from nCr notation
  isAtMost: boolean; // from trailing minus (e.g., true from "4c3-")
  riskType: 'perSelection' | 'total'; // from "per" or "total"
  useFair: boolean;
  pushesLose?: boolean;
  legs: Array<ParseResultStraight>;
}

export type ParseResult = ParseResultStraight | ParseResultParlay | ParseResultRoundRobin;

// ==============================================================================
// DEPRECATED TYPE ALIASES (for backwards compatibility)
// ==============================================================================

/** @deprecated Use ParseResultStraight with chatType === 'order' instead */
export type ChatOrderResult = ParseResultStraight & { chatType: 'order' };

/** @deprecated Use ParseResultStraight with chatType === 'fill' instead */
export type ChatFillResult = ParseResultStraight & { chatType: 'fill' };

// ==============================================================================
// PARSE OPTIONS
// ==============================================================================

export interface ParseOptions {
  /**
   * Reference date for year inference logic.
   * When parsing dates without years (e.g., "7/1" or "MM/DD"), this date is used
   * to determine whether to use the current year or next year.
   * Defaults to new Date() (current date/time).
   */
  referenceDate?: Date;
}

// ==============================================================================
// CONVENIENCE TYPE GUARDS
// ==============================================================================

// ChatType guards
export function isOrder(result: ParseResult): result is ParseResult & { chatType: 'order' } {
  return result.chatType === 'order';
}

export function isFill(result: ParseResult): result is ParseResult & { chatType: 'fill' } {
  return result.chatType === 'fill';
}

// BetType guards
export function isStraight(result: ParseResult): result is ParseResultStraight {
  return result.betType === 'straight';
}

export function isParlay(result: ParseResult): result is ParseResultParlay {
  return result.betType === 'parlay';
}

export function isRoundRobin(result: ParseResult): result is ParseResultRoundRobin {
  return result.betType === 'roundRobin';
}

export function isTotalPoints(
  contract: Contract
): contract is ContractSportCompetitionMatchTotalPoints {
  return (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'TotalPoints' &&
    !contract.HasContestant
  );
}

export function isTotalPointsContestant(
  contract: Contract
): contract is ContractSportCompetitionMatchTotalPointsContestant {
  return (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'TotalPoints' &&
    contract.HasContestant
  );
}

export function isHandicapML(
  contract: Contract
): contract is ContractSportCompetitionMatchHandicapContestantML {
  return (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'Handicap' &&
    contract.HasContestant &&
    !contract.HasLine
  );
}

export function isHandicapLine(
  contract: Contract
): contract is ContractSportCompetitionMatchHandicapContestantLine {
  return (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'Handicap' &&
    contract.HasContestant &&
    contract.HasLine
  );
}

export function isPropOU(contract: Contract): contract is ContractSportCompetitionMatchPropOU {
  return (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'Prop' &&
    contract.HasContestant &&
    contract.HasLine
  );
}

export function isPropYN(contract: Contract): contract is ContractSportCompetitionMatchPropYN {
  return (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'Prop' &&
    contract.HasContestant &&
    !contract.HasLine
  );
}

export function isSeries(contract: Contract): contract is ContractSportCompetitionSeries {
  return 'SeriesLength' in contract;
}

export function isWritein(contract: Contract): contract is ContractWritein {
  return 'EventDate' in contract && 'Description' in contract;
}
