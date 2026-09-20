import { motion } from "motion/react";

interface AppLoadingScreenProps {
  showLogo?: boolean;
}

export function AppLoadingScreen({ showLogo = true }: AppLoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl px-4 select-none pointer-events-none">
      <div className="relative flex flex-col items-center max-w-sm w-full">
        {/* Subtle ambient gradient glow with delayed reveal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute -inset-10 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none"
        />

        {/* Bravura AI Logo Flash with staged delay */}
        {showLogo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{
              delay: 0.7,
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative mb-6 flex flex-col items-center justify-center"
          >
            <img
              src="/ai-logo.jpg"
              alt="Bravura AI"
              className="h-16 sm:h-20 w-auto max-w-[280px] object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.35)]"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}

        {/* Minimal subtitle appearing after logo */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.85, y: 0 }}
          transition={{ delay: showLogo ? 1.1 : 0.1, duration: 0.5, ease: "easeOut" }}
          className="text-xs tracking-wider uppercase text-muted-foreground font-medium"
        >
          Initializing Intelligence Workspace
        </motion.p>

        {/* Fluid linear progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: showLogo ? 0.3 : 0, duration: 0.5 }}
          className="mt-5 w-48 h-1 bg-white/10 rounded-full overflow-hidden relative"
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.4,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="h-full w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full"
          />
        </motion.div>
      </div>
    </div>
  );
}
