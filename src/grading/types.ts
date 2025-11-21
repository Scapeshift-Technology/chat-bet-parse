/**
 * Type definitions for chat-bet-parse grading functionality
 */

import type { ParseResult, ContestantType } from '../types/index';

// ==============================================================================
// GRADING RESULT TYPES
// ==============================================================================

/**
 * The result of grading a contract
 * W = Win, L = Loss, P = Push (tie), ? = Unable to grade (missing data)
 */
export type GradeResult = 'W' | 'L' | 'P' | '?';

// Re-export ContestantType for convenience
export type { ContestantType };

// ==============================================================================
// CONNECTION CONFIGURATION
// ==============================================================================

/**
 * SQL Server connection configuration
 * Uses the mssql package connection interface
 */
export interface GradingClientConfig {
  /** SQL Server connection string */
  connectionString: string;

  /** Connection pool configuration (optional) */
  pool?: {
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
    acquireTimeoutMillis?: number;
  };

  /** Request timeout in milliseconds (default: 30000) */
  requestTimeout?: number;

  /** Connection timeout in milliseconds (default: 15000) */
  connectionTimeout?: number;
}

// ==============================================================================
// GRADING INTERFACES
// ==============================================================================

/**
 * Interface for grading client
 */
export interface IGradingClient {
  /**
   * Grade a parsed chat result
   * @param result The ParseResult from parseChat()
   * @param options Optional grading options
   * @returns Promise resolving to grade ('W', 'L', 'P', or '?')
   */
  grade(result: ParseResult, options?: GradingOptions): Promise<GradeResult>;

  /**
   * Test the database connection
   * @throws Error if connection fails
   */
  testConnection(): Promise<void>;

  /**
   * Close the database connection and clean up resources
   */
  close(): Promise<void>;

  /**
   * Get connection status
   */
  isConnected(): boolean;
}

// ==============================================================================
// SQL PARAMETER MAPPING TYPES
// ==============================================================================

/**
 * SQL parameters for the universal grading function
 */
export interface GradingSqlParameters {
  // Match identification
  MatchScheduledDate: Date;
  Contestant1?: string; // Optional for individual props (PropOU/PropYN with Individual type)
  Contestant2?: string;
  DaySequence?: number;
  MatchContestantType?: ContestantType;

  // Period specification
  PeriodTypeCode: string;
  PeriodNumber: number;

  // Contract type and details
  ContractType: string;
  Line?: number;
  IsOver?: boolean;
  SelectedContestant?: string;
  TiesLose?: boolean;

  // Prop-specific
  Prop?: string;
  PropContestantType?: ContestantType;
  IsYes?: boolean;

  // Series-specific
  SeriesLength?: number;

  // Writein-specific
  EventDate?: Date;
  WriteInDescription?: string;
}

// ==============================================================================
// ERROR TYPES
// ==============================================================================

/**
 * Base class for grading errors
 */
export class GradingError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GradingError';
  }
}

/**
 * Error thrown when database connection fails
 */
export class GradingConnectionError extends GradingError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.name = 'GradingConnectionError';
  }
}

/**
 * Error thrown when SQL query fails
 */
export class GradingQueryError extends GradingError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.name = 'GradingQueryError';
  }
}

/**
 * Error thrown when contract data is insufficient for grading
 */
export class GradingDataError extends GradingError {
  constructor(message: string) {
    super(message);
    this.name = 'GradingDataError';
  }
}

// ==============================================================================
// GRADING CLIENT INTERFACES
// ==============================================================================

/**
 * Options for grading a contract
 */
export interface GradingOptions {
  /** The scheduled date of the match (defaults to contract date or today) */
  matchScheduledDate?: Date;
}
