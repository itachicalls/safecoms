/**
 * safeComms — Activation Model (CRITICAL)
 * Bot MUST NOT auto-activate.
 * Activation: mod posts "@Safe_Coms activate" → verify mod → store → confirm → monitor
 * Deactivation: "@Safe_Coms deactivate"
 */

import { getDb } from '../db';
import { schema } from '../db';
import { eq } from 'drizzle-orm';
import { isCommunityMod } from '../x-api/client';
import { allowUserCommand } from '../abuse/rate-limiter';
import { BOT_HANDLE } from '../x-api/client';

const ACTIVATE_CMD = `@${BOT_HANDLE} activate`;
const DEACTIVATE_CMD = `@${BOT_HANDLE} deactivate`;

export type ActivationResult =
  | { ok: true; message: string }
  | { ok: false; reason: string };

/** Check if post is an activation/deactivation command */
export function parseCommand(text: string): 'activate' | 'deactivate' | null {
  const t = text.trim().toLowerCase();
  if (t.includes(ACTIVATE_CMD.toLowerCase())) return 'activate';
  if (t.includes(DEACTIVATE_CMD.toLowerCase())) return 'deactivate';
  return null;
}

/** Process activation command — returns result for bot reply */
export async function processActivation(
  communityId: string,
  communityName: string | undefined,
  userId: string
): Promise<ActivationResult> {
  if (!allowUserCommand(userId)) {
    return { ok: false, reason: 'Cooldown: wait 1 minute between commands.' };
  }

  const isMod = await isCommunityMod(communityId, userId);
  if (!isMod) {
    return { ok: false, reason: 'Only community mods/admins can activate safeComms.' };
  }

  const db = getDb();
  const existing = db
    .select()
    .from(schema.communities)
    .where(eq(schema.communities.id, communityId))
    .limit(1)
    .all();

  const now = new Date().toISOString();

  if (existing.length > 0) {
    db.update(schema.communities)
      .set({
        status: 'active',
        activatedAt: now,
        activatedBy: userId,
        name: communityName ?? existing[0].name,
      })
      .where(eq(schema.communities.id, communityId))
      .run();
  } else {
    db.insert(schema.communities).values({
      id: communityId,
      name: communityName,
      status: 'active',
      activatedAt: now,
      activatedBy: userId,
    }).run();
  }

  return {
    ok: true,
    message: `🛡️ safeComms activated for this community. Monitoring enabled.`,
  };
}

/** Process deactivation command */
export async function processDeactivation(
  communityId: string,
  userId: string
): Promise<ActivationResult> {
  if (!allowUserCommand(userId)) {
    return { ok: false, reason: 'Cooldown: wait 1 minute between commands.' };
  }

  const isMod = await isCommunityMod(communityId, userId);
  if (!isMod) {
    return { ok: false, reason: 'Only community mods/admins can deactivate safeComms.' };
  }

  const db = getDb();
  db.update(schema.communities)
    .set({ status: 'inactive' })
    .where(eq(schema.communities.id, communityId))
    .run();

  return {
    ok: true,
    message: `🛡️ safeComms deactivated. Monitoring stopped for this community.`,
  };
}
