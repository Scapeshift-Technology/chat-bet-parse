/**
 * Mappers to convert ParseResult contracts to SQL Server function parameters
 */

import type {
  ParseResult,
  Contract,
  ContractSportCompetitionMatch,
  ContractSportCompetitionSeries,
} from '../types/index';
import { isWritein, isStraight } from '../types/index';
import type { GradingSqlParameters, GradingOptions } from './types';
import { GradingDataError } from './types';
import { validateContractStructure } from '../shared/contractValidation';

// ==============================================================================
// MAIN MAPPING FUNCTION
// ==============================================================================

/**
 * Convert a ParseResult to SQL Server function parameters
 * For straight bets, returns a single GradingSqlParameters object
 * For parlays/round robins, returns an array of GradingSqlParameters (one per leg)
 */
export function mapParseResultToSqlParameters(
  result: ParseResult,
  options?: GradingOptions
): GradingSqlParameters | GradingSqlParameters[] {
  // Handle parlay and round robin by mapping each leg
  if (!isStraight(result)) {
    // Parlay and RoundRobin both have a 'legs' array
    const legs = (result as any).legs as ParseResult[];
    return legs.map(leg => mapParseResultToSqlParameters(leg, options) as GradingSqlParameters);
  }

  const contract = result.contract;

  // Determine the match scheduled date - must be provided explicitly
  let matchScheduledDate: Date;
  if (options?.matchScheduledDate) {
    // Use explicitly provided date
    matchScheduledDate = options.matchScheduledDate;
  } else {
    throw new GradingDataError('MatchScheduledDate must be provided in options when grading');
  }

  // Extract match info from contract
  const contractType = result.contractType;
  const matchInfo = contractType !== 'Writein' ? extractMatchInfo(contract) : null;
  const periodInfo = extractPeriodInfo(contract);

  // Common parameters for all contract types
  let baseParams: Partial<GradingSqlParameters> = {
    MatchScheduledDate: matchScheduledDate,
    PeriodTypeCode: periodInfo.PeriodTypeCode,
    PeriodNumber: periodInfo.PeriodNumber,
    TiesLose: false, // Default assumption
  };

  // Add match info only for non-Writein contracts
  if (contractType !== 'Writein' && matchInfo) {
    baseParams = {
      ...baseParams,
      Contestant1: matchInfo.Contestant1,
      Contestant2: matchInfo.Contestant2,
      DaySequence: matchInfo.DaySequence,
    };
  }

  // Contract-specific parameters
  let contractParams: Partial<GradingSqlParameters> = {};

  switch (contractType) {
    case 'TotalPoints':
      contractParams = mapTotalPoints(contract);
      break;
    case 'TotalPointsContestant':
      contractParams = mapTotalPointsContestant(contract);
      break;
    case 'HandicapContestantML':
      contractParams = mapHandicapML(contract);
      break;
    case 'HandicapContestantLine':
      contractParams = mapHandicapLine(contract);
      break;
    case 'PropOU':
      contractParams = mapPropOU(contract);
      break;
    case 'PropYN':
      contractParams = mapPropYN(contract);
      break;
    case 'Series':
      contractParams = mapSeries(contract);
      break;
    case 'Writein':
      contractParams = mapWritein(contract);
      break;
    default:
      throw new GradingDataError(`Unsupported contract type: ${contractType}`);
  }

  return {
    ...baseParams,
    ContractType: contractType,
    ...contractParams,
  } as GradingSqlParameters;
}

// ==============================================================================
// EXTRACTION HELPERS
// ==============================================================================

/**
 * Extract match identification info from any contract
 */
function extractMatchInfo(
  contract: Contract
): Pick<GradingSqlParameters, 'Contestant1' | 'Contestant2' | 'DaySequence'> {
  // Writein contracts don't have Match property
  if (isWritein(contract)) {
    return {
      Contestant1: '',
      Contestant2: undefined,
      DaySequence: undefined,
    };
  }

  // For individual player props, use PlayerTeam for Contestant1
  if (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'Prop' &&
    'ContestantType' in contract &&
    contract.ContestantType === 'Individual'
  ) {
    return {
      Contestant1: contract.Match.PlayerTeam || undefined,
      Contestant2: undefined,
      DaySequence: contract.Match.DaySequence || undefined,
    };
  }

  // Both match and series contracts have a Match property with Team1
  return {
    Contestant1: contract.Match.Team1 || '',
    Contestant2: contract.Match.Team2,
    DaySequence: contract.Match.DaySequence || undefined,
  };
}

/**
 * Extract period info from match contracts
 */
function extractPeriodInfo(
  contract: Contract
): Pick<GradingSqlParameters, 'PeriodTypeCode' | 'PeriodNumber'> {
  // Series contracts don't have period info in the same way
  if ('SeriesLength' in contract) {
    return {
      PeriodTypeCode: 'M', // Default to match
      PeriodNumber: 0,
    };
  }

  // For match contracts, extract period info
  if ('Period' in contract) {
    const matchContract = contract as ContractSportCompetitionMatch;
    return {
      PeriodTypeCode: matchContract.Period.PeriodTypeCode,
      PeriodNumber: matchContract.Period.PeriodNumber,
    };
  }

  // Default fallback
  return {
    PeriodTypeCode: 'FG',
    PeriodNumber: 1,
  };
}

// ==============================================================================
// CONTRACT TYPE MAPPERS
// ==============================================================================

/**
 * Map TotalPoints (game totals) contract
 */
function mapTotalPoints(contract: Contract): Partial<GradingSqlParameters> {
  validateContractStructure(
    contract,
    { expectedType: 'TotalPoints', expectedHasContestant: false },
    msg => new GradingDataError(msg)
  );

  return {
    Line: (contract as any).Line,
    IsOver: (contract as any).IsOver,
  };
}

/**
 * Map TotalPointsContestant (team totals) contract
 */
function mapTotalPointsContestant(contract: Contract): Partial<GradingSqlParameters> {
  validateContractStructure(
    contract,
    { expectedType: 'TotalPoints', expectedHasContestant: true },
    msg => new GradingDataError(msg)
  );

  return {
    Line: (contract as any).Line,
    IsOver: (contract as any).IsOver,
    SelectedContestant: (contract as any).Contestant,
  };
}

/**
 * Map HandicapContestantML (moneyline) contract
 */
function mapHandicapML(contract: Contract): Partial<GradingSqlParameters> {
  validateContractStructure(
    contract,
    { expectedType: 'Handicap', expectedHasContestant: true, expectedHasLine: false },
    msg => new GradingDataError(msg)
  );

  return {
    SelectedContestant: (contract as any).Contestant,
    TiesLose: (contract as any).TiesLose,
  };
}

/**
 * Map HandicapContestantLine (spread) contract
 */
function mapHandicapLine(contract: Contract): Partial<GradingSqlParameters> {
  validateContractStructure(
    contract,
    { expectedType: 'Handicap', expectedHasContestant: true, expectedHasLine: true },
    msg => new GradingDataError(msg)
  );

  return {
    SelectedContestant: (contract as any).Contestant,
    Line: (contract as any).Line,
  };
}

/**
 * Map PropOU (prop over/under) contract
 */
function mapPropOU(contract: Contract): Partial<GradingSqlParameters> {
  validateContractStructure(
    contract,
    { expectedType: 'Prop', expectedHasContestant: true, expectedHasLine: true },
    msg => new GradingDataError(msg)
  );

  return {
    SelectedContestant: (contract as any).Contestant,
    Line: (contract as any).Line,
    IsOver: (contract as any).IsOver,
    Prop: (contract as any).Prop,
    PropContestantType: (contract as any).ContestantType,
  };
}

/**
 * Map PropYN (prop yes/no) contract
 */
function mapPropYN(contract: Contract): Partial<GradingSqlParameters> {
  validateContractStructure(
    contract,
    { expectedType: 'Prop', expectedHasContestant: true, expectedHasLine: false },
    msg => new GradingDataError(msg)
  );

  return {
    SelectedContestant: (contract as any).Contestant,
    IsYes: (contract as any).IsYes,
    Prop: (contract as any).Prop,
    PropContestantType: (contract as any).ContestantType,
  };
}

/**
 * Map Series contract
 */
function mapSeries(contract: Contract): Partial<GradingSqlParameters> {
  if (!('SeriesLength' in contract)) {
    throw new GradingDataError('Invalid Series contract structure');
  }

  const seriesContract = contract as ContractSportCompetitionSeries;

  return {
    SeriesLength: seriesContract.SeriesLength,
    SelectedContestant: seriesContract.Contestant,
  };
}

/**
 * Map Writein contract
 */
function mapWritein(contract: Contract): Partial<GradingSqlParameters> {
  if (!isWritein(contract)) {
    throw new GradingDataError('Invalid Writein contract structure');
  }

  return {
    EventDate: contract.EventDate,
    WriteInDescription: contract.Description,
  };
}

// ==============================================================================
// VALIDATION HELPERS
// ==============================================================================

/**
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
