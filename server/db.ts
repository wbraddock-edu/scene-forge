import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "@shared/schema";

// Use Railway volume mount path if available, otherwise use /data, fallback to cwd
const dbDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || (fs.existsSync("/data") ? "/data" : ".");
const dbPath = path.join(dbDir, "scene-forge.db");

// Ensure the database directory exists (Railway volume may not be pre-created)
try {
  fs.mkdirSync(dbDir, { recursive: true });
} catch { /* directory may already exist */ }

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'trial',
    google_api_key TEXT,
    openai_api_key TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT,
    subscription_plan TEXT,
    subscription_expires_at TEXT,
    trial_started_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    state_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    scene_name TEXT NOT NULL,
    scene_number TEXT NOT NULL,
    source_type TEXT NOT NULL,
    profile_json TEXT NOT NULL,
    project_id INTEGER,
    created_at TEXT NOT NULL
  )
`);

// Migration: add columns if they don't already exist (safe for existing DBs)
const migrations = [
  `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'trial'`,
  `ALTER TABLE users ADD COLUMN google_api_key TEXT`,
  `ALTER TABLE users ADD COLUMN openai_api_key TEXT`,
  `ALTER TABLE users ADD COLUMN stripe_customer_id TEXT`,
  `ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT`,
  `ALTER TABLE users ADD COLUMN subscription_status TEXT`,
  `ALTER TABLE users ADD COLUMN subscription_plan TEXT`,
  `ALTER TABLE users ADD COLUMN subscription_expires_at TEXT`,
  `ALTER TABLE users ADD COLUMN trial_started_at TEXT`,
  `ALTER TABLE scenes ADD COLUMN project_id INTEGER`,
];

for (const migration of migrations) {
  try { sqlite.exec(migration); } catch { /* column already exists */ }
}

// Set trial_started_at for existing users that don't have it
try {
  sqlite.exec(`UPDATE users SET trial_started_at = created_at WHERE trial_started_at IS NULL`);
} catch { /* ignore */ }

// Set creator role for the app owner
try {
  sqlite.exec(`UPDATE users SET role = 'creator' WHERE email = 'designholistically@gmail.com' AND role != 'creator'`);
} catch { /* ignore */ }

export const db = drizzle(sqlite, { schema });
export { sqlite };
