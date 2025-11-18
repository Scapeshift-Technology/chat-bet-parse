/**
 * Shared contract validation utilities
 * Used by both tracking and grading mappers to reduce duplication
 */

import type { Contract, ContractSportCompetitionMatchType } from '../types';

/**
 * Contract validation rules for structure checking
 */
export interface ContractValidationRules {
  expectedType: ContractSportCompetitionMatchType;
  expectedHasContestant?: boolean;
  expectedHasLine?: boolean;
}

/**
 * Validate contract structure against expected rules
 * Throws error via errorFactory if validation fails
 */
export function validateContractStructure(
  contract: Contract,
  rules: ContractValidationRules,
  errorFactory: (msg: string) => Error
): void {
  // Check type exists and matches
  if (
    !('ContractSportCompetitionMatchType' in contract) ||
    contract.ContractSportCompetitionMatchType !== rules.expectedType
  ) {
    throw errorFactory('Invalid contract structure');
  }

  // Check HasContestant if specified
  if (
    rules.expectedHasContestant !== undefined &&
    contract.HasContestant !== rules.expectedHasContestant
  ) {
    throw errorFactory('Invalid contract structure');
  }

  // Check HasLine if specified
  if (rules.expectedHasLine !== undefined && contract.HasLine !== rules.expectedHasLine) {
    throw errorFactory('Invalid contract structure');
  }
}
