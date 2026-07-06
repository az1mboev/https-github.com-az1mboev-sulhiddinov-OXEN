/* ------------------------------------------------------------------ */
/*  Shared Framer Motion spring presets & animation helpers             */
/*  Import these instead of inlining transitions everywhere — keeps     */
/*  the whole app on the same physical, Apple-style feel.               */
/* ------------------------------------------------------------------ */

import type { Transition, Variants } from "framer-motion";

/** Snappy spring — buttons, taps, toggles. Fast settle, no bounce. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 360,
  damping: 30,
  mass: 0.8,
};

/** Gentle spring — large surfaces, page sections. Slower, soft settle. */
export const springGentle: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 28,
  mass: 1,
};

/** Card spring — cards entering a grid/showcase. Slight bounce. */
export const springCard: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
  mass: 0.85,
};

/** Stagger container — children animate in sequence. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

/** Fade-up child — pairs with staggerContainer. */
export const fadeUpChild: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springCard },
};

/** Scale-in child — for pills, chips, icons. */
export const scaleInChild: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: springSnappy },
};

/** Standard exit — used with AnimatePresence for sheets/modals. */
export const fadeExit: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

/** 60FPS hint — apply to animated containers so the browser composites on GPU. */
export const willChangeTransform = { willChange: "transform" as const };
