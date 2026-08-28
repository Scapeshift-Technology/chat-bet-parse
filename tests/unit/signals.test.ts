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
    it.each(['First 5 gurdians-128 ml', 'Angels+1.5', 'yankees -105', '+120 lakers'])(
      'matches bet-like text: %s',
      text => {
        expect(BET_CANDIDATE_SIGNAL.test(text)).toBe(true);
      }
    );

    it.each(['they won 8-5 yesterday', 'meet @ 5', 'available 8-20', 'no bet here'])(
      'does not match: %s',
      text => {
        expect(BET_CANDIDATE_SIGNAL.test(text)).toBe(false);
      }
    );
  });

  describe('root re-exports', () => {
    it('exposes the same signal objects from the package root', () => {
      expect(root.BET_CANDIDATE_SIGNAL).toBe(BET_CANDIDATE_SIGNAL);
      expect(root.EXPLICIT_PREFIX_SIGNAL).toBe(EXPLICIT_PREFIX_SIGNAL);
      expect(root.RECOGNIZED_PREFIXES).toBe(RECOGNIZED_PREFIXES);
    });
  });
});
