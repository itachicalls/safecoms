/**
 * safeComms — Circuit Breaker
 * Graceful degradation: auto-disable on high error rate.
 */

type State = 'closed' | 'open' | 'half-open';
let state: State = 'closed';
let failures = 0;
let lastFailureAt = 0;

const THRESHOLD = 5;
const WINDOW_MS = 60_000;
const COOLDOWN_MS = 120_000;

export function recordSuccess(): void {
  if (state === 'half-open') {
    state = 'closed';
    failures = 0;
  }
}

export function recordFailure(): void {
  failures++;
  lastFailureAt = Date.now();
  if (failures >= THRESHOLD) {
    state = 'open';
  }
}

export function isOpen(): boolean {
  const now = Date.now();
  if (state === 'closed') return false;
  if (state === 'open') {
    if (now - lastFailureAt > COOLDOWN_MS) {
      state = 'half-open';
      return false;
    }
    return true;
  }
  return false;
}
