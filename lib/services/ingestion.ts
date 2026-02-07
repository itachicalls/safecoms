/**
 * safeComms — Ingestion Service
 * Monitors activated community timelines (when available) AND mentions of @Safe_Coms.
 * Latency target: <5 seconds per post.
 */

import { fetchCommunityTimeline, fetchMentionsTimeline, type MentionWithOriginal } from '../x-api/client';
import { getDb } from '../db';
import { eq } from 'drizzle-orm';
import { schema } from '../db';
import type { NormalizedPost } from '../types';

const MENTIONS_COMMUNITY_ID = 'mentions';

/** Convert mention + original post to NormalizedPost for risk assessment */
function mentionToPost(m: MentionWithOriginal): NormalizedPost {
  return {
    post_id: m.replyToPostId,
    author_id: m.replyToAuthorId,
    author_metadata: {
      username: m.replyToUsername,
      follower_count: m.replyToFollowerCount,
    },
    text: m.replyToText,
    links: m.replyToLinks ?? [],
    timestamp: m.replyToCreatedAt ? new Date(m.replyToCreatedAt).toISOString() : new Date().toISOString(),
    community_id: MENTIONS_COMMUNITY_ID,
  };
}

/** Ingest from mentions timeline — when someone @mentions Safe_Coms in reply to a post */
export async function ingestMentions(): Promise<NormalizedPost[]> {
  const mentions = await fetchMentionsTimeline();
  const posts = mentions.map(mentionToPost);
  for (const p of posts) {
    storePost(p);
  }
  return posts;
}

/** Get list of active community IDs */
function getActiveCommunityIds(): string[] {
  const db = getDb();
  const rows = db
    .select({ id: schema.communities.id })
    .from(schema.communities)
    .where(eq(schema.communities.status, 'active'))
    .all();
  return rows.map((r) => r.id);
}

/** Store post in DB (idempotent) */
function storePost(post: NormalizedPost): void {
  const db = getDb();
  db.insert(schema.posts)
    .values({
      id: post.post_id,
      communityId: post.community_id,
      authorId: post.author_id,
      authorUsername: post.author_metadata.username,
      authorFollowers: post.author_metadata.follower_count,
      text: post.text,
      links: JSON.stringify(post.links),
      createdAt: post.timestamp,
    })
    .onConflictDoNothing({ target: schema.posts.id })
    .run();
}

/** Ingest posts from all active communities */
export async function ingestActiveCommunities(): Promise<NormalizedPost[]> {
  const communityIds = getActiveCommunityIds();
  const allPosts: NormalizedPost[] = [];

  for (const cid of communityIds) {
    const posts = await fetchCommunityTimeline(cid);
    for (const p of posts) {
      storePost(p);
      allPosts.push(p);
    }
  }

  return allPosts;
}
