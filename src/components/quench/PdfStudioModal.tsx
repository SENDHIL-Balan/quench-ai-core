import { useState, useEffect } from "react";
import {
  X,
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Eye,
  BookOpen,
  Briefcase,
  Receipt,
  FileCode,
  GraduationCap,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratedPdfContent } from "@/routes/api/pdf";
import { generatePdfDocument, type PdfStyleOptions } from "@/lib/pdf/pdf-generator";

const PDF_PRESETS = [
  {
    icon: Briefcase,
    label: "Business Proposal",
    prompt:
      "Create a detailed project proposal for an AI customer support automation system with scope, deliverables, timeline, and pricing table.",
    style: "corporate" as const,
    docType: "proposal",
  },
  {
    icon: GraduationCap,
    label: "Study Guide",
    prompt:
      "Generate a comprehensive college-level study guide on Machine Learning Foundations, including Supervised Learning, Loss Functions, Gradient Descent, and key mathematical formulas.",
    style: "teal" as const,
    docType: "study-guide",
  },
  {
    icon: Receipt,
    label: "Professional Invoice",
    prompt:
      "Generate a formal consulting invoice for Web Application Architecture & Security Audit for Acme Corp with itemized hours, milestone breakdown, and payment terms.",
    style: "minimal" as const,
    docType: "invoice",
  },
  {
    icon: BookOpen,
    label: "Executive Report",
    prompt:
      "Produce an executive strategic review on Global Renewable Energy Market Trends for 2026, with key metrics, regional growth drivers, and strategic recommendations.",
    style: "executive" as const,
    docType: "report",
  },
  {
    icon: FileCode,
    label: "Technical Spec",
    prompt:
      "Draft a system architecture specification for a high-throughput real-time event streaming pipeline using Kafka, Redis, and Go microservices.",
    style: "emerald" as const,
    docType: "specification",
  },
];

const THEMES = [
  { id: "corporate", label: "Corporate Navy", color: "bg-[#0f2c59]" },
  { id: "teal", label: "Modern Teal", color: "bg-[#0d474f]" },
  { id: "executive", label: "Executive Charcoal", color: "bg-[#18181b]" },
  { id: "minimal", label: "Minimal Slate", color: "bg-[#334155]" },
  { id: "emerald", label: "Emerald Green", color: "bg-[#064e3b]" },
];

export function PdfStudioModal({
  onClose,
  initialPrompt = "",
}: {
  onClose: () => void;
  initialPrompt?: string;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [theme, setTheme] = useState<PdfStyleOptions["theme"]>("corporate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedPdfContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"create" | "preview">("create");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please describe the document you want to generate.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style: theme,
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        data?: GeneratedPdfContent;
        error?: string;
      };

      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || "Failed to generate document content.");
      }

      setGeneratedData(json.data);
      setActiveMobileTab("preview");
    } catch (err) {
      console.error("[pdf-studio] generation error", err);
      setError(err instanceof Error ? err.message : "Failed to generate PDF document.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedData) return;
    setIsDownloading(true);
    try {
      const { download } = generatePdfDocument(generatedData, { theme });
      download(`${generatedData.title || "document"}.pdf`);
    } catch (err) {
      console.error("[pdf-studio] PDF download error", err);
      setError("Failed to compile and download PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = async () => {
    if (!generatedData) return;
    try {
      let text = `# ${generatedData.title}\n${generatedData.subtitle}\n\n`;
      text += `**Author:** ${generatedData.author} | **Date:** ${generatedData.date}\n\n`;
      text += `## Executive Summary\n${generatedData.summary}\n\n`;

      if (generatedData.sections) {
        generatedData.sections.forEach((sec) => {
          text += `### ${sec.heading}\n${sec.content}\n\n`;
          if (sec.bullets) {
            sec.bullets.forEach((b) => (text += `- ${b}\n`));
            text += "\n";
          }
        });
      }

      if (generatedData.conclusion) {
        text += `## Conclusion\n${generatedData.conclusion}\n\n`;
      }

      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass-panel relative flex h-full w-full sm:h-auto sm:max-h-[92vh] max-w-5xl flex-col overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border border-white/10 bg-[#0d121f]/95 shadow-2xl text-foreground"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div
          className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full opacity-35 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(0.72 0.22 160 / 45%), oklch(0.6 0.18 190 / 30%) 40%, transparent 70%)",
          }}
        />

        {/* Header */}
        <header className="relative flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 ring-1 ring-white/15">
              <FileText className="size-4 sm:size-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold sm:text-lg truncate">
                  AI PDF Document Studio
                </h2>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                  Powered by Gemini AI
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] sm:text-xs truncate hidden sm:block">
                Draft, format, and download publication-quality PDF documents based on any prompt.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-white rounded-xl p-2.5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Mobile Tab Switcher */}
        {generatedData && (
          <div className="flex border-b border-white/10 bg-[#0b111e] p-1.5 lg:hidden shrink-0">
            <button
              type="button"
              onClick={() => setActiveMobileTab("create")}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 min-h-[40px]",
                activeMobileTab === "create"
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-white",
              )}
            >
              <FileText className="size-3.5" />
              <span>Prompt & Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab("preview")}
              className={cn(
                "flex-1 py-2 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1.5 min-h-[40px]",
                activeMobileTab === "preview"
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-white",
              )}
            >
              <Eye className="size-3.5" />
              <span>Preview & PDF</span>
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>
        )}

        {/* Main Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
          {/* Inputs & Config Column */}
          <div
            className={cn(
              "flex flex-col gap-4 border-b border-white/10 p-4 sm:p-5 lg:col-span-5 lg:border-b-0 lg:border-r overflow-y-auto",
              activeMobileTab === "preview" && generatedData ? "hidden lg:flex" : "flex",
            )}
          >
            {/* Prompt input */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                <Sparkles className="size-3.5 text-emerald-400" />
                Document Prompt & Instructions
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what kind of PDF you need (e.g. A 2-page project proposal for a mobile app redesign with scope, team, budget table, and milestones)..."
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
              />
            </div>

            {/* Presets */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/90">
                Quick Document Templates:
              </label>
              <div className="flex flex-col gap-1.5">
                {PDF_PRESETS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setPrompt(p.prompt);
                        setTheme(p.style);
                      }}
                      className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.025] p-2.5 text-left text-xs transition-colors hover:border-emerald-400/30 hover:bg-white/[0.06] cursor-pointer"
                    >
                      <Icon className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="block font-medium text-foreground/90">{p.label}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">
                          {p.prompt}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Styling Theme */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                <Sliders className="size-3.5 text-emerald-400" />
                Color Palette & Theme
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id as PdfStyleOptions["theme"])}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2 text-xs transition-all cursor-pointer",
                      theme === th.id
                        ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200 font-medium"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-white",
                    )}
                  >
                    <span className={cn("size-3 rounded-full shrink-0", th.color)} />
                    <span className="truncate">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p className="flex-1">{error}</p>
              </div>
            )}

            {/* Generate Action */}
            <div className="mt-auto pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Authoring PDF Document with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Generate PDF with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Document Preview Column */}
          <div
            className={cn(
              "flex flex-col p-4 sm:p-5 lg:col-span-7 bg-black/20 overflow-y-auto",
              activeMobileTab === "create" && generatedData ? "hidden lg:flex" : "flex",
            )}
          >
            {isGenerating ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
                <div className="relative flex size-20 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
                  <div className="size-14 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                  <FileText className="absolute size-6 text-emerald-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Synthesizing Document Layout...
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs max-w-sm">
                    Structuring sections, metrics, executive summary, and data tables for high-res
                    PDF export.
                  </p>
                </div>
              </div>
            ) : generatedData ? (
              <div className="flex flex-col gap-4">
                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-300">Document Ready</span>
                    <span className="text-xs text-muted-foreground">• A4 Formatted</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? "Copied" : "Copy Text"}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isDownloading}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="size-3.5" />
                      <span>{isDownloading ? "Compiling..." : "Download PDF (.pdf)"}</span>
                    </button>
                  </div>
                </div>

                {/* Styled Document Sheet Preview */}
                <div className="rounded-2xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl overflow-y-auto max-h-[58vh]">
                  {/* Decorative top border */}
                  <div className="h-1.5 w-full bg-slate-900 rounded-full mb-4" />

                  {/* Subtitle / Category */}
                  {generatedData.subtitle && (
                    <p className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">
                      {generatedData.subtitle}
                    </p>
                  )}

                  {/* Title */}
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    {generatedData.title}
                  </h1>

                  {/* Metadata line */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 border border-slate-200">
                    <span>
                      <strong>Author:</strong> {generatedData.author}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Date:</strong> {generatedData.date}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Type:</strong> {generatedData.documentType.toUpperCase()}
                    </span>
                  </div>

                  {/* Summary Callout */}
                  {generatedData.summary && (
                    <div className="mt-4 rounded-xl border-l-4 border-emerald-600 bg-emerald-50/70 p-3.5 text-xs text-slate-800 leading-relaxed">
                      <p className="font-bold text-emerald-950 mb-1">Executive Summary</p>
                      <p>{generatedData.summary}</p>
                    </div>
                  )}

                  {/* Key Metadata Fields */}
                  {generatedData.metaFields && generatedData.metaFields.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {generatedData.metaFields.map((mf, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                        >
                          <p className="text-[10px] uppercase font-bold text-slate-500">
                            {mf.label}
                          </p>
                          <p className="font-bold text-slate-900">{mf.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sections */}
                  {generatedData.sections && (
                    <div className="mt-5 space-y-4">
                      {generatedData.sections.map((sec, i) => (
                        <div key={i} className="border-t border-slate-200 pt-3">
                          <h3 className="text-sm font-bold text-slate-900 mb-1">{sec.heading}</h3>
                          {sec.content && (
                            <p className="text-xs text-slate-700 leading-relaxed">{sec.content}</p>
                          )}

                          {sec.callout && (
                            <div className="my-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900 italic">
                              Note: {sec.callout}
                            </div>
                          )}

                          {sec.bullets && (
                            <ul className="mt-2 space-y-1 pl-4 text-xs text-slate-700 list-disc">
                              {sec.bullets.map((b, bi) => (
                                <li key={bi}>{b}</li>
                              ))}
                            </ul>
                          )}

                          {sec.table && (
                            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-800 text-white font-semibold">
                                  <tr>
                                    {sec.table.headers.map((th, thi) => (
                                      <th key={thi} className="p-2">
                                        {th}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sec.table.rows.map((row, ri) => (
                                    <tr
                                      key={ri}
                                      className={cn(
                                        "border-t border-slate-200",
                                        ri % 2 === 1 ? "bg-slate-50" : "bg-white",
                                      )}
                                    >
                                      {row.map((cell, ci) => (
                                        <td key={ci} className="p-2 text-slate-800">
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Conclusion */}
                  {generatedData.conclusion && (
                    <div className="mt-5 border-t border-slate-200 pt-3">
                      <h3 className="text-sm font-bold text-slate-900 mb-1">
                        Conclusion & Next Steps
                      </h3>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {generatedData.conclusion}
                      </p>
                    </div>
                  )}

                  {/* Footer note */}
                  <div className="mt-6 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
                    {generatedData.footerNotes ||
                      "Generated with Bravura AI Document Studio • All rights reserved"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center p-8">
                <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                  <Eye className="size-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground/80">Document Workspace</h3>
                <p className="text-muted-foreground mt-1 text-xs max-w-xs">
                  Pick a template on the left or type your custom prompt, then click "Generate PDF
                  with AI" to preview and export.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
