import { useEffect } from "react";
import {
  X,
  Lock,
  FileText,
  PenTool,
  BookOpen,
  GraduationCap,
  Palette,
  Type,
  Ruler,
  Layout,
  AlignLeft,
  Hash,
  FilePlus,
  ListTree,
  Image as ImageIcon,
  Droplets,
  Eye,
  Download,
} from "lucide-react";

type PdfFeature = {
  icon: typeof FileText;
  label: string;
  hint: string;
};

const STYLES: PdfFeature[] = [
  { icon: FileText, label: "Normal Professional PDF", hint: "Clean corporate look" },
  { icon: PenTool, label: "Handwritten Notes", hint: "Realistic handwriting style" },
  { icon: BookOpen, label: "Notebook Paper Style", hint: "Lined notebook feel" },
  { icon: GraduationCap, label: "Study Notes", hint: "Highlighted + structured" },
  { icon: Palette, label: "Custom PDF Styling", hint: "Pick your own colors and fonts" },
];

const FORMATTING: PdfFeature[] = [
  { icon: Type, label: "Font & handwriting selection", hint: "Multiple fonts" },
  { icon: Ruler, label: "Font size & line spacing", hint: "Fine control" },
  { icon: Layout, label: "A4 / A5 · Portrait / Landscape", hint: "Any page size" },
  { icon: AlignLeft, label: "Margins & alignment", hint: "Custom margins" },
  { icon: Hash, label: "Headers & footers", hint: "Repeating text" },
  { icon: FilePlus, label: "Page numbers", hint: "Auto numbered" },
  { icon: FileText, label: "Title page", hint: "Cover page generator" },
  { icon: ListTree, label: "Table of contents", hint: "Auto-generated" },
  { icon: ImageIcon, label: "Image / diagram support", hint: "Insert visuals" },
  { icon: Droplets, label: "Watermark", hint: "Draft / confidential" },
];

const PREVIEW: PdfFeature[] = [
  { icon: Eye, label: "Live PDF preview", hint: "See it before export" },
  { icon: Download, label: "Export / Download PDF", hint: "One click" },
];

export function PdfStudioModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-md sm:items-center sm:p-6"
      onClick={onClose}
    >
      <section
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
        style={{
          background: "oklch(0.15 0.022 240 / 97%)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute -top-24 left-1/2 size-[500px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, oklch(0.72 0.22 160 / 45%), oklch(0.6 0.18 190 / 30%) 40%, transparent 70%)",
          }}
        />

        <header className="relative flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="from-quench-green/25 to-quench-blue/25 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ring-white/10">
              <FileText className="text-quench-cyan size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Text to PDF Studio</h2>
                <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                  Coming Soon
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                Everything planned for Bravura AI's PDF workspace.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground shrink-0 rounded-full p-2 transition-colors"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="relative max-h-[70vh] overflow-y-auto p-5 sm:p-6">
          <Section title="Styles">
            <Grid items={STYLES} />
          </Section>
          <Section title="Formatting & Controls">
            <Grid items={FORMATTING} />
          </Section>
          <Section title="Preview & Export">
            <Grid items={PREVIEW} />
          </Section>
          <p className="text-muted-foreground mt-6 text-center text-xs">
            This is a preview of what's coming. Nothing here generates a file yet.
          </p>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-[0.2em] uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

function Grid({ items }: { items: PdfFeature[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <FeatureCard key={item.label} item={item} />
      ))}
    </div>
  );
}

function FeatureCard({ item }: { item: PdfFeature }) {
  const Icon = item.icon;
  return (
    <div className="group relative flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 transition-colors hover:border-white/[0.12]">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
        <Icon className="text-muted-foreground size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground/80 text-[13px] leading-tight font-medium">{item.label}</p>
        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{item.hint}</p>
      </div>
      <Lock className="text-muted-foreground mt-0.5 size-3.5 shrink-0 opacity-40" />
    </div>
  );
}