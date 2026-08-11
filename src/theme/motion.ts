/** Shared spring presets for press / enter / sheet motion. */
export const springs = {
  /** Soft press feedback on buttons and chips. */
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  /** Comfortable enter for cards and form blocks. */
  enter: { damping: 22, stiffness: 180, mass: 0.85 },
  /** Sheet / pop surfaces. */
  sheet: { damping: 26, stiffness: 240, mass: 0.9 },
} as const;

export const timings = {
  enterMs: 420,
  fadeMs: 220,
  pressMs: 120,
} as const;
