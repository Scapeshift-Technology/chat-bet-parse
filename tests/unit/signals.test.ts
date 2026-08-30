/**
 * Tests for the chat-bet-parse/signals subpath entry: the pre-parse text
 * signals downstream chat consumers use to decide whether to run the parser
 * at all. The core contract is ALIGNMENT: EXPLICIT_PREFIX_SIGNAL must agree
 * with what parseChat actually accepts as an explicit prefix, so consumer
 * gates built on the signal can never drift from the grammar.
 */

import {
  BET_CANDIDATE_SIGNAL,
  EXPLICIT_PREFIX_SIGNAL,
  RECOGNIZED_PREFIXES,
} from '../../src/signals';
import * as root from '../../src/index';
import { parseChat } from '../../src/index';
import { UnrecognizedChatPrefixError } from '../../src/errors';

describe('signals entry', () => {
  describe('RECOGNIZED_PREFIXES', () => {
    it('lists exactly the prefixes the parser dispatches on', () => {
      expect([...RECOGNIZED_PREFIXES].sort()).toEqual(
        ['IW', 'IWP', 'IWRR', 'IWW', 'YG', 'YGP', 'YGRR', 'YGW'].sort()
      );
    });
  });

  describe('EXPLICIT_PREFIX_SIGNAL', () => {
    it.each([...RECOGNIZED_PREFIXES])('matches a %s-prefixed message', prefix => {
      expect(EXPLICIT_PREFIX_SIGNAL.test(`${prefix} something`)).toBe(true);
      expect(EXPLICIT_PREFIX_SIGNAL.test(`${prefix.toLowerCase()} something`)).toBe(true);
    });

    it.each([
      'IWANT to go',
      'iwill be there',
      'YGX thing',
      'IW-2 glued punctuation is not a prefix token',
      'YG.ok',
      'they won 8-5 yesterday',
      'First 5 gurdians-128 ml',
      '',
    ])('does not match non-prefixed text: %s', text => {
      expect(EXPLICIT_PREFIX_SIGNAL.test(text)).toBe(false);
    });

    it('matches only at the start of the message', () => {
      expect(EXPLICIT_PREFIX_SIGNAL.test('sure, IW Yankees @ -110')).toBe(false);
    });

    /**
     * Alignment property: for any message WITH a body, the signal matches
     * exactly when parseChat recognizes the first token as an explicit
     * prefix (i.e. does not throw UnrecognizedChatPrefixError; other parse
     * errors mean the prefix WAS recognized). Bare prefixes with no body are
     * excluded: the signal is a cheap pre-filter and deliberately matches
     * them, while the parser rejects the degenerate message.
     */
    it.each([
      'IW Yankees @ -110',
      'YG Yankees @ -110 = $100',
      'IWP Lakers @ +120 & Warriors @ -110',
      'YGP 872 Cardinals/Cubs o8.5 @ -110 & 701 Lakers @ +120 = $100',
      'IWRR 4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115',
      'YGRR 3c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100 each',
      'IWW 12/25 NBA Lakers score 120+ points @ +200',
      'YGW 12/25 NBA Lakers score 120+ points @ +200 = $100',
      'IWANT to go',
      'iwill be there',
      'YGX thing',
      'IW-2 glued',
      'random chatter with no bet',
      // Delimiter matrix: leading whitespace (parser trims), tab/newline/CRLF
      // after every prefix class, and @/= glue (the tokenizer inserts spaces
      // around @ and = before splitting, so bare IW/YG tolerate glue while
      // longer prefixes do not).
      '  IW Yankees @ -110',
      '\nYG Yankees @ -110 = $100',
      'IW\tYankees @ -110',
      'YG\nYankees @ -110 = $100',
      'IWP\tLakers @ +120 & Warriors @ -110',
      'YGP\nLakers @ +120 & Warriors @ -110 = $100',
      'IWRR\t4c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 & Nets @ +115',
      'YGRR\r\n3c2 Lakers @ +120 & Warriors @ -110 & Celtics @ +105 = $100 each',
      'IWW\t12/25 NBA Lakers score 120+ points @ +200',
      'IWW\n12/25 NBA Lakers score 120+ points @ +200',
      'YGW\n12/25 NBA Lakers score 120+ points @ +200 = $100',
      'IW@+150 Yankees',
      'YG@-110 Yankees = $100',
      'YG=$100 Yankees @ -110',
      'IWP@ Lakers @ +120 & Warriors @ -110',
      'IWW@ 12/25 NBA Lakers score 120+ points',
    ])('agrees with parseChat prefix recognition for: %s', text => {
      let prefixRecognized = true;
      try {
        parseChat(text);
      } catch (e) {
        if (e instanceof UnrecognizedChatPrefixError) prefixRecognized = false;
      }
      expect(EXPLICIT_PREFIX_SIGNAL.test(text)).toBe(prefixRecognized);
    });
  });

  describe('BET_CANDIDATE_SIGNAL', () => {
    it.each([
      'First 5 gurdians-128 ml',
      'Angels+1.5',
      'yankees -105',
      '+120 lakers',
      // Digit-glued prices in a totals context — the ONLY context the
      // grammar consumes them, so the signal admits exactly that: over/under
      // (word or o/u shorthand) + number + glued signed 3-5 digit price.
      // The first two are live counterparty orders the old signal silently
      // rejected; the rest pin shorthand, glued-word, caps, trailing
      // punctuation, and decimal-odds forms, which all parse too.
      'Astros first 5 under 4-105',
      'First 5 giants over 4.5+105',
      'yanks over 8-110',
      'u4.5-105 astros',
      'o8.5+102 cubs',
      'over4.5+105 giants',
      'ASTROS FIRST 5 UNDER 4-105',
      'Astros first 5 under 4-105.',
      'Astros first 5 under 4-105.5',
    ])('matches bet-like text: %s', text => {
      expect(BET_CANDIDATE_SIGNAL.test(text)).toBe(true);
    });

    it.each([
      'they won 8-5 yesterday',
      'meet @ 5',
      'available 8-20',
      'no bet here',
      // Digit-glued signs OUTSIDE a totals context stay excluded — the
      // grammar never consumes them, and admitting them lets the implied
      // default-price path silently mint phantom moneyline orders on
      // nonsense contestant text (verified: 'they lost 110-105 last night'
      // parses as an ML order on that whole string at -110 if admitted).
      'they lost 110-105 last night',
      'call me at 555-1234',
      'see you 3-45pm',
      'posted 2026-08-28',
      'went 12-45 on the road trip',
      'buy the range 100-150',
      // Known-silent by owner decision 2026-08-29: a digit-glued price after
      // a period marker has no totals context, no live sample, and would
      // ALSO mis-parse into a contestant swallow if admitted.
      'First 5-128 gurdians ml',
      // The totals words alone do not admit unsigned/short-glued forms.
      'over 4.5 was the total',
      'under 8-20 minutes left',
      'rollover 4-105 balance',
    ])('does not match: %s', text => {
      expect(BET_CANDIDATE_SIGNAL.test(text)).toBe(false);
    });

    /**
     * Alignment property, on the path the signal actually feeds: consumers
     * gate UNPREFIXED text with this signal before an implied-prefix parse.
     * Every digit-glued form the signal admits must parse via
     * `impliedPrefix` — an admitted-but-unparseable live class means the
     * signal has drifted ahead of the grammar.
     */
    it.each([
      'Astros first 5 under 4-105',
      'First 5 giants over 4.5+105',
      'yanks over 8-110',
      'astros u4.5-105',
      'Astros first 5 under 4-105.5',
    ])('admitted glued-total forms parse implied: %s', text => {
      expect(BET_CANDIDATE_SIGNAL.test(text)).toBe(true);
      expect(() => parseChat(text, { impliedPrefix: 'IW' })).not.toThrow();
    });

    /**
     * Anti-phantom property: the totals-context restriction exists because
     * an admitted digit-glued sign the grammar does NOT consume would fall
     * through to the implied default-price path and silently mint a
     * moneyline order on nonsense contestant text. Pin that the excluded
     * forms would indeed mis-parse if force-fed, so nobody "simplifies" the
     * branch back to context-free without hitting this test.
     */
    it('excluded digit-glued chatter would default-price mis-parse if admitted', () => {
      const text = 'they lost 110-105 last night';
      expect(BET_CANDIDATE_SIGNAL.test(text)).toBe(false);
      const result = parseChat(`IW ${text}`);
      expect(result.contract).toMatchObject({ Contestant: text });
      expect(result.bet).toMatchObject({ Price: -110 });
    });
  });

  describe('root re-exports', () => {
    it('exposes the same signal objects from the package root', () => {
      expect(root.BET_CANDIDATE_SIGNAL).toBe(BET_CANDIDATE_SIGNAL);
      expect(root.EXPLICIT_PREFIX_SIGNAL).toBe(EXPLICIT_PREFIX_SIGNAL);
      expect(root.RECOGNIZED_PREFIXES).toBe(RECOGNIZED_PREFIXES);
    });
  });
});
