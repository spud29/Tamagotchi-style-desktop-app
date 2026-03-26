import { AnimationDef } from '../../engine/types';

/**
 * Gloop animation definitions.
 *
 * Frame indices reference the sprite sheet grid positions.
 * The sprite sheet uses a uniform grid layout.
 *
 * Until the actual sprite sheet is sliced, we use placeholder frame indices.
 * These will be updated once the sprite sheet JSON is finalized.
 *
 * Animation naming convention: {action}_{direction}
 * e.g., idle_front, walk_left, sleep, happy, sad
 */
export const gloopAnimations: Record<string, AnimationDef> = {
  // --- Idle animations (looping) ---
  idle_front: {
    frames: [0, 1],
    frameRate: 2,
    loop: true,
  },
  idle_back: {
    frames: [2, 3],
    frameRate: 2,
    loop: true,
  },
  idle_left: {
    frames: [4, 5],
    frameRate: 2,
    loop: true,
  },
  idle_right: {
    frames: [6, 7],
    frameRate: 2,
    loop: true,
  },

  // --- Walk animations (looping) ---
  walk_front: {
    frames: [8, 9, 10, 11],
    frameRate: 6,
    loop: true,
  },
  walk_back: {
    frames: [12, 13, 14, 15],
    frameRate: 6,
    loop: true,
  },
  walk_left: {
    frames: [16, 17, 18, 19],
    frameRate: 6,
    loop: true,
  },
  walk_right: {
    frames: [20, 21, 22, 23],
    frameRate: 6,
    loop: true,
  },

  // --- Basic function animations ---
  sleep: {
    frames: [24, 25, 26, 27],
    frameRate: 2,
    loop: true,
  },
  happy: {
    frames: [28, 29, 30, 31],
    frameRate: 4,
    loop: false,
  },
  sad: {
    frames: [32, 33],
    frameRate: 2,
    loop: true,
  },
  sick: {
    frames: [34, 35],
    frameRate: 2,
    loop: true,
  },
  eating: {
    frames: [36, 37, 38, 39],
    frameRate: 4,
    loop: false,
  },

  // --- Egg / hatching ---
  egg_idle: {
    frames: [40, 41],
    frameRate: 1,
    loop: true,
  },
  egg_hatch: {
    frames: [42, 43, 44, 45],
    frameRate: 3,
    loop: false,
  },

  // --- Ghost ---
  ghost: {
    frames: [46, 47],
    frameRate: 2,
    loop: true,
  },

  // --- Attention seeking ---
  wave: {
    frames: [48, 49, 50, 51],
    frameRate: 4,
    loop: true,
  },
  knock: {
    frames: [52, 53, 54, 55],
    frameRate: 4,
    loop: false,
  },
  ride_cursor: {
    frames: [56, 57],
    frameRate: 4,
    loop: true,
  },

  // --- Desktop icon interactions ---
  reach: {
    frames: [58, 59],
    frameRate: 3,
    loop: false,
  },
  pickup: {
    frames: [60, 61],
    frameRate: 3,
    loop: false,
  },
  carry_left: {
    frames: [62, 63],
    frameRate: 4,
    loop: true,
  },
  carry_right: {
    frames: [64, 65],
    frameRate: 4,
    loop: true,
  },
  drop: {
    frames: [66, 67],
    frameRate: 3,
    loop: false,
  },
};
