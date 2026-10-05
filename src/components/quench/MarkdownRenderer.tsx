import { useState, useEffect, useRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, Maximize2, X, Loader2, Sparkles } from "lucide-react";
import { GoogleMapsCards } from "./GoogleMapsCards";
import { downloadImageFile } from "@/lib/download-image";
import { cn } from "@/lib/utils";

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = extractText(children);

  const childElement = children as { props?: { className?: string } } | undefined;
  const langClass = childElement?.props?.className || "";
  const isMapsBlock =
    /language-json:google_maps|language-google_maps|google_maps/i.test(langClass) ||
    text.includes('"places"') ||
    text.includes('"routes"');

  if (isMapsBlock) {
    try {
      const parsed = JSON.parse(text.trim());
      if (parsed && (Array.isArray(parsed.places) || parsed.route)) {
        return <GoogleMapsCards data={parsed} />;
      }
    } catch {
      // Never show internal maps payload as raw code block
      return null;
    }
    return null;
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-2xl border border-white/10 bg-[#16171d] shadow-lg">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 text-xs text-zinc-400 hover:text-white transition-all cursor-pointer backdrop-blur-md"
        aria-label="Copy code"
      >
        {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
        <span className="text-[11px] font-medium">{copied ? "Copied" : "Copy"}</span>
      </button>
      <pre className="overflow-x-auto p-4 pt-3.5 font-mono text-[13.5px] leading-relaxed text-[#f4f4f5] pr-20 [scrollbar-width:thin]">
        {children}
      </pre>
    </div>
  );
}

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function ChatImage({ src, alt }: { src?: string; alt?: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(15);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loadError, setLoadError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentSrc(src);
    setIsLoaded(false);
    setLoadError(false);
    setProgress(15);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 96) return 96;
        let inc = 3;
        if (prev < 40) inc = 8;
        else if (prev < 70) inc = 5;
        else if (prev < 88) inc = 3;
        else inc = 1;
        return Math.min(96, prev + inc);
      });
    }, 160);

    return () => clearInterval(timer);
  }, [src]);

  // Check if image is already cached/complete
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
      setProgress(100);
    }
  }, [currentSrc]);

  // Timeout protection: if direct image hasn't loaded within 10s, attempt same-origin proxy
  useEffect(() => {
    if (isLoaded || loadError || !src) return;
    const timeout = setTimeout(() => {
      if (!isLoaded && currentSrc === src && src.startsWith("http")) {
        console.info("[ChatImage] Direct load taking long, switching to proxy fallback");
        setCurrentSrc(`/api/download?url=${encodeURIComponent(src)}`);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isLoaded, loadError, currentSrc, src]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  if (!src) return null;

  const handleDownload = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const downloadTarget = currentSrc || src;
    if (!downloadTarget || isDownloading) return;
    setIsDownloading(true);
    const cleanAlt = (alt || "artwork").replace(/[^a-zA-Z0-9_ -]/g, "_").slice(0, 30);
    const filename = `bravura-${cleanAlt}-${Date.now()}.png`;
    const ok = await downloadImageFile(downloadTarget, filename);
    setIsDownloading(false);
    if (ok) {
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    }
  };

  const handleImageLoad = () => {
    setProgress(100);
    setTimeout(() => {
      setIsLoaded(true);
      setLoadError(false);
    }, 120);
  };

  const handleImageError = () => {
    if (currentSrc === src && src.startsWith("http")) {
      // First fallback: attempt same-origin server proxy
      console.warn("[ChatImage] Direct load failed, attempting same-origin proxy");
      setCurrentSrc(`/api/download?url=${encodeURIComponent(src)}`);
    } else {
      setLoadError(true);
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    setLoadError(false);
    setIsLoaded(false);
    setProgress(20);
    const cleanPrompt = encodeURIComponent((alt || "creative artwork").slice(0, 200));
    const freshSeed = Math.floor(Math.random() * 999999);
    const rawUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&model=flux&nologo=true&seed=${freshSeed}`;
    const freshUrl = `/api/download?url=${encodeURIComponent(rawUrl)}`;
    setCurrentSrc(freshUrl);
    setTimeout(() => setIsRetrying(false), 500);
  };

  return (
    <div className="group relative my-3 max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-xl">
      {/* Animated Percentage Generation Skeleton */}
      {!isLoaded && !loadError && (
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 min-h-[260px] sm:min-h-[290px] w-full bg-gradient-to-b from-[#0f1422] to-[#090c14] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-blue-500/10 blur-xl animate-pulse" />

          {/* Radial progress circle */}
          <div className="relative flex size-24 items-center justify-center mb-4">
            <svg className="size-24 -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-white/10"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-cyan-400 transition-all duration-300 ease-out"
                strokeWidth="5"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - progress / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                {progress}%
              </span>
            </div>
          </div>

          <div className="relative z-10 w-full max-w-xs space-y-2 text-center">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="truncate max-w-[200px] font-medium text-cyan-200">
                {progress < 40
                  ? "Sampling diffusion steps..."
                  : progress < 75
                    ? "Rendering details & textures..."
                    : progress < 100
                      ? "Finalizing neural synthesis..."
                      : "Rendering complete!"}
              </span>
              <span className="font-mono text-cyan-400 font-bold">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-1">
              {alt || "Generating artwork..."}
            </p>
          </div>
        </div>
      )}

      {/* Error state with Retry action */}
      {loadError && (
        <div className="flex flex-col items-center justify-center p-8 min-h-[220px] w-full bg-[#121624] text-center space-y-3">
          <p className="text-sm font-medium text-zinc-300">
            Artwork synthesis took too long or was interrupted.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            {isRetrying ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            <span>Regenerate Artwork</span>
          </button>
        </div>
      )}

      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt || "Generated Image"}
        referrerPolicy="no-referrer"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={cn(
          "w-full max-h-[480px] object-contain transition-all duration-500 group-hover:scale-[1.01]",
          isLoaded && !loadError
            ? "opacity-100 block"
            : "opacity-0 absolute inset-0 pointer-events-none",
        )}
      />

      {isLoaded && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            title="Download Image File"
            className="rounded-lg bg-black/75 p-1.5 text-white backdrop-blur-md hover:bg-black/90 cursor-pointer shadow-md flex items-center gap-1 text-xs"
          >
            {downloaded ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : isDownloading ? (
              <Loader2 className="size-3.5 animate-spin text-cyan-300" />
            ) : (
              <Download className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            title="View Fullscreen"
            className="rounded-lg bg-black/75 p-1.5 text-white backdrop-blur-md hover:bg-black/90 cursor-pointer shadow-md"
          >
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      )}

      {/* Fullscreen Lightbox with Dedicated Cancel/Close Bar */}
      {lightboxOpen && (
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
              <span className="font-semibold text-white">Full Resolution Artwork</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 truncate">{alt || "Generated Artwork"}</span>
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
              src={src}
              alt={alt || "Generated Image"}
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

function hasBlockOrImageDescendant(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as { tagName?: string; children?: unknown[] };
  if (n.tagName === "img" || n.tagName === "div") return true;
  if (Array.isArray(n.children)) {
    return n.children.some(hasBlockOrImageDescendant);
  }
  return false;
}

export function MarkdownRenderer({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-[15px] sm:text-[15.5px] leading-[1.65] text-[#ececf1] break-words",
        isStreaming && "bravura-streaming-active",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => (
            <h1
              className="mt-4 mb-2 text-[17px] sm:text-[18px] font-bold text-white tracking-tight"
              {...p}
            />
          ),
          h2: (p) => (
            <h2
              className="mt-3.5 mb-1.5 text-[16px] sm:text-[16.5px] font-semibold text-white tracking-tight"
              {...p}
            />
          ),
          h3: (p) => (
            <h3
              className="mt-3 mb-1 text-[15px] sm:text-[15.5px] font-semibold text-white"
              {...p}
            />
          ),
          h4: (p) => <h4 className="mt-2.5 mb-1 text-[15px] font-semibold text-white" {...p} />,
          p: ({ children, node, ...props }) => {
            const hasBlockOrImage =
              hasBlockOrImageDescendant(node) ||
              (Array.isArray(children) &&
                children.some(
                  (c) =>
                    Boolean(c) &&
                    typeof c === "object" &&
                    "props" in (c as Record<string, unknown>) &&
                    Boolean((c as { props?: { src?: unknown } }).props?.src),
                ));

            if (hasBlockOrImage) {
              return (
                <div className="mb-3 last:mb-0 text-[#ececf1] leading-[1.65]" {...props}>
                  {children}
                </div>
              );
            }
            return (
              <p className="mb-3 last:mb-0 text-[#ececf1] leading-[1.65]" {...props}>
                {children}
              </p>
            );
          },
          strong: (p) => <strong className="font-semibold text-white" {...p} />,
          ul: (p) => (
            <ul
              className="marker:text-zinc-400 mb-3 list-disc space-y-1 pl-5 leading-[1.65]"
              {...p}
            />
          ),
          ol: (p) => (
            <ol
              className="marker:text-zinc-400 mb-3 list-decimal space-y-1 pl-5 leading-[1.65]"
              {...p}
            />
          ),
          li: (p) => <li className="pl-0.5 text-[#ececf1]" {...p} />,
          a: ({ href, children, ...rest }) => {
            if (href && href.startsWith("#prompt:")) {
              const promptText = decodeURIComponent(href.replace("#prompt:", ""));
              return (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("bravura:pick-prompt", { detail: promptText }),
                    );
                  }}
                  className="group my-1 inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:border-cyan-400 hover:bg-cyan-500/25 hover:text-white transition-all cursor-pointer shadow-sm text-left max-w-full active:scale-95"
                  title={`Click to use prompt: "${promptText}"`}
                >
                  <Sparkles className="size-3 text-cyan-400 shrink-0 group-hover:rotate-12 transition-transform" />
                  <span className="truncate">{children}</span>
                </button>
              );
            }
            return (
              <a
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
                href={href}
                {...rest}
              >
                {children}
              </a>
            );
          },
          blockquote: (p) => (
            <blockquote
              className="border-cyan-500/60 text-zinc-300 my-2.5 border-l-2 pl-3.5 italic"
              {...p}
            />
          ),
          table: (p) => (
            <div className="border-white/10 my-3 overflow-x-auto rounded-xl border bg-[#16171d]">
              <table className="w-full text-sm" {...p} />
            </div>
          ),
          th: (p) => (
            <th className="bg-white/5 px-3 py-2 text-left font-medium text-white" {...p} />
          ),
          td: (p) => <td className="border-white/10 border-t px-3 py-2 text-zinc-300" {...p} />,
          img: ({ src, alt }) => <ChatImage src={src} alt={alt} />,
          code: ({ className, children, ...rest }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded-md bg-[#24252e] border border-white/10 px-1.5 py-0.5 font-mono text-[13px] text-[#ececf1] mx-0.5 inline-block font-normal"
                {...rest}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="bravura-stream-caret" role="status" aria-label="Generating" />
      )}
    </div>
  );
}
