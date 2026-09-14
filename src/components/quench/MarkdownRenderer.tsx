import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = extractText(children);

  return (
    <div className="group border-border bg-background/70 relative my-4 overflow-hidden rounded-2xl border">
      <button
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="text-muted-foreground hover:text-foreground bg-card/80 absolute top-2.5 right-2.5 rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">{children}</pre>
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

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-[1.75] break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mt-5 mb-2 text-xl font-semibold" {...p} />,
          h2: (p) => <h2 className="mt-5 mb-2 text-lg font-semibold" {...p} />,
          h3: (p) => <h3 className="mt-4 mb-2 text-base font-semibold" {...p} />,
          p: (p) => <p className="mb-3 last:mb-0" {...p} />,
          ul: (p) => <ul className="marker:text-primary mb-3 list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="marker:text-primary mb-3 list-decimal space-y-1 pl-5" {...p} />,
          a: (p) => (
            <a
              className="text-primary underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
          blockquote: (p) => (
            <blockquote
              className="border-primary/60 text-muted-foreground my-3 border-l-2 pl-4 italic"
              {...p}
            />
          ),
          table: (p) => (
            <div className="border-border my-3 overflow-x-auto rounded-xl border">
              <table className="w-full text-sm" {...p} />
            </div>
          ),
          th: (p) => <th className="bg-card/70 px-3 py-2 text-left font-medium" {...p} />,
          td: (p) => <td className="border-border/60 border-t px-3 py-2" {...p} />,
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
                className="bg-accent/70 text-primary rounded-md px-1.5 py-0.5 text-[13px]"
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
