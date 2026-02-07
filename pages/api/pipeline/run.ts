/**
 * safeComms — Trigger pipeline run (cron or manual)
 * In production: protect with Vercel Cron secret.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { runPipeline } from '@/lib/pipeline/processor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await runPipeline();
    return res.status(200).json(result);
  } catch (err) {
    console.error('[pipeline]', err);
    return res.status(500).json({ error: 'Pipeline failed' });
  }
}
