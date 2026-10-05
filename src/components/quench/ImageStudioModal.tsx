import { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  Maximize2,
  Upload,
  RefreshCw,
  Palette,
  Eye,
  AlertCircle,
  Wand2,
  Compass,
  ArrowRight,
  Send,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { downloadImageFile } from "@/lib/download-image";
import { getPromptSuggestions } from "@/lib/agent/image-suggestions";
import { cn } from "@/lib/utils";

interface ImageStudioModalProps {
  onClose: () => void;
  initialPrompt?: string;
  initialImage?: string;
  onSendToChat?: (prompt: string, imageUrl: string) => void;
}

const ASPECT_RATIOS = [
  { id: "1:1", label: "Square", ratio: "1:1", icon: "■" },
  { id: "16:9", label: "Landscape", ratio: "16:9", icon: "▬" },
  { id: "9:16", label: "Portrait", ratio: "9:16", icon: "▮" },
  { id: "4:3", label: "Standard", ratio: "4:3", icon: "▭" },
  { id: "3:4", label: "Tall", ratio: "3:4", icon: "▯" },
];

const STYLE_PRESETS = [
  { id: "", label: "Natural", desc: "Balanced realistic rendering" },
  {
    id: "Photorealistic 8K cinematic lighting, high-detail texture",
    label: "Photorealistic",
    desc: "Studio lighting & 8K detail",
  },
  {
    id: "Cyberpunk neon glow, futuristic synthwave lighting, vibrant",
    label: "Cyberpunk",
    desc: "Neon & holographic glows",
  },
  {
    id: "Anime aesthetic, Makoto Shinkai studio lighting, vivid colors",
    label: "Anime",
    desc: "Vibrant Makoto Shinkai aesthetic",
  },
  {
    id: "Minimalist 3D isometric render, clean pastel surfaces, Octane render",
    label: "3D Isometric",
    desc: "Clean Octane render diorama",
  },
  {
    id: "Soft watercolor painting with ink outlines, paper texture",
    label: "Watercolor",
    desc: "Delicate pigment & paper grain",
  },
  {
    id: "Classic oil painting with rich impasto brush strokes, dramatic chiaroscuro",
    label: "Oil Painting",
    desc: "Textured impasto brushwork",
  },
];

const INSPIRATION_CARDS = [
  {
    title: "Cyberpunk Skyway",
    prompt:
      "A futuristic neon city with glowing holographic skyways and flying vehicles in rain reflections",
    style: "Cyberpunk neon glow, futuristic synthwave lighting, vibrant",
    aspectRatio: "16:9",
    tag: "Sci-Fi",
  },
  {
    title: "Crystalline Phoenix",
    prompt:
      "Iridescent crystalline phoenix rising from glowing emerald embers, macro details, 8K cinematic lighting",
    style: "Photorealistic 8K cinematic lighting, high-detail texture",
    aspectRatio: "1:1",
    tag: "Fantasy",
  },
  {
    title: "Floating Sky Islands",
    prompt:
      "Lush floating green islands with waterfalls and ancient temples under dramatic sunset clouds",
    style: "Anime aesthetic, Makoto Shinkai studio lighting, vivid colors",
    aspectRatio: "16:9",
    tag: "Anime",
  },
  {
    title: "Cozy Rooftop Cafe",
    prompt:
      "Cozy miniature rooftop coffee shop at night with warm fairy lights and bonsai trees, soft shadows",
    style: "Minimalist 3D isometric render, clean pastel surfaces, Octane render",
    aspectRatio: "1:1",
    tag: "3D Render",
  },
];

export function ImageStudioModal({
  onClose,
  initialPrompt = "",
  initialImage,
  onSendToChat,
}: ImageStudioModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [stylePreset, setStylePreset] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(initialImage || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedNanoModel, setSelectedNanoModel] = useState("pollinations");
  const [usedModel, setUsedModel] = useState("Pollinations AI (Flux)");
  const [error, setError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [sentToChat, setSentToChat] = useState(false);
  const [autoSendToChat, setAutoSendToChat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("Initializing neural latent canvas...");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"create" | "preview">("create");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxOpen) setLightboxOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, lightboxOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPEG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setReferenceImage(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please describe the image you want to create or edit.");
      return;
    }

    setIsGenerating(true);
    setProgress(8);
    setProgressStage("Initializing neural latent canvas...");
    setError(null);
    setAuthNotice(null);

    // Realistic progress animation timer
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        let inc = 3;
        if (prev < 30) inc = 7;
        else if (prev < 65) inc = 4;
        else if (prev < 85) inc = 2;
        else inc = 1;
        const next = Math.min(95, prev + inc);
        if (next < 30) setProgressStage("Initializing neural latent canvas...");
        else if (next < 60) setProgressStage("Computing diffusion steps & latents...");
        else if (next < 85) setProgressStage("Synthesizing high-frequency details...");
        else setProgressStage("Refining lighting, contrast & colors...");
        return next;
      });
    }, 180);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          stylePreset,
          referenceImage: referenceImage || undefined,
          model: selectedNanoModel,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        imageUrl?: string;
        model?: string;
        authNotice?: string;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.imageUrl) {
        throw new Error(data.error || "Image generation failed. Please try again.");
      }

      clearInterval(progressTimer);
      setProgress(100);
      setProgressStage("Artwork Complete!");

      // Brief delay to showcase satisfying 100% completion before revealing artwork
      await new Promise((resolve) => setTimeout(resolve, 320));

      setGeneratedImage(data.imageUrl);
      if (data.model) setUsedModel(data.model);
      if (data.authNotice) setAuthNotice(data.authNotice);
      // Seamlessly switch to preview tab on mobile
      setActiveMobileTab("preview");

      if (autoSendToChat && onSendToChat && data.imageUrl) {
        onSendToChat(prompt.trim(), data.imageUrl);
        setSentToChat(true);
      }
    } catch (err) {
      clearInterval(progressTimer);
      console.error("[image-studio] generation error", err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(
        msg.startsWith("{")
          ? "AI service is currently initializing. Please retry in a few seconds."
          : msg,
      );
    } finally {
      clearInterval(progressTimer);
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage || isDownloading) return;
    setIsDownloading(true);
    const cleanPrompt = (prompt || "artwork").replace(/[^a-zA-Z0-9_ -]/g, "_").slice(0, 30);
    const filename = `bravura-${cleanPrompt}-${Date.now()}.png`;
    const ok = await downloadImageFile(generatedImage, filename);
    setIsDownloading(false);
    if (ok) {
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2200);
    }
  };

  const handleCopy = async () => {
    if (!generatedImage) return;
    try {
      await navigator.clipboard.writeText(generatedImage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleUseAsReference = () => {
    if (!generatedImage) return;
    setReferenceImage(generatedImage);
    setPrompt((prev) =>
      prev ? `Add modifications to this: ${prev}` : "Transform this image with ",
    );
    setActiveMobileTab("create");
  };

  const handleApplyInspiration = (item: (typeof INSPIRATION_CARDS)[number]) => {
    setPrompt(item.prompt);
    setStylePreset(item.style);
    setAspectRatio(item.aspectRatio);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex h-full w-full sm:h-auto sm:max-h-[92vh] max-w-6xl flex-col overflow-hidden sm:rounded-3xl border-0 sm:border border-white/10 bg-[#090d16] text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0 bg-[#0c1322]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-300 ring-1 ring-cyan-400/30">
              <Sparkles className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  AI Image Studio
                </h2>
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-cyan-300">
                  {usedModel}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] sm:text-xs truncate hidden sm:block">
                High-fidelity image creation & neural synthesis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Studio"
            className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Mobile Tab Switcher (Visible on small screens when image exists) */}
        {generatedImage && (
          <div className="flex border-b border-white/10 bg-[#0b111e] p-1.5 lg:hidden shrink-0">
            <button
              type="button"
              onClick={() => setActiveMobileTab("create")}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5",
                activeMobileTab === "create"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-white",
              )}
            >
              <Palette className="size-3.5" />
              <span>Prompt & Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab("preview")}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5",
                activeMobileTab === "preview"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-white",
              )}
            >
              <Eye className="size-3.5" />
              <span>Artwork Result</span>
              <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
            </button>
          </div>
        )}

        {/* Notice Banner */}
        {authNotice && (
          <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-2 text-xs text-cyan-200 flex items-center gap-2">
            <Sparkles className="size-3.5 shrink-0 text-cyan-400" />
            <p className="flex-1 text-[11px] sm:text-xs">{authNotice}</p>
          </div>
        )}

        {/* Modal Main Content Grid */}
        <div className="grid flex-1 min-h-0 overflow-y-auto lg:grid-cols-12">
          {/* Controls Column */}
          <div
            className={cn(
              "flex flex-col gap-4 p-4 sm:p-6 lg:col-span-6 lg:border-r border-white/10 overflow-y-auto",
              activeMobileTab === "preview" && generatedImage ? "hidden lg:flex" : "flex",
            )}
          >
            {/* Prompt Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="studio-prompt-input"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Prompt Description
                </label>
                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    className="text-[11px] text-muted-foreground hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                id="studio-prompt-input"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision in detail (e.g., A celestial observatory carved from obsidian marble with luminous aurora waves)..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-3.5 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition-all leading-relaxed"
              />
            </div>

            {/* Reference Image / Image-to-Image editing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Reference Image{" "}
                  <span className="text-[10px] font-normal lowercase">(optional for edits)</span>
                </span>
                {referenceImage && (
                  <button
                    type="button"
                    onClick={() => setReferenceImage(null)}
                    className="text-[11px] text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              {referenceImage ? (
                <div className="relative flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-2.5">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="size-14 rounded-xl object-cover border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-cyan-200">Reference Loaded</p>
                    <p className="text-[11px] text-muted-foreground">
                      AI will edit or restyle this artwork based on your prompt.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-xs text-muted-foreground hover:border-cyan-400/40 hover:bg-white/[0.04] hover:text-white transition-all cursor-pointer min-h-[44px]"
                >
                  <Upload className="size-4 text-cyan-400" />
                  <span>Upload image to edit or restyle</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* AI Generation Engine Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-cyan-400" />
                  Generation Engine
                </span>
                <span className="text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                  {selectedNanoModel === "pollinations" ? "Pollinations AI" : "Google GenAI"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedNanoModel("pollinations")}
                  className={cn(
                    "flex flex-col rounded-xl border p-2 text-left transition-all cursor-pointer",
                    selectedNanoModel === "pollinations"
                      ? "border-cyan-400/80 bg-cyan-500/20 text-cyan-200 shadow-md shadow-cyan-500/10"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span className="text-xs font-semibold text-white truncate">Pollinations AI</span>
                  <span className="text-[10px] text-zinc-400 truncate">Flux • Instant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNanoModel("gemini-3.1-flash-image")}
                  className={cn(
                    "flex flex-col rounded-xl border p-2 text-left transition-all cursor-pointer",
                    selectedNanoModel === "gemini-3.1-flash-image"
                      ? "border-cyan-400/80 bg-cyan-500/20 text-cyan-200 shadow-md shadow-cyan-500/10"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span className="text-xs font-semibold text-white truncate">Nano Banana 2</span>
                  <span className="text-[10px] text-zinc-400 truncate">Gemini 3.1 Flash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNanoModel("gemini-3.1-flash-lite-image")}
                  className={cn(
                    "flex flex-col rounded-xl border p-2 text-left transition-all cursor-pointer",
                    selectedNanoModel === "gemini-3.1-flash-lite-image"
                      ? "border-cyan-400/80 bg-cyan-500/20 text-cyan-200 shadow-md shadow-cyan-500/10"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span className="text-xs font-semibold text-white truncate">Nano Lite</span>
                  <span className="text-[10px] text-zinc-400 truncate">Gemini Lite</span>
                </button>
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Aspect Ratio
              </span>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatio(ar.id)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-2 sm:p-2.5 text-center transition-all cursor-pointer min-h-[52px]",
                      aspectRatio === ar.id
                        ? "border-cyan-400/80 bg-cyan-500/20 text-cyan-200 shadow-md shadow-cyan-500/20"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <span className="text-sm sm:text-base leading-none mb-1">{ar.icon}</span>
                    <span className="text-[11px] font-medium leading-none">{ar.ratio}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Artistic Style
                </span>
                {stylePreset && (
                  <button
                    type="button"
                    onClick={() => setStylePreset("")}
                    className="text-[11px] text-muted-foreground hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {STYLE_PRESETS.map((st) => (
                  <button
                    key={st.label}
                    type="button"
                    onClick={() => setStylePreset(st.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs transition-all cursor-pointer min-h-[38px]",
                      stylePreset === st.id
                        ? "border-cyan-400/70 bg-cyan-500/25 text-cyan-200 font-semibold shadow-sm"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-white",
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p className="flex-1 leading-snug">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-destructive hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* Auto-send to chat toggle */}
            {onSendToChat && (
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none py-1">
                <input
                  type="checkbox"
                  checked={autoSendToChat}
                  onChange={(e) => setAutoSendToChat(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400 size-3.5 cursor-pointer accent-cyan-500"
                />
                <span>Automatically send artwork to chat upon generation</span>
              </label>
            )}

            {/* Generate Button */}
            <div className="mt-auto pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-cyan-500/25 transition-all hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none cursor-pointer min-h-[48px]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="size-4 animate-spin text-cyan-200" />
                    <span>Generating Artwork ({progress}%)…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 text-cyan-200" />
                    <span>{referenceImage ? "Transform Image with AI" : "Generate Artwork"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Generated Artwork Preview OR Inspiration Showcase */}
          <div
            className={cn(
              "flex flex-col items-center justify-center p-4 sm:p-6 lg:col-span-6 bg-black/40 overflow-y-auto",
              activeMobileTab === "create" && generatedImage ? "hidden lg:flex" : "flex",
            )}
          >
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center gap-5 text-center p-6 sm:p-8 max-w-sm w-full animate-in fade-in duration-200">
                {/* Radial Percentage Ring */}
                <div className="relative flex size-32 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-500/15 to-purple-500/20 blur-xl animate-pulse" />

                  {/* SVG circular track & animated progress stroke */}
                  <svg className="size-32 -rotate-90 transform" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="stroke-white/10"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      className="stroke-cyan-400 transition-all duration-300 ease-out"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 50}
                      strokeDashoffset={2 * Math.PI * 50 * (1 - progress / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  {/* Centered Percentage Display */}
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                      {progress}
                      <span className="text-sm font-semibold text-cyan-300 ml-0.5">%</span>
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/90 mt-0.5">
                      Neural AI
                    </span>
                  </div>
                </div>

                {/* Linear progress bar & Stage description */}
                <div className="w-full space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white truncate max-w-[240px]">
                      {progressStage}
                    </span>
                    <span className="font-mono text-cyan-300 font-bold ml-2">{progress}%</span>
                  </div>

                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Framing: <strong className="text-zinc-300">{aspectRatio}</strong> • Model:{" "}
                    <strong className="text-zinc-300">Flux Synthesis Engine</strong>
                  </p>
                </div>
              </div>
            ) : generatedImage ? (
              <div className="flex flex-col items-center gap-4 w-full max-w-lg animate-in fade-in duration-300">
                <div className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                  <img
                    src={generatedImage}
                    alt={prompt}
                    referrerPolicy="no-referrer"
                    className="w-full object-contain max-h-[55vh] transition-transform duration-300 group-hover:scale-[1.01]"
                  />

                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="absolute top-3 right-3 rounded-xl bg-black/70 p-2.5 text-white backdrop-blur-md hover:bg-black/90 transition-all cursor-pointer shadow-lg"
                    title="Fullscreen Lightbox"
                  >
                    <Maximize2 className="size-4" />
                  </button>
                </div>

                {/* Actions Toolbar */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 text-black font-semibold px-4 py-2.5 text-xs hover:bg-cyan-400 transition-colors cursor-pointer shadow-md shadow-cyan-500/20 min-h-[44px]"
                  >
                    {downloaded ? (
                      <>
                        <Check className="size-4 text-black" />
                        <span>Downloaded!</span>
                      </>
                    ) : isDownloading ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-black" />
                        <span>Downloading…</span>
                      </>
                    ) : (
                      <>
                        <Download className="size-4" />
                        <span>Download PNG</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleUseAsReference}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-2.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer min-h-[44px]"
                    title="Edit this artwork with additional prompts"
                  >
                    <Wand2 className="size-4" />
                    <span>Edit Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-medium text-white hover:bg-white/10 transition-colors cursor-pointer min-h-[44px]"
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-400" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    <span>{copied ? "Copied" : "Copy URL"}</span>
                  </button>

                  {onSendToChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onSendToChat(prompt.trim(), generatedImage);
                        setSentToChat(true);
                        setTimeout(() => {
                          onClose();
                        }, 350);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer min-h-[44px] shadow-sm",
                        sentToChat
                          ? "bg-emerald-500/20 border border-emerald-400/50 text-emerald-300"
                          : "bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30 text-cyan-200 hover:text-white shadow-cyan-500/10 active:scale-95",
                      )}
                    >
                      {sentToChat ? (
                        <>
                          <CheckCheck className="size-4 text-emerald-400" />
                          <span>Sent to Chat!</span>
                        </>
                      ) : (
                        <>
                          <Send className="size-4 text-cyan-300" />
                          <span>Send to Chat</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Thematic Prompt Suggestions based on what was generated */}
                <div className="w-full mt-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-3.5 space-y-2 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    <Sparkles className="size-3.5 text-cyan-400" />
                    <span>Try Creating Next:</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {getPromptSuggestions(prompt).map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPrompt(suggestion);
                          setActiveMobileTab("create");
                        }}
                        className="group flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left text-xs text-zinc-300 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white transition-all cursor-pointer"
                        title="Click to load this prompt"
                      >
                        <span className="truncate">{suggestion}</span>
                        <ArrowRight className="size-3 text-cyan-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* INSPIRATION SHOWCASE (Replaces the annoying Canvas Ready placeholder!) */
              <div className="flex flex-col w-full max-w-md p-2 sm:p-4 space-y-4">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Compass className="size-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Quick Inspiration Showcase
                  </h3>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Select any visual style below to automatically load the prompt, style preset, and
                  optimal aspect ratio:
                </p>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {INSPIRATION_CARDS.map((card) => (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => handleApplyInspiration(card)}
                      className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 cursor-pointer min-h-[96px]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-white group-hover:text-cyan-200">
                            {card.title}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {card.tag}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed">
                          {card.prompt}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-cyan-400 font-medium">
                        <span>{card.aspectRatio}</span>
                        <span className="flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Use This <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal with Dedicated Cancel/Close Bar */}
      {lightboxOpen && generatedImage && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Top Cancel/Action Bar */}
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0c101a]/95 backdrop-blur-md shrink-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-xs text-zinc-300 truncate max-w-[60%]">
              <span className="font-semibold text-white">Full Resolution Preview</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 truncate">{prompt || "Generated Artwork"}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-3 py-1.5 text-xs transition-colors cursor-pointer shadow-md"
              >
                {downloaded ? (
                  <>
                    <Check className="size-3.5 text-black" />
                    <span>Downloaded!</span>
                  </>
                ) : isDownloading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-black" />
                    <span>Downloading…</span>
                  </>
                ) : (
                  <>
                    <Download className="size-3.5" />
                    <span>Download PNG</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                title="Close Lightbox (Esc)"
              >
                <X className="size-4" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Centered Image Viewport */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <img
              src={generatedImage}
              alt="Fullscreen Preview"
              referrerPolicy="no-referrer"
              className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl transition-transform duration-200"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
