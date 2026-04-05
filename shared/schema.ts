import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Auth & User Tables ──

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("trial"),
  googleApiKey: text("google_api_key"),
  openaiApiKey: text("openai_api_key"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  subscriptionPlan: text("subscription_plan"),
  subscriptionExpiresAt: text("subscription_expires_at"),
  trialStartedAt: text("trial_started_at"),
  createdAt: text("created_at").notNull(),
});

export const authSessions = sqliteTable("auth_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  stateJson: text("state_json"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── App Tables ──

export const scenes = sqliteTable("scenes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitorId: text("visitor_id").notNull(),
  sceneName: text("scene_name").notNull(),
  sceneNumber: text("scene_number").notNull(),
  sourceType: text("source_type").notNull(),
  profileJson: text("profile_json").notNull(),
  projectId: integer("project_id"),
  createdAt: text("created_at").notNull(),
});

export const insertSceneSchema = createInsertSchema(scenes).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
});

export type InsertScene = z.infer<typeof insertSceneSchema>;
export type Scene = typeof scenes.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Detected scene from manuscript scan
export const detectedSceneSchema = z.object({
  sceneName: z.string(),
  sceneNumber: z.string(),
  location: z.string(),
  timeOfDay: z.string(),
  charactersPresentList: z.string(),
  briefSummary: z.string(),
  estimatedLength: z.enum(["short", "medium", "long"]),
});

export type DetectedScene = z.infer<typeof detectedSceneSchema>;

// 10-Section Scene Development Profile
export const sceneProfileSchema = z.object({
  // Section 1 - Scene Identity
  sceneName: z.string(),
  sceneNumber: z.string(),
  logline: z.string(),
  location: z.string(),
  timeOfDay: z.string(),
  durationEstimate: z.string(),
  sceneType: z.string(),

  // Section 2 - Dramatic Purpose
  narrativePurpose: z.string(),
  audienceLearns: z.string(),
  emotionalArc: z.string(),
  connectionToPreviousScene: z.string(),
  connectionToNextScene: z.string(),

  // Section 3 - Characters Present
  charactersAndObjectives: z.string(),
  emotionalStateEntering: z.string(),
  emotionalStateExiting: z.string(),
  powerDynamics: z.string(),
  keyRelationshipBeats: z.string(),

  // Section 4 - Dialogue & Subtext
  keyDialogueBeats: z.string(),
  saidVsMeant: z.string(),
  significantSilences: z.string(),
  verbalConflictPoints: z.string(),
  dialogueTone: z.string(),

  // Section 5 - Action & Blocking
  physicalMovement: z.string(),
  stagingPositions: z.string(),
  keyGestures: z.string(),
  choreographyNotes: z.string(),
  entrancesExits: z.string(),

  // Section 6 - Shot List
  shotListDetailed: z.string(),

  // Section 7 - Lighting & Atmosphere
  lightingSetup: z.string(),
  colorTemperature: z.string(),
  mood: z.string(),
  timeOfDayEffects: z.string(),
  shadowsContrast: z.string(),
  practicalLights: z.string(),

  // Section 8 - Sound Design
  ambientSound: z.string(),
  dialogueRecordingNotes: z.string(),
  soundEffects: z.string(),
  musicCues: z.string(),
  silenceBeats: z.string(),
  diegeticVsNondiegetic: z.string(),

  // Section 9 - VFX & Technical
  practicalEffects: z.string(),
  cgiRequirements: z.string(),
  greenScreenNeeds: z.string(),
  propsSpecialHandling: z.string(),
  safetyConsiderations: z.string(),

  // Section 10 - Emotional & Thematic
  underlyingTension: z.string(),
  thematicResonance: z.string(),
  foreshadowing: z.string(),
  callbacks: z.string(),
  symbolicElements: z.string(),
  directorNotes: z.string(),

  // Visual Study Prompts (5 AI-generated)
  visualMasterShot: z.string(),
  visualDramaticMoment: z.string(),
  visualCharacterCoverage: z.string(),
  visualDetailInsert: z.string(),
  visualLightingStudy: z.string(),
});

export type SceneProfile = z.infer<typeof sceneProfileSchema>;

// API request schemas
export const scanRequestSchema = z.object({
  text: z.string().min(50, "Please provide at least 50 characters of text"),
  sourceType: z.enum(["screenplay", "prose"]),
  provider: z.enum(["openai", "anthropic", "google"]),
  apiKey: z.string().min(1, "API key is required"),
});

export type ScanRequest = z.infer<typeof scanRequestSchema>;

export const analyzeRequestSchema = z.object({
  text: z.string().min(50),
  sourceType: z.enum(["screenplay", "prose"]),
  provider: z.enum(["openai", "anthropic", "google"]),
  apiKey: z.string().min(1),
  sceneName: z.string().min(1, "Scene name is required"),
  sceneNumber: z.string().min(1, "Scene number is required"),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const ART_STYLES = [
  { id: "cinematic", name: "Cinematic Concept Art", prompt: "STRICT STYLE LOCK: cinematic concept art. Every panel MUST use the same semi-realistic digital painting style with dramatic cinematic lighting, visible brushwork, rich color grading, and film-production quality. Do NOT switch to photorealistic rendering or flat illustration for any panel. Maintain this exact rendering approach regardless of subject matter — close-ups, full body, and environments all use the same painterly cinematic look" },
  { id: "photorealistic", name: "Photorealistic", prompt: "STRICT STYLE LOCK: photorealistic. Every panel MUST look like a real photograph — hyperrealistic skin textures, real-world lighting, studio photography quality, shallow depth of field, 8K detail. Do NOT switch to illustrated, painted, or stylized rendering for any panel. Turnarounds, expressions, poses, and close-ups must ALL look like real photographs of the same person" },
  { id: "pixar", name: "Pixar / 3D Animation", prompt: "STRICT STYLE LOCK: Pixar 3D animation style. Every panel MUST look like a Pixar/Disney 3D rendered frame — smooth subsurface scattering skin, soft rounded features, slightly exaggerated proportions, warm global illumination. Do NOT mix in photorealistic or 2D styles. All panels must look like they came from the same animated film" },
  { id: "anime", name: "Anime / Manga", prompt: "STRICT STYLE LOCK: anime art style. Every panel MUST use consistent anime/manga rendering — clean sharp linework, cel-shaded flat coloring with subtle gradients, large expressive eyes, Japanese animation production quality. Do NOT switch to realistic or Western illustration style for any panel. Turnarounds, close-ups, and scenes all use the same anime look" },
  { id: "3d-render", name: "3D Render / Game Art", prompt: "STRICT STYLE LOCK: 3D game character render. Every panel MUST look like Unreal Engine 5 real-time rendering — PBR materials, subsurface scattering, volumetric lighting, AAA game quality. Do NOT switch to 2D illustration or painterly styles. All panels look like in-engine screenshots from the same game" },
  { id: "2d-illustration", name: "2D Illustration", prompt: "STRICT STYLE LOCK: 2D digital illustration. Every panel MUST use clean vector-like linework with flat color and subtle cel-shading — modern character design sheet aesthetic, graphic novel quality. Do NOT switch to photorealistic or 3D rendering for any panel. Close-ups, full body, and environments all use the same flat illustrated look" },
  { id: "comic-book", name: "Comic Book", prompt: "STRICT STYLE LOCK: comic book art. Every panel MUST use bold ink outlines, dynamic hatching and crosshatching, vivid saturated colors, comic book panel composition. Do NOT switch to photorealistic or soft painted styles. All panels look like pages from the same comic book" },
  { id: "watercolor", name: "Watercolor", prompt: "STRICT STYLE LOCK: watercolor painting. Every panel MUST show loose expressive brushwork, visible paper texture, soft color bleeds and washes, luminous transparent layers. Do NOT switch to digital, photorealistic, or hard-edged styles. All panels look like paintings from the same watercolor artist" },
  { id: "oil-painting", name: "Oil Painting", prompt: "STRICT STYLE LOCK: classical oil painting. Every panel MUST show rich impasto brushwork, chiaroscuro lighting, warm glazing layers, canvas texture visible, Renaissance-quality portraiture. Do NOT switch to digital, photorealistic photography, or flat illustration. All panels look like paintings in the same classical tradition" },
  { id: "concept-art", name: "Concept Art / Matte", prompt: "STRICT STYLE LOCK: entertainment concept art. Every panel MUST use painterly digital style with visible brushstrokes, atmospheric perspective, matte painting quality, loose but intentional rendering. Do NOT switch to tight photorealistic or flat 2D styles. All panels look like production paintings from the same concept artist" },
] as const;

export type ArtStyleId = typeof ART_STYLES[number]["id"];

export const generateImageRequestSchema = z.object({
  prompt: z.string(),
  style: z.string().optional(),
  referenceImages: z.array(z.string()).optional(),
  provider: z.enum(["openai", "google"]),
  apiKey: z.string().min(1),
});

export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;
