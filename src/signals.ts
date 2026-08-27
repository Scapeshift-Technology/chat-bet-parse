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
 * number at a token boundary (`-105`, `+1.5`) or glued to a word
 * (`gurdians-128`, `Angels+1.5`). Digit-glued forms ("available 8-20",
 * "3-4pm") are dates and ranges, not signs, and stay excluded. Downstream
 * pre-parse gates (e.g. a chat consumer deciding whether to attempt an
 * implied-prefix parse at all) mirror this ONE definition instead of
 * maintaining a drift-prone copy; the parser's own implied-prefix gate is
 * built on it too.
 */
export const BET_CANDIDATE_SIGNAL = /(^|\s|[A-Za-z])[+-]\d/;
