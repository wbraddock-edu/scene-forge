import { scenes, type Scene, type InsertScene } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("scene-forge.db");
const db = drizzle(sqlite);

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS scenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    scene_name TEXT NOT NULL,
    scene_number TEXT NOT NULL,
    source_type TEXT NOT NULL,
    profile_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

export interface IStorage {
  createScene(data: InsertScene): Scene;
  getScenesByVisitor(visitorId: string): Scene[];
}

export const storage: IStorage = {
  createScene(data: InsertScene): Scene {
    return db.insert(scenes).values(data).returning().get();
  },
  getScenesByVisitor(visitorId: string): Scene[] {
    return db.select().from(scenes).where(eq(scenes.visitorId, visitorId)).all();
  },
};
