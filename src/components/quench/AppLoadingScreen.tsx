import { motion } from "motion/react";

interface AppLoadingScreenProps {
  showLogo?: boolean;
}

export function AppLoadingScreen({ showLogo = true }: AppLoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl px-4 select-none pointer-events-none">
      <div className="relative flex flex-col items-center justify-center max-w-xl w-full">
        {/* Subtle ambient gradient glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute -inset-16 bg-gradient-to-r from-cyan-500/25 via-blue-500/20 to-purple-500/25 rounded-full blur-3xl pointer-events-none"
        />

        {/* Bravura AI Logo prominent and centered */}
        {showLogo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{
              delay: 0.15,
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative flex items-center justify-center"
          >
            <img
              src="/ai-logo.jpg"
              alt="Bravura AI"
              className="h-28 sm:h-36 md:h-44 w-auto max-w-[85vw] sm:max-w-[480px] object-contain drop-shadow-[0_0_45px_rgba(6,182,212,0.45)]"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
