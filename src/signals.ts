/**
 * chat-bet-parse/signals
 *
 * Pre-parse text signals: the cheap gates a chat consumer needs BEFORE
 * deciding to run the full parser — "is this text explicitly prefixed as a
 * bet?" and "does this unprefixed text plausibly carry a bet?". They live in
 * this package, not in consumer codebases, because they are facts about THIS
 * grammar: when the grammar moves, the signals move in the same commit
 * (tests/unit/signals.test.ts pins them to actual parser behavior). Shipped
 * as a dedicated subpath entry so browser consumers can import them without
 * pulling in the parser body.
 */

/**
 * Chat prefixes the parser accepts as an explicit first token
 * (case-insensitive): straight orders/fills (IW/YG), writein shorthand
 * (IWW/YGW), parlays (IWP/YGP), and round robins (IWRR/YGRR).
 */
export const RECOGNIZED_PREFIXES = [
  'IW',
  'IWW',
  'IWP',
  'IWRR',
  'YG',
  'YGW',
  'YGP',
  'YGRR',
] as const;

/**
 * "This message is explicitly prefixed": after optional leading whitespace
 * (the parser trims), its first token is one of RECOGNIZED_PREFIXES. Bare
 * IW/YG additionally tolerate a glued `@` or `=` (`IW@+150 Yankees`) because
 * the tokenizer inserts spaces around those markers before splitting; longer
 * prefixes are recognized only whitespace-delimited. A cheap pre-filter, not
 * a parse guarantee — a bare prefix with no body matches here but still
 * fails the parser's message-too-short check. Built from RECOGNIZED_PREFIXES
 * so the list and the regex cannot drift; an alignment test pins it to
 * actual parseChat behavior.
 */
const LONG_PREFIXES = RECOGNIZED_PREFIXES.filter(p => p.length > 2);
const BARE_PREFIXES = RECOGNIZED_PREFIXES.filter(p => p.length === 2);
export const EXPLICIT_PREFIX_SIGNAL = new RegExp(
  `^\\s*(?:(?:${[...LONG_PREFIXES].sort((a, b) => b.length - a.length).join('|')})(?=\\s|$)|(?:${BARE_PREFIXES.join('|')})(?=[\\s@=]|$))`,
  'i'
);

/**
 * Candidate heuristic for "this text plausibly carries a bet": a signed
 * number at a token boundary (`-105`, `+1.5`), glued to a word
 * (`gurdians-128`, `Angels+1.5`), or glued to a total's number in an
 * over/under context (`under 4-105`, `over 4.5+105`, `u4.5-105`, and the
 * punctuated/decimal forms `4-105.`, `4-105.5`). The digit-glued branch is
 * deliberately restricted to the totals context — the ONLY place the
 * grammar consumes a digit-glued price — because a context-free `\d[+-]\d`
 * admits chatter ("they lost 110-105", phone numbers) that the implied
 * default-price path would then silently mint into a moneyline order on
 * nonsense contestant text; the anti-phantom test pins this. American
 * prices are never shorter than 3 digits, which keeps dates, times, and
 * short ranges ("available 8-20", "3-45pm") excluded even after over/under.
 * A leading `Parlay` token is bet evidence in its own right (the free-form
 * parlay grammar) — even priceless, so an order whose price arrives in a
 * later message reaches the parser and fails LOUDLY (operator alert lane)
 * instead of staying silent. Leading-token only: mid-sentence "parlay"
 * chatter stays excluded. Downstream pre-parse gates (e.g. a chat consumer
 * deciding whether to attempt an implied-prefix parse at all) mirror this
 * ONE definition instead of maintaining a drift-prone copy; the parser's
 * own implied-prefix gate is built on it too.
 */
export const BET_CANDIDATE_SIGNAL =
  /(^|\s|[A-Za-z])[+-]\d|\b(?:over|under|[ou])\s*\d+(?:\.\d+)?[+-]\d{3,5}(?!\d)|^\s*parlay\b/i;
