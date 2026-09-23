import {
  Compass,
  BookMarked,
  Bot,
  Wrench,
  Folder,
  Plug,
  Plus,
  Crown,
  ChevronRight,
  LogOut,
  History,
  Loader2,
  Sliders,
  Volume2,
  Orbit,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { QuenchOrb } from "./QuenchOrb";
import { cn } from "@/lib/utils";
import { signInWithGoogle, signOutUser, onAuthState, type AuthUserProfile } from "@/lib/firebase";
import { useCosmicTheme } from "@/lib/theme/CosmicThemeContext";
import { CosmicThemeGalleryModal } from "./CosmicThemeGalleryModal";

const NAV = [
  { label: "Explore", icon: Compass, to: null },
  { label: "Library", icon: BookMarked, to: null },
  { label: "Agents", icon: Bot, to: null },
  { label: "Tools", icon: Wrench, to: "/tools" as const },
  { label: "Projects", icon: Folder, to: null },
  { label: "Integrations", icon: Plug, to: null },
];

export function Sidebar({
  onNewChat,
  onHistory,
  onOpenVoiceSettings,
  onOpenTools,
  className,
  user: userProp,
  authInitialized: authInitializedProp,
}: {
  onNewChat: () => void;
  onHistory: () => void;
  onOpenVoiceSettings?: () => void;
  onOpenTools?: () => void;
  className?: string;
  user?: AuthUserProfile | null;
  authInitialized?: boolean;
}) {
  const [internalUser, setInternalUser] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [internalAuthInitialized, setInternalAuthInitialized] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const { currentThemeMeta } = useCosmicTheme();

  useEffect(() => {
    // If props are passed from parent, do not duplicate listener
    if (userProp !== undefined || authInitializedProp !== undefined) return;

    const unsubscribe = onAuthState((profile) => {
      setInternalUser(profile);
      setInternalAuthInitialized(true);
    });
    return () => unsubscribe();
  }, [userProp, authInitializedProp]);

  const user = userProp !== undefined ? userProp : internalUser;
  const authInitialized =
    authInitializedProp !== undefined ? authInitializedProp : internalAuthInitialized;

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const profile = await signInWithGoogle();
      toast.success(`Signed in as ${profile.displayName ?? profile.email ?? "Google User"}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast.info("Signed out successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign out";
      toast.error(message);
    }
  };

  return (
    <aside
      className={cn(
        "glass-panel flex min-h-full w-full flex-col gap-6 overflow-y-auto rounded-3xl p-4 lg:h-full lg:w-[260px]",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-1 pt-2">
        <QuenchOrb className="size-11" />
        <div>
          <p className="text-[1.35rem] leading-none font-semibold tracking-wide">
            BRAVURA <span className="text-gradient-brand">AI</span>
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">Intelligent Voice & Workspace</p>
        </div>
      </div>

      <button
        onClick={onNewChat}
        className="glow-ring bg-primary/12 text-foreground hover:bg-primary/20 flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer"
      >
        <span className="bg-gradient-brand text-primary-foreground flex size-7 items-center justify-center rounded-full">
          <Plus className="size-4" />
        </span>
        New Chat
      </button>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ label, icon: Icon, to }) => {
          const baseClass =
            "text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors cursor-pointer";

          if (to) {
            return (
              <Link
                key={label}
                to={to}
                onClick={() => {
                  if (label === "Tools") {
                    onOpenTools?.();
                  }
                }}
                className={baseClass}
                activeProps={{ className: "bg-accent/70 text-foreground font-medium" }}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            );
          }

          return (
            <button key={label} type="button" className={baseClass}>
              <Icon className="size-[18px]" />
              {label}
            </button>
          );
        })}

        {onOpenVoiceSettings && (
          <button
            type="button"
            onClick={onOpenVoiceSettings}
            className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors cursor-pointer group"
          >
            <span className="flex items-center gap-3">
              <Volume2 className="size-[18px] text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Voice Settings</span>
            </span>
            <span className="flex size-2 rounded-full bg-emerald-400" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setThemeModalOpen(true)}
          className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors cursor-pointer group"
          title="Change cosmic theme"
        >
          <span className="flex items-center gap-3">
            <Orbit className="size-[18px] text-cyan-400 group-hover:rotate-45 transition-transform" />
            <span>Cosmic Themes</span>
          </span>
          <span
            className="size-2 rounded-full ring-1 ring-white/20"
            style={{
              background: currentThemeMeta.accents[0],
              boxShadow: `0 0 6px ${currentThemeMeta.accents[0]}`,
            }}
          />
        </button>

        <button
          type="button"
          onClick={onHistory}
          className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors cursor-pointer"
        >
          <History className="size-[18px]" />
          History
        </button>
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <button className="border-border/80 bg-accent/40 hover:bg-accent/70 flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors cursor-pointer">
          <Crown className="text-quench-green size-5" />
          <span className="flex-1">
            <span className="block text-sm font-medium">Upgrade to Pro</span>
            <span className="text-muted-foreground block text-xs">Unlock more power</span>
          </span>
          <ChevronRight className="text-muted-foreground size-4" />
        </button>

        {!authInitialized ? (
          <div className="border-border/60 border-t px-1 pt-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/5 px-2.5 py-2 animate-pulse">
              <div className="size-8 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-3 w-20 rounded bg-white/15" />
                <div className="h-2.5 w-28 rounded bg-white/10" />
              </div>
            </div>
          </div>
        ) : user ? (
          <div className="border-border/60 flex items-center gap-3 border-t px-1 pt-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="size-9 rounded-full object-cover border border-white/10"
              />
            ) : (
              <span className="bg-gradient-brand text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-semibold">
                {(user.displayName ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {user.displayName ?? "Signed in"}
              </span>
              <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
            </span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <div className="border-border/60 border-t pt-3">
            <button
              type="button"
              onClick={() => void handleSignIn()}
              disabled={loading}
              className="group border border-white/15 bg-white/5 hover:bg-white/10 text-foreground flex w-full items-center justify-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin text-cyan-400" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <CosmicThemeGalleryModal open={themeModalOpen} onOpenChange={setThemeModalOpen} />
    </aside>
  );
}
