import type { NextApiRequest, NextApiResponse } from 'next';

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
    const rows = db.select().from(schema.communities).all();
    return res.status(200).json({
      communities: rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status ?? 'inactive',
        activatedAt: r.activatedAt,
      })),
    });
  } catch (err) {
    console.error('[api/communities]', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
