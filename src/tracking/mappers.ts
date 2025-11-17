/**
 * Mappers to convert ParseResult to ContractLegSpec for SQL Server tracking
 */

import type {
  ParseResult,
  Contract,
  ContractSportCompetitionMatch,
  ContractSportCompetitionSeries,
} from '../types/index';
import { isWritein } from '../types/index';
import type { ContractLegSpec, ContractMappingOptions } from './types';
import { ContractMappingError } from './types';

/**
 * Convert a ParseResult to ContractLegSpec for SQL Server
 */
export function mapParseResultToContractLegSpec(
  result: ParseResult,
  options?: ContractMappingOptions
): ContractLegSpec {
  const contract = result.contract;
  const contractType = result.contractType;

  // Determine event date - for writeins use contract's EventDate, otherwise use options.eventDate or derive from ExecutionDtm
  let eventDate: Date;
  if (isWritein(contract) && contract.EventDate) {
    // For writein contracts, always use the EventDate from the contract itself
    eventDate = contract.EventDate;
  } else if (options?.eventDate) {
    // For non-writein contracts, use the provided option
    eventDate = options.eventDate;
  } else if (result.bet.ExecutionDtm) {
    // Convert ExecutionDtm to Eastern time and extract date
    const easternTime = new Date(
      result.bet.ExecutionDtm.toLocaleString('en-US', { timeZone: 'America/New_York' })
    );
    eventDate = new Date(easternTime.getFullYear(), easternTime.getMonth(), easternTime.getDate());
  } else {
    // Fallback to today
    eventDate = new Date();
    eventDate.setHours(0, 0, 0, 0);
  }

  // Extract common match and period info
  const matchInfo = !isWritein(contract) ? extractMatchInfo(contract) : null;

  // Base ContractLegSpec
  let baseSpec: Partial<ContractLegSpec> = {
    LegSequence: 1, // Always 1 for straight bets
    ContractType: contractType,
    EventDate: eventDate,
    TiesLose: false, // Default assumption
    Price: null, // Always null for straight bets per SQL procedure documentation
  };

  // Add match info for non-Writein contracts
  if (!isWritein(contract) && matchInfo) {
    baseSpec = {
      ...baseSpec,
      ...matchInfo,
    };

    // Extract league from contract or use options
    const league = options?.league || extractLeague(contract);
    if (league) {
      baseSpec.League = league;
    }

    // Extract sport from contract
    const sport = extractSport(contract);
    if (sport) {
      baseSpec.Sport = sport;
    }
  } else if (isWritein(contract)) {
    // For writein contracts, extract league and sport from the contract itself
    if (contract.League) {
      baseSpec.League = contract.League;
    }
    if (contract.Sport) {
      baseSpec.Sport = contract.Sport;
    }
  }

  // Add period info for contracts that need it
  if (contractType !== 'Series' && !isWritein(contract)) {
    const periodInfo = extractPeriodInfo(contract);
    baseSpec = {
      ...baseSpec,
      ...periodInfo,
    };
  }

  // Contract-specific parameters
  let contractParams: Partial<ContractLegSpec> = {};

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
      throw new ContractMappingError(`Unsupported contract type: ${contractType}`);
  }

  return {
    ...baseSpec,
    ...contractParams,
  } as ContractLegSpec;
}

/**
 * Extract match identification info from any contract
 */
function extractMatchInfo(
  contract: Contract
): Pick<ContractLegSpec, 'Contestant1_RawName' | 'Contestant2_RawName' | 'DaySequence'> {
  // Writein contracts don't have Match property
  if (isWritein(contract)) {
    return {
      Contestant1_RawName: undefined,
      Contestant2_RawName: undefined,
      DaySequence: undefined,
    };
  }

  // For HandicapContestantML and HandicapContestantLine, use Team1 as Contestant1
  if (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'Handicap'
  ) {
    return {
      Contestant1_RawName: contract.Match.Team1,
      Contestant2_RawName: contract.Match.Team2,
      DaySequence: contract.Match.DaySequence || undefined,
    };
  }

  // For TotalPoints (game totals), use both teams
  if (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'TotalPoints' &&
    !contract.HasContestant
  ) {
    return {
      Contestant1_RawName: contract.Match.Team1,
      Contestant2_RawName: contract.Match.Team2,
      DaySequence: contract.Match.DaySequence || undefined,
    };
  }

  // For TotalPointsContestant, Props, and Series - Team1 is the contestant
  return {
    Contestant1_RawName: contract.Match.Team1,
    Contestant2_RawName: contract.Match.Team2,
    DaySequence: contract.Match.DaySequence || undefined,
  };
}

/**
 * Extract period info from match contracts
 */
function extractPeriodInfo(
  contract: Contract
): Pick<ContractLegSpec, 'PeriodTypeCode' | 'PeriodNumber'> {
  // Series contracts don't have period info in the same way
  if ('SeriesLength' in contract) {
    return {};
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
  return {};
}

/**
 * Extract league info from contract
 */
function extractLeague(contract: Contract): string | undefined {
  if ('League' in contract && contract.League) {
    return contract.League;
  }

  // Default to undefined for now - could be enhanced to infer from team names
  return undefined;
}

/**
 * Extract Sport from contract if available
 */
function extractSport(contract: Contract): string | undefined {
  if ('Sport' in contract && contract.Sport) {
    return contract.Sport;
  }

  // Default to undefined for now - could be enhanced to infer from league
  return undefined;
}

/**
 * Extract ContestantType from contract if available
 */
function extractContestantType(contract: Contract): string | undefined {
  if ('ContestantType' in contract && contract.ContestantType) {
    return contract.ContestantType;
  }

  // For team totals, automatically set ContestantType to 'TeamLeague'
  if (
    'ContractSportCompetitionMatchType' in contract &&
    contract.ContractSportCompetitionMatchType === 'TotalPoints' &&
    contract.HasContestant === true
  ) {
    return 'TeamLeague';
  }

  // Default to undefined for now - could be enhanced to infer from contestant names
  return undefined;
}

/**
 * Map TotalPoints (game totals) contract
 */
function mapTotalPoints(contract: Contract): Partial<ContractLegSpec> {
  if (
    !('ContractSportCompetitionMatchType' in contract) ||
    contract.ContractSportCompetitionMatchType !== 'TotalPoints' ||
    contract.HasContestant !== false
  ) {
    throw new ContractMappingError('Invalid TotalPoints contract structure', 'TotalPoints');
  }

  return {
    Line: contract.Line,
    IsOver: contract.IsOver,
  };
}

/**
 * Map TotalPointsContestant (team totals) contract
 */
function mapTotalPointsContestant(contract: Contract): Partial<ContractLegSpec> {
  if (
    !('ContractSportCompetitionMatchType' in contract) ||
    contract.ContractSportCompetitionMatchType !== 'TotalPoints' ||
    contract.HasContestant !== true
  ) {
    throw new ContractMappingError(
      'Invalid TotalPointsContestant contract structure',
      'TotalPointsContestant'
    );
  }

  return {
    Line: contract.Line,
    IsOver: contract.IsOver,
    SelectedContestant_RawName: contract.Contestant,
    ContestantType: extractContestantType(contract),
  };
}

/**
 * Map HandicapContestantML (moneyline) contract
 */
function mapHandicapML(contract: Contract): Partial<ContractLegSpec> {
  if (
    !('ContractSportCompetitionMatchType' in contract) ||
    contract.ContractSportCompetitionMatchType !== 'Handicap' ||
    contract.HasContestant !== true ||
    contract.HasLine !== false
  ) {
    throw new ContractMappingError(
      'Invalid HandicapContestantML contract structure',
      'HandicapContestantML'
    );
  }

  return {
    SelectedContestant_RawName: contract.Contestant,
    TiesLose: contract.TiesLose,
    ContestantType: extractContestantType(contract),
  };
}

/**
 * Map HandicapContestantLine (spread) contract
 */
function mapHandicapLine(contract: Contract): Partial<ContractLegSpec> {
  if (
    !('ContractSportCompetitionMatchType' in contract) ||
    contract.ContractSportCompetitionMatchType !== 'Handicap' ||
    contract.HasContestant !== true ||
    contract.HasLine !== true
  ) {
    throw new ContractMappingError(
      'Invalid HandicapContestantLine contract structure',
      'HandicapContestantLine'
    );
  }

  return {
    SelectedContestant_RawName: contract.Contestant,
    Line: contract.Line,
    ContestantType: extractContestantType(contract),
  };
}

/**
 * Map PropOU (prop over/under) contract
 */
function mapPropOU(contract: Contract): Partial<ContractLegSpec> {
  if (
    !('ContractSportCompetitionMatchType' in contract) ||
    contract.ContractSportCompetitionMatchType !== 'Prop' ||
    contract.HasContestant !== true ||
    contract.HasLine !== true
  ) {
    throw new ContractMappingError('Invalid PropOU contract structure', 'PropOU');
  }

  return {
    SelectedContestant_RawName: contract.Contestant,
    Line: contract.Line,
    IsOver: contract.IsOver,
    Prop: contract.Prop,
    PropContestantType: contract.ContestantType,
  };
}

/**
 * Map PropYN (prop yes/no) contract
 */
function mapPropYN(contract: Contract): Partial<ContractLegSpec> {
  if (
    !('ContractSportCompetitionMatchType' in contract) ||
    contract.ContractSportCompetitionMatchType !== 'Prop' ||
    contract.HasContestant !== true ||
    contract.HasLine !== false
  ) {
    throw new ContractMappingError('Invalid PropYN contract structure', 'PropYN');
  }

  return {
    SelectedContestant_RawName: contract.Contestant,
    IsYes: contract.IsYes,
    Prop: contract.Prop,
    PropContestantType: contract.ContestantType,
  };
}

/**
 * Map Series contract
 */
function mapSeries(contract: Contract): Partial<ContractLegSpec> {
  if (!('SeriesLength' in contract)) {
    throw new ContractMappingError('Invalid Series contract structure', 'Series');
  }

  const seriesContract = contract as ContractSportCompetitionSeries;

  return {
    SeriesLength: seriesContract.SeriesLength,
    SelectedContestant_RawName: seriesContract.Contestant,
  };
}

/**
 * Map Writein contract
 */
function mapWritein(contract: Contract): Partial<ContractLegSpec> {
  if (!isWritein(contract)) {
    throw new ContractMappingError('Invalid Writein contract structure', 'Writein');
  }

  return {
    WriteInDescription: contract.Description,
    // EventDate is handled in the main function
  };
}

/**
 * Validate that required parameters are present for contract mapping
 */
export function validateContractLegSpec(spec: Partial<ContractLegSpec>): void {
  // Basic validation
  if (!spec.LegSequence) {
    throw new ContractMappingError('LegSequence is required');
  }

  if (!spec.ContractType) {
    throw new ContractMappingError('ContractType is required');
  }

  if (!spec.EventDate) {
    throw new ContractMappingError('EventDate is required');
  }

  if (spec.LegSequence < 1) {
    throw new ContractMappingError('LegSequence must be positive');
  }

  // Contract-specific validation
  switch (spec.ContractType) {
    case 'TotalPoints':
      if (spec.Line === undefined || spec.IsOver === undefined) {
        throw new ContractMappingError(`${spec.ContractType} requires Line and IsOver`);
      }
      break;

    case 'TotalPointsContestant':
      if (spec.Line === undefined || spec.IsOver === undefined) {
        throw new ContractMappingError(`${spec.ContractType} requires Line and IsOver`);
      }
      if (!spec.SelectedContestant_RawName) {
        throw new ContractMappingError('TotalPointsContestant requires SelectedContestant_RawName');
      }
      break;

    case 'HandicapContestantML':
      if (!spec.SelectedContestant_RawName) {
        throw new ContractMappingError('HandicapContestantML requires SelectedContestant_RawName');
      }
      break;

    case 'HandicapContestantLine':
      if (!spec.SelectedContestant_RawName || spec.Line === undefined) {
        throw new ContractMappingError(
          'HandicapContestantLine requires SelectedContestant_RawName and Line'
        );
      }
      break;

    case 'PropOU':
      if (
        !spec.SelectedContestant_RawName ||
        spec.Line === undefined ||
        spec.IsOver === undefined ||
        !spec.Prop
      ) {
        throw new ContractMappingError(
          'PropOU requires SelectedContestant_RawName, Line, IsOver, and Prop'
        );
      }
      break;

    case 'PropYN':
      if (!spec.SelectedContestant_RawName || spec.IsYes === undefined || !spec.Prop) {
        throw new ContractMappingError(
          'PropYN requires SelectedContestant_RawName, IsYes, and Prop'
        );
      }
      break;

    case 'Series':
      if (!spec.SelectedContestant_RawName || !spec.SeriesLength) {
        throw new ContractMappingError(
          'Series requires SelectedContestant_RawName and SeriesLength'
        );
      }
      break;

    case 'Writein':
      if (!spec.WriteInDescription) {
        throw new ContractMappingError('Writein contracts require WriteInDescription');
      }
      break;

    default:
      throw new ContractMappingError(`Unknown contract type: ${spec.ContractType}`);
  }
}
