/**
 * Main exports for the chat-bet-parse grading functionality
 *
 * This module provides SQL Server integration for grading parsed chat bets.
 * Requires a licensed connection to Scapeshift's SQL Server database.
 *
 * @deprecated The grading mapper functions are deprecated in favor of the tracking module.
 * The ChatBetGradingClient is still supported, but mapParseResultToSqlParameters and
 * validateGradingParameters are deprecated. Use the tracking module instead:
 *
 * import { mapParseResultToContractLegSpec } from 'chat-bet-parse/tracking'
 */

// Export main client class and factory functions
export { ChatBetGradingClient, createGradingClient, createGradingClientWithConfig } from './client';

// Export types for TypeScript users
export type {
  IGradingClient,
  GradingClientConfig,
  GradeResult,
  GradingSqlParameters,
  ContestantType,
} from './types';

// Export error classes for error handling
export { GradingError, GradingConnectionError, GradingQueryError, GradingDataError } from './types';

// Export mapping utilities for advanced use cases (DEPRECATED)
/**
 * @deprecated Use mapParseResultToContractLegSpec from 'chat-bet-parse/tracking' instead
 */
export { mapParseResultToSqlParameters, validateGradingParameters } from './mappers';

// Re-export the main client as default
export { ChatBetGradingClient as default } from './client';
