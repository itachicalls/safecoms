/**
 * safeComms — Rate Limits & Abuse Protection
 * Per-community limits, per-user cooldowns, global circuit breaker.
 * Use Redis/KV in production; in-memory fallback for dev.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const LIMITS = {
  perCommunityPerMinute: 30,
  perUserCommandCooldownMs: 60_000,
  globalFlagsPerMinute: 100,
};

/** Check if key is over limit. Returns true if allowed. */
function check(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/** Per-community rate limit: 30 posts/min */
export function allowCommunityIngestion(communityId: string): boolean {
  return check(`community:${communityId}`, LIMITS.perCommunityPerMinute, 60_000);
}

/** Per-user command cooldown: 1 min between activate/deactivate */
export function allowUserCommand(userId: string): boolean {
  const key = `cmd:${userId}`;
  const entry = store.get(key);
  const now = Date.now();
  if (entry && now < entry.resetAt) return false;
  store.set(key, { count: 1, resetAt: now + LIMITS.perUserCommandCooldownMs });
  return true;
}

/** Global flag rate: 100/min */
export function allowGlobalFlag(): boolean {
  return check('global:flags', LIMITS.globalFlagsPerMinute, 60_000);
}
