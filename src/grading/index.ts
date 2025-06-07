/**
 * Main exports for the chat-bet-parse grading functionality
 * 
 * This module provides SQL Server integration for grading parsed chat bets.
 * Requires a licensed connection to Scapeshift's SQL Server database.
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
export {
  GradingError,
  GradingConnectionError,
  GradingQueryError,
  GradingDataError,
} from './types';

// Export mapping utilities for advanced use cases
export { mapParseResultToSqlParameters, validateGradingParameters } from './mappers';

// Re-export the main client as default
export { ChatBetGradingClient as default } from './client'; 