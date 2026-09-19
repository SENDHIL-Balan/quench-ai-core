import { Home, BookMarked, Bot, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", icon: Home, active: true },
  { label: "Library", icon: BookMarked, active: false },
  { label: "Agents", icon: Bot, active: false },
  { label: "Tools", icon: Wrench, active: false },
];

export function MobileNavigation() {
  return (
    <nav className="glass-panel fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-3xl px-2 py-2.5 lg:hidden">
      {ITEMS.map(({ label, icon: Icon, active }) => (
        <button
          key={label}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-2xl py-1 text-[11px]",
            active ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
          {label}
        </button>
      ))}
    </nav>
  );
}
