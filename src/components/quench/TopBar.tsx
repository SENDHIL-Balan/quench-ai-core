<<<<<<< HEAD
import { Bell, Menu, PanelRight } from "lucide-react";
=======
import { Bell, Menu, Search, PanelRight } from "lucide-react";
>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39

export function TopBar({
  onToggleSidebar,
  onToggleContext,
}: {
  onToggleSidebar: () => void;
  onToggleContext: () => void;
}) {
  return (
    <header className="flex items-center gap-3">
      <button
        onClick={onToggleSidebar}
        className="glass-panel text-muted-foreground hover:text-foreground flex size-11 items-center justify-center rounded-2xl lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

<<<<<<< HEAD
=======
      <label className="glass-panel flex h-11 flex-1 items-center gap-3 rounded-full px-4">
        <Search className="text-muted-foreground size-4 shrink-0" />
        <input
          className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
          placeholder="Search conversations, tasks, or anything..."
        />
      </label>

>>>>>>> 139dbab44bd11806e24f3bbbca6f38a5e766ff39
      <button
        className="glass-panel text-muted-foreground hover:text-foreground relative flex size-11 items-center justify-center rounded-full"
        aria-label="Notifications"
      >
        <Bell className="size-[18px]" />
        <span className="bg-destructive absolute top-2.5 right-3 size-2 rounded-full" />
      </button>

      <span className="bg-gradient-brand text-primary-foreground hidden size-11 items-center justify-center rounded-full text-sm font-semibold sm:flex">
        A
      </span>

      <button
        onClick={onToggleContext}
        className="glass-panel text-muted-foreground hover:text-foreground flex size-11 items-center justify-center rounded-2xl xl:hidden"
        aria-label="Toggle context panel"
      >
        <PanelRight className="size-5" />
      </button>
    </header>
  );
}
