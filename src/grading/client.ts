/**
 * SQL Server grading client with connection pooling
 */

import * as sql from 'mssql';
import type { ParseResult } from '../types/index';
import type {
  IGradingClient,
  GradingClientConfig,
  GradeResult,
  GradingSqlParameters,
  GradingOptions,
} from './types';
import { GradingError, GradingConnectionError, GradingQueryError, GradingDataError } from './types';
import { mapParseResultToSqlParameters, validateGradingParameters } from './mappers';

// ==============================================================================
// GRADING CLIENT IMPLEMENTATION
// ==============================================================================

/**
 * SQL Server client for grading parsed chat bets
 * Supports connection pooling and comprehensive error handling
 */
export class ChatBetGradingClient implements IGradingClient {
  private pool: sql.ConnectionPool | null = null;
  private isPoolConnected = false;
  private readonly connectionString: string;

  constructor(config: string | GradingClientConfig) {
    if (typeof config === 'string') {
      this.connectionString = config;
    } else {
      this.connectionString = config.connectionString;
    }
  }

  /**
   * Test the database connection
   * This will be called automatically on first use, but can be called explicitly
   */
  async testConnection(): Promise<void> {
    try {
      if (!this.pool) {
        this.pool = new sql.ConnectionPool(this.connectionString);
      }

      if (!this.isPoolConnected) {
        await this.pool.connect();
        this.isPoolConnected = true;
      }

      // Test with a simple query
      const request = this.pool.request();
      await request.query('SELECT 1 as test');
    } catch (error) {
      this.isPoolConnected = false;
      const message = error instanceof Error ? error.message : 'Unknown connection error';
      throw new GradingConnectionError(
        `Failed to connect to SQL Server: ${message}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.isPoolConnected && this.pool?.connected === true;
  }

  /**
   * Grade a parsed chat result
   */
  async grade(result: ParseResult, options?: GradingOptions): Promise<GradeResult> {
    try {
      // Ensure connection is established
      if (!this.isConnected()) {
        await this.testConnection();
      }

      // Convert ParseResult to SQL parameters
      const sqlParams = mapParseResultToSqlParameters(result, options);

      // Check if this is a parlay/round robin (array return)
      if (Array.isArray(sqlParams)) {
        throw new GradingDataError(
          'Parlay and round robin bets cannot be graded using this method. ' +
            'Grade each leg individually by passing the individual leg ParseResult.'
        );
      }

      // Validate parameters (cast needed for TypeScript type narrowing)
      const params = sqlParams as GradingSqlParameters;
      validateGradingParameters(params);

      // Execute the grading function
      const grade = await this.executeGradingFunction(params);

      return grade;
    } catch (error) {
      if (error instanceof GradingError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown grading error';
      throw new GradingQueryError(
        `Failed to grade contract: ${message}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Close the database connection and clean up resources
   */
  async close(): Promise<void> {
    try {
      if (this.pool && this.isPoolConnected) {
        await this.pool.close();
        this.isPoolConnected = false;
      }
    } catch (error) {
      // Log error but don't throw - we're trying to clean up
      console.warn('Warning: Error closing database connection:', error);
    }
  }

  // ==============================================================================
  // PRIVATE METHODS
  // ==============================================================================

  /**
   * Execute the SQL Server grading function with parameters
   */
  private async executeGradingFunction(params: GradingSqlParameters): Promise<GradeResult> {
    if (!this.pool) {
      throw new GradingConnectionError('Database connection not established');
    }

    try {
      const request = this.pool.request();

      // Add input parameters
      request.input('MatchScheduledDate', sql.Date, params.MatchScheduledDate);
      request.input('Contestant1', sql.Char(50), params.Contestant1);
      request.input('Contestant2', sql.Char(50), params.Contestant2 ?? null);
      request.input('DaySequence', sql.TinyInt, params.DaySequence ?? null);
      request.input('MatchContestantType', sql.Char(10), params.MatchContestantType ?? null);
      request.input('PeriodTypeCode', sql.Char(2), params.PeriodTypeCode);
      request.input('PeriodNumber', sql.TinyInt, params.PeriodNumber);
      request.input('ContractType', sql.VarChar(30), params.ContractType);
      request.input('Line', sql.Decimal(5, 2), params.Line ?? null);
      request.input('IsOver', sql.Bit, params.IsOver ?? null);
      request.input('SelectedContestant', sql.Char(50), params.SelectedContestant ?? null);
      request.input('TiesLose', sql.Bit, params.TiesLose ?? false);
      request.input('Prop', sql.VarChar(20), params.Prop ?? null);
      request.input('PropContestantType', sql.Char(10), params.PropContestantType ?? null);
      request.input('IsYes', sql.Bit, params.IsYes ?? null);
      request.input('SeriesLength', sql.TinyInt, params.SeriesLength ?? null);

      // Execute the function
      const result = await request.query(`
        SELECT dbo.Contract_CALCULATE_Grade_fn(
          @MatchScheduledDate,
          @Contestant1,
          @Contestant2,
          @DaySequence,
          @MatchContestantType,
          @PeriodTypeCode,
          @PeriodNumber,
          @ContractType,
          @Line,
          @IsOver,
          @SelectedContestant,
          @TiesLose,
          @Prop,
          @PropContestantType,
          @IsYes,
          @SeriesLength
        ) as Grade
      `);

      if (!result.recordset || result.recordset.length === 0) {
        throw new GradingQueryError('No result returned from grading function');
      }

      const grade = result.recordset[0].Grade;

      // Validate the grade result
      if (!['W', 'L', 'P', '?'].includes(grade)) {
        throw new GradingQueryError(`Invalid grade result: ${grade}`);
      }

      return grade as GradeResult;
    } catch (error) {
      if (error instanceof GradingError) {
        throw error;
      }

      let message =
        error instanceof Error ? error.message : `Unknown SQL execution error: ${error}`;

      // Extract actual error message from SQL Server conversion errors
      const conversionErrorPattern =
        /^Conversion failed when converting the (?:nvarchar|varchar) value '(.+?)' to data type tinyint\.?$/;
      const match = message.match(conversionErrorPattern);
      if (match) {
        message = match[1].trim();
      }

      throw new GradingQueryError(
        `SQL execution failed: ${message}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}

// ==============================================================================
// CONVENIENCE FACTORY FUNCTIONS
// ==============================================================================

/**
 * Create a new grading client with a connection string
 */
export function createGradingClient(connectionString: string): ChatBetGradingClient {
  return new ChatBetGradingClient(connectionString);
}

/**
 * Create a new grading client with full configuration
 */
export function createGradingClientWithConfig(config: GradingClientConfig): ChatBetGradingClient {
  return new ChatBetGradingClient(config);
}
