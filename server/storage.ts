import { scenes, users, authSessions, projects, type Scene, type InsertScene, type User, type InsertUser, type Project, type InsertProject } from "@shared/schema";
import { db, sqlite } from "./db";
import { eq, and, desc } from "drizzle-orm";

// ── User CRUD ──

export function createUser(data: InsertUser): User {
  return db.insert(users).values(data).returning().get();
}

export function getUserByEmail(email: string): User | undefined {
  return db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).get();
}

export function getUserById(id: number): User | undefined {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function updateUser(id: number, data: Partial<Omit<User, "id">>): void {
  db.update(users).set(data).where(eq(users.id, id)).run();
}

// ── Session CRUD ──

export function createSession(userId: number, token: string, expiresAt: string): void {
  const now = new Date().toISOString();
  db.insert(authSessions).values({ userId, token, expiresAt, createdAt: now }).run();
}

export function getSessionByToken(token: string): typeof authSessions.$inferSelect | undefined {
  return db.select().from(authSessions).where(eq(authSessions.token, token)).get();
}

export function deleteSession(token: string): void {
  db.delete(authSessions).where(eq(authSessions.token, token)).run();
}

// ── Project CRUD ──

export function createProject(userId: number, name: string): Project {
  const now = new Date().toISOString();
  return db.insert(projects).values({
    userId,
    name: name.trim(),
    stateJson: null,
    createdAt: now,
    updatedAt: now,
  }).returning().get();
}

export function getProjectsByUserId(userId: number): Project[] {
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.id)).all();
}

export function getProjectById(id: number, userId: number): Project | undefined {
  return db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).get();
}

export function updateProject(id: number, userId: number, data: { name?: string; stateJson?: string }): void {
  const now = new Date().toISOString();
  db.update(projects).set({ ...data, updatedAt: now }).where(and(eq(projects.id, id), eq(projects.userId, userId))).run();
}

export function deleteProject(id: number, userId: number): void {
  db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).run();
}

export function renameProject(id: number, userId: number, name: string): void {
  const now = new Date().toISOString();
  db.update(projects).set({ name: name.trim(), updatedAt: now }).where(and(eq(projects.id, id), eq(projects.userId, userId))).run();
}

// ── Scene CRUD ──

export interface IStorage {
  createScene(data: InsertScene): Scene;
  getScenesByVisitor(visitorId: string): Scene[];
  getScenesByProject(projectId: number): Scene[];
}

export const storage: IStorage = {
  createScene(data: InsertScene): Scene {
    return db.insert(scenes).values(data).returning().get();
  },
  getScenesByVisitor(visitorId: string): Scene[] {
    return db.select().from(scenes).where(eq(scenes.visitorId, visitorId)).all();
  },
  getScenesByProject(projectId: number): Scene[] {
    return db.select().from(scenes).where(eq(scenes.projectId, projectId)).all();
  },
};
