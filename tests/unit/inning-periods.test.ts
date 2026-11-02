/**
 * Inning periods (owner rule, 2026-11-02): a bare "inning 7" or "7th inning"
 * is the 7th inning alone (I7); "F7", "first 7", "innings 1-7" and the like
 * are the first seven innings cumulatively (H17). Inning text never lands in
 * a team name: a phrase the grammar cannot read throws instead.
 */

import { parseChat, InvalidPeriodFormatError, ParseResult } from '../../src/index';

interface Summary {
  type?: string;
  team1?: string;
  team2?: string;
  contestant?: string;
  period?: string;
  line?: number;
  isOver?: boolean;
  sport?: string;
}

function summarize(result: ParseResult): Summary {
  const contract = result.contract as any;
  const summary: Summary = {
    type: result.contractType,
    team1: contract.Match?.Team1,
    team2: contract.Match?.Team2,
    contestant: contract.Contestant,
    period: contract.Period
      ? `${contract.Period.PeriodTypeCode}${contract.Period.PeriodNumber}`
      : undefined,
    line: contract.Line,
    isOver: contract.IsOver,
    sport: contract.Sport,
  };
  return JSON.parse(JSON.stringify(summary));
}

describe('Single inning: I<N>', () => {
  test.each([
    ['YG TEX/SD inning 7 u0.5 = 1', 'TotalPoints', 'TEX', 'SD', 'I7'],
    ['YG TEX/SD 7th inning u0.5 = 1', 'TotalPoints', 'TEX', 'SD', 'I7'],
    ['YG TEX/SD 7th inn u0.5 = 1', 'TotalPoints', 'TEX', 'SD', 'I7'],
    ['YG TEX/SD inn 7 u0.5 = 1', 'TotalPoints', 'TEX', 'SD', 'I7'],
    ['YG TEX/SD Inning 3 o0.5 runs = 1', 'TotalPoints', 'TEX', 'SD', 'I3'],
    ['YG TEX/SD inning 1 u0.5 = 1', 'TotalPoints', 'TEX', 'SD', 'I1'],
    ['YG TEX/SD first inning u0.5 = 1', 'TotalPoints', 'TEX', 'SD', 'I1'],
    ['YG TEX/SD u0.5 inning 7 = 1', 'TotalPoints', 'TEX', 'SD', 'I7'],
    ['YG SD inning 7 ML @ +150 = 1', 'HandicapContestantML', 'SD', undefined, 'I7'],
    ['YG SD inning 7 TT o0.5 = 1', 'TotalPointsContestant', 'SD', undefined, 'I7'],
    ['YG SD inning 7 -0.5 = 1', 'HandicapContestantLine', 'SD', undefined, 'I7'],
    ['YG SD inning 1 -2.5 = 1', 'HandicapContestantLine', 'SD', undefined, 'I1'],
    ['YG SD 7th inn @ +150 = 1', 'HandicapContestantML', 'SD', undefined, 'I7'],
  ])('%s → %s %s/%s %s', (input, type, team1, team2, period) => {
    const summary = summarize(parseChat(input));
    expect(summary).toMatchObject({ type, team1, period, sport: 'Baseball' });
    expect(summary.team2).toBe(team2);
  });

  // "7th inning" with a market word after it: the period stays the 7th alone.
  test.each([
    ['YG SD 7th inning ML @ +150 = 1', 'HandicapContestantML'],
    ['YG SD 7th inning TT o0.5 = 1', 'TotalPointsContestant'],
    ['YG TEX/SD 7th inning over 0.5 = 1', 'TotalPoints'],
    ['YG TEX/SD 7th inning o0.5 runs = 1', 'TotalPoints'],
    ['YG SD 7th inning -0.5 = 1', 'HandicapContestantLine'],
  ])('%s → %s I7', (input, type) => {
    expect(summarize(parseChat(input))).toMatchObject({ type, period: 'I7' });
  });

  test('a player prop takes "inning 7" out of the contestant', () => {
    expect(summarize(parseChat('IW B. Falter inning 7 hits o0.5'))).toMatchObject({
      type: 'PropOU',
      contestant: 'B. Falter',
      period: 'I7',
    });
  });
});

describe('First N innings, cumulative: F<N>', () => {
  test.each([
    ['YG TEX/SD F7 u4.5 = 1', 'H17'],
    ['YG TEX/SD first 7 u4.5 = 1', 'H17'],
    ['YG TEX/SD first 7 innings u4.5 = 1', 'H17'],
    ['YG TEX/SD first seven innings u4.5 = 1', 'H17'],
    ['YG TEX/SD 1st 7 innings u4.5 = 1', 'H17'],
    ['YG TEX/SD 1st 7 u4.5 = 1', 'H17'],
    ['YG TEX/SD innings 1-7 u4.5 = 1', 'H17'],
    ['YG TEX/SD inning 1-7 u4.5 = 1', 'H17'],
    ['YG TEX/SD innings 1 - 7 u4.5 = 1', 'H17'],
    ['YG TEX/SD 7 innings u4.5 = 1', 'H17'],
    ['YG TEX/SD F7 innings u4.5 = 1', 'H17'],
    ['YG TEX/SD first 3 innings u2.5 = 1', 'H13'],
    ['YG TEX/SD innings 1-3 u2.5 = 1', 'H13'],
    ['YG TEX/SD 3 innings u2.5 = 1', 'H13'],
    ['YG TEX/SD 5 innings u4.5 = 1', 'H1'],
    ['YG TEX/SD innings 1-5 u4.5 = 1', 'H1'],
    ['YG TEX/SD F2 u1.5 = 1', 'H12'],
    ['YG TEX/SD F4 u3.5 = 1', 'H14'],
    ['YG TEX/SD first 6 innings u5.5 = 1', 'H16'],
    ['YG TEX/SD innings 1-8 u6.5 = 1', 'H18'],
  ])('%s → %s', (input, period) => {
    expect(summarize(parseChat(input))).toMatchObject({
      type: 'TotalPoints',
      team1: 'TEX',
      team2: 'SD',
      period,
    });
  });

  test.each([
    ['YG KC F7 o6.5 @ -115 = 1', 'TotalPoints'],
    ['YG KC first 7 innings @ +125 = 1', 'HandicapContestantML'],
    ['YG KC 7 innings ML @ +125 = 1', 'HandicapContestantML'],
    ['YG KC innings 1-7 TT o3.5 = 1', 'TotalPointsContestant'],
    ['YG KC first 7 -0.5 = 1', 'HandicapContestantLine'],
    ['YG F4 KC -0.5 = 1', 'HandicapContestantLine'],
    ['YG KC F6 @ +110 = 1', 'HandicapContestantML'],
  ])('single team: %s → %s', (input, type) => {
    const summary = summarize(parseChat(input));
    expect(summary.type).toBe(type);
    expect(summary.team1).toBe('KC');
    expect(summary.period).toMatch(/^H1\d$/);
  });

  test('parlay legs read the same phrasings', () => {
    const result = parseChat('YGP TEX/SD innings 1-7 u4.5 @ -110 & KC inning 7 @ +120 = $100');
    if (result.betType !== 'parlay') throw new Error('expected a parlay');
    expect(result.legs.map(leg => summarize(leg).period)).toEqual(['H17', 'I7']);
  });
});

// A period phrase the contract does not carry fails: a player prop dropped one
// written after the prop word and booked the full game (0.18.0 too).
describe('Inning text never lands in a team name', () => {
  test.each([
    'YG TEX/SD innings 2-7 u4.5 = 1',
    'YG TEX/SD innings 7 u4.5 = 1',
    'YG TEX/SD 7th innings u4.5 = 1',
    'YG TEX/SD 9 innings u8.5 = 1',
    'YG TEX/SD last 7 innings u4.5 = 1',
    'YG TEX/SD final 3 innings u2.5 = 1',
    'YG TEX/SD next 2 innings u1.5 = 1',
    'YG TEX/SD first 9 innings u8.5 = 1',
    'YG TEX/SD 7 inn u4.5 = 1',
    'YG TEX/SD inning u0.5 = 1',
    'YG SD innings @ +120 = 1',
    'IW B. Falter innings 7 hits o0.5',
    'IW B. Falter hits innings 7 o0.5',
    'IW B. Falter hits inning 7 o0.5',
    'IW B. Falter hits 1st inning o0.5',
    'IW B. Falter hits F7 o0.5',
    'IW B. Falter hits first 5 o0.5',
    'YG TEX/SD 1st inning 7th inning u0.5 = 1',
  ])('%s throws InvalidPeriodFormatError', input => {
    expect(() => parseChat(input)).toThrow(InvalidPeriodFormatError);
  });
});

// Every phrasing below parsed before this grammar change; each expected value
// is the output of chat-bet-parse 0.18.0 on the same input.
describe('Regression: 0.18.0 period phrasings are unchanged', () => {
  const T = 'TotalPoints';
  const TT = 'TotalPointsContestant';
  const ML = 'HandicapContestantML';
  const SP = 'HandicapContestantLine';
  test.each<[string, Summary]>([
    [
      'YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094',
      {
        type: T,
        team1: 'Padres',
        team2: 'Pirates',
        period: 'I1',
        line: 0.5,
        isOver: false,
        sport: 'Baseball',
      },
    ],
    [
      'YG TEX/SD 7th inning u0.5 = 1',
      {
        type: T,
        team1: 'TEX',
        team2: 'SD',
        period: 'I7',
        line: 0.5,
        isOver: false,
        sport: 'Baseball',
      },
    ],
    [
      'YG TEX/SD 7th. inning u0.5 = 1',
      {
        type: T,
        team1: 'TEX',
        team2: 'SD',
        period: 'I7',
        line: 0.5,
        isOver: false,
        sport: 'Baseball',
      },
    ],
    [
      'YG TEX/SD 7 inning u0.5 = 1',
      {
        type: T,
        team1: 'TEX',
        team2: 'SD',
        period: 'I7',
        line: 0.5,
        isOver: false,
        sport: 'Baseball',
      },
    ],
    [
      'YG TEX/SD 3rd inning o0.5 runs = 1',
      {
        type: T,
        team1: 'TEX',
        team2: 'SD',
        period: 'I3',
        line: 0.5,
        isOver: true,
        sport: 'Baseball',
      },
    ],
    [
      'YG SD 7th inning ML @ +150 = 1',
      { type: ML, team1: 'SD', contestant: 'SD', period: 'I7', sport: 'Baseball' },
    ],
    [
      'YG SD 7th inning @ +150 = 1',
      { type: ML, team1: 'SD', contestant: 'SD', period: 'I7', sport: 'Baseball' },
    ],
    [
      'YG SD 7th inning TT o0.5 = 1',
      {
        type: TT,
        team1: 'SD',
        contestant: 'SD',
        period: 'I7',
        line: 0.5,
        isOver: true,
        sport: 'Baseball',
      },
    ],
    [
      'YG SD 7th inning -0.5 = 1',
      { type: SP, team1: 'SD', contestant: 'SD', period: 'I7', line: -0.5, sport: 'Baseball' },
    ],
    [
      'YG Tigers G1 o0.5 1st inning = 1',
      { type: T, team1: 'Tigers', period: 'I1', line: 0.5, isOver: true, sport: 'Baseball' },
    ],
    [
      'YG ATH/SF F5 o4.5 @ -117 = 2.7',
      { type: T, team1: 'ATH', team2: 'SF', period: 'H1', line: 4.5, isOver: true },
    ],
    [
      'YG TEX/SD F3 u2.5 = 1',
      { type: T, team1: 'TEX', team2: 'SD', period: 'H13', line: 2.5, isOver: false },
    ],
    [
      'YG TEX/SD F7 u4.5 = 1',
      { type: T, team1: 'TEX', team2: 'SD', period: 'H17', line: 4.5, isOver: false },
    ],
    ['YG KC F7 @ +125 = 2.0', { type: ML, team1: 'KC', contestant: 'KC', period: 'H17' }],
    [
      'YG SD F7 TT o3.5 = 1',
      { type: TT, team1: 'SD', contestant: 'SD', period: 'H17', line: 3.5, isOver: true },
    ],
    ['YG SD F7 -0.5 = 1', { type: SP, team1: 'SD', contestant: 'SD', period: 'H17', line: -0.5 }],
    ['YG F7 SD -0.5 = 1', { type: SP, team1: 'SD', contestant: 'SD', period: 'H17', line: -0.5 }],
    [
      'YG MIA F5 TT u1.5 @ -110 = 1.0',
      { type: TT, team1: 'MIA', contestant: 'MIA', period: 'H1', line: 1.5, isOver: false },
    ],
    [
      'YG Pirates F5 u4.5 = 1',
      { type: T, team1: 'Pirates', period: 'H1', line: 4.5, isOver: false },
    ],
    [
      'YG Astros first 5 under 4-105 = $4k',
      { type: T, team1: 'Astros', period: 'H1', line: 4, isOver: false },
    ],
    [
      'YG Astros first five under 4 = 1',
      { type: T, team1: 'Astros', period: 'H1', line: 4, isOver: false },
    ],
    [
      'YG Astros 1st 5 innings u4 = 1',
      { type: T, team1: 'Astros', period: 'H1', line: 4, isOver: false },
    ],
    ['YG Astros 1st 5 u4 = 1', { type: T, team1: 'Astros', period: 'H1', line: 4, isOver: false }],
    [
      'yg h1 phillies under 4.5 even = 4k',
      { type: T, team1: 'phillies', period: 'H1', line: 4.5, isOver: false },
    ],
    [
      'YG 2h Vanderbilt +2.5 = 1',
      { type: SP, team1: 'Vanderbilt', contestant: 'Vanderbilt', period: 'H2', line: 2.5 },
    ],
    [
      'YG Vanderbilt first half +2.5 = 1',
      { type: SP, team1: 'Vanderbilt', contestant: 'Vanderbilt', period: 'H1', line: 2.5 },
    ],
    [
      'YG Vanderbilt 2nd half +2.5 = 1',
      { type: SP, team1: 'Vanderbilt', contestant: 'Vanderbilt', period: 'H2', line: 2.5 },
    ],
    [
      'YG CFB 1Q Utah State u10.5 = 1',
      { type: T, team1: 'Utah State', period: 'Q1', line: 10.5, isOver: false, sport: 'Football' },
    ],
    [
      'YG Rangers/Devils u.5 p3 = 1',
      { type: T, team1: 'Rangers', team2: 'Devils', period: 'P3', line: 0.5, isOver: false },
    ],
    [
      'YG Lakers q1 -2.5 = 1',
      { type: SP, team1: 'Lakers', contestant: 'Lakers', period: 'Q1', line: -2.5 },
    ],
    [
      'YG Rays 1st Inning o0.5 = 1',
      { type: T, team1: 'Rays', period: 'I1', line: 0.5, isOver: true, sport: 'Baseball' },
    ],
    [
      'IW LAA 1st Inning TT o0.5',
      {
        type: TT,
        team1: 'LAA',
        contestant: 'LAA',
        period: 'I1',
        line: 0.5,
        isOver: true,
        sport: 'Baseball',
      },
    ],
    [
      'IW CIN 1st inning first team to score',
      { type: 'PropYN', team1: 'CIN', contestant: 'CIN', period: 'I1', sport: 'Baseball' },
    ],
    [
      'IW B. Falter 1st inning hits o0.5',
      {
        type: 'PropOU',
        contestant: 'B. Falter',
        period: 'I1',
        line: 0.5,
        isOver: true,
        sport: 'Baseball',
      },
    ],
    [
      'IW B. Falter innings pitched o5.5',
      { type: 'PropOU', contestant: 'B. Falter', period: 'M0', line: 5.5, isOver: true },
    ],
    [
      'IW Padres/Pirates 1st inning u0.5 @ +100',
      {
        type: T,
        team1: 'Padres',
        team2: 'Pirates',
        period: 'I1',
        line: 0.5,
        isOver: false,
        sport: 'Baseball',
      },
    ],
    [
      'IW Jays +0.5 -119 first five',
      { type: SP, team1: 'Jays', contestant: 'Jays', period: 'H1', line: 0.5 },
    ],
    [
      'YG Cincinnati Reds vs LA Dodgers U0.5 1st inning = 1',
      {
        type: T,
        team1: 'Cincinnati Reds',
        team2: 'LA Dodgers',
        period: 'I1',
        line: 0.5,
        isOver: false,
        sport: 'Baseball',
      },
    ],
    [
      'YG Mets/Braves o8.5 = 1',
      { type: T, team1: 'Mets', team2: 'Braves', period: 'M0', line: 8.5, isOver: true },
    ],
    ['YG Mets ML @ +120 = 1', { type: ML, team1: 'Mets', contestant: 'Mets', period: 'M0' }],
    [
      'YG Innsbruck @ +120 = 1',
      { type: ML, team1: 'Innsbruck', contestant: 'Innsbruck', period: 'M0' },
    ],
  ])('%s', (input, expected) => {
    expect(summarize(parseChat(input))).toEqual(expected);
  });
});
