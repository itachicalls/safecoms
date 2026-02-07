import type { NextApiRequest, NextApiResponse } from 'next';
import { desc } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getDb } = await import('@/lib/db');
    const { schema } = await import('@/lib/db');
    const db = getDb();
    const rows = db
      .select()
      .from(schema.flags)
      .orderBy(desc(schema.flags.createdAt))
      .limit(100)
      .all();
    return res.status(200).json({
      flags: rows.map((r) => ({
        id: r.id,
        postId: r.postId,
        communityId: r.communityId,
        category: r.category,
        score: r.score,
        threshold: r.threshold,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error('[api/flags]', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
