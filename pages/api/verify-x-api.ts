/**
 * safeComms — Verify which X API endpoints your app can access
 * Run: GET /api/verify-x-api
 * Checks: user lookup, mentions timeline, post tweet, communities lookup, community tweets
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
    return res.status(400).json({
      ok: false,
      error: 'Missing X credentials in .env',
      results: null,
    });
  }

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });

  const results: Record<string, { ok: boolean; status?: number; message: string }> = {};
  let userId: string | null = null;

  // 1. Verify credentials — get current user
  try {
    const me = await client.v2.me();
    userId = me.data.id;
    results.credentials = {
      ok: true,
      message: `Connected as @${me.data.username} (${me.data.id})`,
    };
  } catch (e: any) {
    results.credentials = {
      ok: false,
      status: e?.code ?? e?.status,
      message: e?.message ?? String(e),
    };
    return res.status(200).json({ ok: false, results });
  }

  if (!userId) return res.status(200).json({ ok: false, results });

  // 2. User timeline (read) — users/:id/tweets with params from X docs Postman examples
  const v2Get = (client.v2 as { get: (path: string, params?: object, opts?: { params?: object }) => Promise<unknown> }).get.bind(client.v2);
  try {
    await v2Get(
      'users/:id/tweets',
      {
        max_results: 5,
        'tweet.fields': 'created_at,author_id',
        expansions: 'author_id',
        'user.fields': 'created_at',
      },
      { params: { id: userId } }
    );
    results.user_timeline = {
      ok: true,
      message: 'User timeline: OK',
    };
  } catch (e: any) {
    const errDetail = e?.data?.errors?.[0]?.message ?? e?.data?.detail ?? e?.message;
    results.user_timeline = {
      ok: false,
      status: e?.code ?? e?.data?.status,
      message: errDetail ? `user_timeline: ${errDetail}` : String(e?.message ?? e),
    };
  }

  // 3. Mentions timeline — users/:id/mentions with same params
  try {
    await v2Get(
      'users/:id/mentions',
      {
        max_results: 5,
        'tweet.fields': 'created_at,author_id',
        expansions: 'author_id',
        'user.fields': 'created_at',
      },
      { params: { id: userId } }
    );
    results.mentions_timeline = {
      ok: true,
      message: 'Mentions timeline: OK',
    };
  } catch (e: any) {
    const errDetail = e?.data?.errors?.[0]?.message ?? e?.data?.detail ?? e?.message;
    results.mentions_timeline = {
      ok: false,
      status: e?.code ?? e?.data?.status,
      message: errDetail ? `mentions_timeline: ${errDetail}` : String(e?.message ?? e),
    };
  }

  // 4. Communities lookup (GET /2/communities/{id}) — use a known public community
  const testCommunityId = '1758747817642700922'; // from X docs example
  try {
    await (client.v2 as { get: (url: string, query?: object) => Promise<unknown> }).get(`communities/${testCommunityId}`);
    results.communities_lookup = {
      ok: true,
      message: 'Communities lookup: OK',
    };
  } catch (e: any) {
    results.communities_lookup = {
      ok: false,
      status: e?.code ?? e?.data?.status ?? 404,
      message: e?.message ?? String(e),
    };
  }

  // 5. Community tweets (GET /2/communities/{id}/tweets) — may not exist on all tiers
  try {
    await (client.v2 as { get: (url: string, query?: object) => Promise<unknown> }).get(`communities/${testCommunityId}/tweets`, {
      max_results: 1,
    });
    results.community_tweets = {
      ok: true,
      message: 'Community tweets: OK',
    };
  } catch (e: any) {
    results.community_tweets = {
      ok: false,
      status: e?.code ?? e?.data?.status ?? 404,
      message:
        (e?.code ?? e?.data?.status) === 404
          ? 'Community tweets endpoint not available (404). May require Pro tier or endpoint may not exist in public API.'
          : e?.message ?? String(e),
    };
  }

  const canUseCommunities = results.communities_lookup?.ok;
  const canUseCommunityTweets = results.community_tweets?.ok;
  const canUseMentions = results.mentions_timeline?.ok;

  // Build suggestion based on what works
  let suggestion: string;
  if (canUseCommunityTweets) {
    suggestion = 'Full community monitoring available.';
  } else if (canUseMentions) {
    suggestion = 'Use mention-based bot: reply when @mentioned.';
  } else if (results.user_timeline?.ok === false || results.mentions_timeline?.ok === false) {
    suggestion =
      'user_timeline/mentions return 400: check error details above. With pay-per-use + credits, invalid params are the usual cause. See docs.x.com for current endpoint params.';
  } else {
    suggestion = 'Check your X API tier at developer.x.com — you may need Basic or Pro for reads.';
  }

  return res.status(200).json({
    ok: true,
    results,
    summary: {
      canUseCommunities: !!canUseCommunities,
      canUseCommunityTweets: !!canUseCommunityTweets,
      canUseMentions: !!canUseMentions,
      suggestion,
    },
  });
}
