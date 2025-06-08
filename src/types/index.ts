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
  | 'NBA' // Basketball
  | 'CFL' // Football (Canadian)
  | 'CFB' // Football (NCAA)
  | 'NFL' // Football
  | 'UFL' // Football
  | 'LPGA' // Golf
  | 'PGA' // Golf
  | 'NHL' // Hockey
  | 'UFC' // MMA
  | 'WTA' // Tennis
  | 'ATP'; // Tennis

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
  Team1: string;
  Team2?: string; // Optional for team totals, series, etc.
  DaySequence?: number; // Game number (G2, #2, etc.)
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
// UNION TYPES
// ==============================================================================

export type ContractSportCompetitionMatch =
  | ContractSportCompetitionMatchTotalPoints
  | ContractSportCompetitionMatchTotalPointsContestant
  | ContractSportCompetitionMatchHandicapContestantML
  | ContractSportCompetitionMatchHandicapContestantLine
  | ContractSportCompetitionMatchPropOU
  | ContractSportCompetitionMatchPropYN;

export type Contract = ContractSportCompetitionMatch | ContractSportCompetitionSeries;

// ==============================================================================
// BET TYPES
// ==============================================================================

export interface BaseBet {
  ExecutionDtm?: Date; // Optional for orders
  Price: number; // USA odds format
  Size?: number; // Optional for orders, required for fills
}

export interface ChatOrder extends BaseBet {
  Size?: number; // Optional, interpreted as literal units when present
}

export interface ChatFill extends BaseBet {
  ExecutionDtm: Date; // Required for fills
  Size: number; // Required, interpreted based on format (thousands, k-notation, dollar)
}

// ==============================================================================
// PARSING RESULT TYPES
// ==============================================================================

export type ChatType = 'order' | 'fill';

export type ContractType =
  | 'TotalPoints'
  | 'TotalPointsContestant'
  | 'HandicapContestantML'
  | 'HandicapContestantLine'
  | 'PropOU'
  | 'PropYN'
  | 'Series';

export interface ParseResultBase {
  chatType: ChatType;
  contractType: ContractType;
  contract: Contract;
  rotationNumber?: number;
}

export interface ChatOrderResult extends ParseResultBase {
  chatType: 'order';
  bet: ChatOrder;
}

export interface ChatFillResult extends ParseResultBase {
  chatType: 'fill';
  bet: ChatFill;
}

export type ParseResult = ChatOrderResult | ChatFillResult;

// ==============================================================================
// CONVENIENCE TYPE GUARDS
// ==============================================================================

export function isOrder(result: ParseResult): result is ChatOrderResult {
  return result.chatType === 'order';
}

export function isFill(result: ParseResult): result is ChatFillResult {
  return result.chatType === 'fill';
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
