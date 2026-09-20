import { motion } from "motion/react";

export function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="text-center px-2 w-full max-w-full min-w-0 shrink-0"
    >
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.18] sm:leading-[1.15] break-words">
        Let's build something
        <br />
        <span className="text-gradient-brand">incredible.</span>
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base font-normal"
      >
        Your ideas. Deeper answers.
      </motion.p>
    </motion.div>
  );
}
