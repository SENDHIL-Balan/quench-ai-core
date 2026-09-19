import { cn } from "@/lib/utils";

export function QuenchOrb({ className }: { className?: string }) {
  return (
    <img
      className={cn("inline-block size-20 shrink-0 rounded-full object-cover", className)}
      src="/ai-chat.jpg"
      alt="Bravura AI"
      aria-hidden="true"
    />
  );
}
