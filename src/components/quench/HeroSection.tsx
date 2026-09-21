import { motion } from "motion/react";

export function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="text-center px-2.5 sm:px-4 w-full max-w-full min-w-0 shrink-0 pt-2 sm:pt-4"
    >
      <h1 className="text-4xl xs:text-5xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] sm:leading-[1.12] break-words text-white">
        Let's build something <br className="hidden sm:inline" />
        <span className="text-gradient-brand">incredible.</span>
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-muted-foreground mt-3 sm:mt-4 text-base sm:text-lg font-medium"
      >
        Your ideas. Deeper answers.
      </motion.p>
    </motion.div>
  );
}
