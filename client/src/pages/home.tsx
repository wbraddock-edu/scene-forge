import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { apiRequest, setSessionToken, getSessionToken } from "@/lib/queryClient";
import {
  Upload,
  FileText,
  Clapperboard,
  Sparkles,
  Download,
  Image,
  Sun,
  Moon,
  Loader2,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Wand2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  FolderDown,
  FolderOpen,
  Plus,
  Trash2,
  Pencil,
  LayoutGrid,
  PlayCircle,
  Filter,
  ArrowUpDown,
  MapPin,
  Clock,
  Users,
  Box,
  Mic,
  Video,
  Layers,
  Camera,
  ChevronDown,
  LogIn,
  LogOut,
  UserPlus,
  KeyRound,
  Crown,
  Zap,
  CreditCard,
  RotateCcw,
  RefreshCw,
  X,
} from "lucide-react";
import type { DetectedScene, SceneProfile } from "@shared/schema";
import { ART_STYLES } from "@shared/schema";
import { DEMO_SCENES, DEMO_PROFILE } from "@/lib/demo-data";

type Step = "auth" | "projects" | "account" | "upload" | "configure" | "dashboard" | "analyzing" | "expanded" | "import";

interface ImportedAsset {
  source: "characters" | "locations" | "props";
  sourceName: string; // "Character Forge", "Location Forge", "Props Forge"
  name: string;       // e.g. "Captain Aria Voss"
  projectName: string; // e.g. "Polaris"
  profile: Record<string, any>; // full text profile
  images: Record<string, string>; // { panelKey: base64string }
  importedAt: string; // ISO timestamp
}

interface Provider {
  id: "openai" | "anthropic" | "google";
  name: string;
  supportsImages: boolean;
  keyPlaceholder: string;
}

const PROVIDERS: Provider[] = [
  { id: "openai", name: "OpenAI", supportsImages: true, keyPlaceholder: "sk-..." },
  { id: "anthropic", name: "Anthropic", supportsImages: false, keyPlaceholder: "sk-ant-..." },
  { id: "google", name: "Google AI", supportsImages: true, keyPlaceholder: "AIza..." },
];

const PROFILE_SECTIONS = [
  {
    num: 1, title: "Scene Identity",
    fields: [
      { key: "sceneName", label: "Scene Name" }, { key: "sceneNumber", label: "Scene Number" },
      { key: "logline", label: "Logline" }, { key: "location", label: "Location" },
      { key: "timeOfDay", label: "Time of Day" }, { key: "durationEstimate", label: "Duration Estimate" },
      { key: "sceneType", label: "Scene Type" },
    ],
  },
  {
    num: 2, title: "Dramatic Purpose",
    fields: [
      { key: "narrativePurpose", label: "Narrative Purpose" }, { key: "audienceLearns", label: "Audience Learns" },
      { key: "emotionalArc", label: "Emotional Arc" }, { key: "connectionToPreviousScene", label: "Connection to Previous Scene" },
      { key: "connectionToNextScene", label: "Connection to Next Scene" },
    ],
  },
  {
    num: 3, title: "Characters Present",
    fields: [
      { key: "charactersAndObjectives", label: "Characters & Objectives" }, { key: "emotionalStateEntering", label: "Emotional State Entering" },
      { key: "emotionalStateExiting", label: "Emotional State Exiting" }, { key: "powerDynamics", label: "Power Dynamics" },
      { key: "keyRelationshipBeats", label: "Key Relationship Beats" },
    ],
  },
  {
    num: 4, title: "Dialogue & Subtext",
    fields: [
      { key: "keyDialogueBeats", label: "Key Dialogue Beats" }, { key: "saidVsMeant", label: "Said vs. Meant" },
      { key: "significantSilences", label: "Significant Silences" }, { key: "verbalConflictPoints", label: "Verbal Conflict Points" },
      { key: "dialogueTone", label: "Dialogue Tone" },
    ],
  },
  {
    num: 5, title: "Action & Blocking",
    fields: [
      { key: "physicalMovement", label: "Physical Movement" }, { key: "stagingPositions", label: "Staging Positions" },
      { key: "keyGestures", label: "Key Gestures" }, { key: "choreographyNotes", label: "Choreography Notes" },
      { key: "entrancesExits", label: "Entrances & Exits" },
    ],
  },
  {
    num: 6, title: "Shot List",
    fields: [{ key: "shotListDetailed", label: "Detailed Shot List" }],
  },
  {
    num: 7, title: "Lighting & Atmosphere",
    fields: [
      { key: "lightingSetup", label: "Lighting Setup" }, { key: "colorTemperature", label: "Color Temperature" },
      { key: "mood", label: "Mood" }, { key: "timeOfDayEffects", label: "Time of Day Effects" },
      { key: "shadowsContrast", label: "Shadows & Contrast" }, { key: "practicalLights", label: "Practical Lights" },
    ],
  },
  {
    num: 8, title: "Sound Design",
    fields: [
      { key: "ambientSound", label: "Ambient Sound" }, { key: "dialogueRecordingNotes", label: "Dialogue Recording Notes" },
      { key: "soundEffects", label: "Sound Effects" }, { key: "musicCues", label: "Music Cues" },
      { key: "silenceBeats", label: "Silence Beats" }, { key: "diegeticVsNondiegetic", label: "Diegetic vs. Non-Diegetic" },
    ],
  },
  {
    num: 9, title: "VFX & Technical",
    fields: [
      { key: "practicalEffects", label: "Practical Effects" }, { key: "cgiRequirements", label: "CGI Requirements" },
      { key: "greenScreenNeeds", label: "Green Screen Needs" }, { key: "propsSpecialHandling", label: "Props / Special Handling" },
      { key: "safetyConsiderations", label: "Safety Considerations" },
    ],
  },
  {
    num: 10, title: "Emotional & Thematic",
    fields: [
      { key: "underlyingTension", label: "Underlying Tension" }, { key: "thematicResonance", label: "Thematic Resonance" },
      { key: "foreshadowing", label: "Foreshadowing" }, { key: "callbacks", label: "Callbacks" },
      { key: "symbolicElements", label: "Symbolic Elements" }, { key: "directorNotes", label: "Director's Notes" },
    ],
  },
];

interface DevelopedItem {
  profile: SceneProfile;
  images: Record<string, string>;
}

// Legacy fallback panels for scenes analyzed before dynamic shot prompts
const VISUAL_PANELS_FALLBACK = [
  { key: "masterShot", label: "Master Shot", sublabel: "Establishing", promptKey: "visualMasterShot" },
  { key: "dramaticMoment", label: "Key Moment", sublabel: "Drama", promptKey: "visualDramaticMoment" },
  { key: "characterCoverage", label: "Character Coverage", sublabel: "Performance", promptKey: "visualCharacterCoverage" },
  { key: "detailInsert", label: "Detail Insert", sublabel: "Focus", promptKey: "visualDetailInsert" },
  { key: "lightingStudy", label: "Lighting Study", sublabel: "Mood", promptKey: "visualLightingStudy" },
  { key: "customScene", label: "Custom Scene", sublabel: "Director's Shot", promptKey: "" },
];

interface ShotPromptEntry {
  shotNumber: number;
  label: string;
  sublabel: string;
  prompt: string;
}

/** Parse visualShotPrompts into panel definitions.
 *  Handles both a JSON-encoded string (schema contract) and a raw array
 *  (what the AI often actually produces after the outer JSON.parse). */
function parseShotPrompts(profile: SceneProfile): { key: string; label: string; sublabel: string; prompt: string }[] | null {
  const raw = (profile as any).visualShotPrompts;
  if (!raw) return null;
  try {
    const entries: ShotPromptEntry[] = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(entries) || entries.length === 0) return null;
    return entries.map((e) => ({
      key: `shot_${e.shotNumber}`,
      label: e.label,
      sublabel: e.sublabel || `Shot #${e.shotNumber}`,
      prompt: e.prompt,
    }));
  } catch {
    return null;
  }
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // ── Auth state ──
  const [authUser, setAuthUser] = useState<{ id: number; email: string; displayName: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ── Project state ──
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeProjectName, setActiveProjectName] = useState("");
  const [projectList, setProjectList] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // ── Account / subscription state ──
  const [subStatus, setSubStatus] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [showGoogleApiKey, setShowGoogleApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);

  // Flow state
  const [step, setStep] = useState<Step>("upload");
  const [manuscriptText, setManuscriptText] = useState("");
  const [sourceType, setSourceType] = useState<"screenplay" | "prose">("screenplay");
  const [provider, setProvider] = useState<Provider["id"]>("openai");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Scenes
  const [detectedScenes, setDetectedScenes] = useState<DetectedScene[]>([]);
  const [developedScenes, setDevelopedScenes] = useState<Record<string, DevelopedItem>>({});
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  const [failedScenes, setFailedScenes] = useState<Record<string, string>>({}); // sceneNumber → error message

  // Loading
  const [scanning, setScanning] = useState(false);
  const [analyzingScene, setAnalyzingScene] = useState<string | null>(null);
  const [developingAll, setDevelopingAll] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [refreshingPanels, setRefreshingPanels] = useState(false);
  const [refreshingShotPrompt, setRefreshingShotPrompt] = useState<string | null>(null);

  // Visual study
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0].id);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [midjourneyPrompt, setMidjourneyPrompt] = useState("");
  const [showMidjourneyDialog, setShowMidjourneyDialog] = useState(false);

  // Imported assets
  const [importedAssets, setImportedAssets] = useState<ImportedAsset[]>([]);

  // Import panel state
  const [importSubstep, setImportSubstep] = useState<1 | 2 | 3>(1);
  const [importSource, setImportSource] = useState<{ id: string; name: string; url: string; icon: string } | null>(null);
  const [importProjects, setImportProjects] = useState<string[]>([]);
  const [importProjectsLoading, setImportProjectsLoading] = useState(false);
  const [importSelectedProject, setImportSelectedProject] = useState<string | null>(null);
  const [importItems, setImportItems] = useState<any[]>([]);
  const [importItemsLoading, setImportItemsLoading] = useState(false);
  const [importSelectedItems, setImportSelectedItems] = useState<Set<string>>(new Set());
  const [importError, setImportError] = useState<string | null>(null);
  const [importRefLibOpen, setImportRefLibOpen] = useState(true);

  // Dashboard filters
  const [filterLength, setFilterLength] = useState<"all" | "short" | "medium" | "long">("all");
  const [sortBy, setSortBy] = useState<"number" | "name">("number");

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;
  const imageProvider = provider === "anthropic" ? "openai" : provider;
  const developedCount = Object.keys(developedScenes).length;
  const failedCount = Object.keys(failedScenes).length;

  // ── Check auth on mount ──
  useEffect(() => {
    if (getSessionToken()) {
      (async () => {
        try {
          const res = await apiRequest("GET", "/api/auth/me");
          const user = await res.json();
          setAuthUser(user);
        } catch {
          setSessionToken(null);
        }
        setAuthChecked(true);
      })();
    } else {
      setAuthChecked(true);
    }
  }, []);

  // ── Load subscription status ──
  useEffect(() => {
    if (authUser) {
      apiRequest("GET", "/api/subscription/status")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setSubStatus(data); })
        .catch(() => {});
    }
  }, [authUser, step]);

  // ── Load project list on auth ──
  const loadProjectList = useCallback(async () => {
    try {
      setProjectsLoading(true);
      const res = await apiRequest("GET", "/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjectList(data.projects || data || []);
      }
    } catch { /* no projects yet */ }
    setProjectsLoading(false);
  }, []);

  useEffect(() => {
    if (authUser && !activeProjectId) loadProjectList();
  }, [authUser, activeProjectId, loadProjectList]);

  // ── Open a project: load its state ──
  const openProject = useCallback(async (projectId: number) => {
    try {
      const res = await apiRequest("GET", `/api/projects/${projectId}`);
      if (!res.ok) return;
      const { state, name } = await res.json();
      setActiveProjectId(projectId);
      setActiveProjectName(name);
      if (state && Object.keys(state).length > 0) {
        if (state.manuscriptText) setManuscriptText(state.manuscriptText);
        if (state.sourceType) setSourceType(state.sourceType);
        if (state.provider) setProvider(state.provider);
        if (state.apiKey) setApiKey(state.apiKey);
        if (state.selectedStyle) setSelectedStyle(state.selectedStyle);
        if (state.detectedScenes?.length) {
          setDetectedScenes(state.detectedScenes);
          setStep("dashboard");
        } else {
          setStep("upload");
        }
        if (state.developedScenes) setDevelopedScenes(state.developedScenes);
        if (state.referenceImages) setReferenceImages(state.referenceImages);
        if (state.importedAssets) {
          // Deduplicate by name + source, keeping only the last occurrence
          const seen = new Map();
          for (const asset of state.importedAssets) {
            const key = `${asset.source}::${asset.name}`;
            seen.set(key, asset);
          }
          setImportedAssets(Array.from(seen.values()));
        }
      } else {
        setStep("upload");
      }
      setSessionLoaded(true);
    } catch (err) {
      console.error("Failed to load project:", err);
    }
  }, []);

  // ── Create a new project ──
  const createProject = useCallback(async (name: string) => {
    try {
      const res = await apiRequest("POST", "/api/projects", { name });
      if (!res.ok) return;
      const data = await res.json();
      const id = data.id || data.project?.id;
      // Reset workspace state for new project
      setManuscriptText(""); setSourceType("screenplay"); setDetectedScenes([]);
      setDevelopedScenes({}); setReferenceImages([]); setImportedAssets([]); setStep("upload");
      setActiveProjectId(id);
      setActiveProjectName(name);
      setSessionLoaded(true);
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  }, []);

  // ── Rename a project ──
  const handleRenameProject = useCallback(async (projectId: number) => {
    if (!renameValue.trim()) return;
    try {
      await apiRequest("PATCH", `/api/projects/${projectId}/rename`, { name: renameValue.trim() });
      if (activeProjectId === projectId) setActiveProjectName(renameValue.trim());
      setRenamingProjectId(null);
      loadProjectList();
    } catch {}
  }, [renameValue, activeProjectId, loadProjectList]);

  // ── Delete a project ──
  const deleteProject = useCallback(async (projectId: number) => {
    try {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
      loadProjectList();
    } catch {}
  }, [loadProjectList]);

  // ── Back to project list ──
  const backToProjects = useCallback(async () => {
    if (activeProjectId) {
      try {
        await apiRequest("PUT", `/api/projects/${activeProjectId}`, {
          state: {
            manuscriptText,
            sourceType,
            provider,
            apiKey,
            selectedStyle,
            detectedScenes,
            developedScenes,
            referenceImages,
            importedAssets,
          },
        });
      } catch { /* silent */ }
    }
    setActiveProjectId(null);
    setActiveProjectName("");
    setSessionLoaded(false);
    setStep("upload");
    setManuscriptText(""); setDetectedScenes([]); setDevelopedScenes({});
    setReferenceImages([]); setImportedAssets([]);
    loadProjectList();
  }, [loadProjectList, activeProjectId, manuscriptText, sourceType, provider, apiKey, selectedStyle, detectedScenes, developedScenes, referenceImages, importedAssets]);

  // ── Auto-save to active project (debounced) ──
  const saveTimeout = useRef<any>(null);
  useEffect(() => {
    if (!sessionLoaded || !activeProjectId) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await apiRequest("PUT", `/api/projects/${activeProjectId}`, {
          state: {
            manuscriptText,
            sourceType,
            provider,
            apiKey,
            selectedStyle,
            detectedScenes,
            developedScenes,
            referenceImages,
            importedAssets,
          },
        });
      } catch { /* silent */ }
    }, 2000);
  }, [sessionLoaded, activeProjectId, manuscriptText, sourceType, provider, apiKey, selectedStyle, detectedScenes, developedScenes, referenceImages, importedAssets]);

  // ── Auth submit ──
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body: any = { email: authEmail, password: authPassword };
      if (authMode === "register") body.displayName = authDisplayName;

      const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
      const res = await fetch(API_BASE + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Auth failed");

      setSessionToken(data.token);
      setAuthUser(data.user);
    } catch (err: any) {
      setAuthError(err.message);
    }
    setAuthLoading(false);
  }

  // ── Logout ──
  async function handleLogout() {
    if (activeProjectId) {
      try {
        await apiRequest("PUT", `/api/projects/${activeProjectId}`, {
          state: { manuscriptText, sourceType, provider, apiKey, selectedStyle, detectedScenes, developedScenes, referenceImages, importedAssets },
        });
      } catch { /* silent */ }
    }
    apiRequest("POST", "/api/auth/logout").catch(() => {});
    setSessionToken(null);
    setAuthUser(null);
    setActiveProjectId(null);
    setActiveProjectName("");
    setSessionLoaded(false);
    setStep("upload");
    setManuscriptText(""); setDetectedScenes([]); setDevelopedScenes({}); setReferenceImages([]); setImportedAssets([]);
  }

  // File upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith(".txt")) {
      const text = await file.text();
      setManuscriptText(text);
    } else if (file.name.endsWith(".docx")) {
      const arrayBuf = await file.arrayBuffer();
      try {
        const mammoth = await import("mammoth");
        const result = await (mammoth as any).extractRawText({ arrayBuffer: arrayBuf });
        setManuscriptText(result.value);
      } catch {
        toast({ title: "Error", description: "Could not read .docx file. Please paste text instead.", variant: "destructive" });
      }
    } else {
      toast({ title: "Unsupported format", description: "Please upload .txt or .docx files.", variant: "destructive" });
    }
  }, [toast]);

  // Reference image upload
  const handleRefUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newRefs: string[] = [];
    for (let i = 0; i < Math.min(files.length, 6 - referenceImages.length); i++) {
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(files[i]);
      });
      newRefs.push(b64);
    }
    setReferenceImages((prev) => [...prev, ...newRefs].slice(0, 6));
  }, [referenceImages.length]);

  // Load demo (now goes to dashboard directly without needing a project)
  const loadDemo = useCallback(() => {
    setDetectedScenes(DEMO_SCENES);
    setDevelopedScenes({
      "2": { profile: DEMO_PROFILE, images: {} },
    });
    setManuscriptText("[Demo manuscript loaded — sci-fi derelict ship scenario]");
    setSourceType("screenplay");
    setProvider("openai");
    setStep("dashboard");
    toast({ title: "Demo loaded", description: "8 scenes detected, 1 fully developed." });
  }, [toast]);

  // Scan for scenes
  const handleScan = useCallback(async () => {
    if (!manuscriptText || !apiKey) {
      toast({ title: "Missing fields", description: "Please provide manuscript text and API key.", variant: "destructive" });
      return;
    }
    setScanning(true);
    try {
      const res = await apiRequest("POST", "/api/scan", {
        text: manuscriptText,
        sourceType,
        provider,
        apiKey,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDetectedScenes(data.scenes || []);
      setStep("dashboard");
      toast({ title: "Scan complete", description: `Found ${(data.scenes || []).length} scenes.` });
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }, [manuscriptText, apiKey, sourceType, provider, toast]);

  // Develop a single scene
  const developScene = useCallback(async (scene: DetectedScene) => {
    setAnalyzingScene(scene.sceneNumber);
    // Clear any previous failure for this scene
    setFailedScenes((prev) => {
      const next = { ...prev };
      delete next[scene.sceneNumber];
      return next;
    });
    try {
      const res = await apiRequest("POST", "/api/analyze", {
        text: manuscriptText,
        sourceType,
        provider,
        apiKey,
        sceneName: scene.sceneName,
        sceneNumber: scene.sceneNumber,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Force sceneName from scan
      data.profile.sceneName = scene.sceneName;
      data.profile.sceneNumber = scene.sceneNumber;
      setDevelopedScenes((prev) => ({
        ...prev,
        [scene.sceneNumber]: { profile: data.profile, images: {} },
      }));
      toast({ title: "Scene developed", description: `Scene ${scene.sceneNumber}: ${scene.sceneName}` });
    } catch (err: any) {
      setFailedScenes((prev) => ({ ...prev, [scene.sceneNumber]: err.message }));
      toast({ title: "Development failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzingScene(null);
    }
  }, [manuscriptText, sourceType, provider, apiKey, toast]);

  // Develop all scenes — staggered with 3s delay between requests
  const developAll = useCallback(async () => {
    setDevelopingAll(true);
    setFailedScenes({});
    const undeveloped = detectedScenes.filter((s) => !developedScenes[s.sceneNumber]);
    for (let i = 0; i < undeveloped.length; i++) {
      const scene = undeveloped[i];
      await developScene(scene);
      // Stagger: wait 3 seconds between requests to avoid rate limiting
      if (i < undeveloped.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    setDevelopingAll(false);
  }, [detectedScenes, developedScenes, developScene]);

  // Retry only the failed scenes
  const retryFailed = useCallback(async () => {
    setDevelopingAll(true);
    const failedIds = Object.keys(failedScenes);
    const toRetry = detectedScenes.filter((s) => failedIds.includes(s.sceneNumber));
    for (let i = 0; i < toRetry.length; i++) {
      const scene = toRetry[i];
      await developScene(scene);
      if (i < toRetry.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    setDevelopingAll(false);
  }, [detectedScenes, failedScenes, developScene]);

  // Generate image
  const generateImage = useCallback(async (panelKey: string, prompt: string) => {
    if (!expandedScene) return;
    setGeneratingImage(panelKey);
    try {
      const style = ART_STYLES.find((s) => s.id === selectedStyle)?.prompt || "";
      const res = await apiRequest("POST", "/api/generate-image", {
        prompt,
        style,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        provider: imageProvider as "openai" | "google",
        apiKey,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDevelopedScenes((prev) => ({
        ...prev,
        [expandedScene]: {
          ...prev[expandedScene],
          images: { ...prev[expandedScene].images, [panelKey]: data.image },
        },
      }));
    } catch (err: any) {
      toast({ title: "Image generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingImage(null);
    }
  }, [expandedScene, selectedStyle, referenceImages, imageProvider, apiKey, toast]);

  // Generate all images — uses dynamic shot panels when available, falls back to legacy
  const generateAllImages = useCallback(async () => {
    if (!expandedScene || !developedScenes[expandedScene]) return;
    setGeneratingAll(true);
    const profile = developedScenes[expandedScene].profile;
    const dynamicPanels = parseShotPrompts(profile);
    if (dynamicPanels) {
      for (let i = 0; i < dynamicPanels.length; i++) {
        const dp = dynamicPanels[i];
        if (!dp.prompt) continue;
        await generateImage(dp.key, dp.prompt);
        if (i < dynamicPanels.length - 1) {
          await new Promise((r) => setTimeout(r, 8000));
        }
      }
    } else {
      // Legacy fallback
      const panels = VISUAL_PANELS_FALLBACK.filter((p) => p.key !== "customScene");
      for (const panel of panels) {
        const prompt = (profile as any)[panel.promptKey];
        if (!prompt) continue;
        await generateImage(panel.key, prompt);
        if (panels.indexOf(panel) < panels.length - 1) {
          await new Promise((r) => setTimeout(r, 8000));
        }
      }
    }
    setGeneratingAll(false);
  }, [expandedScene, developedScenes, generateImage]);

  // Refresh all shot panels — runs only the second AI call against existing shotListDetailed
  const refreshShotPanels = useCallback(async () => {
    if (!expandedScene || !developedScenes[expandedScene]) return;
    setRefreshingPanels(true);
    try {
      const profile = developedScenes[expandedScene].profile;
      const res = await apiRequest("POST", "/api/refresh-shot-panels", {
        shotListDetailed: profile.shotListDetailed,
        sceneName: profile.sceneName,
        sceneNumber: profile.sceneNumber,
        location: profile.location,
        timeOfDay: profile.timeOfDay,
        mood: profile.mood,
        lightingSetup: profile.lightingSetup,
        provider,
        apiKey,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Parse new panels to determine which keys still match
      const newPanels: { shotNumber: number }[] = JSON.parse(data.visualShotPrompts);
      const newKeys = new Set(newPanels.map((p) => `shot_${p.shotNumber}`));
      const oldImages = developedScenes[expandedScene].images;
      const preservedImages: Record<string, string> = {};
      for (const [key, val] of Object.entries(oldImages)) {
        if (newKeys.has(key) || key === "customScene") {
          preservedImages[key] = val;
        }
      }

      setDevelopedScenes((prev) => ({
        ...prev,
        [expandedScene]: {
          ...prev[expandedScene],
          profile: { ...prev[expandedScene].profile, visualShotPrompts: data.visualShotPrompts },
          images: preservedImages,
        },
      }));
      toast({ title: "Panels refreshed", description: `Updated ${newPanels.length} shot panels` });
    } catch (err: any) {
      toast({ title: "Panel refresh failed", description: err.message, variant: "destructive" });
    } finally {
      setRefreshingPanels(false);
    }
  }, [expandedScene, developedScenes, provider, apiKey, toast]);

  // Refresh a single shot's image prompt
  const refreshSingleShotPrompt = useCallback(async (shotNumber: number) => {
    if (!expandedScene || !developedScenes[expandedScene]) return;
    const panelKey = `shot_${shotNumber}`;
    setRefreshingShotPrompt(panelKey);
    try {
      const profile = developedScenes[expandedScene].profile;
      // Extract the specific shot description from shotListDetailed
      const lines = (profile.shotListDetailed || "").split("\n");
      const shotLine = lines.find((l: string) => {
        const match = l.match(/^\s*(\d+)/);
        return match && parseInt(match[1]) === shotNumber;
      });
      const shotDescription = shotLine || `Shot #${shotNumber}`;

      const res = await apiRequest("POST", "/api/refresh-single-shot-prompt", {
        shotDescription,
        sceneName: profile.sceneName,
        location: profile.location,
        timeOfDay: profile.timeOfDay,
        mood: profile.mood,
        lightingSetup: profile.lightingSetup,
        provider,
        apiKey,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update just this shot's prompt in visualShotPrompts
      const raw = (profile as any).visualShotPrompts;
      const entries = typeof raw === "string" ? JSON.parse(raw) : raw;
      const updated = entries.map((e: any) =>
        e.shotNumber === shotNumber ? { ...e, prompt: data.prompt } : e
      );

      setDevelopedScenes((prev) => ({
        ...prev,
        [expandedScene]: {
          ...prev[expandedScene],
          profile: { ...prev[expandedScene].profile, visualShotPrompts: JSON.stringify(updated) },
        },
      }));
      toast({ title: "Prompt refreshed", description: `Updated prompt for Shot #${shotNumber}` });
    } catch (err: any) {
      toast({ title: "Prompt refresh failed", description: err.message, variant: "destructive" });
    } finally {
      setRefreshingShotPrompt(null);
    }
  }, [expandedScene, developedScenes, provider, apiKey, toast]);

  // Download single image
  const downloadImage = useCallback((base64: string, filename: string) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64}`;
    link.download = filename;
    link.click();
  }, []);

  // Download ZIP
  const downloadZip = useCallback(async () => {
    if (!expandedScene || !developedScenes[expandedScene]) return;
    const images = developedScenes[expandedScene].images;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const [key, b64] of Object.entries(images)) {
      if (b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        zip.file(`${key}.png`, bytes);
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Scene_${expandedScene}_Visual_Study.zip`;
    link.click();
  }, [expandedScene, developedScenes]);

  // Export DOCX
  const exportDocx = useCallback(async (sceneNum: string) => {
    setExportingDocx(true);
    try {
      const dev = developedScenes[sceneNum];
      if (!dev) return;
      const res = await apiRequest("POST", "/api/export-docx", {
        profile: dev.profile,
        images: dev.images,
      });
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Scene_${sceneNum}_${dev.profile.sceneName.replace(/[^a-zA-Z0-9]/g, "_")}_Profile.docx`;
      link.click();
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExportingDocx(false);
    }
  }, [developedScenes, toast]);

  // Export all DOCX
  const exportAllDocx = useCallback(async () => {
    setExportingDocx(true);
    try {
      const scenesPayload = Object.entries(developedScenes).map(([_, dev]) => ({
        profile: dev.profile,
        images: dev.images,
      }));
      const res = await apiRequest("POST", "/api/export-all-docx", { scenes: scenesPayload });
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Scene_Bible_${scenesPayload.length}_Scenes.docx`;
      link.click();
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExportingDocx(false);
    }
  }, [developedScenes, toast]);

  // Filter & sort
  const filteredScenes = detectedScenes
    .filter((s) => filterLength === "all" || s.estimatedLength === filterLength)
    .sort((a, b) => {
      if (sortBy === "number") return parseInt(a.sceneNumber) - parseInt(b.sceneNumber);
      return a.sceneName.localeCompare(b.sceneName);
    });

  // ── AUTH LOADING ──
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0b0d]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00d4aa]" />
      </div>
    );
  }

  // ── AUTH GATE ──
  if (!authUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "hsl(225,15%,4%)" }}>
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <img src="./scene-forge-logo.png" alt="Scene Forge" className="w-16 h-16 rounded-xl object-contain" />
            </div>
            <h1 className="text-xl font-semibold tracking-wide uppercase" style={{ color: "hsl(163,100%,42%)" }}>SCENE FORGE</h1>
            <p className="text-xs font-mono tracking-wider uppercase mt-1" style={{ color: "hsl(220,5%,68%)" }}>
              Scene Breakdown &amp; Shot List
            </p>
          </div>

          <Card className="border" style={{ background: "hsl(225,12%,14%)", borderColor: "hsl(225,10%,24%)" }}>
            <CardContent className="p-5">
              {/* Tab toggle */}
              <div className="flex gap-1 mb-5 p-0.5 rounded-md" style={{ background: "hsl(225,12%,8%)" }}>
                <button
                  className={`flex-1 text-sm py-2 rounded font-medium transition-colors ${
                    authMode === "login" ? "bg-[#00d4aa] text-black" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                >
                  Sign In
                </button>
                <button
                  className={`flex-1 text-sm py-2 rounded font-medium transition-colors ${
                    authMode === "register" ? "bg-[#00d4aa] text-black" : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === "register" && (
                  <div>
                    <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>Display Name</label>
                    <Input
                      type="text"
                      value={authDisplayName}
                      onChange={(e) => setAuthDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="text-sm"
                      style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }}
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>Email</label>
                  <Input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="text-sm"
                    style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-mono tracking-wider uppercase block mb-1.5" style={{ color: "hsl(220,5%,72%)" }}>Password</label>
                  <Input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="text-sm"
                    style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,26%)", color: "hsl(0,0%,95%)" }}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full gap-2 mt-2 bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black font-semibold" disabled={authLoading}>
                  {authLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : authMode === "login" ? (
                    <><LogIn className="w-4 h-4" /> Sign In</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Create Account</>
                  )}
                </Button>
                {authMode === "login" && (
                  <button
                    type="button"
                    className="w-full text-xs hover:text-foreground transition-colors mt-2"
                    style={{ color: "hsl(220,5%,65%)" }}
                    onClick={() => {}}
                  >
                    Forgot your password?
                  </button>
                )}
                {authError && (
                  <div className="text-xs text-red-400 bg-red-400/10 rounded px-3 py-2 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <p className="text-xs text-center mt-6" style={{ color: "hsl(220,5%,55%)" }}>
            Your scenes and shot lists are stored securely per account.
          </p>
          <p className="text-xs text-center mt-4" style={{ color: "hsl(220,5%,30%)" }}>
            Created with the Assistance of AI &copy; 2026{" "}
            <a href="https://littleredappleproductions.com" target="_blank" rel="noopener" className="text-[#00d4aa]/60 hover:text-[#00d4aa]">
              Little Red Apple Productions
            </a>{" "}
            &copy; 2026
          </p>
        </div>
      </div>
    );
  }

  // ── PROJECT LIST ──
  if (!activeProjectId) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "hsl(225,15%,4%)" }}>
        {/* Header */}
        <header className="h-12 flex items-center px-4 gap-3 shrink-0" style={{ borderBottom: "1px solid hsl(225,10%,12%)" }}>
          <img src="./scene-forge-logo.png" alt="Scene Forge" className="w-7 h-7 rounded object-contain" />
          <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: "hsl(163,100%,42%)" }}>SCENE FORGE</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: "hsla(163,100%,42%,0.08)", border: "1px solid hsla(163,100%,42%,0.15)" }}>
            <LayoutGrid className="w-3 h-3" style={{ color: "hsl(163,100%,42%)" }} />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "hsl(163,100%,42%)" }}>Dashboard</span>
          </div>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">{authUser?.displayName}</span>
          <button
            onClick={() => setStep("account")}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "hsla(163,100%,42%,0.12)", color: "hsl(163,100%,42%)" }}
          >
            {authUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
          </button>
        </header>

        {/* Account page or Project list */}
        {step === "account" ? (
          <AccountPage
            authUser={authUser}
            subStatus={subStatus}
            billingCycle={billingCycle}
            setBillingCycle={setBillingCycle}
            checkoutLoading={checkoutLoading}
            setCheckoutLoading={setCheckoutLoading}
            googleApiKey={googleApiKey}
            setGoogleApiKey={setGoogleApiKey}
            showGoogleApiKey={showGoogleApiKey}
            setShowGoogleApiKey={setShowGoogleApiKey}
            savingApiKey={savingApiKey}
            setSavingApiKey={setSavingApiKey}
            onBack={() => setStep("upload")}
            onLogout={handleLogout}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-xl font-semibold" style={{ color: "hsl(180,5%,88%)" }}>Your Projects</h1>
                  <p className="text-xs font-mono mt-1" style={{ color: "hsl(220,5%,62%)" }}>
                    {projectList.length} project{projectList.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* New Project */}
              <div className="rounded-lg p-5 mb-6" style={{ background: "hsl(225,15%,10%)", border: "1px solid hsl(225,10%,18%)" }}>
                <div className="flex items-center gap-3">
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="New project name..."
                    className="flex-1 text-sm bg-background border-border/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newProjectName.trim()) {
                        createProject(newProjectName.trim());
                        setNewProjectName("");
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (newProjectName.trim()) {
                        createProject(newProjectName.trim());
                        setNewProjectName("");
                      }
                    }}
                    className="bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black font-semibold text-sm gap-2"
                    disabled={!newProjectName.trim()}
                  >
                    <Plus className="w-4 h-4" />
                    New Project
                  </Button>
                </div>
              </div>

              {/* Load Demo Banner */}
              {!projectsLoading && !projectList.some((p: any) => p.name?.includes("Demo")) && (
                <div className="rounded-lg p-5 mb-6 text-center" style={{ background: "hsla(163,100%,42%,0.04)", border: "1px dashed hsla(163,100%,42%,0.2)" }}>
                  <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: "hsl(163,100%,42%)" }} />
                  <p className="text-sm font-semibold mb-1" style={{ color: "hsl(180,5%,88%)" }}>Try a Sample Project</p>
                  <p className="text-xs mb-3" style={{ color: "hsl(220,5%,55%)" }}>Load a sci-fi derelict ship scenario with 8 detected scenes and 1 fully developed profile.</p>
                  <Button
                    onClick={async () => {
                      try {
                        const createRes = await apiRequest("POST", "/api/projects", { name: "Demo — Sci-Fi Derelict Ship" });
                        if (!createRes.ok) return;
                        const data = await createRes.json();
                        const id = data.id || data.project?.id;
                        const demoState = {
                          manuscriptText: "[Demo manuscript loaded — sci-fi derelict ship scenario]",
                          sourceType: "screenplay",
                          detectedScenes: DEMO_SCENES,
                          developedScenes: { "2": { profile: DEMO_PROFILE, images: {} } },
                          referenceImages: [],
                        };
                        await apiRequest("PUT", `/api/projects/${id}`, { state: demoState });
                        openProject(id);
                      } catch (err) { console.error("Failed to load demo:", err); }
                    }}
                    className="bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black font-semibold text-sm gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Load Demo Project
                  </Button>
                </div>
              )}

              {/* Project List */}
              {projectsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(163,100%,42%)" }} />
                </div>
              ) : projectList.length === 0 ? (
                <div className="text-center py-16">
                  <FolderOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "hsl(220,5%,25%)" }} />
                  <p className="text-sm" style={{ color: "hsl(220,5%,52%)" }}>No projects yet</p>
                  <p className="text-[10px] font-mono mt-1" style={{ color: "hsl(220,5%,35%)" }}>Create your first project above to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectList.map((proj: any) => (
                    <div
                      key={proj.id}
                      className="rounded-lg p-4 flex items-center gap-4 cursor-pointer transition-all group hover:border-[#00d4aa]/30"
                      style={{ background: "hsl(225,15%,10%)", border: "1px solid hsl(225,10%,18%)" }}
                      onClick={() => renamingProjectId !== proj.id && openProject(proj.id)}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(163,100%,42%,0.12)" }}>
                        <Clapperboard className="w-5 h-5" style={{ color: "hsl(163,100%,42%)" }} />
                      </div>
                      {renamingProjectId === proj.id ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameProject(proj.id);
                              if (e.key === "Escape") setRenamingProjectId(null);
                            }}
                            className="text-sm h-9"
                            style={{ background: "hsl(225,12%,7%)", borderColor: "hsl(225,10%,22%)", color: "hsl(0,0%,95%)" }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button onClick={(e) => { e.stopPropagation(); handleRenameProject(proj.id); }} style={{ color: "hsl(163,100%,42%)" }}>
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold truncate group-hover:text-[#00d4aa] transition-colors" style={{ color: "hsl(0,0%,95%)" }}>
                            {proj.name}
                          </h3>
                          <p className="text-[10px] font-mono mt-0.5" style={{ color: "hsl(220,5%,62%)" }}>
                            {proj.sceneCount != null
                              ? `${proj.sceneCount} scene${proj.sceneCount !== 1 ? "s" : ""}${proj.developedCount > 0 ? ` · ${proj.developedCount} developed` : ""}`
                              : "No scenes yet"}
                          </p>
                        </div>
                      )}
                      <p className="text-[10px] font-mono hidden sm:block" style={{ color: "hsl(220,5%,55%)" }}>
                        {proj.updatedAt ? new Date(proj.updatedAt).toLocaleDateString() : ""}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setRenamingProjectId(proj.id); setRenameValue(proj.name); }}
                          className="p-1.5 rounded"
                          style={{ color: "hsl(220,5%,55%)" }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${proj.name}"?`)) deleteProject(proj.id); }}
                          className="p-1.5 rounded"
                          style={{ color: "hsl(0,72%,65%)" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="py-8 mt-6 border-t" style={{ borderColor: "hsl(225,10%,12%)" }}>
                <p className="text-xs text-center font-mono" style={{ color: "hsl(220,5%,30%)" }}>
                  Created with the Assistance of AI &copy; 2026{" "}
            <a href="https://littleredappleproductions.com" target="_blank" rel="noopener" className="text-[#00d4aa]/60 hover:text-[#00d4aa]">
              Little Red Apple Productions
            </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ACCOUNT PAGE (within a project) ──
  if (step === "account") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "hsl(225,15%,4%)" }}>
        <header className="h-12 flex items-center px-4 gap-3 shrink-0" style={{ borderBottom: "1px solid hsl(225,10%,12%)" }}>
          <img src="./scene-forge-logo.png" alt="Scene Forge" className="w-7 h-7 rounded object-contain" />
          <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: "hsl(163,100%,42%)" }}>SCENE FORGE</span>
          <div className="flex-1" />
          <button
            onClick={() => setStep("account")}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "hsl(163,100%,42%)", color: "black" }}
          >
            {authUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
          </button>
        </header>
        <AccountPage
          authUser={authUser}
          subStatus={subStatus}
          billingCycle={billingCycle}
          setBillingCycle={setBillingCycle}
          checkoutLoading={checkoutLoading}
          setCheckoutLoading={setCheckoutLoading}
          googleApiKey={googleApiKey}
          setGoogleApiKey={setGoogleApiKey}
          showGoogleApiKey={showGoogleApiKey}
          setShowGoogleApiKey={setShowGoogleApiKey}
          savingApiKey={savingApiKey}
          setSavingApiKey={setSavingApiKey}
          onBack={() => setStep("dashboard")}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // ── UPLOAD STEP ──
  if (step === "upload" || step === "configure") {
    return (
      <div className="min-h-screen bg-background" data-testid="upload-page">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50" data-testid="header">
          <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="./scene-forge-logo.png" alt="Scene Forge" className="w-8 h-8 rounded-sm object-contain shrink-0" data-testid="logo" />
              <span className="font-semibold text-sm tracking-wide text-foreground">SCENE FORGE</span>
              <span className="text-[11px] font-mono text-muted-foreground">v4.2</span>
              {activeProjectName && (
                <span className="text-[11px] text-muted-foreground hidden sm:inline">— {activeProjectName}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={loadDemo} data-testid="btn-demo" className="text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" />Demo
              </Button>
              {activeProjectId && (
                <Button variant="ghost" size="sm" onClick={backToProjects} className="text-xs">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />Projects
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} data-testid="btn-theme">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              {/* Avatar */}
              <button
                onClick={() => setStep("account")}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "hsla(163,100%,42%,0.12)", color: "hsl(163,100%,42%)" }}
              >
                {authUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-foreground mb-1" data-testid="text-title">Scene Breakdown &amp; Shot List</h1>
            <p className="text-sm text-muted-foreground">Upload a manuscript or screenplay to scan for scenes and develop detailed breakdowns</p>
          </div>

          <div className="grid gap-6">
            {/* Source text */}
            <Card className="bg-card border-border" data-testid="card-upload">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />Manuscript / Screenplay Text
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={manuscriptText}
                  onChange={(e) => setManuscriptText(e.target.value)}
                  placeholder="Paste your screenplay or manuscript text here..."
                  className="min-h-[200px] bg-background border-border text-sm font-mono"
                  data-testid="input-manuscript"
                />
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <Input type="file" accept=".txt,.docx" className="hidden" onChange={handleFileUpload} data-testid="input-file" />
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Upload .txt / .docx</span>
                  </Label>
                  <span className="text-xs text-muted-foreground font-mono">{manuscriptText.length.toLocaleString()} chars</span>
                </div>
              </CardContent>
            </Card>

            {/* Source type */}
            <Card className="bg-card border-border" data-testid="card-source-type">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />Source Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant={sourceType === "screenplay" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setSourceType("screenplay")}
                    data-testid="btn-source-screenplay"
                    className="text-xs"
                  >
                    <Clapperboard className="w-3.5 h-3.5 mr-1" />Screenplay / Script
                  </Button>
                  <Button
                    variant={sourceType === "prose" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setSourceType("prose")}
                    data-testid="btn-source-prose"
                    className="text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />Prose Manuscript
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Provider */}
            <Card className="bg-card border-border" data-testid="card-provider">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />AI Provider
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  {PROVIDERS.map((p) => (
                    <Button
                      key={p.id}
                      variant={provider === p.id ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setProvider(p.id)}
                      data-testid={`btn-provider-${p.id}`}
                      className="text-xs"
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={currentProvider.keyPlaceholder}
                    className="bg-background border-border text-sm font-mono pr-10"
                    data-testid="input-api-key"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowKey(!showKey)}
                    data-testid="btn-toggle-key"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                {!currentProvider.supportsImages && (
                  <p className="text-[11px] text-muted-foreground">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {currentProvider.name} doesn&apos;t support image generation. Visuals will use OpenAI.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Scan button */}
            <Button
              size="lg"
              onClick={handleScan}
              disabled={scanning || !manuscriptText || !apiKey}
              className="w-full"
              data-testid="btn-scan"
            >
              {scanning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning for scenes...</>
              ) : (
                <><Clapperboard className="w-4 h-4 mr-2" />Scan for Scenes</>
              )}
            </Button>
          </div>
        </main>

        <PerplexityAttribution />
      </div>
    );
  }

  // ── IMPORT SCREEN ──
  if (step === "import") {
    const IMPORT_SOURCES = [
      { id: "characters", name: "Character Forge", icon: Users, desc: "Characters with portraits and profiles" },
      { id: "locations", name: "Location Forge", icon: MapPin, desc: "Locations with environment visuals" },
      { id: "props", name: "Props Forge", icon: Box, desc: "Props with reference images" },
    ];

    const handleSelectSource = async (src: typeof IMPORT_SOURCES[0]) => {
      setImportSource({ id: src.id, name: src.name, url: "", icon: src.id });
      setImportSubstep(2);
      setImportProjectsLoading(true);
      setImportError(null);
      try {
        const res = await apiRequest("GET", `/api/import/projects?source=${src.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load projects");
        // Accept { projects: [{id, name}] }, { projects: string[] }, or string[]
        const raw: any[] = Array.isArray(data) ? data : (data.projects || []);
        const projects: string[] = raw.map((p: any) =>
          typeof p === "string" ? p : (p?.name ?? String(p))
        );
        setImportProjects(projects);
      } catch (err: any) {
        setImportError(err.message);
        setImportProjects([]);
      }
      setImportProjectsLoading(false);
    };

    const handleSelectProject = async (project: string) => {
      setImportSelectedProject(project);
      setImportSubstep(3);
      setImportItemsLoading(true);
      setImportError(null);
      setImportSelectedItems(new Set());
      try {
        const res = await apiRequest("GET", `/api/import/items?source=${importSource!.id}&project=${encodeURIComponent(project)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load items");
        // Accept { characters: [...] } or { locations: [...] } or { props: [...] } or array
        let items: any[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else {
          const key = importSource!.id; // "characters", "locations", "props"
          items = data[key] || Object.values(data)[0] || [];
        }
        setImportItems(items);
      } catch (err: any) {
        setImportError(err.message);
        setImportItems([]);
      }
      setImportItemsLoading(false);
    };

    const handleImportSelected = () => {
      const toImport = importItems.filter((item) => importSelectedItems.has(item.name || item.id));
      const sourceId = importSource!.id as "characters" | "locations" | "props";
      const sourceName = importSource!.name;
      const now = new Date().toISOString();

      const newAssets: ImportedAsset[] = toImport.map((item) => ({
        source: sourceId,
        sourceName,
        name: item.name || item.id || "Unknown",
        projectName: importSelectedProject || "",
        profile: item.profile || {},
        images: item.images || {},
        importedAt: now,
      }));

      // Helper: extract the first image from an asset as a data URI
      const extractRefImage = (asset: ImportedAsset): string | null => {
        const rawImg = Object.values(asset.images)[0] as string | undefined;
        if (!rawImg) return null;
        return rawImg.startsWith("data:") ? rawImg : `data:image/png;base64,${rawImg}`;
      };

      // Deduplicate: replace existing assets with same name+source, append new ones
      let updatedCount = 0;
      let addedCount = 0;

      setImportedAssets((prev) => {
        const result = [...prev];
        for (const asset of newAssets) {
          const existingIdx = result.findIndex(
            (a) => a.name === asset.name && a.source === asset.source
          );
          if (existingIdx !== -1) {
            result[existingIdx] = asset;
            updatedCount++;
          } else {
            result.push(asset);
            addedCount++;
          }
        }
        return result;
      });

      // Deduplicate reference images in sync with asset dedup
      setReferenceImages((prev) => {
        const result = [...prev];
        for (const asset of newAssets) {
          const newRef = extractRefImage(asset);
          // Find old asset to locate its existing reference image
          const oldAsset = importedAssets.find(
            (a) => a.name === asset.name && a.source === asset.source
          );
          if (oldAsset) {
            const oldRef = extractRefImage(oldAsset);
            if (oldRef && newRef) {
              const oldIdx = result.indexOf(oldRef);
              if (oldIdx !== -1) {
                result[oldIdx] = newRef;
                continue;
              }
            }
          }
          // New asset — append its reference image
          if (newRef) {
            result.push(newRef);
          }
        }
        return result.slice(0, 6);
      });

      const parts: string[] = [];
      if (addedCount > 0) parts.push(`${addedCount} imported`);
      if (updatedCount > 0) parts.push(`${updatedCount} updated`);
      toast({ title: "Assets imported", description: `${parts.join(", ")}.` });
      setStep("dashboard");
    };

    return (
      <div className="min-h-screen" style={{ background: "hsl(225,15%,4%)" }} data-testid="import-page">
        {/* Header */}
        <header className="h-12 flex items-center px-4 gap-3 shrink-0" style={{ borderBottom: "1px solid hsl(225,10%,12%)" }}>
          <img src="./scene-forge-logo.png" alt="Scene Forge" className="w-7 h-7 rounded object-contain" />
          <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: "hsl(163,100%,42%)" }}>SCENE FORGE</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: "hsla(163,100%,42%,0.08)", border: "1px solid hsla(163,100%,42%,0.15)" }}>
            <Download className="w-3 h-3" style={{ color: "hsl(163,100%,42%)" }} />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "hsl(163,100%,42%)" }}>Import Assets</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setStep("dashboard")}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
            style={{ color: "hsl(220,5%,65%)", border: "1px solid hsl(225,10%,18%)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />Back to Dashboard
          </button>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6 text-[11px] font-mono" style={{ color: "hsl(220,5%,52%)" }}>
            <button
              onClick={() => { setImportSubstep(1); setImportSource(null); setImportProjects([]); setImportSelectedProject(null); setImportItems([]); setImportSelectedItems(new Set()); setImportError(null); }}
              className={importSubstep >= 1 ? "text-[#00d4aa]" : ""}
            >Source</button>
            {importSubstep >= 2 && <><span>/</span><button onClick={() => { setImportSubstep(2); setImportSelectedProject(null); setImportItems([]); setImportSelectedItems(new Set()); }} className={importSubstep >= 2 ? "text-[#00d4aa]" : ""}>{importSource?.name}</button></>}
            {importSubstep >= 3 && <><span>/</span><span style={{ color: "hsl(0,0%,85%)" }}>{importSelectedProject}</span></>}
          </div>

          {/* Step 1: Source Selection */}
          {importSubstep === 1 && (
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: "hsl(0,0%,92%)" }}>Choose Import Source</h2>
              <p className="text-xs mb-6" style={{ color: "hsl(220,5%,60%)" }}>Select a Forge module to import assets from.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {IMPORT_SOURCES.map((src) => {
                  const Icon = src.icon;
                  return (
                    <button
                      key={src.id}
                      onClick={() => handleSelectSource(src)}
                      className="rounded-xl p-5 text-left transition-all group"
                      style={{ background: "hsl(225,15%,10%)", border: "1px solid hsl(225,10%,18%)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(163,100%,42%)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(225,10%,18%)"; }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: "hsla(163,100%,42%,0.1)" }}>
                        <Icon className="w-5 h-5" style={{ color: "hsl(163,100%,42%)" }} />
                      </div>
                      <h3 className="text-sm font-semibold mb-1" style={{ color: "hsl(0,0%,92%)" }}>{src.name}</h3>
                      <p className="text-[11px]" style={{ color: "hsl(220,5%,58%)" }}>{src.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Project Selection */}
          {importSubstep === 2 && (
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: "hsl(0,0%,92%)" }}>Select Project</h2>
              <p className="text-xs mb-6" style={{ color: "hsl(220,5%,60%)" }}>Choose a project from {importSource?.name} to browse its assets.</p>
              {importError && (
                <div className="rounded-lg p-4 mb-4 flex items-start gap-2" style={{ background: "hsla(0,72%,50%,0.08)", border: "1px solid hsla(0,72%,50%,0.2)" }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(0,72%,65%)" }} />
                  <div>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: "hsl(0,72%,65%)" }}>Could not connect to {importSource?.name}</p>
                    <p className="text-[11px]" style={{ color: "hsl(220,5%,60%)" }}>{importError}</p>
                  </div>
                </div>
              )}
              {importProjectsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(163,100%,42%)" }} />
                </div>
              ) : importProjects.length === 0 && !importError ? (
                <div className="text-center py-16" style={{ color: "hsl(220,5%,52%)" }}>
                  <p className="text-sm">No projects found in {importSource?.name}.</p>
                  <p className="text-[11px] font-mono mt-1">Create a project there first, or check your account credentials.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {importProjects.map((proj) => (
                    <button
                      key={proj}
                      onClick={() => handleSelectProject(proj)}
                      className="w-full rounded-lg px-4 py-3 text-left flex items-center justify-between transition-all"
                      style={{ background: "hsl(225,15%,10%)", border: "1px solid hsl(225,10%,18%)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(163,100%,42%)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "hsl(225,10%,18%)"; }}
                    >
                      <span className="text-sm font-medium" style={{ color: "hsl(0,0%,90%)" }}>{proj}</span>
                      <ChevronRight className="w-4 h-4" style={{ color: "hsl(220,5%,50%)" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Item Selection */}
          {importSubstep === 3 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold" style={{ color: "hsl(0,0%,92%)" }}>Select Assets to Import</h2>
                {importItems.length > 0 && (
                  <button
                    className="text-[11px] font-mono"
                    style={{ color: "hsl(163,100%,42%)" }}
                    onClick={() => {
                      if (importSelectedItems.size === importItems.length) {
                        setImportSelectedItems(new Set());
                      } else {
                        setImportSelectedItems(new Set(importItems.map((it) => it.name || it.id)));
                      }
                    }}
                  >
                    {importSelectedItems.size === importItems.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              <p className="text-xs mb-5" style={{ color: "hsl(220,5%,60%)" }}>
                From <span style={{ color: "hsl(0,0%,85%)" }}>{importSelectedProject}</span> in {importSource?.name}
              </p>
              {importError && (
                <div className="rounded-lg p-4 mb-4 flex items-start gap-2" style={{ background: "hsla(0,72%,50%,0.08)", border: "1px solid hsla(0,72%,50%,0.2)" }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(0,72%,65%)" }} />
                  <p className="text-xs" style={{ color: "hsl(0,72%,65%)" }}>{importError}</p>
                </div>
              )}
              {importItemsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(163,100%,42%)" }} />
                </div>
              ) : importItems.length === 0 && !importError ? (
                <div className="text-center py-16" style={{ color: "hsl(220,5%,52%)" }}>
                  <p className="text-sm">No assets found in this project.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {importItems.map((item) => {
                    const itemKey = item.name || item.id || String(Math.random());
                    const isSelected = importSelectedItems.has(itemKey);
                    // images may be stored as full data URIs or raw base64 — normalise to full data URI
                    const rawImg = item.images ? (Object.values(item.images)[0] as string | undefined) : undefined;
                    const firstImg = rawImg
                      ? (rawImg.startsWith("data:") ? rawImg : `data:image/png;base64,${rawImg}`)
                      : undefined;
                    return (
                      <button
                        key={itemKey}
                        onClick={() => {
                          setImportSelectedItems((prev) => {
                            const next = new Set(prev);
                            if (next.has(itemKey)) next.delete(itemKey); else next.add(itemKey);
                            return next;
                          });
                        }}
                        className="w-full rounded-lg px-4 py-3 flex items-center gap-3 transition-all"
                        style={{
                          background: isSelected ? "hsla(163,100%,42%,0.08)" : "hsl(225,15%,10%)",
                          border: `1px solid ${isSelected ? "hsl(163,100%,42%)" : "hsl(225,10%,18%)"}`,
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
                          style={{
                            background: isSelected ? "hsl(163,100%,42%)" : "transparent",
                            border: `1px solid ${isSelected ? "hsl(163,100%,42%)" : "hsl(225,10%,32%)"}`,
                          }}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" style={{ color: "black" }} />}
                        </div>
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-md overflow-hidden shrink-0" style={{ background: "hsl(225,15%,16%)", border: "1px solid hsl(225,10%,22%)" }}>
                          {firstImg ? (
                            <img src={firstImg} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {importSource?.id === "characters" ? <Users className="w-4 h-4" style={{ color: "hsl(220,5%,40%)" }} /> :
                               importSource?.id === "locations" ? <MapPin className="w-4 h-4" style={{ color: "hsl(220,5%,40%)" }} /> :
                               <Box className="w-4 h-4" style={{ color: "hsl(220,5%,40%)" }} />}
                            </div>
                          )}
                        </div>
                        {/* Name */}
                        <span className="text-sm font-medium flex-1 text-left" style={{ color: "hsl(0,0%,90%)" }}>{item.name || itemKey}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {importSelectedItems.size > 0 && (
                <div className="mt-6">
                  <Button
                    onClick={handleImportSelected}
                    className="w-full gap-2 font-semibold bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black"
                  >
                    <Download className="w-4 h-4" />
                    Import {importSelectedItems.size} Asset{importSelectedItems.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── EXPANDED VIEW ──
  if (step === "expanded" && expandedScene && developedScenes[expandedScene]) {
    const dev = developedScenes[expandedScene];
    const profile = dev.profile;
    const images = dev.images;
    const sceneData = detectedScenes.find((s) => s.sceneNumber === expandedScene);

    return (
      <div className="min-h-screen bg-background" data-testid="expanded-page">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50" data-testid="header-expanded">
          <div className="max-w-[1600px] mx-auto px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="./scene-forge-logo.png" alt="Scene Forge" className="w-8 h-8 rounded-sm object-contain shrink-0" />
              <span className="font-semibold text-sm tracking-wide text-foreground">SCENE FORGE</span>
              <span className="text-[11px] font-mono text-muted-foreground">v4.2</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setExpandedScene(null); setStep("dashboard"); }} data-testid="btn-back">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back to Dashboard
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} data-testid="btn-theme-expanded">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              {/* Avatar */}
              <button
                onClick={() => setStep("account")}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "hsla(163,100%,42%,0.12)", color: "hsl(163,100%,42%)" }}
              >
                {authUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
              </button>
            </div>
          </div>
        </header>

        {/* Scene info bar */}
        <div className="border-b border-border bg-card/30 px-4 py-2">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-primary border-primary font-mono text-xs" data-testid="badge-scene-number">
                Scene #{expandedScene}
              </Badge>
              <span className="text-sm font-semibold text-foreground" data-testid="text-scene-name">{profile.sceneName}</span>
              {sceneData && (
                <span className="text-xs text-muted-foreground font-mono">{sceneData.location}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-primary"
                onClick={() => { if (sceneData) developScene(sceneData); }}
                disabled={analyzingScene === expandedScene || developingAll}
                title="Re-develop scene with latest AI analysis"
                data-testid="btn-redevelop-expanded"
              >
                {analyzingScene === expandedScene ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                Re-develop
              </Button>
              <Button variant="secondary" size="sm" className="text-xs" onClick={() => exportDocx(expandedScene)} disabled={exportingDocx} data-testid="btn-export-scene">
                <Download className="w-3.5 h-3.5 mr-1" />{exportingDocx ? "Exporting..." : "Export DOCX"}
              </Button>
            </div>
          </div>
        </div>

        <main className="max-w-[1600px] mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Profile data */}
            <div className="space-y-1 max-h-[calc(100vh-160px)] overflow-y-auto pr-2" data-testid="profile-panel">
              <Tabs defaultValue="1">
                <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent mb-3">
                  {PROFILE_SECTIONS.map((sec) => (
                    <TabsTrigger key={sec.num} value={String(sec.num)} className="text-xs px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid={`tab-section-${sec.num}`}>
                      {sec.num}. {sec.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {PROFILE_SECTIONS.map((sec) => (
                  <TabsContent key={sec.num} value={String(sec.num)} className="space-y-2">
                    <h3 className="text-sm font-bold text-primary mb-2" data-testid={`text-section-title-${sec.num}`}>
                      Section {sec.num}: {sec.title}
                    </h3>
                    {sec.fields.map((field) => {
                      const val = (profile as any)[field.key];
                      return (
                        <div key={field.key} className="space-y-0.5" data-testid={`field-${field.key}`}>
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{field.label}</Label>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{val || "—"}</p>
                        </div>
                      );
                    })}
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* RIGHT: Visual study */}
            <div className="space-y-4" data-testid="visual-panel">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Visual Scene Study</h3>
                <div className="flex items-center gap-2">
                  {Object.keys(images).length > 0 && (
                    <Button variant="secondary" size="sm" className="text-xs" onClick={downloadZip} data-testid="btn-download-zip">
                      <FolderDown className="w-3.5 h-3.5 mr-1" />ZIP
                    </Button>
                  )}
                </div>
              </div>

              {/* Style selector */}
              <div className="flex flex-wrap gap-1.5" data-testid="style-selector">
                {ART_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                      selectedStyle === style.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                    data-testid={`btn-style-${style.id}`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>

              {/* Reference images */}
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  <Input type="file" accept="image/*" multiple className="hidden" onChange={handleRefUpload} data-testid="input-ref-upload" />
                  <span className="flex items-center gap-1 text-[11px]"><Image className="w-3 h-3" />References ({referenceImages.length}/6)</span>
                </Label>
                {referenceImages.map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded bg-muted border border-border flex items-center justify-center">
                    <img src={`data:image/png;base64,${referenceImages[i]}`} className="w-full h-full object-cover rounded" alt={`ref-${i}`} />
                  </div>
                ))}
                {referenceImages.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2" onClick={() => setReferenceImages([])} data-testid="btn-clear-refs">Clear</Button>
                )}
              </div>

              {/* Info banner for scenes developed before dynamic panels */}
              {!parseShotPrompts(profile) && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3" data-testid="banner-legacy-panels">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      This scene was developed before dynamic shot panels were available. Re-develop the scene to generate panels matching your shot list.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] mt-1.5 h-6 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                      onClick={() => { if (sceneData) developScene(sceneData); }}
                      disabled={analyzingScene === expandedScene || developingAll}
                      data-testid="btn-redevelop-banner"
                    >
                      {analyzingScene === expandedScene ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                      Re-develop Scene
                    </Button>
                  </div>
                </div>
              )}

              {/* Dynamic panels from shot list, or legacy fallback */}
              {(() => {
                const dynamicPanels = parseShotPrompts(profile);
                const hasDynamic = dynamicPanels && dynamicPanels.length > 0;
                // Build the effective panel list: dynamic shot panels + custom scene panel at end
                const effectivePanels = hasDynamic
                  ? [
                      ...dynamicPanels.map((dp) => ({
                        key: dp.key,
                        label: dp.label,
                        sublabel: dp.sublabel,
                        prompt: dp.prompt,
                        isCustom: false,
                      })),
                      { key: "customScene", label: "Custom Scene", sublabel: "Director's Shot", prompt: "", isCustom: true },
                    ]
                  : VISUAL_PANELS_FALLBACK.map((p) => ({
                      key: p.key,
                      label: p.label,
                      sublabel: p.sublabel,
                      prompt: p.key === "customScene" ? "" : ((profile as any)[p.promptKey] || ""),
                      isCustom: p.key === "customScene",
                    }));
                const generatablePanels = effectivePanels.filter((p) => !p.isCustom);
                const panelCount = generatablePanels.length;

                return (
                  <>
                    {/* Generate all + Refresh panels */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={generateAllImages}
                        disabled={generatingAll || generatingImage !== null}
                        className="flex-1 text-xs"
                        data-testid="btn-generate-all"
                      >
                        {generatingAll ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Generating all panels...</>
                        ) : (
                          <><PlayCircle className="w-3.5 h-3.5 mr-1" />Generate All ({panelCount} panels)</>
                        )}
                      </Button>
                      {hasDynamic && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-primary"
                          onClick={refreshShotPanels}
                          disabled={refreshingPanels || generatingAll || generatingImage !== null}
                          title="Refresh panel definitions from current shot list (lightweight — does not re-analyze scene)"
                          data-testid="btn-refresh-panels"
                        >
                          {refreshingPanels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                    </div>

                    {/* Visual grid */}
                    <div className="grid grid-cols-2 gap-3" data-testid="visual-grid">
                      {effectivePanels.map((panel, idx) => {
                        const img = images[panel.key];
                        const isCustom = panel.isCustom;
                        const isAnchor = idx === 0 && !isCustom;
                        const prompt = isCustom ? customPrompt : panel.prompt;

                        return (
                          <div key={panel.key} className="relative group" data-testid={`visual-panel-${panel.key}`}>
                            <div className="aspect-square bg-muted/50 rounded-lg border border-border overflow-hidden relative">
                              {img ? (
                                <>
                                  <img
                                    src={`data:image/png;base64,${img}`}
                                    alt={panel.label}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="visual-label-overlay absolute bottom-0 left-0 right-0 p-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-[11px] font-semibold text-white">{panel.label}</p>
                                        <p className="text-[10px] text-white/60">{panel.sublabel}</p>
                                      </div>
                                      <div className="flex gap-1">
                                        {isAnchor && (
                                          <Badge className="text-[9px] bg-primary/90 text-primary-foreground" data-testid="badge-anchor">ANCHOR</Badge>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-white hover:text-primary"
                                          onClick={() => downloadImage(img, `scene_${expandedScene}_${panel.key}.png`)}
                                          data-testid={`btn-download-${panel.key}`}
                                        >
                                          <Download className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-2">
                                  {isCustom ? (
                                    <>
                                      <p className="text-[11px] font-semibold text-muted-foreground">{panel.label}</p>
                                      <Textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="Describe your custom shot..."
                                        className="text-[11px] min-h-[60px] bg-background/50 border-border"
                                        data-testid="input-custom-prompt"
                                      />
                                      <Button
                                        size="sm"
                                        className="text-[11px] w-full"
                                        onClick={() => generateImage("customScene", customPrompt)}
                                        disabled={!customPrompt || generatingImage === "customScene"}
                                        data-testid="btn-generate-custom"
                                      >
                                        {generatingImage === "customScene" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate"}
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Image className="w-6 h-6 text-muted-foreground/40" />
                                      <p className="text-[11px] font-semibold text-muted-foreground">{panel.label}</p>
                                      <p className="text-[10px] text-muted-foreground/60">{panel.sublabel}</p>
                                      {isAnchor && (
                                        <Badge variant="outline" className="text-[9px]" data-testid="badge-anchor-empty">ANCHOR</Badge>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="text-[11px]"
                                        onClick={() => generateImage(panel.key, prompt)}
                                        disabled={generatingImage === panel.key}
                                        data-testid={`btn-generate-${panel.key}`}
                                      >
                                        {generatingImage === panel.key ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate"}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Hover action buttons */}
                            {!isCustom && (
                              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {panel.key.startsWith("shot_") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[10px] bg-background/80"
                                    onClick={() => {
                                      const num = parseInt(panel.key.replace("shot_", ""));
                                      if (!isNaN(num)) refreshSingleShotPrompt(num);
                                    }}
                                    disabled={refreshingShotPrompt === panel.key}
                                    title="Refresh this shot's image prompt"
                                    data-testid={`btn-refresh-prompt-${panel.key}`}
                                  >
                                    {refreshingShotPrompt === panel.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                  </Button>
                                )}
                                {prompt && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[10px] bg-background/80"
                                    onClick={() => { setMidjourneyPrompt(prompt); setShowMidjourneyDialog(true); }}
                                    data-testid={`btn-midjourney-${panel.key}`}
                                  >
                                    <Copy className="w-3 h-3 mr-0.5" />MJ
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </main>

        {/* Midjourney dialog */}
        {showMidjourneyDialog && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowMidjourneyDialog(false)} data-testid="midjourney-dialog">
            <div className="bg-card border border-border rounded-lg p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold mb-2">Midjourney Prompt</h3>
              <Textarea
                value={midjourneyPrompt}
                readOnly
                className="min-h-[120px] text-xs font-mono bg-background"
                data-testid="textarea-midjourney"
              />
              <div className="flex justify-end gap-2 mt-3">
                <MJCopyButton text={midjourneyPrompt} />
                <Button variant="secondary" size="sm" onClick={() => setShowMidjourneyDialog(false)} data-testid="btn-close-mj">Close</Button>
              </div>
            </div>
          </div>
        )}

        <PerplexityAttribution />
      </div>
    );
  }

  // ── DASHBOARD ──
  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-page">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50" data-testid="header-dashboard">
        <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="./scene-forge-logo.png" alt="Scene Forge" className="w-8 h-8 rounded-sm object-contain shrink-0" />
            <span className="font-semibold text-sm tracking-wide text-foreground">SCENE FORGE</span>
            <span className="text-[11px] font-mono text-muted-foreground">v4.2</span>
            {activeProjectName && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline">— {activeProjectName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground" data-testid="text-progress">
              {developedCount} of {detectedScenes.length} developed
            </span>
            {developedCount > 0 && (
              <Button variant="secondary" size="sm" className="text-xs" onClick={exportAllDocx} disabled={exportingDocx} data-testid="btn-export-all">
                <Download className="w-3.5 h-3.5 mr-1" />{exportingDocx ? "Exporting..." : "Export All DOCX"}
              </Button>
            )}
            <Button
              variant="ghost" size="sm" className="text-xs gap-1"
              onClick={() => { setImportSubstep(1); setImportSource(null); setImportProjects([]); setImportSelectedProject(null); setImportItems([]); setImportSelectedItems(new Set()); setImportError(null); setStep("import"); }}
              data-testid="btn-import-assets"
            >
              <Download className="w-3.5 h-3.5" />Import Assets
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep("upload")} data-testid="btn-new-scan">
              New Scan
            </Button>
            {activeProjectId && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={backToProjects} data-testid="btn-projects">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />Projects
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} data-testid="btn-theme-dash">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {/* Avatar */}
            <button
              onClick={() => setStep("account")}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "hsla(163,100%,42%,0.12)", color: "hsl(163,100%,42%)" }}
            >
              {authUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
            </button>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {detectedScenes.length > 0 && (
        <div className="border-b border-border bg-card/20 px-4 py-2">
          <div className="max-w-[1400px] mx-auto">
            <Progress value={(developedCount / detectedScenes.length) * 100} className="h-1.5" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-border bg-card/10 px-4 py-2">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {(["all", "short", "medium", "long"] as const).map((len) => (
              <button
                key={len}
                onClick={() => setFilterLength(len)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterLength === len ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
                data-testid={`btn-filter-${len}`}
              >
                {len === "all" ? "All" : len.charAt(0).toUpperCase() + len.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy(sortBy === "number" ? "name" : "number")}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              data-testid="btn-sort"
            >
              <ArrowUpDown className="w-3 h-3" />Sort: {sortBy === "number" ? "Scene #" : "Name"}
            </button>
            <Button
              size="sm"
              className="text-xs"
              onClick={developAll}
              disabled={developingAll || developedCount === detectedScenes.length}
              data-testid="btn-develop-all"
            >
              {developingAll ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Developing...</>
              ) : (
                <><PlayCircle className="w-3.5 h-3.5 mr-1" />Develop All</>
              )}
            </Button>
            {failedCount > 0 && !developingAll && (
              <Button
                size="sm"
                variant="destructive"
                className="text-xs"
                onClick={retryFailed}
                data-testid="btn-retry-failed"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />Retry {failedCount} Failed
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Scene cards grid */}
      <main className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" data-testid="scene-grid">
          {filteredScenes.map((scene) => {
            const isDeveloped = !!developedScenes[scene.sceneNumber];
            const isFailed = !!failedScenes[scene.sceneNumber];
            const isAnalyzing = analyzingScene === scene.sceneNumber;
            const lengthColor = scene.estimatedLength === "long" ? "text-orange-400" : scene.estimatedLength === "medium" ? "text-yellow-400" : "text-green-400";

            return (
              <Card
                key={scene.sceneNumber}
                className={`bg-card border-border hover:border-primary/30 transition-colors ${isDeveloped ? "card-developed" : ""} ${isFailed ? "border-destructive/50" : ""}`}
                data-testid={`card-scene-${scene.sceneNumber}`}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary" data-testid={`text-scene-num-${scene.sceneNumber}`}>
                        #{scene.sceneNumber}
                      </span>
                      <Badge variant={isDeveloped ? "default" : isFailed ? "destructive" : "secondary"} className="text-[10px]" data-testid={`badge-status-${scene.sceneNumber}`}>
                        {isDeveloped ? <><CheckCircle2 className="w-3 h-3 mr-0.5" />Developed</> : isFailed ? <><AlertCircle className="w-3 h-3 mr-0.5" />Failed</> : "Pending"}
                      </Badge>
                    </div>
                    <span className={`text-[10px] font-mono ${lengthColor}`} data-testid={`badge-length-${scene.sceneNumber}`}>
                      {scene.estimatedLength.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-foreground leading-tight" data-testid={`text-scene-name-${scene.sceneNumber}`}>
                    {scene.sceneName}
                  </h4>

                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />{scene.location}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />{scene.timeOfDay}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3 shrink-0" />{scene.charactersPresentList}
                    </p>
                  </div>

                  <p className="text-[11px] text-muted-foreground/80 line-clamp-2">{scene.briefSummary}</p>

                  {isFailed && (
                    <p className="text-[10px] text-destructive line-clamp-2">{failedScenes[scene.sceneNumber]}</p>
                  )}

                  <div className="pt-1">
                    {isDeveloped ? (
                      <div className="flex gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => { setExpandedScene(scene.sceneNumber); setStep("expanded"); }}
                          data-testid={`btn-view-${scene.sceneNumber}`}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />View Profile
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs px-2 text-muted-foreground hover:text-primary"
                          onClick={() => developScene(scene)}
                          disabled={isAnalyzing || developingAll}
                          title="Re-develop scene with latest AI analysis"
                          data-testid={`btn-redevelop-${scene.sceneNumber}`}
                        >
                          {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant={isFailed ? "destructive" : "default"}
                        className="w-full text-xs"
                        onClick={() => developScene(scene)}
                        disabled={isAnalyzing || developingAll}
                        data-testid={`btn-develop-${scene.sceneNumber}`}
                      >
                        {isAnalyzing ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Developing...</>
                        ) : isFailed ? (
                          <><RotateCcw className="w-3.5 h-3.5 mr-1" />Retry</>
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5 mr-1" />Develop</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Reference Library */}
        {importedAssets.length > 0 && (
          <div className="mt-8 max-w-[1400px]">
            <div className="flex items-center gap-2 mb-3">
              <button
                className="flex items-center gap-2 text-left flex-1"
                onClick={() => setImportRefLibOpen((v) => !v)}
              >
                <span className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: "hsl(163,100%,42%)" }}>Reference Library</span>
                <span className="text-[10px] font-mono" style={{ color: "hsl(220,5%,52%)" }}>({importedAssets.length} asset{importedAssets.length !== 1 ? "s" : ""})</span>
                <ChevronDown className="w-3.5 h-3.5 ml-1 transition-transform" style={{ color: "hsl(220,5%,52%)", transform: importRefLibOpen ? "rotate(0deg)" : "rotate(-90deg)" }} />
              </button>
              <button
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono hover:bg-destructive/20 transition-colors"
                style={{ color: "hsl(0,70%,60%)" }}
                onClick={() => {
                  if (confirm("Clear all imported assets? This cannot be undone.")) {
                    setImportedAssets([]);
                    setReferenceImages([]);
                  }
                }}
                title="Clear all imported assets"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            </div>
            {importRefLibOpen && (
              <div className="space-y-4">
                {(["characters", "locations", "props"] as const).map((srcType) => {
                  const group = importedAssets.filter((a) => a.source === srcType);
                  if (group.length === 0) return null;
                  const srcLabel = srcType === "characters" ? "Characters" : srcType === "locations" ? "Locations" : "Props";
                  const SrcIcon = srcType === "characters" ? Users : srcType === "locations" ? MapPin : Box;
                  return (
                    <div key={srcType}>
                      <div className="flex items-center gap-2 mb-2">
                        <SrcIcon className="w-3.5 h-3.5" style={{ color: "hsl(163,100%,42%)" }} />
                        <span className="text-[11px] font-mono font-semibold tracking-wider uppercase" style={{ color: "hsl(220,5%,62%)" }}>{srcLabel}</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {group.map((asset, i) => {
                          const firstImage = Object.values(asset.images)[0] as string | undefined;
                          return (
                            <div key={i} className="flex flex-col items-center gap-1 relative group" style={{ width: 72 }}>
                              <button
                                className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const key = `${asset.source}::${asset.name}`;
                                  // Remove matching reference image by comparing the asset's first image
                                  const rawImg = Object.values(asset.images)[0] as string | undefined;
                                  if (rawImg) {
                                    const refStr = rawImg.startsWith("data:") ? rawImg : `data:image/png;base64,${rawImg}`;
                                    setReferenceImages((prev) => {
                                      const idx = prev.indexOf(refStr);
                                      return idx !== -1 ? prev.filter((_, j) => j !== idx) : prev;
                                    });
                                  }
                                  setImportedAssets((prev) => prev.filter((a) => `${a.source}::${a.name}` !== key));
                                }}
                                title={`Remove ${asset.name}`}
                              >
                                <X className="w-2.5 h-2.5 text-white" />
                              </button>
                              <div className="w-16 h-16 rounded-lg overflow-hidden border" style={{ borderColor: "hsl(225,10%,18%)", background: "hsl(225,15%,10%)" }}>
                                {firstImage ? (
                                  <img src={`data:image/png;base64,${firstImage}`} alt={asset.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <SrcIcon className="w-5 h-5" style={{ color: "hsl(220,5%,35%)" }} />
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-center leading-tight line-clamp-2" style={{ color: "hsl(220,5%,75%)", maxWidth: 72 }}>{asset.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-10 max-w-3xl mx-auto">
          <h2 className="text-sm font-mono font-semibold tracking-wider uppercase mb-4 text-muted-foreground">
            Frequently Asked Questions
          </h2>
          {[
            {
              q: "What is Scene Forge?",
              a: "Scene Forge is an AI-powered scene development tool that scans screenplays and prose manuscripts, breaks them into individual scenes, and generates comprehensive 10-section production profiles covering identity, dramatic purpose, characters, dialogue, blocking, shot lists, lighting, sound, VFX, and emotional mapping."
            },
            {
              q: "Does this generate images or video?",
              a: "Scene Forge generates 5-panel visual scene studies — storyboard-quality images that capture master shots, dramatic moments, character coverage, detail inserts, and lighting studies. It does NOT generate video. For video prompt translation, see Prompt Cinematographer."
            },
            {
              q: "How does scene detection work?",
              a: "The AI reads your full manuscript or screenplay text and identifies every distinct scene based on location changes, time jumps, and dramatic beat shifts. For screenplays, it uses INT./EXT. headings as anchors. For prose, it analyzes narrative structure to find scene boundaries."
            },
            {
              q: "What AI providers are supported?",
              a: "Scene Forge supports OpenAI (GPT-4o), Anthropic (Claude), and Google AI (Gemini). OpenAI and Google also support image generation for the visual scene studies. You provide your own API key — keys are never stored."
            },
            {
              q: "What is the Visual Scene Study?",
              a: "Each developed scene includes a 5-panel visual study: Master Shot (establishing), Key Dramatic Moment, Character Coverage, Detail Insert, and Lighting Study. Choose from 10 art styles (Cinematic, Photorealistic, Pixar, Anime, and more) and optionally upload reference images for visual consistency."
            },
            {
              q: "Can I export scene profiles?",
              a: "Yes. Export individual scene profiles or all developed scenes as DOCX files. The export includes all 10 sections plus any generated visual study images embedded in the document."
            },
          ].map((faq, i) => (
            <details key={i} className="group mb-2 rounded-lg bg-card border border-border">
              <summary className="flex items-center justify-between cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
                {faq.q}
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-3 text-xs leading-relaxed text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>

        {/* Cross-Promotion: The Forge Suite */}
        <div className="mt-10 max-w-4xl mx-auto">
          <h2 className="text-sm font-mono font-semibold tracking-wider uppercase mb-2 text-muted-foreground">
            The Forge Suite
          </h2>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Scene Forge is part of a complete AI production toolkit by Little Red Apple Productions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                name: "Character Forge",
                url: "https://character.littleredappleproductions.com",
                icon: Users,
                desc: "AI-powered character development with multi-panel portrait studies and 11 art styles."
              },
              {
                name: "Location Forge",
                url: "https://location.littleredappleproductions.com",
                icon: MapPin,
                desc: "AI-powered location scouting and environment visualization for film production."
              },
              {
                name: "Manuscript Forge",
                url: "https://manuscript.littleredappleproductions.com",
                icon: FileText,
                desc: "Production readiness analysis for screenplays — story structure, character arcs, pacing, and dialogue."
              },
              {
                name: "Props Forge",
                url: "https://props.littleredappleproductions.com",
                icon: Box,
                desc: "AI-powered prop identification and visual development from manuscript analysis."
              },
              {
                name: "Story Forge",
                url: "https://story-forge.littleredappleproductions.com",
                icon: BookOpen,
                desc: "AI-assisted story development and screenplay writing with structured narrative tools."
              },
              {
                name: "Sound Forge",
                url: "https://github.com/wbraddock-edu/sound-forge",
                icon: Mic,
                desc: "AI-powered sound design — dialogue, ambience, foley, music cues, and scene sound profiles."
              },
              {
                name: "Production Forge",
                url: "https://github.com/wbraddock-edu/production-forge",
                icon: Video,
                desc: "Unified production pipeline — clip generation, voice performance, and motion animation."
              },
              {
                name: "Prompt Cinematographer",
                url: "https://github.com/wbraddock-edu/prompt-cinematographer",
                icon: Camera,
                desc: "Shot translation engine — converts cinematography language into AI video platform prompts."
              },
            ].map((mod) => (
              <a
                key={mod.name}
                href={mod.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg p-4 bg-card border border-border hover:border-[#00d4aa]/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <mod.icon className="w-4 h-4 text-[#00d4aa]" />
                  <span className="text-xs font-semibold text-foreground">{mod.name}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {mod.desc}
                </p>
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="py-6 mt-6 border-t border-border">
          <p className="text-xs text-muted-foreground/50 text-center font-mono tracking-wide">
            Created with the Assistance of AI &copy; 2026{" "}
            <a href="https://littleredappleproductions.com" target="_blank" rel="noopener" className="text-[#00d4aa]/60 hover:text-[#00d4aa]">
              Little Red Apple Productions
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Account Page Component ──
interface AccountPageProps {
  authUser: { id: number; email: string; displayName: string } | null;
  subStatus: any;
  billingCycle: "monthly" | "yearly";
  setBillingCycle: (v: "monthly" | "yearly") => void;
  checkoutLoading: boolean;
  setCheckoutLoading: (v: boolean) => void;
  googleApiKey: string;
  setGoogleApiKey: (v: string) => void;
  showGoogleApiKey: boolean;
  setShowGoogleApiKey: (v: boolean) => void;
  savingApiKey: boolean;
  setSavingApiKey: (v: boolean) => void;
  onBack: () => void;
  onLogout: () => void;
}

function AccountPage({
  authUser,
  subStatus,
  billingCycle,
  setBillingCycle,
  checkoutLoading,
  setCheckoutLoading,
  googleApiKey,
  setGoogleApiKey,
  showGoogleApiKey,
  setShowGoogleApiKey,
  savingApiKey,
  setSavingApiKey,
  onBack,
  onLogout,
}: AccountPageProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Account sub-header */}
      <div className="h-12 flex items-center px-4 gap-3" style={{ borderBottom: "1px solid hsl(225,10%,12%)" }}>
        <button onClick={onBack} className="p-1 rounded" style={{ color: "hsl(220,5%,52%)" }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono" style={{ color: "hsl(220,5%,52%)" }}>Account</span>
        <div className="flex-1" />
        <button
          onClick={onLogout}
          className="text-[10px] font-mono px-3 py-1 rounded flex items-center gap-1.5"
          style={{ color: "hsl(220,5%,52%)", border: "1px solid hsl(225,10%,14%)" }}
        >
          <LogOut className="w-3 h-3" /> Sign Out
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="rounded-lg p-6 mb-6" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "hsla(163,100%,42%,0.12)", color: "hsl(163,100%,42%)" }}>
              {authUser?.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold" style={{ color: "hsl(180,5%,88%)" }}>{authUser?.displayName}</h1>
              <p className="text-sm font-mono" style={{ color: "hsl(220,5%,52%)" }}>{authUser?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {subStatus?.isAdmin ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono" style={{ background: "hsla(280,80%,65%,0.08)", color: "hsl(280,80%,65%)" }}>
                    <Crown className="w-3 h-3" /> Creator
                  </div>
                ) : subStatus?.subscriptionActive ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono" style={{ background: "hsla(163,100%,42%,0.08)", color: "hsl(163,100%,42%)" }}>
                    <CheckCircle2 className="w-3 h-3" /> Active Subscriber
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono" style={{ background: "hsla(163,100%,42%,0.08)", color: "hsl(163,100%,42%)" }}>
                    <Clock className="w-3 h-3" /> Trial · {subStatus?.trialDaysRemaining ?? 7} day{(subStatus?.trialDaysRemaining ?? 7) !== 1 ? "s" : ""} left
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Google AI Key Section */}
        <div className="rounded-lg p-5 mb-6" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4" style={{ color: "hsl(163,100%,42%)" }} />
            <h2 className="text-xs font-mono font-semibold tracking-wider uppercase" style={{ color: "hsl(220,5%,52%)" }}>Google AI API Key</h2>
          </div>
          <p className="text-xs mb-3" style={{ color: "hsl(220,5%,52%)" }}>
            Used for AI scene analysis. Get your key at{" "}
            <a href="https://aistudio.google.com" target="_blank" rel="noopener" className="text-[#00d4aa]/80 hover:text-[#00d4aa]">
              aistudio.google.com
            </a>
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showGoogleApiKey ? "text" : "password"}
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                placeholder="AIza..."
                className="text-sm font-mono pr-10"
                style={{ background: "hsl(225,12%,10%)", borderColor: "hsl(225,10%,22%)", color: "hsl(0,0%,95%)" }}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: "hsl(220,5%,52%)" }}
                onClick={() => setShowGoogleApiKey(!showGoogleApiKey)}
              >
                {showGoogleApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              size="sm"
              className="bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black font-semibold text-xs"
              disabled={savingApiKey || !googleApiKey.trim()}
              onClick={async () => {
                setSavingApiKey(true);
                // Local save only — keys are stored client-side per session
                setTimeout(() => setSavingApiKey(false), 800);
              }}
            >
              {savingApiKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </Button>
          </div>
        </div>

        {/* Upgrade Section */}
        {subStatus && !subStatus.subscriptionActive && !subStatus.isAdmin && (
          <div className="rounded-lg overflow-hidden mb-6" style={{ border: "1px solid hsl(225,10%,12%)" }}>
            <div className="p-5" style={{ background: "linear-gradient(135deg, hsla(163,100%,42%,0.06), hsla(163,100%,42%,0.02))" }}>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4" style={{ color: "hsl(163,100%,42%)" }} />
                <h2 className="text-sm font-semibold" style={{ color: "hsl(180,5%,88%)" }}>
                  {!subStatus.canAccess ? "Your trial has ended" : "Upgrade to Scene Forge Pro"}
                </h2>
              </div>
              <p className="text-xs" style={{ color: "hsl(220,5%,60%)" }}>
                {!subStatus.canAccess
                  ? "Subscribe to continue developing scenes with AI-powered profiles and visual studies."
                  : "Unlock unlimited scene development after your trial ends."
                }
              </p>
            </div>
            <div className="px-5 pt-4">
              <div className="flex items-center justify-center gap-1 p-1 rounded-lg" style={{ background: "hsl(225,15%,4%)" }}>
                <button
                  className="flex-1 text-center py-2 rounded-md text-xs font-mono font-semibold transition-colors"
                  style={{ background: billingCycle === "monthly" ? "hsl(225,18%,8%)" : "transparent", color: billingCycle === "monthly" ? "hsl(180,5%,88%)" : "hsl(220,5%,40%)" }}
                  onClick={() => setBillingCycle("monthly")}
                >
                  Monthly
                </button>
                <button
                  className="flex-1 text-center py-2 rounded-md text-xs font-mono font-semibold transition-colors relative"
                  style={{ background: billingCycle === "yearly" ? "hsl(225,18%,8%)" : "transparent", color: billingCycle === "yearly" ? "hsl(180,5%,88%)" : "hsl(220,5%,40%)" }}
                  onClick={() => setBillingCycle("yearly")}
                >
                  Yearly <span className="ml-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: "hsla(163,100%,42%,0.12)", color: "hsl(163,100%,42%)" }}>SAVE 17%</span>
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="text-center mb-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold font-mono tabular-nums" style={{ color: "hsl(163,100%,42%)" }}>${billingCycle === "yearly" ? "299" : "29.99"}</span>
                  <span className="text-sm font-mono" style={{ color: "hsl(220,5%,40%)" }}>/{billingCycle === "yearly" ? "year" : "month"}</span>
                </div>
                {billingCycle === "yearly" && <p className="text-[10px] font-mono mt-1" style={{ color: "hsl(220,5%,52%)" }}>$24.92/mo · Save $60.88/year</p>}
              </div>
              <div className="space-y-2 mb-5">
                {[
                  "Unlimited scene scanning & development",
                  "AI-powered 10-section scene profiles",
                  "5-panel visual scene studies",
                  "Shot list generation",
                  "Multi-project workspace with auto-save",
                  "DOCX export & ZIP image download",
                  "10 art styles with reference image support",
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: "hsl(163,100%,42%)" }} />
                    <span className="text-xs" style={{ color: "hsl(220,5%,65%)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full h-10 font-mono font-semibold text-sm bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-black"
                onClick={async () => {
                  setCheckoutLoading(true);
                  try {
                    const priceId = billingCycle === "yearly" ? "price_yearly" : "price_monthly";
                    const res = await apiRequest("POST", "/api/stripe/create-checkout", { priceId });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  } catch {} finally { setCheckoutLoading(false); }
                }}
                disabled={checkoutLoading}
              >
                <Zap className="w-4 h-4 mr-2" />
                {checkoutLoading ? "Redirecting..." : `Subscribe — $${billingCycle === "yearly" ? "299/yr" : "29.99/mo"}`}
              </Button>
              <p className="text-[9px] font-mono text-center mt-3" style={{ color: "hsl(220,5%,30%)" }}>Secure payment via Stripe. Cancel anytime.</p>
            </div>
          </div>
        )}

        {/* Account Details */}
        <div className="rounded-lg p-5 mb-6" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
          <h2 className="text-xs font-mono font-semibold tracking-wider uppercase mb-3" style={{ color: "hsl(220,5%,52%)" }}>Account Details</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid hsl(225,10%,10%)" }}>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "hsl(220,5%,40%)" }}>Name</span>
              <span className="text-xs font-mono" style={{ color: "hsl(180,5%,88%)" }}>{authUser?.displayName}</span>
            </div>
            <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid hsl(225,10%,10%)" }}>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "hsl(220,5%,40%)" }}>Email</span>
              <span className="text-xs font-mono" style={{ color: "hsl(180,5%,88%)" }}>{authUser?.email}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "hsl(220,5%,40%)" }}>Status</span>
              <span className="text-xs font-mono" style={{ color: "hsl(163,100%,42%)" }}>
                {subStatus?.isAdmin ? "Creator" : subStatus?.subscriptionActive ? "Active" : `Trial · ${subStatus?.trialDaysRemaining ?? 7}d left`}
              </span>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="rounded-lg p-4" style={{ background: "hsl(225,18%,6%)", border: "1px solid hsl(225,10%,12%)" }}>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-mono transition-colors hover:bg-red-500/10"
            style={{ color: "hsl(0,72%,65%)", border: "1px solid hsl(0,60%,30%)" }}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Midjourney copy button ──
function MJCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textarea = document.querySelector("[data-testid='textarea-midjourney']") as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.select();
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button variant="default" size="sm" onClick={handleCopy} data-testid="btn-copy-mj">
      {copied ? <><Check className="w-3.5 h-3.5 mr-1" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
    </Button>
  );
}
