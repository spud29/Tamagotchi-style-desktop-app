import { SpriteSheetConfig, SpriteFrame } from '../engine/types';

/**
 * Generate a grid-based sprite sheet config.
 * Assumes frames are laid out in a uniform grid (common with pixel art).
 */
export function createGridSpriteConfig(
  imagePath: string,
  frameWidth: number,
  frameHeight: number,
  columns: number,
  rows: number
): SpriteSheetConfig {
  const frames: SpriteFrame[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      frames.push({
        x: col * frameWidth,
        y: row * frameHeight,
        width: frameWidth,
        height: frameHeight,
      });
    }
  }

  return {
    image: imagePath,
    frameWidth,
    frameHeight,
    frames,
  };
}

/**
 * Create a sprite sheet config from explicit frame positions.
 * Use this for non-uniform sprite sheets.
 */
export function createCustomSpriteConfig(
  imagePath: string,
  frameWidth: number,
  frameHeight: number,
  frames: SpriteFrame[]
): SpriteSheetConfig {
  return {
    image: imagePath,
    frameWidth,
    frameHeight,
    frames,
  };
}
