/**
 * safeComms — 6-hour transparency report cron
 * Auto-post report every 6 hours.
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
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const metrics = await getMetricsWindow(sixHoursAgo, now);
    await storeSnapshot(metrics);

    const tweetId = await postTransparencyReport({
      period: '6h',
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
    console.error('[cron/metrics-report]', err);
    return res.status(500).json({ error: 'Metrics report failed' });
  }
}
