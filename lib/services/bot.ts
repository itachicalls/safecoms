/**
 * safeComms — Bot Engine
 * Can: reply to risky posts, mention mods, post scheduled reports, milestone tweets.
 * Tone: authoritative, sharp, dismissive — never abusive.
 */

import { replyToPost, postTweet } from '../x-api/client';
import { generateReply } from '../llm/reasoning';
import { allowGlobalFlag } from '../abuse/rate-limiter';
import { isOpen, recordSuccess, recordFailure } from '../abuse/circuit-breaker';
import { getDb } from '../db';
import { schema } from '../db';
import type { RiskCategory } from '../types';

export interface ReplyToRiskyResult {
  replyId: string | null;
  error?: string;
}

/** Reply to a risky post (public flag or mod alert) */
export async function replyToRiskyPost(
  postId: string,
  authorId: string,
  category: RiskCategory,
  postText: string
): Promise<ReplyToRiskyResult> {
  if (isOpen()) {
    console.warn('[Bot] Reply skipped: circuit breaker open');
    return { replyId: null, error: 'Circuit breaker open' };
  }
  if (!allowGlobalFlag()) {
    console.warn('[Bot] Reply skipped: rate limit (global flags)');
    return { replyId: null, error: 'Rate limit (global flags)' };
  }

  try {
    const text = await generateReply(category, postText);
    const res = await replyToPost(postId, authorId, text);
    if (res.id) {
      recordSuccess();
      return { replyId: res.id };
    }
    recordFailure();
    return { replyId: null, error: res.error ?? 'Unknown error' };
  } catch (err: any) {
    recordFailure();
    return { replyId: null, error: err?.message ?? String(err) };
  }
}

/** Post transparency report (6h or daily) */
export async function postTransparencyReport(report: {
  period: string;
  scamLinks: number;
  fudAttempts: number;
  impersonators: number;
  avgResponseSec?: number;
}): Promise<string | null> {
  const line = (n: number, label: string) => (n > 0 ? `• ${n} ${label}` : null);
  const lines = [
    '🛡️ safeComms Report (' + report.period + ')',
    line(report.scamLinks, 'scam links flagged'),
    line(report.fudAttempts, 'FUD attempts blocked'),
    line(report.impersonators, 'impersonators detected'),
  ].filter(Boolean);
  if (report.avgResponseSec != null) {
    lines.push(`Avg response: ${report.avgResponseSec.toFixed(1)}s`);
  }
  const text = lines.join('\n');
  return postTweet(text);
}
