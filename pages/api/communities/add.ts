/**
 * safeComms — Add / activate a community for testing
 * POST with { communityId: string, name?: string }
 * Use this to add your X Community so the pipeline will ingest from it.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { communityId, name } = req.body ?? {};
  if (!communityId || typeof communityId !== 'string') {
    return res.status(400).json({ error: 'communityId required' });
  }

  try {
    const { getDb } = await import('@/lib/db');
    const { schema } = await import('@/lib/db');
    const db = getDb();

    const existing = db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.id, communityId))
      .all();

    const now = new Date().toISOString();

    if (existing.length > 0) {
      db.update(schema.communities)
        .set({
          status: 'active',
          activatedAt: now,
          name: name ?? existing[0].name,
        })
        .where(eq(schema.communities.id, communityId))
        .run();
    } else {
      db.insert(schema.communities)
        .values({
          id: communityId,
          name: name ?? null,
          status: 'active',
          activatedAt: now,
          activatedBy: 'manual-test',
        })
        .run();
    }

    return res.status(200).json({
      ok: true,
      message: `Community ${communityId} activated. Pipeline will ingest from it.`,
    });
  } catch (err) {
    console.error('[api/communities/add]', err);
    return res.status(500).json({ error: 'Failed to add community' });
  }
}
