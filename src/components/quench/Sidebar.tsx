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
  LogIn,
  LogOut,
  History,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { QuenchOrb } from "./QuenchOrb";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const NAV = [
  { label: "Explore", icon: Compass, to: null },
  { label: "Library", icon: BookMarked, to: null },
  { label: "Agents", icon: Bot, to: null },
  { label: "Tools", icon: Wrench, to: "/tools" as const },
  { label: "Projects", icon: Folder, to: null },
  { label: "Integrations", icon: Plug, to: null },
];

type AuthUser = {
  email: string | undefined;
  name: string | undefined;
  avatarUrl: string | undefined;
};

export function Sidebar({
  onNewChat,
  onHistory,
  className,
}: {
  onNewChat: () => void;
  onHistory: () => void;
  className?: string;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!supabase) return;

    void supabase.auth.getUser().then(({ data }) => {
      const metadata = data.user?.user_metadata as
        { full_name?: string; name?: string; avatar_url?: string } | undefined;
      setUser(
        data.user
          ? {
              email: data.user.email,
              name: metadata?.full_name ?? metadata?.name,
              avatarUrl: metadata?.avatar_url,
            }
          : null,
      );
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const metadata = session?.user.user_metadata as
        { full_name?: string; name?: string; avatar_url?: string } | undefined;
      setUser(
        session?.user
          ? {
              email: session.user.email,
              name: metadata?.full_name ?? metadata?.name,
              avatarUrl: metadata?.avatar_url,
            }
          : null,
      );
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
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
                className={baseClass}
                activeProps={{ className: "bg-accent/60 text-foreground" }}
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

        {user ? (
          <div className="border-border/60 flex items-center gap-3 border-t px-1 pt-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
            ) : (
              <span className="bg-gradient-brand text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-semibold">
                {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.name ?? "Signed in"}</span>
              <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
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
              onClick={() => void signInWithGoogle()}
              disabled={!isSupabaseConfigured()}
              className="border-border bg-card/60 text-foreground hover:bg-accent/70 flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="size-4" />
              Sign in with Google
            </button>
            {!isSupabaseConfigured() && (
              <p className="text-muted-foreground mt-2 text-center text-[11px]">
                Add Supabase credentials to enable sign-in.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
