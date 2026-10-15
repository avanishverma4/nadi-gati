// Scroll-in animations shared by the marketing pages (landing and About).
// Pair them with <MotionConfig reducedMotion="user"> so reduced-motion visitors get a plain fade.

export const STAGGER_GRID_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const RISE_TILE_VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
      delayChildren: 0.25,
      staggerChildren: 0.1,
    },
  },
};
