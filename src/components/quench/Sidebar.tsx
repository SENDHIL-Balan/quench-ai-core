import {
  Compass,
  BookMarked,
  Bot,
  Wrench,
  Folder,
  Plug,
  Plus,
  Crown,
  MoreVertical,
  ChevronRight,
} from "lucide-react";
import { QuenchOrb } from "./QuenchOrb";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Explore", icon: Compass },
  { label: "Library", icon: BookMarked },
  { label: "Agents", icon: Bot },
  { label: "Tools", icon: Wrench },
  { label: "Projects", icon: Folder },
  { label: "Integrations", icon: Plug },
];

export function Sidebar({
  onNewChat,
  className,
}: {
  onNewChat: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "glass-panel flex h-full w-full flex-col gap-6 rounded-3xl p-4 lg:w-[260px]",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-1 pt-2">
        <QuenchOrb className="size-11" />
        <div>
          <p className="text-[1.35rem] leading-none font-semibold tracking-wide">
            QUENCH <span className="text-gradient-brand">AI</span>
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">Curiosity, fully satisfied.</p>
        </div>
      </div>

      <button
        onClick={onNewChat}
        className="glow-ring bg-primary/12 text-foreground hover:bg-primary/20 flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors"
      >
        <span className="bg-gradient-brand text-primary-foreground flex size-7 items-center justify-center rounded-full">
          <Plus className="size-4" />
        </span>
        New Chat
      </button>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
          >
            <Icon className="size-[18px]" />
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <button className="border-border/80 bg-accent/40 hover:bg-accent/70 flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors">
          <Crown className="text-quench-green size-5" />
          <span className="flex-1">
            <span className="block text-sm font-medium">Upgrade to Pro</span>
            <span className="text-muted-foreground block text-xs">Unlock more power</span>
          </span>
          <ChevronRight className="text-muted-foreground size-4" />
        </button>

        <div className="border-border/60 flex items-center gap-3 border-t px-1 pt-3">
          <span className="bg-gradient-brand text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-semibold">
            A
          </span>
          <span className="flex-1">
            <span className="block text-sm font-medium">Aditya</span>
            <span className="text-muted-foreground block text-xs">Free Plan</span>
          </span>
          <MoreVertical className="text-muted-foreground size-4" />
        </div>
      </div>
    </aside>
  );
}
