/**
 * Tracking module for converting ParseResult to ContractLegSpec
 * Used for SQL Server ticket tracking and storage
 */

// Export mapper functions
export { mapParseResultToContractLegSpec, validateContractLegSpec } from './mappers';

// Export types
export type { ContractLegSpec, ContractMappingOptions } from './types';
export { ContractMappingError } from './types';
