import { useState, useId, useRef } from "react";
import {
  BookOpen,
  Search,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
} from "lucide-react";
import { useSlangDictionary } from "@/lib/slang";
import type { SlangOrigin } from "@/lib/slang";
import { cn } from "@/lib/utils";

export function SlangContextCard({ className }: { className?: string }) {
  const {
    entries,
    totalCount,
    uploadedFiles,
    search,
    processFile,
    addEntry,
    removeEntry,
    resetToDefaults,
  } = useSlangDictionary();

  const [query, setQuery] = useState("");
  const [filterOrigin, setFilterOrigin] = useState<SlangOrigin | "all">("all");
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New entry form state
  const [newTerm, setNewTerm] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newOrigin, setNewOrigin] = useState<SlangOrigin>("Universal");
  const [newCategory, setNewCategory] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const filteredEntries = search(query, filterOrigin);
  const displayedEntries = isExpanded ? filteredEntries.slice(0, 50) : filteredEntries.slice(0, 4);

  const americanCount = entries.filter((e) => e.origin === "American").length;
  const britishCount = entries.filter((e) => e.origin === "British").length;

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadStatus(`Extracting slang terms from ${file.name}…`);
      const res = await processFile(file);
      setUploadStatus(
        `Extracted ${res.extractedCount} slang definitions from ${file.name}. Total cached: ${res.totalCached}`,
      );
      setTimeout(() => setUploadStatus(null), 5000);
    } catch (err) {
      setUploadStatus(err instanceof Error ? err.message : "Failed to extract slang definitions.");
      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newMeaning.trim()) return;

    addEntry({
      term: newTerm.trim(),
      meaning: newMeaning.trim(),
      origin: newOrigin,
      category: newCategory.trim() || "User Added",
      source: "Manual Entry",
    });

    setNewTerm("");
    setNewMeaning("");
    setNewCategory("");
    setShowAddModal(false);
    setUploadStatus(`Added slang term: "${newTerm}"`);
    setTimeout(() => setUploadStatus(null), 3000);
  };

  return (
    <section
      className={cn(
        "glass-panel relative rounded-3xl border border-white/10 bg-[#0d1526]/70 p-4 transition-all duration-200",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
            <BookOpen className="size-3.5" />
          </span>
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-white uppercase">
              Slang Knowledge Base
            </h2>
            <p className="text-[10px] text-white/50">Local Cache & Chat Context</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <Sparkles className="size-2.5 animate-pulse" />
            Active
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-1.5">
          <span className="block text-xs font-bold text-cyan-400">{totalCount}</span>
          <span className="text-[9px] text-white/50 uppercase">Total Terms</span>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-1.5">
          <span className="block text-xs font-bold text-sky-400">{americanCount}</span>
          <span className="text-[9px] text-white/50 uppercase">American</span>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-1.5">
          <span className="block text-xs font-bold text-indigo-400">{britishCount}</span>
          <span className="text-[9px] text-white/50 uppercase">British</span>
        </div>
      </div>

      {/* Upload Notification Alert */}
      {uploadStatus && (
        <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2 text-[11px] text-cyan-200 animate-fadeIn">
          <CheckCircle2 className="size-3.5 shrink-0 text-cyan-400" />
          <span className="truncate">{uploadStatus}</span>
        </div>
      )}

      {/* Quick Search and Filter */}
      <div className="mb-2.5 flex flex-col gap-1.5">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-white/40" />
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search slang terms (e.g. clutch, knackered)…"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 text-white/40 hover:text-white"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Origin Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
          {(["all", "American", "British"] as const).map((origin) => (
            <button
              key={origin}
              type="button"
              onClick={() => setFilterOrigin(origin)}
              className={cn(
                "rounded-lg px-2 py-0.5 transition-colors cursor-pointer capitalize shrink-0",
                filterOrigin === origin
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              {origin}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="ml-auto flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-cyan-300 hover:bg-white/10 cursor-pointer"
          >
            <Plus className="size-2.5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Slang Entries List */}
      <div
        className={cn(
          "space-y-1.5 transition-all overflow-y-auto pr-0.5",
          isExpanded ? "max-h-72" : "max-h-48",
        )}
      >
        {displayedEntries.length === 0 ? (
          <p className="py-4 text-center text-xs text-white/40 italic">
            No slang matches "{query}".
          </p>
        ) : (
          displayedEntries.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col gap-0.5 rounded-xl border border-white/5 bg-white/[0.02] p-2 hover:border-white/15 hover:bg-white/[0.04] transition-colors text-left"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-xs text-cyan-300 truncate">{item.term}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.2 text-[9px] font-medium uppercase",
                      item.origin === "American"
                        ? "bg-sky-500/20 text-sky-300"
                        : item.origin === "British"
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "bg-purple-500/20 text-purple-300",
                    )}
                  >
                    {item.origin}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEntry(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-opacity p-0.5"
                    title="Remove slang entry"
                  >
                    <Trash2 className="size-2.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-white/75 leading-tight">{item.meaning}</p>
              {item.category && (
                <span className="text-[9px] text-white/40 mt-0.5">{item.category}</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Controls */}
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          {/* File Upload Trigger */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.json,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
          >
            <UploadCloud className="size-3" />
            <span>{isUploading ? "Processing…" : "Upload Slang Doc"}</span>
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={resetToDefaults}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Reset to default 452 slang terms"
          >
            <RefreshCw className="size-3" />
          </button>
        </div>

        {/* View All / Collapse toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-0.5 text-[11px] text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <span>{isExpanded ? "Collapse" : `View all (${filteredEntries.length})`}</span>
          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
      </div>

      {/* Uploaded files summary if any */}
      {uploadedFiles.length > 0 && (
        <div className="mt-2 text-[10px] text-white/40 flex items-center gap-1 truncate">
          <span className="font-medium text-white/60">Imported:</span>
          <span className="truncate">{uploadedFiles[0]?.name}</span>
          <span>(+{uploadedFiles[0]?.termCount} terms)</span>
        </div>
      )}

      {/* Add Slang Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0f172a] p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Add Slang Definition</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/50 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">
                  Slang Term
                </label>
                <input
                  type="text"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="e.g. Proper chuffed"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1">
                  Definition & Meaning
                </label>
                <textarea
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  placeholder="e.g. Really pleased or happy with an outcome"
                  required
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">Origin</label>
                  <select
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value as SlangOrigin)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none"
                  >
                    <option value="British">British</option>
                    <option value="American">American</option>
                    <option value="Universal">Universal</option>
                    <option value="Australian">Australian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1">
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Reactions"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400"
                >
                  Save Definition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
