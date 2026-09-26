import {
  Plus,
  Crown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  Loader2,
  Volume2,
  Orbit,
  MessageSquare,
  Trash2,
  Search,
  RefreshCw,
  Cloud,
  Wrench,
  X,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  signInWithGoogle,
  signOutUser,
  onAuthState,
  getUserChatsFromFirestore,
  subscribeUserChats,
  UnauthorizedDomainError,
  type AuthUserProfile,
  type FirestoreChatSession,
} from "@/lib/firebase";
import { useCosmicTheme } from "@/lib/theme/CosmicThemeContext";
import { CosmicThemeGalleryModal } from "./CosmicThemeGalleryModal";
import { UnauthorizedDomainModal } from "./UnauthorizedDomainModal";

const MAX_INITIAL_CHATS = 6;

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return "Just now";
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export type SidebarChat = {
  id: string;
  title: string;
  updatedAt: string;
  messages?: unknown[];
};

export type SidebarProps = {
  onNewChat: () => void;
  onSelectChat?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  activeChatId?: string | null;
  chats?: SidebarChat[];
  onHistory?: () => void;
  onOpenVoiceSettings?: () => void;
  onOpenTools?: () => void;
  className?: string;
  user?: AuthUserProfile | null;
  authInitialized?: boolean;
};

export function Sidebar({
  onNewChat,
  onSelectChat,
  onDeleteChat,
  activeChatId,
  chats: parentChats = [],
  onOpenVoiceSettings,
  onOpenTools,
  className,
  user: userProp,
  authInitialized: authInitializedProp,
}: SidebarProps) {
  const [internalUser, setInternalUser] = useState<AuthUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [internalAuthInitialized, setInternalAuthInitialized] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const { currentThemeMeta } = useCosmicTheme();

  // Firestore chat sessions state
  const [firestoreChats, setFirestoreChats] = useState<FirestoreChatSession[]>([]);
  const [isFetchingFirestore, setIsFetchingFirestore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllChats, setShowAllChats] = useState(false);
  const [unauthorizedModalOpen, setUnauthorizedModalOpen] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string>("");

  useEffect(() => {
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

  // Subscribe to & fetch previous chat sessions from Firestore when authenticated
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setFirestoreChats([]);
      return;
    }

    setIsFetchingFirestore(true);

    // Initial fetch from Firestore
    void getUserChatsFromFirestore(uid)
      .then((chats) => {
        setFirestoreChats(chats);
      })
      .finally(() => {
        setIsFetchingFirestore(false);
      });

    // Real-time synchronization listener with Firestore
    const unsubscribe = subscribeUserChats(uid, (remoteChats) => {
      setFirestoreChats(remoteChats);
      setIsFetchingFirestore(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Merge parent chats (local state) with Firestore chats (remote state)
  const mergedChats = useMemo(() => {
    const map = new Map<string, SidebarChat>();

    // Add remote Firestore chats
    for (const fc of firestoreChats) {
      map.set(fc.id, {
        id: fc.id,
        title: fc.title,
        updatedAt: fc.updatedAt,
        messages: fc.messages,
      });
    }

    // Overlay or add parent local chats (which may have newer uncommitted turns)
    for (const pc of parentChats) {
      const existing = map.get(pc.id);
      if (!existing) {
        map.set(pc.id, pc);
      } else {
        const localTime = new Date(pc.updatedAt).getTime();
        const remoteTime = new Date(existing.updatedAt).getTime();
        if (localTime >= remoteTime) {
          map.set(pc.id, pc);
        }
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  }, [firestoreChats, parentChats]);

  // Filter chats by search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return mergedChats;
    const q = searchQuery.toLowerCase().trim();
    return mergedChats.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [mergedChats, searchQuery]);

  // Limit chats to MAX_INITIAL_CHATS (6) unless "See all" is clicked or searching
  const visibleChats = useMemo(() => {
    if (showAllChats || searchQuery.trim()) {
      return filteredChats;
    }
    return filteredChats.slice(0, MAX_INITIAL_CHATS);
  }, [filteredChats, showAllChats, searchQuery]);

  const hasMoreChats =
    !showAllChats && !searchQuery.trim() && filteredChats.length > MAX_INITIAL_CHATS;

  // Manual refresh trigger
  const handleManualRefresh = useCallback(async () => {
    if (!user?.uid) {
      toast.info("Sign in with Google to sync previous chats from Firestore");
      return;
    }
    try {
      setIsRefreshing(true);
      const chats = await getUserChatsFromFirestore(user.uid);
      setFirestoreChats(chats);
      toast.success("Previous chats updated from Firestore");
    } catch {
      toast.error("Failed to sync chats from Firestore");
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.uid]);

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      const profile = await signInWithGoogle();
      toast.success(`Signed in as ${profile.displayName ?? profile.email ?? "Google User"}`);
    } catch (err: unknown) {
      if (
        err instanceof UnauthorizedDomainError ||
        (err as { code?: string })?.code === "auth/unauthorized-domain" ||
        String((err as Error)?.message || "").includes("auth/unauthorized-domain")
      ) {
        const domain =
          (err as UnauthorizedDomainError)?.domain ||
          (typeof window !== "undefined" ? window.location.hostname : "");
        setUnauthorizedDomain(domain);
        setUnauthorizedModalOpen(true);
        toast.error("Domain unauthorized: click to authorize in Firebase Console", {
          action: {
            label: "Authorize",
            onClick: () => setUnauthorizedModalOpen(true),
          },
        });
      } else {
        const message = err instanceof Error ? err.message : "Failed to sign in with Google";
        toast.error(message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setFirestoreChats([]);
      toast.info("Signed out successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign out";
      toast.error(message);
    }
  };

  const handleDeleteChat = (id: string, title?: string) => {
    if (onDeleteChat) {
      onDeleteChat(id);
      toast.info(
        `Deleted "${title ? (title.length > 25 ? title.slice(0, 25) + "…" : title) : "Chat"}"`,
      );
    }
  };

  return (
    <aside
      className={cn(
        "glass-panel flex min-h-full w-full flex-col gap-3 overflow-hidden rounded-3xl p-3 sm:p-4 lg:h-full lg:w-[275px] xl:w-[290px]",
        className,
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-start px-1 pt-1">
        <img
          src="/ai-logo.jpg"
          alt="AI Logo"
          className="h-10 sm:h-11 w-auto max-w-[210px] object-contain rounded-lg select-none"
        />
      </div>

      {/* New Chat Button */}
      <button
        type="button"
        onClick={onNewChat}
        className="glow-ring bg-primary/15 text-foreground hover:bg-primary/25 border border-primary/20 flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium transition-all shadow-sm cursor-pointer group active:scale-[0.99]"
      >
        <span className="flex items-center gap-2.5">
          <span className="bg-gradient-brand text-primary-foreground flex size-6 items-center justify-center rounded-full shadow-sm group-hover:scale-110 transition-transform">
            <Plus className="size-3.5" />
          </span>
          <span className="font-semibold text-xs sm:text-sm tracking-wide">New Chat</span>
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
          New
        </span>
      </button>

      {/* AI Tools & Multi-Agent and Cosmic Theme Buttons at the TOP */}
      <nav className="flex flex-col gap-1 pb-1 border-b border-border/40">
        <Link
          to="/tools"
          onClick={onOpenTools}
          className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer group"
          activeProps={{ className: "bg-accent/70 text-foreground font-medium" }}
        >
          <span className="flex items-center gap-2.5">
            <Wrench className="size-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-foreground/90">AI Tools & Multi-Agent</span>
          </span>
          <ChevronRight className="size-3 text-muted-foreground/60 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <button
          type="button"
          onClick={() => setThemeModalOpen(true)}
          className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer group"
          title="Change cosmic theme"
        >
          <span className="flex items-center gap-2.5">
            <Orbit className="size-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
            <span className="font-medium text-foreground/90">Cosmic Themes</span>
          </span>
          <span
            className="size-2 rounded-full ring-1 ring-white/20"
            style={{
              background: currentThemeMeta.accents[0],
              boxShadow: `0 0 6px ${currentThemeMeta.accents[0]}`,
            }}
          />
        </button>

        {onOpenVoiceSettings && (
          <button
            type="button"
            onClick={onOpenVoiceSettings}
            className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer group"
          >
            <span className="flex items-center gap-2.5">
              <Volume2 className="size-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Voice Settings</span>
            </span>
            <span className="flex size-1.5 rounded-full bg-emerald-400" />
          </button>
        )}
      </nav>

      {/* Search Input */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 size-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chats..."
          className="w-full bg-accent/30 hover:bg-accent/50 focus:bg-accent/60 text-xs rounded-xl pl-8 pr-7 py-1.5 text-foreground placeholder:text-muted-foreground/70 outline-none border border-border/40 focus:border-primary/40 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Clear search"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Previous Chat Sessions Section */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1 pb-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <MessageSquare className="size-3.5 text-cyan-400" />
            <span>Previous Chats</span>
            {filteredChats.length > 0 && (
              <span className="text-[10px] rounded-full bg-accent/70 px-1.5 py-0.2 text-muted-foreground font-mono">
                {filteredChats.length}
              </span>
            )}
          </div>
          {user && (
            <button
              type="button"
              onClick={() => void handleManualRefresh()}
              disabled={isRefreshing || isFetchingFirestore}
              title="Refresh chats from Firestore"
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Refresh from Firestore"
            >
              <RefreshCw
                className={cn(
                  "size-3",
                  (isRefreshing || isFetchingFirestore) && "animate-spin text-cyan-400",
                )}
              />
            </button>
          )}
        </div>

        {/* Scrollable list of chat sessions */}
        <div className="flex-1 min-h-[120px] overflow-y-auto space-y-1 pr-1 [scrollbar-width:thin]">
          {isFetchingFirestore && filteredChats.length === 0 ? (
            <div className="flex flex-col gap-2 py-2 px-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center gap-2.5 p-2 rounded-xl bg-white/5"
                >
                  <div className="size-6 rounded-lg bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="h-3 w-3/4 rounded bg-white/10" />
                    <div className="h-2 w-1/3 rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleChats.length > 0 ? (
            <>
              {visibleChats.map((chat) => {
                const isActive = chat.id === activeChatId;
                const timeLabel = formatRelativeTime(chat.updatedAt);
                return (
                  <div
                    key={chat.id}
                    onClick={() => onSelectChat?.(chat.id)}
                    className={cn(
                      "group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all cursor-pointer border select-none",
                      isActive
                        ? "bg-primary/20 border-primary/40 text-foreground font-medium shadow-sm ring-1 ring-primary/25"
                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground border-transparent",
                    )}
                    title={chat.title}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <MessageSquare
                        className={cn(
                          "size-3.5 shrink-0",
                          isActive
                            ? "text-cyan-400"
                            : "text-muted-foreground/70 group-hover:text-foreground",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs leading-snug">{chat.title || "New Chat"}</p>
                        {timeLabel && (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                            {timeLabel}
                          </p>
                        )}
                      </div>
                    </div>

                    {onDeleteChat && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(chat.id, chat.title);
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-destructive/10 shrink-0 cursor-pointer"
                        title="Delete conversation"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* "See all" button when more than 6 chats exist */}
              {hasMoreChats && (
                <button
                  type="button"
                  onClick={() => setShowAllChats(true)}
                  className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-accent/40 hover:bg-accent/70 text-foreground/90 text-xs font-medium border border-border/40 hover:border-primary/40 transition-all cursor-pointer"
                >
                  <span>See all ({filteredChats.length})</span>
                  <ChevronDown className="size-3.5 text-cyan-400" />
                </button>
              )}

              {/* "Show less" button when expanded */}
              {showAllChats && !searchQuery.trim() && filteredChats.length > MAX_INITIAL_CHATS && (
                <button
                  type="button"
                  onClick={() => setShowAllChats(false)}
                  className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-accent/20 hover:bg-accent/40 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors cursor-pointer"
                >
                  <span>Show less</span>
                  <ChevronUp className="size-3.5 text-muted-foreground" />
                </button>
              )}
            </>
          ) : searchQuery.trim() ? (
            <div className="py-6 text-center text-muted-foreground text-xs px-2">
              <p>No matching chats found.</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-1 text-cyan-400 hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          ) : user ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground text-xs px-2">
              <Sparkles className="size-5 text-muted-foreground/40" />
              <p className="font-medium text-foreground/80">No previous chats yet</p>
              <p className="text-[11px] text-muted-foreground/60">
                Start chatting and your sessions will appear right here from Firestore!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-primary/5 border border-primary/10 text-xs">
              <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <Cloud className="size-3.5" />
                <span>Sync with Firestore</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Sign in with Google to fetch and access your previous chat sessions from any device.
              </p>
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="mt-1 py-1.5 px-2.5 bg-primary/20 hover:bg-primary/30 text-primary-foreground text-[11px] font-medium rounded-xl text-center transition-colors cursor-pointer"
              >
                Sign in to sync
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Profile / Pro Upgrade */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
        <button className="border-border/70 bg-accent/30 hover:bg-accent/60 flex items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition-colors cursor-pointer">
          <Crown className="text-quench-green size-4 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-medium">Upgrade to Pro</span>
            <span className="text-muted-foreground block text-[10px] truncate">
              Unlock unlimited reasoning & voice
            </span>
          </span>
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
        </button>

        {!authInitialized ? (
          <div className="px-1 py-1">
            <div className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/5 px-2.5 py-1.5 animate-pulse">
              <div className="size-7 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-1 min-w-0">
                <div className="h-2.5 w-16 rounded bg-white/15" />
                <div className="h-2 w-24 rounded bg-white/10" />
              </div>
            </div>
          </div>
        ) : user ? (
          <div className="flex items-center gap-2.5 px-1 py-1">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="size-8 rounded-full object-cover border border-white/10 shrink-0"
              />
            ) : (
              <span className="bg-gradient-brand text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {(user.displayName ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                {user.displayName ?? "Signed in"}
              </span>
              <span className="text-muted-foreground block truncate text-[10px]">{user.email}</span>
            </span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => void handleSignIn()}
              disabled={authLoading}
              className="group border border-white/15 bg-white/5 hover:bg-white/10 text-foreground flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {authLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin text-cyan-400" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="size-3.5 shrink-0" viewBox="0 0 24 24">
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
      <UnauthorizedDomainModal
        open={unauthorizedModalOpen}
        onOpenChange={setUnauthorizedModalOpen}
        domain={unauthorizedDomain}
      />
    </aside>
  );
}
