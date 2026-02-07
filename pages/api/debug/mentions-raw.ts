/**
 * safeComms — Debug: raw X API mentions response
 * GET /api/debug/mentions-raw
 * Returns exactly what the X API returns (for troubleshooting "no mentions").
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { TwitterApi } from 'twitter-api-v2';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return res.status(400).json({ ok: false, error: 'Missing X credentials' });
  }

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });

  try {
    const me = await client.v2.me();
    const userId = me.data.id;

    // Use fullResponse to see the actual structure the library returns
    const fullResp = await (client.v2 as {
      get: (path: string, params?: object, opts?: { params?: object; fullResponse?: boolean }) => Promise<unknown>;
    }).get(
      'users/:id/mentions',
      {
        max_results: 20,
        'tweet.fields': 'created_at,author_id,referenced_tweets,entities',
        expansions: 'referenced_tweets.id,author_id',
        'user.fields': 'username,public_metrics',
      },
      { params: { id: userId }, fullResponse: true }
    );

    const resp = fullResp as { data?: unknown; rateLimit?: unknown };
    const body = resp?.data;

    const b = body as { data?: unknown[]; includes?: { tweets?: unknown[] }; meta?: { result_count?: number } };
    const tweetCount = Array.isArray(b?.data) ? b.data.length : 0;
    const includedCount = Array.isArray(b?.includes?.tweets) ? b.includes.tweets.length : 0;

    return res.status(200).json({
      ok: true,
      botUser: { id: me.data.id, username: me.data.username },
      summary: {
        tweetCount,
        includedTweetsCount: includedCount,
        hint:
          tweetCount === 0
            ? 'X API returned 0 mentions. If you replied with @Safe_Coms in an X Community, community replies may not appear in the global mentions endpoint.'
            : `${tweetCount} mention(s) fetched. Run pipeline to process.`,
      },
      rawBody: body,
    });
  } catch (err) {
    console.error('[api/debug/mentions-raw]', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Fetch failed',
    });
  }
}
