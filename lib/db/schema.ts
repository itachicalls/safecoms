/**
 * safeComms — Database schema (SQLite via Drizzle)
 * Events, activations, learning data, and metrics.
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const communities = sqliteTable('communities', {
  id: text('id').primaryKey(),
  name: text('name'),
  activatedAt: text('activated_at'),
  activatedBy: text('activated_by'),
  status: text('status').default('inactive'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull(),
  authorId: text('author_id').notNull(),
  authorUsername: text('author_username'),
  authorFollowers: integer('author_followers'),
  text: text('text').notNull(),
  links: text('links'), // JSON array
  rawJson: text('raw_json'),
  createdAt: text('created_at').notNull(),
  ingestedAt: text('ingested_at').default(sql`(datetime('now'))`),
});

export const flags = sqliteTable('flags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: text('post_id').notNull(),
  communityId: text('community_id').notNull(),
  category: text('category').notNull(),
  score: real('score').notNull(),
  signals: text('signals'), // JSON array
  threshold: text('threshold').notNull(),
  botReplyId: text('bot_reply_id'),
  responseTimeMs: integer('response_time_ms'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const learningRecords = sqliteTable('learning_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: text('post_id').notNull(),
  originalCategory: text('original_category').notNull(),
  originalScore: real('original_score').notNull(),
  finalOutcome: text('final_outcome').notNull(),
  appealStatus: text('appeal_status'),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const metricsSnapshots = sqliteTable('metrics_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  flagsCount: integer('flags_count').default(0),
  scamLinks: integer('scam_links').default(0),
  fudAttempts: integer('fud_attempts').default(0),
  impersonators: integer('impersonators').default(0),
  avgResponseTimeMs: integer('avg_response_time_ms'),
  communitiesProtected: integer('communities_protected').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

export const rateLimitLog = sqliteTable('rate_limit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull(),
  action: text('action').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
