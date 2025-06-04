/**
 * Error classes for chat-bet-parse
 * Provides descriptive error messages for parsing failures
 */

export class ChatBetParseError extends Error {
  public readonly rawInput: string;
  public position?: number;

  constructor(message: string, rawInput: string, position?: number) {
    super(message);
    this.name = 'ChatBetParseError';
    this.rawInput = rawInput;
    this.position = position;
  }
}

export class InvalidChatFormatError extends ChatBetParseError {
  constructor(rawInput: string, reason: string) {
    super(`Invalid chat format: ${reason}. Input: "${rawInput}"`, rawInput);
    this.name = 'InvalidChatFormatError';
  }
}

export class InvalidContractTypeError extends ChatBetParseError {
  constructor(rawInput: string, contractPortion: string) {
    super(
      `Unable to determine contract type from: "${contractPortion}". Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'InvalidContractTypeError';
  }
}

export class InvalidPriceFormatError extends ChatBetParseError {
  constructor(rawInput: string, priceStr: string) {
    super(
      `Invalid USA price format: "${priceStr}". Expected format: +150, -110, -115.5, ev, or even. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'InvalidPriceFormatError';
  }
}

export class InvalidSizeFormatError extends ChatBetParseError {
  constructor(rawInput: string, sizeStr: string, expectedFormat: string) {
    super(
      `Invalid size format: "${sizeStr}". Expected: ${expectedFormat}. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'InvalidSizeFormatError';
  }
}

export class InvalidLineValueError extends ChatBetParseError {
  constructor(rawInput: string, line: number) {
    super(
      `Invalid line value: ${line}. Line must be divisible by 0.5. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'InvalidLineValueError';
  }
}

export class InvalidTeamFormatError extends ChatBetParseError {
  constructor(rawInput: string, teamStr: string, reason: string) {
    super(`Invalid team format: "${teamStr}". ${reason}. Input: "${rawInput}"`, rawInput);
    this.name = 'InvalidTeamFormatError';
  }
}

export class InvalidPeriodFormatError extends ChatBetParseError {
  constructor(rawInput: string, periodStr: string) {
    super(
      `Invalid period format: "${periodStr}". Expected formats: 1st inning, F5, 1H, Q1, etc. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'InvalidPeriodFormatError';
  }
}

export class InvalidGameNumberError extends ChatBetParseError {
  constructor(rawInput: string, gameStr: string) {
    super(
      `Invalid game number format: "${gameStr}". Expected formats: G2, GM1, #2, etc. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'InvalidGameNumberError';
  }
}

export class InvalidRotationNumberError extends ChatBetParseError {
  constructor(rawInput: string, rotationStr: string) {
    super(
      `Invalid rotation number: "${rotationStr}". Must be a positive integer. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'InvalidRotationNumberError';
  }
}

export class InvalidPropFormatError extends ChatBetParseError {
  constructor(rawInput: string, propStr: string, availableProps: string[]) {
    super(
      `Invalid prop format: "${propStr}". Available props: ${availableProps.join(', ')}. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'InvalidPropFormatError';
  }
}

export class InvalidSeriesLengthError extends ChatBetParseError {
  constructor(rawInput: string, lengthStr: string) {
    super(
      `Invalid series length: "${lengthStr}". Must be a positive integer. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'InvalidSeriesLengthError';
  }
}

export class MissingSizeForFillError extends ChatBetParseError {
  constructor(rawInput: string) {
    super(
      `Missing size for fill (YG) bet. Fill bets must include size with "=" format. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'MissingSizeForFillError';
  }
}

export class UnrecognizedChatPrefixError extends ChatBetParseError {
  constructor(rawInput: string, prefix: string) {
    super(
      `Unrecognized chat prefix: "${prefix}". Expected "IW" (order) or "YG" (fill). Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'UnrecognizedChatPrefixError';
  }
}

export class AmbiguousContractError extends ChatBetParseError {
  constructor(rawInput: string, possibleTypes: string[]) {
    super(
      `Ambiguous contract type. Could be: ${possibleTypes.join(', ')}. Please be more specific. Input: "${rawInput}"`,
      rawInput
    );
    this.name = 'AmbiguousContractError';
  }
}

// Utility function to create position-aware error messages
export function createPositionError(
  ErrorClass: new (rawInput: string, ...args: any[]) => ChatBetParseError,
  rawInput: string,
  position: number,
  ...args: any[]
): ChatBetParseError {
  const error = new ErrorClass(rawInput, ...args);
  error.position = position;
  return error;
}
