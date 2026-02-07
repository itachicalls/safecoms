/**
 * safeComms — Daily summary cron (00:00 UTC)
 * Auto-post daily report.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getMetricsWindow, storeSnapshot } from '@/lib/services/metrics';
import { postTransparencyReport } from '@/lib/services/bot';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const metrics = await getMetricsWindow(yesterday, now);
    await storeSnapshot(metrics);

    const tweetId = await postTransparencyReport({
      period: '24h',
      scamLinks: metrics.scamLinks,
      fudAttempts: metrics.fudAttempts,
      impersonators: metrics.impersonators,
      avgResponseSec:
        metrics.avgResponseTimeMs != null ? metrics.avgResponseTimeMs / 1000 : undefined,
    });

    return res.status(200).json({
      ok: true,
      tweetId,
      metrics,
    });
  } catch (err) {
    console.error('[cron/daily-summary]', err);
    return res.status(500).json({ error: 'Daily summary failed' });
  }
}
