import {
  ChatBetParseError,
  parseChat,
  parseChatDetailed,
  type OrderShapeAssessment,
  type ParseDiagnostics,
} from '../../src/index';

function expectDiagnostics(actual: ParseDiagnostics, expected: Partial<ParseDiagnostics>): void {
  expect(actual).toMatchObject(expected);
}

function expectOrderShape(actual: OrderShapeAssessment, expected: OrderShapeAssessment): void {
  expect(actual).toEqual(expected);
}

describe('parseChatDetailed', () => {
  it('returns the exact parseChat result plus diagnostics for implied-prefix bare chatter shape', () => {
    const detailed = parseChatDetailed('Ok -107 ok too', { impliedPrefix: 'IW' });
    const regular = parseChat('Ok -107 ok too', { impliedPrefix: 'IW' });

    expect(detailed.result).toEqual(regular);
    expect(detailed.result.contractType).toBe('HandicapContestantML');
    expect(detailed.result.contract).toMatchObject({ Contestant: 'Ok' });
    expect(detailed.result.bet.Price).toBe(-107);
    expectDiagnostics(detailed.diagnostics, {
      rawInput: 'Ok -107 ok too',
      contractText: 'Ok',
      unconsumedText: 'ok too',
      unconsumedTokens: ['ok', 'too'],
      priceSource: 'standaloneToken',
    });
    expectOrderShape(detailed.orderShape, {
      kind: 'bareMoneyline',
      confidence: 'weak',
      reasons: ['bare free-form contestant with standalone price'],
    });
  });

  it('reports trailing unconsumed text for a second bare implied-prefix moneyline', () => {
    const detailed = parseChatDetailed('yes -110 fine', { impliedPrefix: 'IW' });

    expect(detailed.result.contractType).toBe('HandicapContestantML');
    expect(detailed.result.contract).toMatchObject({ Contestant: 'yes' });
    expect(detailed.result.bet.Price).toBe(-110);
    expectDiagnostics(detailed.diagnostics, {
      rawInput: 'yes -110 fine',
      contractText: 'yes',
      unconsumedText: 'fine',
      unconsumedTokens: ['fine'],
      priceSource: 'standaloneToken',
    });
    expect(detailed.orderShape.kind).toBe('bareMoneyline');
    expect(detailed.orderShape.confidence).toBe('weak');
  });

  it('classifies a complete bare implied-prefix moneyline as weak', () => {
    const detailed = parseChatDetailed('Yankees -120', { impliedPrefix: 'IW' });

    expect(detailed.result.contractType).toBe('HandicapContestantML');
    expect(detailed.result.contract).toMatchObject({ Contestant: 'Yankees' });
    expect(detailed.result.bet.Price).toBe(-120);
    expectDiagnostics(detailed.diagnostics, {
      rawInput: 'Yankees -120',
      contractText: 'Yankees',
      unconsumedText: '',
      unconsumedTokens: [],
      priceSource: 'standaloneToken',
    });
    expect(detailed.orderShape.kind).toBe('bareMoneyline');
    expect(detailed.orderShape.confidence).toBe('weak');
  });

  it('classifies spreads as strong and preserves trailing dropped text', () => {
    const complete = parseChatDetailed('Rockies +1.5 -105', { impliedPrefix: 'IW' });
    const trailing = parseChatDetailed('Rockies +1.5 -105 thanks', { impliedPrefix: 'IW' });

    expect(complete.result.contractType).toBe('HandicapContestantLine');
    expectDiagnostics(complete.diagnostics, {
      contractText: 'Rockies +1.5',
      unconsumedText: '',
      unconsumedTokens: [],
      priceSource: 'standaloneToken',
    });
    expectOrderShape(complete.orderShape, {
      kind: 'structured',
      confidence: 'strong',
      reasons: ['has spread line'],
    });

    expect(trailing.result.contractType).toBe('HandicapContestantLine');
    expectDiagnostics(trailing.diagnostics, {
      contractText: 'Rockies +1.5',
      unconsumedText: 'thanks',
      unconsumedTokens: ['thanks'],
      priceSource: 'standaloneToken',
    });
    expect(trailing.orderShape.kind).toBe('structured');
    expect(trailing.orderShape.confidence).toBe('strong');
  });

  it('classifies period totals as strong', () => {
    const detailed = parseChatDetailed('orioles first 5 under 5.5 -105', {
      impliedPrefix: 'IW',
    });

    expect(detailed.result.contractType).toBe('TotalPoints');
    expect(detailed.result.contract).toMatchObject({
      Period: { PeriodTypeCode: 'H', PeriodNumber: 1 },
      Line: 5.5,
      IsOver: false,
    });
    expect(detailed.diagnostics.unconsumedText).toBe('');
    expect(detailed.orderShape.kind).toBe('structured');
    expect(detailed.orderShape.confidence).toBe('strong');
    expect(detailed.orderShape.reasons).toContain('has total');
  });

  it('keeps explicitly prefixed orders and fills identical to parseChat', () => {
    const order = parseChatDetailed('IW Yankees -120 thanks');
    const fill = parseChatDetailed('YG Yankees -120 = 0.5');

    expect(order.result).toEqual(parseChat('IW Yankees -120 thanks'));
    expect(order.diagnostics.unconsumedText).toBe('thanks');
    expect(order.orderShape.kind).toBe('bareMoneyline');

    expect(fill.result.chatType).toBe('fill');
    expect(fill.result.contractType).toBe('HandicapContestantML');
    expect(fill.result.bet.Price).toBe(-120);
    expect(fill.diagnostics.unconsumedText).toBe('');
    expect(fill.orderShape.kind).toBe('bareMoneyline');
  });

  it('classifies parlay and round robin orders as strong', () => {
    const parlay = parseChatDetailed('IWP Lakers @ +120 & Warriors @ -110');
    const roundRobin = parseChatDetailed(
      'IWRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115'
    );

    expect(parlay.result.betType).toBe('parlay');
    expect(parlay.orderShape).toEqual({
      kind: 'structured',
      confidence: 'strong',
      reasons: ['has parlay structure'],
    });
    expect(roundRobin.result.betType).toBe('roundRobin');
    expect(roundRobin.orderShape).toEqual({
      kind: 'structured',
      confidence: 'strong',
      reasons: ['has round robin structure'],
    });
  });

  it('classifies writeins as strong', () => {
    const detailed = parseChatDetailed('IW writein 2024/11/5 Trump to win presidency @ +150');

    expect(detailed.result.contractType).toBe('Writein');
    expect(detailed.diagnostics.contractText).toBe('writein 2024/11/5 Trump to win presidency');
    expect(detailed.diagnostics.priceSource).toBe('explicitAt');
    expect(detailed.orderShape).toEqual({
      kind: 'structured',
      confidence: 'strong',
      reasons: ['has writein contract'],
    });
  });

  it('classifies moneylines with structural evidence as strong', () => {
    const rotation = parseChatDetailed('IW 701 Lakers @ +120');
    const mlToken = parseChatDetailed('IW Lakers ml @ +120');
    const period = parseChatDetailed('IW Lakers F5 @ +120');
    const teamGlued = parseChatDetailed('IW gurdians-128');

    expect(rotation.result.contractType).toBe('HandicapContestantML');
    expect(rotation.orderShape).toEqual({
      kind: 'structured',
      confidence: 'strong',
      reasons: ['has rotation number'],
    });

    expect(mlToken.result.contractType).toBe('HandicapContestantML');
    expect(mlToken.orderShape).toEqual({
      kind: 'structured',
      confidence: 'strong',
      reasons: ['has explicit ml token'],
    });

    expect(period.result.contractType).toBe('HandicapContestantML');
    expect(period.orderShape).toEqual({
      kind: 'structured',
      confidence: 'strong',
      reasons: ['has explicit period marker'],
    });

    expect(teamGlued.result.contractType).toBe('HandicapContestantML');
    expect(teamGlued.diagnostics.priceSource).toBe('teamGlued');
    expect(teamGlued.orderShape).toEqual({
      kind: 'structured',
      confidence: 'strong',
      reasons: ['has team-glued price'],
    });
  });

  it('reports explicit at-sign prices as explicitAt', () => {
    const detailed = parseChatDetailed('IW Yankees @ -120');

    expect(detailed.result).toEqual(parseChat('IW Yankees @ -120'));
    expectDiagnostics(detailed.diagnostics, {
      rawInput: 'IW Yankees @ -120',
      contractText: 'Yankees',
      unconsumedText: '',
      unconsumedTokens: [],
      priceSource: 'explicitAt',
    });
    expect(detailed.orderShape.kind).toBe('bareMoneyline');
    expect(detailed.orderShape.confidence).toBe('weak');
  });

  it('throws the same error class as parseChat for chatter with no price', () => {
    const message = 'will lyk when im ready';
    let parseChatError: unknown;
    let parseChatDetailedError: unknown;

    try {
      parseChat(message, { impliedPrefix: 'IW' });
    } catch (error) {
      parseChatError = error;
    }

    try {
      parseChatDetailed(message, { impliedPrefix: 'IW' });
    } catch (error) {
      parseChatDetailedError = error;
    }

    expect(parseChatError).toBeInstanceOf(ChatBetParseError);
    expect(parseChatDetailedError).toBeInstanceOf(ChatBetParseError);
    expect(parseChatDetailedError).toBeInstanceOf(
      (parseChatError as ChatBetParseError).constructor
    );
    expect((parseChatDetailedError as ChatBetParseError).name).toBe(
      (parseChatError as ChatBetParseError).name
    );
  });
});
