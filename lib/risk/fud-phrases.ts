/**
 * safeComms — FUD Phrase Seeds
 * Malicious panic / liquidity redirect detection.
 */

export const FUD_PHRASES = [
  'dev is selling',
  'team dumped',
  'large bundle',
  'liquidity pulled',
  'to zero',
  'dead coin',
  'sell this',
  'rotate into',
  'buy the og',
  'new contract is legit',
] as const;

/** Urgency triggers */
export const URGENCY_TRIGGERS = [
  'now',
  'asap',
  'before it',
  'last chance',
  'don\'t miss',
  'immediately',
  'quick',
  'rush',
] as const;
