/**
 * safeComms — Debug: fetch mentions and show what would be processed
 * GET /api/debug/mentions
 * Use this to verify the bot is receiving your @mentions.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchMentionsTimeline } from '@/lib/x-api/client';
import { assessPost } from '@/lib/risk/engine';
import type { NormalizedPost } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mentions = await fetchMentionsTimeline();
    const posts: Array<{
      post_id: string;
      text: string;
      author: string;
      assessment: { category: string; score: number; threshold: string } | null;
    }> = [];

    for (const m of mentions) {
      const post: NormalizedPost = {
        post_id: m.replyToPostId,
        author_id: m.replyToAuthorId,
        author_metadata: { username: m.replyToUsername, follower_count: m.replyToFollowerCount },
        text: m.replyToText,
        links: m.replyToLinks ?? [],
        timestamp: m.replyToCreatedAt ? new Date(m.replyToCreatedAt).toISOString() : new Date().toISOString(),
        community_id: 'mentions',
      };
      const assessment = assessPost(post);
      posts.push({
        post_id: post.post_id,
        text: post.text,
        author: post.author_metadata.username ?? post.author_id,
        assessment: assessment
          ? { category: assessment.category, score: assessment.score, threshold: assessment.threshold }
          : null,
      });
    }

    return res.status(200).json({
      ok: true,
      count: mentions.length,
      posts,
      hint:
        mentions.length === 0
          ? 'No mentions. Reply to a post with @Safe_Coms to tag the bot, then run this again.'
          : 'Run the pipeline to process these and post replies.',
    });
  } catch (err) {
    console.error('[api/debug/mentions]', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Fetch failed',
    });
  }
}
