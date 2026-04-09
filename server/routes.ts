import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { storage, createUser, getUserByEmail, getUserById, createSession, getSessionByToken, deleteSession, createProject, getProjectsByUserId, getProjectById, updateProject, deleteProject, renameProject } from "./storage";
import { db, sqlite } from "./db";
import { registerStripeRoutes } from "./stripe";
import { users, authSessions, projects } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  scanRequestSchema,
  analyzeRequestSchema,
  generateImageRequestSchema,
  type SceneProfile,
  type DetectedScene,
} from "@shared/schema";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  BorderStyle,
  AlignmentType,
} from "docx";

// Extend Express Request to carry authenticated userId
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

// ── Auth Middleware ──

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check Authorization header (Bearer token) or cookie
  let token: string | undefined;

  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (req.cookies?.sessionToken) {
    token = req.cookies.sessionToken;
  } else if (req.headers["x-session-token"]) {
    const h = req.headers["x-session-token"];
    token = Array.isArray(h) ? h[0] : h;
  }

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = getSessionByToken(token);
  if (!session || new Date(session.expiresAt) < new Date()) {
    return res.status(401).json({ error: "Session expired or invalid" });
  }

  req.userId = session.userId;
  next();
}

// ── AI Provider Abstraction ──

/** Sleep helper for retry backoff */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Determine if an error is retryable (rate limit, server error, blocked response) */
function isRetryableError(err: any): boolean {
  const msg = String(err?.message || "");
  return (
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("rate") ||
    msg.includes("empty response") ||
    msg.includes("blocked") ||
    msg.includes("SAFETY") ||
    msg.includes("no candidates")
  );
}

/** Single attempt to call a text AI provider (no retries) */
async function callTextAISingle(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error: ${res.status} - ${err}`);
    }
    const data = await res.json();
    return data.content[0].text;
  } else if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8192,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} - ${err}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  } else if (provider === "google") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
          ],
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google AI API error: ${res.status} - ${err}`);
    }
    const data = await res.json();

    // Check for blocked content via promptFeedback
    if (data.promptFeedback?.blockReason) {
      throw new Error(
        `Google AI blocked the request (${data.promptFeedback.blockReason}). ` +
        `This scene may contain content that triggers safety filters. Try rephrasing or using a different provider.`
      );
    }

    // Check candidates exist
    if (!data.candidates || !data.candidates[0]) {
      throw new Error("Google AI returned empty response — no candidates found. The request may have been blocked by content filters.");
    }

    // Check for finish reason indicating safety block
    const finishReason = data.candidates[0].finishReason;
    if (finishReason === "SAFETY") {
      throw new Error(
        "Google AI blocked this scene due to safety filters. " +
        "Scenes with conflict or crisis content may trigger this. Try a different AI provider for this scene."
      );
    }

    if (!data.candidates[0].content) {
      throw new Error(
        `Google AI returned no content (finishReason: ${finishReason || "unknown"}). ` +
        `The response may have been filtered. Try again or use a different provider.`
      );
    }

    return data.candidates[0].content.parts[0].text;
  }
  throw new Error(`Unknown provider: ${provider}`);
}

/** Call text AI with retry logic (3 attempts, exponential backoff starting at 2s) */
async function callTextAI(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const maxRetries = 3;
  const baseDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callTextAISingle(provider, apiKey, systemPrompt, userPrompt);
    } catch (err: any) {
      const isLast = attempt === maxRetries;
      const retryable = isRetryableError(err);

      if (isLast || !retryable) {
        throw err;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1); // 2s, 4s, 8s
      console.warn(`callTextAI attempt ${attempt} failed (retryable), retrying in ${delay}ms:`, err.message);
      await sleep(delay);
    }
  }

  throw new Error("callTextAI: unexpected code path");
}

async function callImageAI(
  provider: string,
  apiKey: string,
  prompt: string,
  referenceImages?: string[]
): Promise<string> {
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI Image API error: ${res.status} - ${err}`);
    }
    const data = await res.json();
    return data.data[0].b64_json;
  } else if (provider === "google") {
    const parts: any[] = [];
    const hasRefs = referenceImages && referenceImages.length > 0;

    if (hasRefs) {
      const refCount = referenceImages.length;
      parts.push({
        text: `Using these ${refCount} scene reference image${refCount > 1 ? "s" : ""} as the visual anchor for consistency (maintain the EXACT same environment, lighting, color palette, and style across all outputs), generate: ${prompt}`,
      });
      for (const refImg of referenceImages) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: refImg,
          },
        });
      }
    } else {
      parts.push({ text: `Generate an image: ${prompt}` });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Image API error: ${res.status} - ${err}`);
    }
    const data = await res.json();
    const responseParts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = responseParts.find((p: any) => p.inlineData);
    if (!imagePart) throw new Error("No image returned from Google AI");
    return imagePart.inlineData.data;
  }
  throw new Error(
    `Image generation not supported for provider: ${provider}. Use OpenAI or Google.`
  );
}

// ── Prompt Templates ──

const SCAN_SYSTEM_PROMPT = `You are a professional screenplay breakdown artist and script supervisor. Analyze the provided text and identify all distinct SCENES. A scene changes when there is a change in location, a significant time jump, or a major dramatic beat shift.

For each scene, provide:
- sceneName: a descriptive name for the scene (e.g., "The Warehouse Confrontation", "Morning at the Café")
- sceneNumber: sequential number as a string ("1", "2", "3", etc.)
- location: where the scene takes place (INT./EXT. + specific location)
- timeOfDay: "DAY", "NIGHT", "DAWN", "DUSK", "CONTINUOUS", etc.
- charactersPresentList: comma-separated list of characters in this scene
- briefSummary: 1-3 sentence summary of what happens
- estimatedLength: "short" (under 1 page/minute), "medium" (1-3 pages/minutes), or "long" (3+ pages/minutes)

Return ONLY a JSON object with this exact structure:
{
  "scenes": [
    { "sceneName": "...", "sceneNumber": "...", "location": "...", "timeOfDay": "...", "charactersPresentList": "...", "briefSummary": "...", "estimatedLength": "short|medium|long" }
  ]
}

Sort by scene order (scene 1 first). Be thorough — identify EVERY scene break.`;

function buildAnalyzePrompt(sceneName: string, sceneNumber: string, sourceType: string): string {
  return `You are an expert film/TV scene breakdown analyst and assistant director. You will analyze the provided text and create a comprehensive scene development profile for the scene "${sceneName}" (Scene #${sceneNumber}).

This text is a ${sourceType === "screenplay" ? "screenplay or script" : "prose manuscript or excerpt"}.

Fill in EVERY field with rich, specific detail drawn from the text. Where the text doesn't explicitly state something, make intelligent inferences consistent with what IS stated. For fields where the text provides no basis for inference, write "[Not enough information — consider developing this area]".

For the 5 legacy visual study fields (visualMasterShot, visualDramaticMoment, visualCharacterCoverage, visualDetailInsert, visualLightingStudy), create detailed AI image generation prompts. Each prompt must describe this specific scene with its exact setting, characters, lighting, and mood. Make every prompt vivid, specific, and production-ready — these are meant to generate a complete scene visual study like a film storyboard artist would create.

IMPORTANT: You must also generate a "visualShotPrompts" field. This is a JSON-encoded string containing an array of objects — one for EACH shot in the shotListDetailed field. Each object must have:
  - "shotNumber": the shot number (integer, starting at 1)
  - "label": a short label like "WIDE — Establishing the courtroom" (shot type + brief description, max ~40 chars)
  - "sublabel": "Shot #N" where N is the shot number
  - "prompt": a detailed AI image generation prompt for this specific shot. Use the shot's type, framing, camera movement, and purpose to craft a vivid, specific image prompt describing exactly what this frame would look like. Include location, characters, lighting, composition, and mood.
The number of entries in this array MUST exactly match the number of shots in shotListDetailed. This array drives the visual study panel grid.

Return ONLY a JSON object matching this exact structure (all values are strings):
{
  "sceneName": "${sceneName}",
  "sceneNumber": "${sceneNumber}",
  "logline": "One-line description of what this scene is about",
  "location": "Full location description",
  "timeOfDay": "...",
  "durationEstimate": "Estimated screen time",
  "sceneType": "e.g., Exposition, Confrontation, Chase, Intimate, Montage, etc.",

  "narrativePurpose": "Why this scene exists in the story",
  "audienceLearns": "What the audience discovers or learns",
  "emotionalArc": "The emotional journey within this scene",
  "connectionToPreviousScene": "How it flows from the previous scene",
  "connectionToNextScene": "How it sets up the next scene",

  "charactersAndObjectives": "Each character and what they want in this scene",
  "emotionalStateEntering": "How characters feel arriving",
  "emotionalStateExiting": "How characters feel leaving",
  "powerDynamics": "Who has power and how it shifts",
  "keyRelationshipBeats": "Critical relationship moments",

  "keyDialogueBeats": "Most important lines and exchanges",
  "saidVsMeant": "Subtext analysis — what's really being communicated",
  "significantSilences": "Meaningful pauses or unspoken moments",
  "verbalConflictPoints": "Where dialogue becomes confrontational",
  "dialogueTone": "Overall verbal register and rhythm",

  "physicalMovement": "How characters move through the space",
  "stagingPositions": "Where characters are positioned relative to each other",
  "keyGestures": "Important physical actions and body language",
  "choreographyNotes": "Any choreographed action or movement",
  "entrancesExits": "How characters enter and leave the scene",

  "shotListDetailed": "A numbered shot list: for each shot include Shot #, type (WIDE/MED/CU/ECU/OTS/INSERT/etc.), camera movement (STATIC/PAN/TILT/DOLLY/CRANE/STEADICAM/etc.), lens suggestion, framing notes, estimated duration, and purpose. Include at least 8-12 shots covering the full scene.",

  "lightingSetup": "Key, fill, and backlight setup",
  "colorTemperature": "Warm/cool/mixed color temperature",
  "mood": "The visual mood this lighting creates",
  "timeOfDayEffects": "How time of day affects the lighting",
  "shadowsContrast": "Shadow quality and contrast ratio",
  "practicalLights": "Any in-scene light sources (lamps, screens, fire, etc.)",

  "ambientSound": "Environmental audio bed",
  "dialogueRecordingNotes": "ADR needs, boom vs lav considerations",
  "soundEffects": "Specific SFX needed",
  "musicCues": "Score direction and music placement",
  "silenceBeats": "Moments where silence is used dramatically",
  "diegeticVsNondiegetic": "Which sounds are in-world vs overlay",

  "practicalEffects": "On-set physical effects needed",
  "cgiRequirements": "Digital effects or compositing",
  "greenScreenNeeds": "Chroma key requirements",
  "propsSpecialHandling": "Props that need special attention",
  "safetyConsiderations": "Stunts, pyro, or safety concerns",

  "underlyingTension": "What tension runs beneath the surface",
  "thematicResonance": "How this scene echoes the story's themes",
  "foreshadowing": "What this scene hints at for the future",
  "callbacks": "References to earlier scenes or setups",
  "symbolicElements": "Symbols, metaphors, visual motifs",
  "directorNotes": "Additional creative notes for the director",

  "visualMasterShot": "A detailed prompt for generating a wide establishing shot of this scene. Include exact location details, time of day, lighting conditions, character positions, set dressing, and atmosphere. Art style: cinematic storyboard frame, widescreen composition.",
  "visualDramaticMoment": "A detailed prompt for the most emotionally charged frame of this scene. Capture the peak dramatic moment — facial expressions, body language, spatial relationships. Art style: dramatic cinematic still, high contrast.",
  "visualCharacterCoverage": "A detailed prompt for a medium/OTS shot showing character interactions. Include specific character details, eyeline direction, and emotional quality. Art style: film coverage shot, natural lighting.",
  "visualDetailInsert": "A detailed prompt for a close-up insert shot of a critical prop, gesture, or detail that carries meaning in this scene. Art style: cinematic macro/detail shot.",
  "visualLightingStudy": "A detailed prompt showcasing the scene's atmosphere through its lighting. Emphasize color temperature, shadow patterns, light sources, and how light sculpts the environment and faces. Art style: atmospheric lighting study, production design reference.",

  "visualShotPrompts": "[{\"shotNumber\":1,\"label\":\"WIDE — Establishing description\",\"sublabel\":\"Shot #1\",\"prompt\":\"Detailed image prompt for shot 1...\"},{\"shotNumber\":2,\"label\":\"MED — Character description\",\"sublabel\":\"Shot #2\",\"prompt\":\"Detailed image prompt for shot 2...\"},...one entry per shot in the shot list]"
}`;
}

// ── DOCX Generation ──

const VISUAL_PANEL_NAMES: Record<string, string> = {
  masterShot: "1. Master Shot — Establishing",
  dramaticMoment: "2. Key Moment — Drama",
  characterCoverage: "3. Character Coverage — Performance",
  detailInsert: "4. Detail Insert — Focus",
  lightingStudy: "5. Lighting Study — Mood",
  customScene: "6. Custom Scene — Director's Shot",
};

function buildDocx(profile: SceneProfile, imageBuffers?: Record<string, Buffer>): Promise<Buffer> {
  const sectionHeader = (text: string, num: number) =>
    new Paragraph({
      children: [
        new TextRun({
          text: `SECTION ${num}  ·  ${text}`,
          bold: true,
          size: 28,
          font: "Calibri",
          color: "1a1a2e",
        }),
      ],
      spacing: { before: 400, after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
      },
    });

  const fieldLabel = (label: string) =>
    new TextRun({ text: label, bold: true, size: 22, font: "Calibri" });

  const fieldValue = (value: string) =>
    new TextRun({ text: value, size: 22, font: "Calibri" });

  const fieldParagraph = (label: string, value: string) =>
    new Paragraph({
      children: [fieldLabel(`${label}: `), fieldValue(value || "—")],
      spacing: { after: 120 },
    });

  const emptyLine = () => new Paragraph({ spacing: { after: 100 } });

  const children: any[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: "SCENE DEVELOPMENT PROFILE",
          bold: true,
          size: 36,
          font: "Calibri",
          color: "1a1a2e",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Scene ${profile.sceneNumber}: ${profile.sceneName}`,
          bold: true,
          size: 32,
          font: "Calibri",
          color: "2d6a4f",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  ];

  // Visual Study Images
  if (imageBuffers && Object.keys(imageBuffers).length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "VISUAL SCENE STUDY",
            bold: true,
            size: 28,
            font: "Calibri",
            color: "1a1a2e",
          }),
        ],
        spacing: { before: 200, after: 200 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
        },
      })
    );

    // Build panel label map: merge legacy names + dynamic shot panels
    const panelLabels: Record<string, string> = { ...VISUAL_PANEL_NAMES };
    // Add dynamic shot panel labels from visualShotPrompts if present
    if (profile.visualShotPrompts) {
      try {
        const shotPrompts = JSON.parse(profile.visualShotPrompts) as Array<{ shotNumber: number; label: string }>;
        for (const sp of shotPrompts) {
          panelLabels[`shot_${sp.shotNumber}`] = `${sp.shotNumber}. ${sp.label}`;
        }
      } catch { /* ignore parse errors */ }
    }

    for (const [key, buf] of Object.entries(imageBuffers)) {
      if (!buf) continue;
      const label = panelLabels[key] || key;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: label,
              bold: true,
              size: 24,
              font: "Calibri",
              color: "2d6a4f",
            }),
          ],
          spacing: { before: 300, after: 150 },
        }),
        new Paragraph({
          children: [
            new ImageRun({
              data: buf,
              transformation: { width: 500, height: 500 },
              type: "png",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      );
    }
    children.push(emptyLine());
  }

  // Section 1: Scene Identity
  children.push(
    sectionHeader("SCENE IDENTITY", 1),
    fieldParagraph("Scene Name", profile.sceneName),
    fieldParagraph("Scene Number", profile.sceneNumber),
    fieldParagraph("Logline", profile.logline),
    fieldParagraph("Location", profile.location),
    fieldParagraph("Time of Day", profile.timeOfDay),
    fieldParagraph("Duration Estimate", profile.durationEstimate),
    fieldParagraph("Scene Type", profile.sceneType),
    emptyLine()
  );

  // Section 2: Dramatic Purpose
  children.push(
    sectionHeader("DRAMATIC PURPOSE", 2),
    fieldParagraph("Narrative Purpose", profile.narrativePurpose),
    fieldParagraph("Audience Learns", profile.audienceLearns),
    fieldParagraph("Emotional Arc", profile.emotionalArc),
    fieldParagraph("Connection to Previous Scene", profile.connectionToPreviousScene),
    fieldParagraph("Connection to Next Scene", profile.connectionToNextScene),
    emptyLine()
  );

  // Section 3: Characters Present
  children.push(
    sectionHeader("CHARACTERS PRESENT", 3),
    fieldParagraph("Characters & Objectives", profile.charactersAndObjectives),
    fieldParagraph("Emotional State Entering", profile.emotionalStateEntering),
    fieldParagraph("Emotional State Exiting", profile.emotionalStateExiting),
    fieldParagraph("Power Dynamics", profile.powerDynamics),
    fieldParagraph("Key Relationship Beats", profile.keyRelationshipBeats),
    emptyLine()
  );

  // Section 4: Dialogue & Subtext
  children.push(
    sectionHeader("DIALOGUE & SUBTEXT", 4),
    fieldParagraph("Key Dialogue Beats", profile.keyDialogueBeats),
    fieldParagraph("Said vs. Meant", profile.saidVsMeant),
    fieldParagraph("Significant Silences", profile.significantSilences),
    fieldParagraph("Verbal Conflict Points", profile.verbalConflictPoints),
    fieldParagraph("Dialogue Tone", profile.dialogueTone),
    emptyLine()
  );

  // Section 5: Action & Blocking
  children.push(
    sectionHeader("ACTION & BLOCKING", 5),
    fieldParagraph("Physical Movement", profile.physicalMovement),
    fieldParagraph("Staging Positions", profile.stagingPositions),
    fieldParagraph("Key Gestures", profile.keyGestures),
    fieldParagraph("Choreography Notes", profile.choreographyNotes),
    fieldParagraph("Entrances & Exits", profile.entrancesExits),
    emptyLine()
  );

  // Section 6: Shot List
  children.push(
    sectionHeader("SHOT LIST", 6),
    fieldParagraph("Shot List", profile.shotListDetailed),
    emptyLine()
  );

  // Section 7: Lighting & Atmosphere
  children.push(
    sectionHeader("LIGHTING & ATMOSPHERE", 7),
    fieldParagraph("Lighting Setup", profile.lightingSetup),
    fieldParagraph("Color Temperature", profile.colorTemperature),
    fieldParagraph("Mood", profile.mood),
    fieldParagraph("Time of Day Effects", profile.timeOfDayEffects),
    fieldParagraph("Shadows & Contrast", profile.shadowsContrast),
    fieldParagraph("Practical Lights", profile.practicalLights),
    emptyLine()
  );

  // Section 8: Sound Design
  children.push(
    sectionHeader("SOUND DESIGN", 8),
    fieldParagraph("Ambient Sound", profile.ambientSound),
    fieldParagraph("Dialogue Recording Notes", profile.dialogueRecordingNotes),
    fieldParagraph("Sound Effects", profile.soundEffects),
    fieldParagraph("Music Cues", profile.musicCues),
    fieldParagraph("Silence Beats", profile.silenceBeats),
    fieldParagraph("Diegetic vs. Non-Diegetic", profile.diegeticVsNondiegetic),
    emptyLine()
  );

  // Section 9: VFX & Technical
  children.push(
    sectionHeader("VFX & TECHNICAL", 9),
    fieldParagraph("Practical Effects", profile.practicalEffects),
    fieldParagraph("CGI Requirements", profile.cgiRequirements),
    fieldParagraph("Green Screen Needs", profile.greenScreenNeeds),
    fieldParagraph("Props / Special Handling", profile.propsSpecialHandling),
    fieldParagraph("Safety Considerations", profile.safetyConsiderations),
    emptyLine()
  );

  // Section 10: Emotional & Thematic
  children.push(
    sectionHeader("EMOTIONAL & THEMATIC", 10),
    fieldParagraph("Underlying Tension", profile.underlyingTension),
    fieldParagraph("Thematic Resonance", profile.thematicResonance),
    fieldParagraph("Foreshadowing", profile.foreshadowing),
    fieldParagraph("Callbacks", profile.callbacks),
    fieldParagraph("Symbolic Elements", profile.symbolicElements),
    fieldParagraph("Director's Notes", profile.directorNotes)
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc) as Promise<Buffer>;
}

// ── Route Registration ──

export async function registerRoutes(httpServer: Server, app: Express) {
  // Set long timeouts for AI calls
  httpServer.timeout = 300000;
  httpServer.keepAliveTimeout = 300000;

  // ── Auth Routes (before auth middleware — public) ──

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: "email, password, and displayName are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const existing = getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      const passwordHash = bcrypt.hashSync(password, 10);
      const now = new Date().toISOString();
      const normalizedEmail = email.toLowerCase().trim();

      // Creator email gets special role
      const role = normalizedEmail === "designholistically@gmail.com" ? "creator" : "trial";

      const user = db.insert(users).values({
        email: normalizedEmail,
        passwordHash,
        displayName: displayName.trim(),
        role,
        trialStartedAt: now,
        createdAt: now,
      }).returning().get();

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      createSession(user.id, token, expiresAt);

      // Set cookie
      res.cookie("sessionToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }
      const user = getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (!bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const now = new Date().toISOString();
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      createSession(user.id, token, expiresAt);

      // Set cookie
      res.cookie("sessionToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        token,
        user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // Check both cookie and header for token
    const rawTok = req.cookies?.sessionToken || req.headers["x-session-token"];
    const token = Array.isArray(rawTok) ? rawTok[0] : rawTok;
    if (token) {
      deleteSession(token);
    }
    res.clearCookie("sessionToken");
    return res.json({ ok: true });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    // Check both cookie and header for token
    const rawTok2 = req.cookies?.sessionToken || req.headers["x-session-token"];
    const token = Array.isArray(rawTok2) ? rawTok2[0] : rawTok2;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const session = getSessionByToken(token);
    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }
    const user = getUserById(session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    return res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    });
  });

  app.post("/api/auth/forgot-password", (req: Request, res: Response) => {
    // Stub — return success without revealing whether email exists
    return res.json({ ok: true, message: "If that email exists, a reset link has been sent." });
  });

  app.post("/api/auth/reset-password", (req: Request, res: Response) => {
    // Stub
    return res.json({ ok: true, message: "Password reset is not yet configured." });
  });

  // ── Project Routes (protected) ──

  app.get("/api/projects", requireAuth, (req: Request, res: Response) => {
    try {
      const rows = sqlite.prepare(
        `SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC`
      ).all(req.userId!) as any[];

      const projects = rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      return res.json({ projects });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/projects", requireAuth, (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string") return res.status(400).json({ error: "name required" });
      const now = new Date().toISOString();
      const result = sqlite.prepare(
        `INSERT INTO projects (user_id, name, state_json, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)`
      ).run(req.userId!, name.trim(), now, now);
      return res.json({ id: Number(result.lastInsertRowid), name: name.trim() });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/projects/:id", requireAuth, (req: Request, res: Response) => {
    try {
      const projectId = parseInt(String(req.params.id), 10);
      const row = sqlite.prepare(
        `SELECT id, name, state_json, created_at, updated_at FROM projects WHERE id = ? AND user_id = ?`
      ).get(projectId, req.userId!) as any;
      if (!row) return res.status(404).json({ error: "Project not found" });

      // Send raw JSON string to avoid double-stringify which OOMs on large projects with base64 images
      const stateStr = row.state_json || "{}";
      const rawJson = `{"id":${row.id},"name":${JSON.stringify(row.name)},"state":${stateStr},"createdAt":${JSON.stringify(row.created_at)},"updatedAt":${JSON.stringify(row.updated_at)}}`;
      res.setHeader("Content-Type", "application/json");
      return res.send(rawJson);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/projects/:id", requireAuth, (req: Request, res: Response) => {
    try {
      const { state, name } = req.body;
      const now = new Date().toISOString();
      const updates: string[] = [];
      const params: any[] = [];
      if (state !== undefined) { updates.push("state_json = ?"); params.push(JSON.stringify(state)); }
      if (name) { updates.push("name = ?"); params.push(name.trim()); }
      updates.push("updated_at = ?"); params.push(now);
      params.push(parseInt(String(req.params.id), 10), req.userId!);

      sqlite.prepare(
        `UPDATE projects SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
      ).run(...params);

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/projects/:id", requireAuth, (req: Request, res: Response) => {
    try {
      sqlite.prepare(
        `DELETE FROM projects WHERE id = ? AND user_id = ?`
      ).run(parseInt(String(req.params.id), 10), req.userId!);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/projects/:id/rename", requireAuth, (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string") return res.status(400).json({ error: "name required" });
      sqlite.prepare(
        `UPDATE projects SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?`
      ).run(name.trim(), new Date().toISOString(), parseInt(String(req.params.id), 10), req.userId!);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Stripe Routes ──
  registerStripeRoutes(app);

  // ── Existing AI Routes (scan, analyze, generate-image, export) ──

  // Scan text for scenes
  app.post("/api/scan", async (req: Request, res: Response) => {
    try {
      const parsed = scanRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { text, sourceType, provider, apiKey } = parsed.data;

      const result = await callTextAI(
        provider,
        apiKey,
        SCAN_SYSTEM_PROMPT,
        `Here is the ${sourceType === "screenplay" ? "screenplay/script" : "prose manuscript"} text to analyze:\n\n${text}`
      );

      let scenes: DetectedScene[];
      try {
        let jsonStr = result;
        jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const firstBrace = jsonStr.indexOf("{");
        const firstBracket = jsonStr.indexOf("[");
        const start = Math.min(
          firstBrace !== -1 ? firstBrace : Infinity,
          firstBracket !== -1 ? firstBracket : Infinity
        );
        if (start !== Infinity) {
          const lastBrace = jsonStr.lastIndexOf("}");
          const lastBracket = jsonStr.lastIndexOf("]");
          const end = Math.max(lastBrace, lastBracket);
          jsonStr = jsonStr.substring(start, end + 1);
        }
        const parsed = JSON.parse(jsonStr);
        scenes = parsed.scenes || (Array.isArray(parsed) ? parsed : [parsed]);
      } catch (e) {
        console.error("Failed to parse scan response. Raw (first 500 chars):", result.substring(0, 500));
        return res.status(422).json({ error: "Failed to parse AI response. Please try again." });
      }

      return res.json({ scenes });
    } catch (err: any) {
      console.error("Scan error:", err);
      return res.status(422).json({ error: err.message });
    }
  });

  // Analyze a specific scene
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const parsed = analyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { text, sourceType, provider, apiKey, sceneName, sceneNumber } = parsed.data;
      const systemPrompt = buildAnalyzePrompt(sceneName, sceneNumber, sourceType);

      const result = await callTextAI(
        provider,
        apiKey,
        systemPrompt,
        `Here is the text to analyze for the scene "${sceneName}" (Scene #${sceneNumber}):\n\n${text}`
      );

      let profile: SceneProfile;
      try {
        let jsonStr = result;
        jsonStr = jsonStr.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const firstBrace = jsonStr.indexOf("{");
        const lastBrace = jsonStr.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }
        profile = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse AI response. Raw result (first 500 chars):", result.substring(0, 500));
        return res.status(422).json({ error: "Failed to parse AI scene analysis. The AI returned an unexpected format. Please try again." });
      }

      // Force sceneName from scan data
      profile.sceneName = sceneName;
      profile.sceneNumber = sceneNumber;

      // Save to database
      const visitorId = req.headers["x-visitor-id"] as string || "anonymous";
      const saved = storage.createScene({
        visitorId,
        sceneName,
        sceneNumber,
        sourceType,
        profileJson: JSON.stringify(profile),
        createdAt: new Date().toISOString(),
      });

      return res.json({ profile, sceneId: saved.id });
    } catch (err: any) {
      console.error("Analyze error:", err);

      const reqSceneName = req.body?.sceneName || "unknown";
      const reqSceneNumber = req.body?.sceneNumber || "?";

      // Classify the error for the frontend
      const msg = String(err?.message || "Unknown error");
      let userMessage: string;
      let errorCode: string;

      if (msg.includes("blocked") || msg.includes("SAFETY") || msg.includes("safety filters")) {
        userMessage = `Scene "${reqSceneName}" was blocked by the AI provider's safety filters. Try a different provider for this scene.`;
        errorCode = "CONTENT_BLOCKED";
      } else if (msg.includes("429") || msg.includes("rate")) {
        userMessage = "Rate limit exceeded. Too many requests — please wait a moment and try again.";
        errorCode = "RATE_LIMITED";
      } else if (msg.includes("empty response") || msg.includes("no candidates")) {
        userMessage = `The AI returned an empty response for scene "${reqSceneName}". This may be a temporary issue — please retry.`;
        errorCode = "EMPTY_RESPONSE";
      } else if (msg.includes("API error: 5")) {
        userMessage = "The AI service is temporarily unavailable. Please try again in a moment.";
        errorCode = "SERVER_ERROR";
      } else if (msg.includes("Failed to parse")) {
        userMessage = "The AI returned an unexpected format. Please try again.";
        errorCode = "PARSE_ERROR";
      } else {
        userMessage = msg;
        errorCode = "UNKNOWN";
      }

      return res.status(422).json({ error: userMessage, errorCode, sceneName: reqSceneName, sceneNumber: reqSceneNumber });
    }
  });

  // Generate scene visual
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const parsed = generateImageRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { prompt, style, referenceImages, provider, apiKey } = parsed.data;
      const styledPrompt = style ? `${style}. ${prompt}` : prompt;
      const base64 = await callImageAI(provider, apiKey, styledPrompt, referenceImages);

      return res.json({ image: base64 });
    } catch (err: any) {
      console.error("Image generation error:", err);
      return res.status(422).json({ error: err.message });
    }
  });

  // Export single scene to DOCX
  app.post("/api/export-docx", async (req: Request, res: Response) => {
    try {
      const { profile, images } = req.body;
      if (!profile) {
        return res.status(400).json({ error: "Profile data is required" });
      }

      const imageBuffers: Record<string, Buffer> = {};
      if (images) {
        for (const [key, b64] of Object.entries(images)) {
          if (b64 && typeof b64 === "string") {
            imageBuffers[key] = Buffer.from(b64 as string, "base64");
          }
        }
      }

      const buffer = await buildDocx(profile, imageBuffers);

      const sceneName = profile.sceneName || "Scene";
      const filename = `Scene_${profile.sceneNumber}_${sceneName.replace(/[^a-zA-Z0-9]/g, "_")}_Profile.docx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err: any) {
      console.error("DOCX export error:", err);
      return res.status(422).json({ error: err.message });
    }
  });

  // ── Import Proxy Routes ──

  // GET /api/import/sources — returns available import sources
  app.get("/api/import/sources", requireAuth, (_req: Request, res: Response) => {
    return res.json({
      sources: [
        { id: "characters", name: "Character Forge", url: "https://character.littleredappleproductions.com", icon: "Users" },
        { id: "locations", name: "Location Forge", url: "https://location.littleredappleproductions.com", icon: "MapPin" },
        { id: "props", name: "Props Forge", url: "https://props.littleredappleproductions.com", icon: "Box" },
      ],
    });
  });

  // GET /api/import/projects?source=characters — proxy to sibling app's shared projects
  app.get("/api/import/projects", requireAuth, async (req: Request, res: Response) => {
    try {
      const source = req.query.source as string;
      if (!source) return res.status(400).json({ error: "source query param required" });

      const SOURCES: Record<string, string> = {
        characters: "https://character.littleredappleproductions.com",
        locations: "https://location.littleredappleproductions.com",
        props: "https://props.littleredappleproductions.com",
      };
      const baseUrl = SOURCES[source];
      if (!baseUrl) return res.status(400).json({ error: `Unknown source: ${source}` });

      const secret = process.env.FORGE_CROSS_APP_SECRET || "";
      const user = getUserById(req.userId!);
      const email = user?.email || "";

      const url = `${baseUrl}/api/shared/projects?secret=${encodeURIComponent(secret)}&email=${encodeURIComponent(email)}`;
      const upstream = await fetch(url);
      if (!upstream.ok) {
        const text = await upstream.text();
        return res.status(upstream.status).json({ error: `Upstream error: ${text}` });
      }
      const data = await upstream.json();
      return res.json(data);
    } catch (err: any) {
      console.error("Import projects proxy error:", err);
      return res.status(502).json({ error: `Could not reach source app: ${err.message}` });
    }
  });

  // GET /api/import/items?source=characters&project=Polaris — proxy to sibling app's shared items
  app.get("/api/import/items", requireAuth, async (req: Request, res: Response) => {
    try {
      const source = req.query.source as string;
      const project = req.query.project as string;
      if (!source) return res.status(400).json({ error: "source query param required" });
      if (!project) return res.status(400).json({ error: "project query param required" });

      const SOURCES: Record<string, string> = {
        characters: "https://character.littleredappleproductions.com",
        locations: "https://location.littleredappleproductions.com",
        props: "https://props.littleredappleproductions.com",
      };
      const ENDPOINTS: Record<string, string> = {
        characters: "characters",
        locations: "locations",
        props: "props",
      };
      const baseUrl = SOURCES[source];
      if (!baseUrl) return res.status(400).json({ error: `Unknown source: ${source}` });

      const secret = process.env.FORGE_CROSS_APP_SECRET || "";
      const user = getUserById(req.userId!);
      const email = user?.email || "";
      const endpoint = ENDPOINTS[source];

      const url = `${baseUrl}/api/shared/${endpoint}?secret=${encodeURIComponent(secret)}&email=${encodeURIComponent(email)}&project=${encodeURIComponent(project)}`;
      const upstream = await fetch(url);
      if (!upstream.ok) {
        const text = await upstream.text();
        return res.status(upstream.status).json({ error: `Upstream error: ${text}` });
      }
      const data = await upstream.json();
      return res.json(data);
    } catch (err: any) {
      console.error("Import items proxy error:", err);
      return res.status(502).json({ error: `Could not reach source app: ${err.message}` });
    }
  });

  // POST /api/import/save — merge imported assets into project state (frontend handles state; this is a passthrough ack)
  app.post("/api/import/save", requireAuth, (req: Request, res: Response) => {
    // The frontend manages importedAssets in React state and persists via the normal
    // PUT /api/projects/:id save mechanism. This endpoint simply acknowledges the import.
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "items array required" });
    return res.json({ ok: true, imported: items.length });
  });

  // Export all developed scenes as combined DOCX
  app.post("/api/export-all-docx", async (req: Request, res: Response) => {
    try {
      const { scenes } = req.body;
      if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
        return res.status(400).json({ error: "At least one scene is required" });
      }

      const allSections: any[] = [];

      for (let idx = 0; idx < scenes.length; idx++) {
        const { profile, images } = scenes[idx];
        if (!profile) continue;

        const imageBuffers: Record<string, Buffer> = {};
        if (images) {
          for (const [key, b64] of Object.entries(images)) {
            if (b64 && typeof b64 === "string") {
              imageBuffers[key] = Buffer.from(b64 as string, "base64");
            }
          }
        }

        // Build individual section children using same function logic
        const sHeader = (text: string, num: number) =>
          new Paragraph({
            children: [
              new TextRun({
                text: `SECTION ${num}  ·  ${text}`,
                bold: true,
                size: 28,
                font: "Calibri",
                color: "1a1a2e",
              }),
            ],
            spacing: { before: 400, after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" },
            },
          });

        const fLabel = (label: string) =>
          new TextRun({ text: label, bold: true, size: 22, font: "Calibri" });
        const fValue = (value: string) =>
          new TextRun({ text: value, size: 22, font: "Calibri" });
        const fP = (label: string, value: string) =>
          new Paragraph({
            children: [fLabel(`${label}: `), fValue(value || "—")],
            spacing: { after: 120 },
          });
        const eLine = () => new Paragraph({ spacing: { after: 100 } });

        const children: any[] = [
          new Paragraph({
            children: [
              new TextRun({
                text: "SCENE DEVELOPMENT PROFILE",
                bold: true,
                size: 36,
                font: "Calibri",
                color: "1a1a2e",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Scene ${profile.sceneNumber}: ${profile.sceneName}`,
                bold: true,
                size: 32,
                font: "Calibri",
                color: "2d6a4f",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
        ];

        // Images
        if (Object.keys(imageBuffers).length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: "VISUAL SCENE STUDY", bold: true, size: 28, font: "Calibri", color: "1a1a2e" }),
              ],
              spacing: { before: 200, after: 200 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "cccccc" } },
            })
          );
          // Build panel label map: merge legacy names + dynamic shot panels
          const panelLabels2: Record<string, string> = { ...VISUAL_PANEL_NAMES };
          if (profile.visualShotPrompts) {
            try {
              const shotPrompts = JSON.parse(profile.visualShotPrompts) as Array<{ shotNumber: number; label: string }>;
              for (const sp of shotPrompts) {
                panelLabels2[`shot_${sp.shotNumber}`] = `${sp.shotNumber}. ${sp.label}`;
              }
            } catch { /* ignore parse errors */ }
          }

          for (const [key, buf] of Object.entries(imageBuffers)) {
            if (!buf) continue;
            const label = panelLabels2[key] || key;
            children.push(
              new Paragraph({
                children: [new TextRun({ text: label, bold: true, size: 24, font: "Calibri", color: "2d6a4f" })],
                spacing: { before: 300, after: 150 },
              }),
              new Paragraph({
                children: [new ImageRun({ data: buf, transformation: { width: 500, height: 500 }, type: "png" })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
              })
            );
          }
          children.push(eLine());
        }

        // All 10 sections
        children.push(
          sHeader("SCENE IDENTITY", 1),
          fP("Scene Name", profile.sceneName), fP("Scene Number", profile.sceneNumber),
          fP("Logline", profile.logline), fP("Location", profile.location),
          fP("Time of Day", profile.timeOfDay), fP("Duration Estimate", profile.durationEstimate),
          fP("Scene Type", profile.sceneType), eLine(),
          sHeader("DRAMATIC PURPOSE", 2),
          fP("Narrative Purpose", profile.narrativePurpose), fP("Audience Learns", profile.audienceLearns),
          fP("Emotional Arc", profile.emotionalArc), fP("Connection to Previous Scene", profile.connectionToPreviousScene),
          fP("Connection to Next Scene", profile.connectionToNextScene), eLine(),
          sHeader("CHARACTERS PRESENT", 3),
          fP("Characters & Objectives", profile.charactersAndObjectives), fP("Emotional State Entering", profile.emotionalStateEntering),
          fP("Emotional State Exiting", profile.emotionalStateExiting), fP("Power Dynamics", profile.powerDynamics),
          fP("Key Relationship Beats", profile.keyRelationshipBeats), eLine(),
          sHeader("DIALOGUE & SUBTEXT", 4),
          fP("Key Dialogue Beats", profile.keyDialogueBeats), fP("Said vs. Meant", profile.saidVsMeant),
          fP("Significant Silences", profile.significantSilences), fP("Verbal Conflict Points", profile.verbalConflictPoints),
          fP("Dialogue Tone", profile.dialogueTone), eLine(),
          sHeader("ACTION & BLOCKING", 5),
          fP("Physical Movement", profile.physicalMovement), fP("Staging Positions", profile.stagingPositions),
          fP("Key Gestures", profile.keyGestures), fP("Choreography Notes", profile.choreographyNotes),
          fP("Entrances & Exits", profile.entrancesExits), eLine(),
          sHeader("SHOT LIST", 6),
          fP("Shot List", profile.shotListDetailed), eLine(),
          sHeader("LIGHTING & ATMOSPHERE", 7),
          fP("Lighting Setup", profile.lightingSetup), fP("Color Temperature", profile.colorTemperature),
          fP("Mood", profile.mood), fP("Time of Day Effects", profile.timeOfDayEffects),
          fP("Shadows & Contrast", profile.shadowsContrast), fP("Practical Lights", profile.practicalLights), eLine(),
          sHeader("SOUND DESIGN", 8),
          fP("Ambient Sound", profile.ambientSound), fP("Dialogue Recording Notes", profile.dialogueRecordingNotes),
          fP("Sound Effects", profile.soundEffects), fP("Music Cues", profile.musicCues),
          fP("Silence Beats", profile.silenceBeats), fP("Diegetic vs. Non-Diegetic", profile.diegeticVsNondiegetic), eLine(),
          sHeader("VFX & TECHNICAL", 9),
          fP("Practical Effects", profile.practicalEffects), fP("CGI Requirements", profile.cgiRequirements),
          fP("Green Screen Needs", profile.greenScreenNeeds), fP("Props / Special Handling", profile.propsSpecialHandling),
          fP("Safety Considerations", profile.safetyConsiderations), eLine(),
          sHeader("EMOTIONAL & THEMATIC", 10),
          fP("Underlying Tension", profile.underlyingTension), fP("Thematic Resonance", profile.thematicResonance),
          fP("Foreshadowing", profile.foreshadowing), fP("Callbacks", profile.callbacks),
          fP("Symbolic Elements", profile.symbolicElements), fP("Director's Notes", profile.directorNotes)
        );

        allSections.push({ children });
      }

      const doc = new Document({ sections: allSections });
      const buffer = await Packer.toBuffer(doc);

      const filename = `Scene_Bible_${scenes.length}_Scenes.docx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err: any) {
      console.error("Export-all DOCX error:", err);
      return res.status(422).json({ error: err.message });
    }
  });
}
