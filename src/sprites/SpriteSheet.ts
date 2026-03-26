import { SpriteFrame, SpriteSheetConfig } from '../engine/types';

/**
 * Loads and manages a sprite sheet image.
 * Provides methods to draw individual frames from the sheet onto a canvas.
 */
export class SpriteSheet {
  private image: HTMLImageElement | null = null;
  private loaded = false;
  readonly config: SpriteSheetConfig;

  constructor(config: SpriteSheetConfig) {
    this.config = config;
  }

  /** Load the sprite sheet image. Returns a promise that resolves when ready. */
  async load(): Promise<void> {
    if (this.loaded) return;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.loaded = true;
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${this.config.image}`));
      img.src = this.config.image;
    });
  }

  /** Check if the sprite sheet is loaded and ready to draw */
  isLoaded(): boolean {
    return this.loaded && this.image !== null;
  }

  /** Get a specific frame's source rectangle */
  getFrame(index: number): SpriteFrame | undefined {
    return this.config.frames[index];
  }

  /** Get total number of frames */
  get frameCount(): number {
    return this.config.frames.length;
  }

  /**
   * Draw a specific frame onto a canvas context.
   * @param ctx - Canvas 2D rendering context
   * @param frameIndex - Index of the frame to draw
   * @param destX - Destination X position on canvas
   * @param destY - Destination Y position on canvas
   * @param destWidth - Destination width (for scaling)
   * @param destHeight - Destination height (for scaling)
   */
  drawFrame(
    ctx: CanvasRenderingContext2D,
    frameIndex: number,
    destX: number,
    destY: number,
    destWidth?: number,
    destHeight?: number
  ): void {
    if (!this.image || !this.loaded) return;

    const frame = this.config.frames[frameIndex];
    if (!frame) return;

    const w = destWidth ?? frame.width;
    const h = destHeight ?? frame.height;

    ctx.drawImage(
      this.image,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      destX,
      destY,
      w,
      h
    );
  }
}
