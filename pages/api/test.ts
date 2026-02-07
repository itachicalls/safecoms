/**
 * safeComms — Test endpoint
 * Runs sample text through risk engine + LLM reply (no X posting).
 * Use this to verify risk detection and OpenAI key work.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { assessPost } from '@/lib/risk/engine';
import { generateReply } from '@/lib/llm/reasoning';
import type { NormalizedPost } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const text = (req.query.text as string) ?? req.body?.text ?? 'dev is selling, rotate into the new contract';
  const samplePost: NormalizedPost = {
    post_id: 'test-' + Date.now(),
    author_id: 'test-author',
    author_metadata: { username: 'testuser', follower_count: 100 },
    text,
    links: [],
    timestamp: new Date().toISOString(),
    community_id: 'test-community',
  };

  try {
    const assessment = assessPost(samplePost);
    let reply = '';
    let llmUsed = false;

    if (assessment) {
      reply = await generateReply(assessment.category, text);
      llmUsed = !!process.env.OPENAI_API_KEY;
    }

    return res.status(200).json({
      ok: true,
      input: { text },
      risk: assessment
        ? {
            category: assessment.category,
            score: assessment.score,
            threshold: assessment.threshold,
            signals: assessment.signals,
          }
        : null,
      reply: assessment ? reply : null,
      llmUsed,
      message: assessment
        ? 'Risk detected. Reply would be posted if this were a real X post.'
        : 'No risk detected for this text.',
    });
  } catch (err) {
    console.error('[api/test]', err);
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Test failed',
    });
  }
}
