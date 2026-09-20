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
} from "lucide-react";
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
  const [usedModel, setUsedModel] = useState("gemini-3.1-flash-image");
  const [error, setError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
    setError(null);
    setAuthNotice(null);

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          stylePreset,
          referenceImage: referenceImage || undefined,
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

      setGeneratedImage(data.imageUrl);
      if (data.model) setUsedModel(data.model);
      if (data.authNotice) setAuthNotice(data.authNotice);
      // Seamlessly switch to preview tab on mobile
      setActiveMobileTab("preview");
    } catch (err) {
      console.error("[image-studio] generation error", err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(
        msg.startsWith("{")
          ? "AI service is currently initializing. Please retry in a few seconds."
          : msg,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      if (generatedImage.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = generatedImage;
        link.download = `bravura-ai-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const res = await fetch(generatedImage);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `bravura-ai-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
    } catch {
      window.open(generatedImage, "_blank");
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
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-cyan-300">
                  {usedModel.includes("flux") ? "Bravura Neural Flux" : "Gemini 3.1 Flash Image"}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] sm:text-xs truncate hidden sm:block">
                Create & edit images using generative multimodal AI
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

            {/* Generate Button */}
            <div className="mt-auto pt-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-cyan-500/25 transition-all hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none cursor-pointer min-h-[48px]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="size-4 animate-spin text-cyan-200" />
                    <span>Rendering Artwork with AI...</span>
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
              <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="relative flex size-24 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20" />
                  <div className="size-16 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent shadow-[0_0_25px_rgba(6,182,212,0.45)]" />
                  <Sparkles className="absolute size-7 text-cyan-300" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">Synthesizing Imagery...</p>
                  <p className="text-muted-foreground mt-1 text-xs max-w-xs leading-relaxed">
                    Computing diffusion passes with {aspectRatio} framing.
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
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 text-black font-semibold px-4 py-2.5 text-xs hover:bg-cyan-400 transition-colors cursor-pointer shadow-md shadow-cyan-500/20 min-h-[44px]"
                  >
                    <Download className="size-4" />
                    <span>Download PNG</span>
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
                        onSendToChat(prompt, generatedImage);
                        onClose();
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-xs font-medium text-white hover:bg-white/15 transition-colors cursor-pointer min-h-[44px]"
                    >
                      <Eye className="size-4 text-cyan-300" />
                      <span>Send to Chat</span>
                    </button>
                  )}
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

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && generatedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="size-6" />
          </button>
          <img
            src={generatedImage}
            alt="Fullscreen Preview"
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
