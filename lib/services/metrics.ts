/**
 * safeComms — Metrics & Transparency
 * Tracks: flags/hour, flags/day, risk breakdown, avg response time, communities protected.
 */

import { getDb } from '../db';
import { schema } from '../db';
import { eq, gte, lte, and } from 'drizzle-orm';

export interface MetricsWindow {
  periodStart: string;
  periodEnd: string;
  flagsCount: number;
  scamLinks: number;
  fudAttempts: number;
  impersonators: number;
  avgResponseTimeMs: number | null;
  communitiesProtected: number;
}

/** Get metrics for a time window */
export async function getMetricsWindow(
  start: Date,
  end: Date
): Promise<MetricsWindow> {
  const db = getDb();

  const startStr = start.toISOString();
  const endStr = end.toISOString();

  const flags = db
    .select()
    .from(schema.flags)
    .where(
      and(
        gte(schema.flags.createdAt, startStr),
        lte(schema.flags.createdAt, endStr)
      )
    )
    .all();

  const scamLinks = flags.filter((f) => f.category === 'scam_link').length;
  const fudAttempts = flags.filter(
    (f) => f.category === 'malicious_fud' || f.category === 'redirect_fud'
  ).length;
  const impersonators = flags.filter((f) => f.category === 'impersonation').length;

  const responseTimes = flags
    .map((f) => f.responseTimeMs)
    .filter((v): v is number => v != null && v > 0);
  const avgResponseTimeMs =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        )
      : null;

  const communities = db
    .select({ id: schema.communities.id })
    .from(schema.communities)
    .where(eq(schema.communities.status, 'active'))
    .all();

  return {
    periodStart: startStr,
    periodEnd: endStr,
    flagsCount: flags.length,
    scamLinks,
    fudAttempts,
    impersonators,
    avgResponseTimeMs,
    communitiesProtected: communities.length,
  };
}

/** Store metrics snapshot for historical reporting */
export async function storeSnapshot(metrics: MetricsWindow): Promise<void> {
  const db = getDb();
  db.insert(schema.metricsSnapshots).values({
    periodStart: metrics.periodStart,
    periodEnd: metrics.periodEnd,
    flagsCount: metrics.flagsCount,
    scamLinks: metrics.scamLinks,
    fudAttempts: metrics.fudAttempts,
    impersonators: metrics.impersonators,
    avgResponseTimeMs: metrics.avgResponseTimeMs,
    communitiesProtected: metrics.communitiesProtected,
  }).run();
}
