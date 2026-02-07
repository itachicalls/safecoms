/**
 * safeComms — Debug: test posting a reply via X API
 * POST /api/debug/test-reply
 * Body: { "postId": "1234567890" }
 * Use this to verify the bot can post replies (tweet.write scope).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { replyToPost } from '@/lib/x-api/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const postId = typeof req.body?.postId === 'string' ? req.body.postId.trim() : null;
  if (!postId) {
    return res.status(400).json({
      ok: false,
      error: 'Missing postId. Send { "postId": "tweet_id_here" }',
    });
  }

  const testText = '🔬 safeComms test reply — please ignore';
  try {
    const { id: replyId, error } = await replyToPost(postId, '', testText);
    if (replyId) {
      return res.status(200).json({
        ok: true,
        message: 'Reply posted successfully',
        replyId,
        postId,
      });
    }
    return res.status(500).json({
      ok: false,
      error: error ?? 'X API returned null — ensure tweet.write scope and sufficient credits.',
      postId,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message ?? String(err),
      postId,
    });
  }
}
