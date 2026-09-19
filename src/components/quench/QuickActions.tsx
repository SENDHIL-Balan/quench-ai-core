import { Lightbulb, ListChecks, BarChart3, PenLine, ChevronRight } from "lucide-react";

export const QUICK_ACTIONS = [
  {
    title: "Explain a concept",
    sub: "Learn something new",
    icon: Lightbulb,
    prompt: "Explain machine learning to me like I'm a beginner.",
  },
  {
    title: "Plan something",
    sub: "Turn ideas into steps",
    icon: ListChecks,
    prompt: "Help me turn this idea into a step-by-step plan: ",
  },
  {
    title: "Analyze data",
    sub: "Find insights fast",
    icon: BarChart3,
    prompt: "Analyze the following data and tell me what stands out:\n",
  },
  {
    title: "Create something",
    sub: "Build, write, design",
    icon: PenLine,
    prompt: "Help me create ",
  },
];

export function QuickActions({ onPick }: { onPick: (prompt: string, submit: boolean) => void }) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {QUICK_ACTIONS.map(({ title, sub, icon: Icon, prompt }) => {
        const submit = !prompt.trimEnd().endsWith(":") && prompt.trim().endsWith(".");
        return (
          <button
            key={title}
            onClick={() => onPick(prompt, submit)}
            className="glass-panel hover:border-primary/35 flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors"
          >
            <Icon className="text-quench-cyan size-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{title}</span>
              <span className="text-muted-foreground block truncate text-xs">{sub}</span>
            </span>
            <ChevronRight className="text-muted-foreground size-4 lg:hidden" />
          </button>
        );
      })}
    </div>
  );
}
