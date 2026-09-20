import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, Maximize2, X } from "lucide-react";

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = extractText(children);

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

  if (!src) return null;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `bravura-ai-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="group relative my-3 max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-xl">
      <img
        src={src}
        alt={alt || "Generated Image"}
        referrerPolicy="no-referrer"
        className="w-full max-h-[460px] object-contain transition-transform duration-200 group-hover:scale-[1.01]"
      />
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={handleDownload}
          title="Download PNG"
          className="rounded-lg bg-black/70 p-1.5 text-white backdrop-blur-md hover:bg-black/90 cursor-pointer"
        >
          <Download className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          title="View Fullscreen"
          className="rounded-lg bg-black/70 p-1.5 text-white backdrop-blur-md hover:bg-black/90 cursor-pointer"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="size-6" />
          </button>
          <img
            src={src}
            alt={alt || "Generated Image"}
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-[15px] sm:text-[15.5px] leading-[1.65] text-[#ececf1] break-words">
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
          p: (p) => <p className="mb-3 last:mb-0 text-[#ececf1] leading-[1.65]" {...p} />,
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
          a: (p) => (
            <a
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
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
    </div>
  );
}
