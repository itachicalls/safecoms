/**
 * safeComms — X (Twitter) API Client
 * Uses v2 API with OAuth 1.0a user context for community monitoring.
 * Requires: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 */

import { TwitterApi } from 'twitter-api-v2';
import type { NormalizedPost } from '../types';

const BOT_HANDLE = 'Safe_Coms';

function getClient(): TwitterApi {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Missing X API credentials. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET');
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });
}

/** Normalize raw tweet/post into our standard format */
function normalizePost(
  raw: { id_str: string; user?: { id_str: string; screen_name?: string; followers_count?: number }; text?: string; created_at?: string },
  communityId: string,
  entities?: { urls?: { expanded_url?: string }[] }
): NormalizedPost {
  const urls = entities?.urls?.map((u) => u.expanded_url || '').filter(Boolean) ?? [];
  return {
    post_id: raw.id_str,
    author_id: raw.user?.id_str ?? '',
    author_metadata: {
      username: raw.user?.screen_name,
      follower_count: raw.user?.followers_count,
    },
    text: raw.text ?? '',
    links: urls,
    timestamp: raw.created_at ? new Date(raw.created_at).toISOString() : new Date().toISOString(),
    community_id: communityId,
  };
}

/** Fetch tweet by ID (for reply-to lookup) */
export async function fetchTweetById(tweetId: string): Promise<{
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  entities?: { urls?: { expanded_url?: string }[] };
} | null> {
  let client: TwitterApi;
  try {
    client = getClient();
  } catch {
    return null;
  }
  try {
    const res = await client.v2.singleTweet(tweetId, {
      'tweet.fields': 'created_at,author_id,entities',
      expansions: 'author_id',
      'user.fields': 'username,public_metrics',
    });
    const t = res.data;
    if (!t) return null;
    return {
      id: t.id,
      text: t.text ?? '',
      author_id: t.author_id,
      created_at: t.created_at,
      entities: t.entities as { urls?: { expanded_url?: string }[] } | undefined,
    };
  } catch (err) {
    console.error('[X-API] Tweet fetch failed:', err);
    return null;
  }
}

/** Mention with the original (replied-to) post to assess */
export interface MentionWithOriginal {
  replyToPostId: string;
  replyToAuthorId: string;
  replyToText: string;
  replyToCreatedAt?: string;
  replyToUsername?: string;
  replyToFollowerCount?: number;
  replyToLinks?: string[];
}

/** Fetch recent mentions of @Safe_Coms — used for mention-based workflow when community tweets unavailable */
export async function fetchMentionsTimeline(): Promise<MentionWithOriginal[]> {
  let client: TwitterApi;
  try {
    client = getClient();
  } catch {
    return [];
  }
  try {
    const me = await client.v2.me();
    const userId = me.data.id;
    const res = await (client.v2 as { get: (path: string, params?: object, opts?: { params?: object }) => Promise<{
      data?: Array<{ id: string; author_id?: string; referenced_tweets?: Array<{ type: string; id: string }> }>;
      includes?: {
        tweets?: Array<{ id: string; author_id?: string; text?: string; created_at?: string; entities?: { urls?: { expanded_url?: string }[] } }>;
        users?: Array<{ id: string; username?: string; public_metrics?: { followers_count?: number } }>;
      };
    }> }).get(
      'users/:id/mentions',
      {
        max_results: 20,
        'tweet.fields': 'created_at,author_id,referenced_tweets,entities',
        expansions: 'referenced_tweets.id,author_id',
        'user.fields': 'username,public_metrics',
      },
      { params: { id: userId } }
    );
    const tweets = res?.data ?? [];
    const includedTweets = res?.includes?.tweets ?? [];
    const includedUsers = res?.includes?.users ?? [];
    const out: MentionWithOriginal[] = [];

    for (const t of tweets) {
      const repliedTo = t.referenced_tweets?.find((r) => r.type === 'replied_to');
      if (!repliedTo) continue;
      const original = includedTweets.find((inc) => inc.id === repliedTo.id);
      if (!original?.author_id) continue;
      const authorUser = includedUsers.find((u) => u.id === original.author_id);
      const links = original.entities?.urls?.map((u) => u.expanded_url || '').filter(Boolean) ?? [];
      out.push({
        replyToPostId: original.id,
        replyToAuthorId: original.author_id,
        replyToText: original.text ?? '',
        replyToCreatedAt: original.created_at,
        replyToUsername: authorUser?.username,
        replyToFollowerCount: authorUser?.public_metrics?.followers_count,
        replyToLinks: links,
      });
    }
    return out;
  } catch (err) {
    console.error('[X-API] Mentions fetch failed:', err);
    return [];
  }
}

/** Fetch recent posts from a community timeline (latency target <5s) */
export async function fetchCommunityTimeline(communityId: string): Promise<NormalizedPost[]> {
  let client: TwitterApi;
  try {
    client = getClient();
  } catch {
    return [];
  }

  // X API v2 Communities: GET /2/communities/:id/tweets (requires elevated/pro)
  // See README for API tier requirements.
  try {
    const res = await (client.v2 as unknown as { get: (path: string, params?: object) => Promise<{ data?: { data?: unknown[] } }> }).get(
      `communities/${communityId}/tweets`,
      {
      max_results: 50,
      'tweet.fields': 'created_at,author_id,entities',
      'user.fields': 'public_metrics,created_at',
      expansions: 'author_id',
    } as object);

    const tweets = (res?.data?.data ?? []) as Record<string, unknown>[];
    return tweets.map((t) =>
      normalizePost(
        {
          id_str: String(t.id ?? ''),
          user: t.author_id
            ? {
                id_str: String((t as { author_id?: string }).author_id ?? ''),
                screen_name: (t as { author?: { username?: string } }).author?.username,
                followers_count: (t as { author?: { public_metrics?: { followers_count?: number } } }).author?.public_metrics?.followers_count,
              }
            : undefined,
          text: String(t.text ?? ''),
          created_at: String(t.created_at ?? ''),
        },
        communityId,
        t.entities as { urls?: { expanded_url?: string }[] }
      )
    );
  } catch (err) {
    console.error('[X-API] Community timeline fetch failed:', err);
    return [];
  }
}

export interface ReplyResult {
  id: string | null;
  error?: string;
}

/** Reply to a post (bot engine) */
export async function replyToPost(postId: string, authorId: string, text: string): Promise<ReplyResult> {
  const client = getClient();
  try {
    const res = await client.v2.reply(text, postId);
    return { id: res.data?.id ?? null };
  } catch (err: any) {
    const detail = err?.data?.errors?.[0] ?? err?.data ?? err;
    const msg = detail?.message ?? err?.message ?? String(err);
    console.error('[X-API] Reply failed:', msg);
    return { id: null, error: msg };
  }
}

/** Post a standalone tweet (transparency report) */
export async function postTweet(text: string): Promise<string | null> {
  const client = getClient();
  try {
    const res = await client.v2.tweet({ text });
    return res.data?.id ?? null;
  } catch (err) {
    console.error('[X-API] Tweet failed:', err);
    return null;
  }
}

/** Check if user is mod/admin of community */
export async function isCommunityMod(communityId: string, userId: string): Promise<boolean> {
  const client = getClient();
  try {
    const res = await client.v2.get(`communities/${communityId}/members`, {
      'user.fields': 'id',
    });
    const members = (res.data as { data?: { id?: string; role?: string }[] })?.data ?? [];
    const member = members.find((m) => m.id === userId);
    return member?.role === 'admin' || member?.role === 'moderator' || false;
  } catch {
    return false;
  }
}

export { BOT_HANDLE };
