import { useState, useCallback } from "react";
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
import { apiRequest } from "@/lib/queryClient";
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
  LayoutGrid,
  PlayCircle,
  Filter,
  ArrowUpDown,
  MapPin,
  Clock,
  Users,
} from "lucide-react";
import type { DetectedScene, SceneProfile } from "@shared/schema";
import { ART_STYLES } from "@shared/schema";
import { DEMO_SCENES, DEMO_PROFILE } from "@/lib/demo-data";

type Step = "upload" | "configure" | "dashboard" | "analyzing" | "expanded";

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

const VISUAL_PANELS = [
  { key: "masterShot", label: "Master Shot", sublabel: "Establishing", promptKey: "visualMasterShot" },
  { key: "dramaticMoment", label: "Key Moment", sublabel: "Drama", promptKey: "visualDramaticMoment" },
  { key: "characterCoverage", label: "Character Coverage", sublabel: "Performance", promptKey: "visualCharacterCoverage" },
  { key: "detailInsert", label: "Detail Insert", sublabel: "Focus", promptKey: "visualDetailInsert" },
  { key: "lightingStudy", label: "Lighting Study", sublabel: "Mood", promptKey: "visualLightingStudy" },
  { key: "customScene", label: "Custom Scene", sublabel: "Director's Shot", promptKey: "" },
];

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

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

  // Loading
  const [scanning, setScanning] = useState(false);
  const [analyzingScene, setAnalyzingScene] = useState<string | null>(null);
  const [developingAll, setDevelopingAll] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // Visual study
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0].id);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [midjourneyPrompt, setMidjourneyPrompt] = useState("");
  const [showMidjourneyDialog, setShowMidjourneyDialog] = useState(false);

  // Dashboard filters
  const [filterLength, setFilterLength] = useState<"all" | "short" | "medium" | "long">("all");
  const [sortBy, setSortBy] = useState<"number" | "name">("number");

  const currentProvider = PROVIDERS.find((p) => p.id === provider)!;
  const imageProvider = provider === "anthropic" ? "openai" : provider;
  const developedCount = Object.keys(developedScenes).length;

  // File upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith(".txt")) {
      const text = await file.text();
      setManuscriptText(text);
    } else if (file.name.endsWith(".docx")) {
      const formData = new FormData();
      formData.append("file", file);
      const arrayBuf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
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

  // Load demo
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
      toast({ title: "Development failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzingScene(null);
    }
  }, [manuscriptText, sourceType, provider, apiKey, toast]);

  // Develop all scenes
  const developAll = useCallback(async () => {
    setDevelopingAll(true);
    const undeveloped = detectedScenes.filter((s) => !developedScenes[s.sceneNumber]);
    for (const scene of undeveloped) {
      try {
        await developScene(scene);
        // 5s delay between calls
        if (undeveloped.indexOf(scene) < undeveloped.length - 1) {
          await new Promise((r) => setTimeout(r, 5000));
        }
      } catch {
        // Auto-retry once after 5s
        await new Promise((r) => setTimeout(r, 5000));
        try {
          await developScene(scene);
        } catch {
          // Skip and continue
        }
      }
    }
    setDevelopingAll(false);
  }, [detectedScenes, developedScenes, developScene]);

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

  // Generate all images (skip custom)
  const generateAllImages = useCallback(async () => {
    if (!expandedScene || !developedScenes[expandedScene]) return;
    setGeneratingAll(true);
    const profile = developedScenes[expandedScene].profile;
    const panels = VISUAL_PANELS.filter((p) => p.key !== "customScene");
    for (const panel of panels) {
      const prompt = (profile as any)[panel.promptKey];
      if (!prompt) continue;
      await generateImage(panel.key, prompt);
      if (panels.indexOf(panel) < panels.length - 1) {
        await new Promise((r) => setTimeout(r, 8000));
      }
    }
    setGeneratingAll(false);
  }, [expandedScene, developedScenes, generateImage]);

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

  // ── UPLOAD STEP ──
  if (step === "upload" || step === "configure") {
    return (
      <div className="min-h-screen bg-background" data-testid="upload-page">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50" data-testid="header">
          <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="./lrap-logo.jpg" alt="LRAP" className="w-8 h-8 rounded-sm object-contain shrink-0" data-testid="logo" />
              <span className="font-semibold text-sm tracking-wide text-foreground">SCENE FORGE</span>
              <span className="text-[11px] font-mono text-muted-foreground">v4.2</span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">— by Little Red Apple Productions</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={loadDemo} data-testid="btn-demo" className="text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" />Demo
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} data-testid="btn-theme">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-foreground mb-1" data-testid="text-title">Scene Breakdown & Shot List</h1>
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
                    {currentProvider.name} doesn't support image generation. Visuals will use OpenAI.
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
              <img src="./lrap-logo.jpg" alt="LRAP" className="w-8 h-8 rounded-sm object-contain shrink-0" />
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

              {/* Generate all */}
              <Button
                size="sm"
                onClick={generateAllImages}
                disabled={generatingAll || generatingImage !== null}
                className="w-full text-xs"
                data-testid="btn-generate-all"
              >
                {generatingAll ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Generating all panels...</>
                ) : (
                  <><PlayCircle className="w-3.5 h-3.5 mr-1" />Generate All (5 panels)</>
                )}
              </Button>

              {/* 2x3 visual grid */}
              <div className="grid grid-cols-2 gap-3" data-testid="visual-grid">
                {VISUAL_PANELS.map((panel) => {
                  const img = images[panel.key];
                  const isCustom = panel.key === "customScene";
                  const isAnchor = panel.key === "masterShot";
                  const prompt = isCustom ? customPrompt : (profile as any)[panel.promptKey] || "";

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

                      {/* Midjourney prompt copy */}
                      {prompt && !isCustom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-1 right-1 h-6 px-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                          onClick={() => { setMidjourneyPrompt(prompt); setShowMidjourneyDialog(true); }}
                          data-testid={`btn-midjourney-${panel.key}`}
                        >
                          <Copy className="w-3 h-3 mr-0.5" />MJ
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
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
            <img src="./lrap-logo.jpg" alt="LRAP" className="w-8 h-8 rounded-sm object-contain shrink-0" />
            <span className="font-semibold text-sm tracking-wide text-foreground">SCENE FORGE</span>
            <span className="text-[11px] font-mono text-muted-foreground">v4.2</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">— by Little Red Apple Productions</span>
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
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep("upload")} data-testid="btn-new-scan">
              New Scan
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} data-testid="btn-theme-dash">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
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
          </div>
        </div>
      </div>

      {/* Scene cards grid */}
      <main className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" data-testid="scene-grid">
          {filteredScenes.map((scene) => {
            const isDeveloped = !!developedScenes[scene.sceneNumber];
            const isAnalyzing = analyzingScene === scene.sceneNumber;
            const lengthColor = scene.estimatedLength === "long" ? "text-orange-400" : scene.estimatedLength === "medium" ? "text-yellow-400" : "text-green-400";

            return (
              <Card
                key={scene.sceneNumber}
                className={`bg-card border-border hover:border-primary/30 transition-colors ${isDeveloped ? "card-developed" : ""}`}
                data-testid={`card-scene-${scene.sceneNumber}`}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary" data-testid={`text-scene-num-${scene.sceneNumber}`}>
                        #{scene.sceneNumber}
                      </span>
                      <Badge variant={isDeveloped ? "default" : "secondary"} className="text-[10px]" data-testid={`badge-status-${scene.sceneNumber}`}>
                        {isDeveloped ? <><CheckCircle2 className="w-3 h-3 mr-0.5" />Developed</> : "Pending"}
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

                  <div className="pt-1">
                    {isDeveloped ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => { setExpandedScene(scene.sceneNumber); setStep("expanded"); }}
                        data-testid={`btn-view-${scene.sceneNumber}`}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />View Profile
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => developScene(scene)}
                        disabled={isAnalyzing || developingAll}
                        data-testid={`btn-develop-${scene.sceneNumber}`}
                      >
                        {isAnalyzing ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Developing...</>
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
      </main>

      <PerplexityAttribution />
    </div>
  );
}

// Midjourney copy button — uses textarea select + copy, NOT clipboard API
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
