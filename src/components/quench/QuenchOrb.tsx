import { cn } from "@/lib/utils";

export function QuenchOrb({ className }: { className?: string }) {
  return (
    <img
      className={cn("inline-block size-10 shrink-0 rounded-full object-cover", className)}
      src="/ai-chat.jpg"
      alt="Bravura AI"
      aria-hidden="true"
    />
  );
}

export const BravuraOrb = QuenchOrb;
