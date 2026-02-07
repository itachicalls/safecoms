/**
 * safeComms — Learning Loop (SAFE)
 * May learn ONLY by: mod confirmations, overturned flags, phrase variants, bounded confidence.
 * NEVER: free-form self-training, personality drift, tone escalation.
 */

import { getDb } from '../db';
import { schema } from '../db';
import { eq } from 'drizzle-orm';
import type { RiskCategory } from '../types';

export type FinalOutcome = 'confirmed' | 'overturned' | 'appeal_pending';
export type AppealStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** Record learning outcome for a flagged post */
export async function recordOutcome(
  postId: string,
  originalCategory: RiskCategory,
  originalScore: number,
  finalOutcome: FinalOutcome,
  appealStatus?: AppealStatus
): Promise<void> {
  const db = getDb();
  db.insert(schema.learningRecords).values({
    postId,
    originalCategory,
    originalScore,
    finalOutcome,
    appealStatus: appealStatus ?? 'none',
  }).run();
}

/** Get overturned flags for analytics (no self-modification) */
export async function getOverturnedCount(): Promise<number> {
  const db = getDb();
  const rows = db
    .select()
    .from(schema.learningRecords)
    .where(eq(schema.learningRecords.finalOutcome, 'overturned'))
    .all();
  return rows.length;
}
