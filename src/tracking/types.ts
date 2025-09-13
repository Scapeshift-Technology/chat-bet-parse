/**
 * Type definitions for tracking module
 * Matches SQL Server ContractLegSpecTableType for ticket tracking
 */

import { ChatBetParseError } from '../errors/index';

/**
 * Contract leg specification matching the SQL Server ContractLegSpecTableType
 * Used for tracking and storing bet tickets
 */
export interface ContractLegSpec {
  /** Leg sequence number (1-based) */
  LegSequence: number;

  /** Contract type */
  ContractType: string;

  /** Event date for the contract */
  EventDate: Date;

  /** First contestant raw name */
  Contestant1_RawName?: string;

  /** Second contestant raw name */
  Contestant2_RawName?: string;

  /** League code */
  League?: string;

  /** Day sequence for multiple games */
  DaySequence?: number;

  /** Contestant type */
  ContestantType?: string;

  /** Period type code */
  PeriodTypeCode?: string;

  /** Period number */
  PeriodNumber?: number;

  /** Line value */
  Line?: number;

  /** Is over/under */
  IsOver?: boolean;

  /** Selected contestant raw name */
  SelectedContestant_RawName?: string;

  /** Ties lose flag */
  TiesLose: boolean;

  /** Prop name */
  Prop?: string;

  /** Prop contestant type */
  PropContestantType?: string;

  /** Is yes/no */
  IsYes?: boolean;

  /** Series length */
  SeriesLength?: number;

  /** Write-in description */
  WriteInDescription?: string;

  /** Price in American odds format (null for straight bets) */
  Price?: number | null;
}

/**
 * Options for mapping ParseResult to ContractLegSpec
 */
export interface ContractMappingOptions {
  /** Event date to use for the contract (optional - will infer from ExecutionDtm if not provided) */
  eventDate?: Date;

  /** League to use for the contract (optional - will infer from contract if not provided) */
  league?: string;
}

/**
 * Error class for contract mapping failures
 */
export class ContractMappingError extends ChatBetParseError {
  public readonly contractType?: string;

  constructor(message: string, contractType?: string) {
    super(message, '');
    this.name = 'ContractMappingError';
    this.contractType = contractType;
  }
}
