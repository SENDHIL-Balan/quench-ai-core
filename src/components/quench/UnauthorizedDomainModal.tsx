import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShieldAlert, Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface UnauthorizedDomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain?: string;
  projectId?: string;
  settingsUrl?: string;
}

export function UnauthorizedDomainModal({
  open,
  onOpenChange,
  domain: propDomain,
  projectId = "gen-lang-client-0686227024",
  settingsUrl: propSettingsUrl,
}: UnauthorizedDomainModalProps) {
  const [copied, setCopied] = useState(false);

  const domain =
    propDomain ||
    (typeof window !== "undefined"
      ? window.location.hostname
      : "ais-pre-xlxxfmfrjs3n3aefygzpop-472341381972.asia-southeast1.run.app");

  const settingsUrl =
    propSettingsUrl ||
    `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(domain);
      setCopied(true);
      toast.success("Domain copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-white/10 text-foreground max-w-md p-6 rounded-3xl shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-semibold">
                Authorize Domain for Google Sign-In
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                One-time Firebase security setup required
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs leading-relaxed">
          <p className="text-muted-foreground">
            Firebase Authentication requires public domains to be added to your project's{" "}
            <span className="text-foreground font-medium">Authorized Domains</span> list before
            allowing Google logins in Chrome.
          </p>

          {/* Domain Box */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Your App's Domain
            </label>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-cyan-300">
              <span className="truncate select-all">{domain}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
                title="Copy domain"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-[10px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span className="text-[10px]">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Steps */}
          <div className="space-y-2 p-3 rounded-2xl bg-accent/30 border border-border/50 text-[11px]">
            <p className="font-semibold text-foreground">How to fix in 1 minute:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>
                Click <span className="text-cyan-400 font-medium">Open Firebase Settings</span>{" "}
                below.
              </li>
              <li>
                Scroll to <span className="text-foreground font-medium">Authorized domains</span>{" "}
                and click <span className="text-foreground font-medium">Add domain</span>.
              </li>
              <li>
                Paste{" "}
                <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">{domain}</code> and
                click <span className="text-foreground font-medium">Save</span>.
              </li>
            </ol>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <a
              href={settingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glow-ring bg-gradient-brand text-primary-foreground font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-transform active:scale-[0.99] shadow-lg"
            >
              <span>Open Firebase Settings</span>
              <ExternalLink className="size-3.5" />
            </a>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="py-2 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Sparkles className="size-3 text-cyan-400" />
              <span>Continue as Guest (All chat & voice features work)</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
