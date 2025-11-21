/**
 * @deprecated This module is deprecated. Use the tracking mapper instead:
 * import { mapParseResultToContractLegSpec } from 'chat-bet-parse/tracking'
 *
 * This module now wraps the tracking mapper for backward compatibility.
 * It will be removed in a future major version.
 */

import type { ParseResult, ContestantType } from '../types/index';
import type { GradingSqlParameters, GradingOptions } from './types';
import { GradingDataError } from './types';
import { mapParseResultToContractLegSpec } from '../tracking/mappers';
import type { ContractLegSpec } from '../tracking/types';

// ==============================================================================
// MAIN MAPPING FUNCTION (DEPRECATED - WRAPS TRACKING MAPPER)
// ==============================================================================

/**
 * @deprecated Use mapParseResultToContractLegSpec from tracking module instead
 *
 * Convert a ParseResult to SQL Server function parameters
 * For straight bets, returns a single GradingSqlParameters object
 * For parlays/round robins, returns an array of GradingSqlParameters (one per leg)
 *
 * This function now wraps the tracking mapper and transforms field names for backward compatibility.
 */
export function mapParseResultToSqlParameters(
  result: ParseResult,
  options?: GradingOptions
): GradingSqlParameters | GradingSqlParameters[] {
  // Validate that matchScheduledDate is provided (required for grading)
  if (!options?.matchScheduledDate) {
    throw new GradingDataError('MatchScheduledDate must be provided in options when grading');
  }

  // Call the tracking mapper
  const trackingResult = mapParseResultToContractLegSpec(result, {
    eventDate: options.matchScheduledDate,
  });

  // Transform ContractLegSpec to GradingSqlParameters
  if (Array.isArray(trackingResult)) {
    return trackingResult.map(transformToGradingParameters);
  }
  return transformToGradingParameters(trackingResult as ContractLegSpec);
}

// ==============================================================================
// TRANSFORMATION HELPER
// ==============================================================================

/**
 * Transform ContractLegSpec (tracking format) to GradingSqlParameters (grading format)
 * Main differences:
 * - EventDate → MatchScheduledDate
 * - Contestant1_RawName → Contestant1
 * - SelectedContestant_RawName → SelectedContestant
 * - Remove tracking-specific fields (League, Sport, LegSequence, Price, ContestantType)
 */
function transformToGradingParameters(spec: ContractLegSpec): GradingSqlParameters {
  return {
    MatchScheduledDate: spec.EventDate,
    Contestant1: spec.Contestant1_RawName,
    Contestant2: spec.Contestant2_RawName,
    DaySequence: spec.DaySequence,
    PeriodTypeCode: spec.PeriodTypeCode || 'M',
    PeriodNumber: spec.PeriodNumber ?? 0,
    ContractType: spec.ContractType,
    Line: spec.Line,
    IsOver: spec.IsOver,
    SelectedContestant: spec.SelectedContestant_RawName,
    TiesLose: spec.TiesLose ?? false,
    Prop: spec.Prop,
    PropContestantType: spec.PropContestantType as ContestantType | undefined,
    IsYes: spec.IsYes,
    SeriesLength: spec.SeriesLength,
    EventDate: spec.EventDate, // For Writein contracts
    WriteInDescription: spec.WriteInDescription,
  };
}

// ==============================================================================
// VALIDATION HELPERS
// ==============================================================================

/**
 * @deprecated Use validateContractLegSpec from tracking module instead
 *
 * Validate that required parameters are present for grading
 */
export function validateGradingParameters(params: GradingSqlParameters): void {
  // Basic validation
  if (!params.MatchScheduledDate) {
    throw new GradingDataError('MatchScheduledDate is required');
  }

  if (!params.ContractType) {
    throw new GradingDataError('ContractType is required');
  }

  // Contestant1 is required for all contract types except Writein and individual props
  // For individual props (PropOU/PropYN with Individual contestant type), Contestant1 can be undefined
  const isIndividualProp =
    (params.ContractType === 'PropOU' || params.ContractType === 'PropYN') &&
    params.PropContestantType === 'Individual';

  if (!params.Contestant1 && params.ContractType !== 'Writein' && !isIndividualProp) {
    throw new GradingDataError('Contestant1 is required');
  }

  // Contract-specific validation
  switch (params.ContractType) {
    case 'TotalPoints':
    case 'TotalPointsContestant':
      if (params.Line === undefined || params.IsOver === undefined) {
        throw new GradingDataError(`${params.ContractType} requires Line and IsOver`);
      }
      if (params.ContractType === 'TotalPointsContestant' && !params.SelectedContestant) {
        throw new GradingDataError('TotalPointsContestant requires SelectedContestant');
      }
      break;

    case 'HandicapContestantML':
      if (!params.SelectedContestant) {
        throw new GradingDataError('HandicapContestantML requires SelectedContestant');
      }
      break;

    case 'HandicapContestantLine':
      if (!params.SelectedContestant || params.Line === undefined) {
        throw new GradingDataError('HandicapContestantLine requires SelectedContestant and Line');
      }
      break;

    case 'PropOU':
      if (
        !params.SelectedContestant ||
        params.Line === undefined ||
        params.IsOver === undefined ||
        !params.Prop
      ) {
        throw new GradingDataError('PropOU requires SelectedContestant, Line, IsOver, and Prop');
      }
      break;

    case 'PropYN':
      if (!params.SelectedContestant || params.IsYes === undefined || !params.Prop) {
        throw new GradingDataError('PropYN requires SelectedContestant, IsYes, and Prop');
      }
      break;

    case 'Series':
      if (!params.SelectedContestant || !params.SeriesLength) {
        throw new GradingDataError('Series requires SelectedContestant and SeriesLength');
      }
      break;

    case 'Writein':
      if (!params.EventDate || !params.WriteInDescription) {
        throw new GradingDataError('Writein contracts require EventDate and WriteInDescription');
      }
      break;

    default:
      throw new GradingDataError(`Unknown contract type: ${params.ContractType}`);
  }
}
