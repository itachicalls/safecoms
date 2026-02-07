#!/usr/bin/env tsx
/**
 * Push schema to SQLite — creates tables if missing.
 * Run: npm run db:push
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = process.env.DATABASE_PATH || './data/safecomms.db';
const dir = dirname(dbPath);

if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);

const migrations = [
  `CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT,
    activated_at TEXT,
    activated_by TEXT,
    status TEXT DEFAULT 'inactive',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_username TEXT,
    author_followers INTEGER,
    text TEXT NOT NULL,
    links TEXT,
    raw_json TEXT,
    created_at TEXT NOT NULL,
    ingested_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    community_id TEXT NOT NULL,
    category TEXT NOT NULL,
    score REAL NOT NULL,
    signals TEXT,
    threshold TEXT NOT NULL,
    bot_reply_id TEXT,
    response_time_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS learning_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    original_category TEXT NOT NULL,
    original_score REAL NOT NULL,
    final_outcome TEXT NOT NULL,
    appeal_status TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS metrics_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    flags_count INTEGER DEFAULT 0,
    scam_links INTEGER DEFAULT 0,
    fud_attempts INTEGER DEFAULT 0,
    impersonators INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    communities_protected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS rate_limit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flags_community ON flags(community_id)`,
  `CREATE INDEX IF NOT EXISTS idx_flags_created ON flags(created_at)`,
];

for (const sql of migrations) {
  sqlite.exec(sql);
}

console.log('Schema pushed to', dbPath);
sqlite.close();
