/**
 * safeComms — Main Pipeline
 * Ingest → Check commands → Assess risk → Bot reply (if threshold met) → Store flag
 * Ingests from: (1) active community timelines, (2) mentions of @Safe_Coms (when community tweets unavailable)
 */

import { ingestActiveCommunities, ingestMentions } from '../services/ingestion';
import { parseCommand, processActivation, processDeactivation } from '../services/activation';
import { assessPost } from '../risk/engine';
import { replyToRiskyPost } from '../services/bot';
import { getDb } from '../db';
import { schema } from '../db';
import { isOpen } from '../abuse/circuit-breaker';
import type { NormalizedPost } from '../types';

/** Run full pipeline: ingest, process commands, assess risk, reply */
export async function runPipeline(): Promise<{
  ingested: number;
  commandsProcessed: number;
  flagsCreated: number;
  repliesAttempted: number;
  repliesSucceeded: number;
  replyErrors?: string[];
}> {
  if (isOpen()) {
    return { ingested: 0, commandsProcessed: 0, flagsCreated: 0, repliesAttempted: 0, repliesSucceeded: 0, replyErrors: [] };
  }

  const [communityPosts, mentionPosts] = await Promise.all([
    ingestActiveCommunities(),
    ingestMentions(),
  ]);
  const seen = new Set<string>();
  const posts: NormalizedPost[] = [];
  for (const p of [...communityPosts, ...mentionPosts]) {
    if (seen.has(p.post_id)) continue;
    seen.add(p.post_id);
    posts.push(p);
  }
  let commandsProcessed = 0;
  let flagsCreated = 0;
  let repliesAttempted = 0;
  let repliesSucceeded = 0;
  const replyErrors: string[] = [];

  const db = getDb();
  const existingFlags = new Set(
    db.select({ postId: schema.flags.postId }).from(schema.flags).all().map((r) => r.postId)
  );

  for (const post of posts) {
    if (existingFlags.has(post.post_id)) continue;

    const cmd = parseCommand(post.text);
    if (cmd === 'activate') {
      const result = await processActivation(post.community_id, undefined, post.author_id);
      // TODO: bot replies to activation command (via webhook or separate flow)
      if (result.ok) commandsProcessed++;
      continue;
    }
    if (cmd === 'deactivate') {
      const result = await processDeactivation(post.community_id, post.author_id);
      if (result.ok) commandsProcessed++;
      continue;
    }

    const assessment = assessPost(post);
    if (!assessment) continue;

    // When tagged via mention, reply when we flag (even mod_alert — user explicitly asked us)
    const isFromMention = post.community_id === 'mentions';
    const shouldReply =
      assessment.threshold === 'flag' || (isFromMention && assessment.threshold === 'mod_alert');

    if (assessment.threshold === 'log_only') {
      // Log only — store without replying
      db.insert(schema.flags).values({
        postId: post.post_id,
        communityId: post.community_id,
        category: assessment.category,
        score: assessment.score,
        signals: JSON.stringify(assessment.signals),
        threshold: assessment.threshold,
        botReplyId: null,
        responseTimeMs: null,
      }).run();
      flagsCreated++;
      existingFlags.add(post.post_id);
      continue;
    }

    // Public flag (>=0.75) — reply; mod_alert — reply when from mention (user tagged us)
    let replyId: string | null = null;
    let responseTimeMs: number | null = null;
    if (shouldReply) {
      repliesAttempted++;
      const t0 = Date.now();
      const replyResult = await replyToRiskyPost(
        post.post_id,
        post.author_id,
        assessment.category,
        post.text
      );
      responseTimeMs = Date.now() - t0;
      replyId = replyResult.replyId;
      if (replyId) repliesSucceeded++;
      else if (replyResult.error) replyErrors.push(replyResult.error);
    }

    db.insert(schema.flags).values({
      postId: post.post_id,
      communityId: post.community_id,
      category: assessment.category,
      score: assessment.score,
      signals: JSON.stringify(assessment.signals),
      threshold: assessment.threshold,
      botReplyId: replyId ?? null,
      responseTimeMs: responseTimeMs ?? null,
    }).run();
    flagsCreated++;
    existingFlags.add(post.post_id);
  }

  return {
    ingested: posts.length,
    commandsProcessed,
    flagsCreated,
    repliesAttempted,
    repliesSucceeded,
    replyErrors: replyErrors.length ? replyErrors : undefined,
  };
}
