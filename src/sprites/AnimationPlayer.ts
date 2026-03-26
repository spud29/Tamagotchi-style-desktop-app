import { AnimationDef } from '../engine/types';
import { SpriteSheet } from './SpriteSheet';

/**
 * Handles frame-by-frame animation playback from a sprite sheet.
 * Manages timing, looping, and animation transitions.
 */
export class AnimationPlayer {
  private spriteSheet: SpriteSheet;
  private animations: Record<string, AnimationDef>;
  private currentAnimation: string | null = null;
  private currentFrameIndex = 0;
  private elapsed = 0;
  private finished = false;

  constructor(spriteSheet: SpriteSheet, animations: Record<string, AnimationDef>) {
    this.spriteSheet = spriteSheet;
    this.animations = animations;
  }

  /** Start playing a named animation. If already playing, restarts it. */
  play(animationName: string): void {
    if (this.currentAnimation === animationName && !this.finished) return;

    if (!this.animations[animationName]) {
      console.warn(`Animation "${animationName}" not found`);
      return;
    }

    this.currentAnimation = animationName;
    this.currentFrameIndex = 0;
    this.elapsed = 0;
    this.finished = false;
  }

  /** Force-start an animation even if it's already playing */
  restart(animationName: string): void {
    this.currentAnimation = null; // Reset so play() doesn't short-circuit
    this.play(animationName);
  }

  /** Update the animation timer. Call each frame with deltaTime in seconds. */
  update(deltaTime: number): void {
    if (!this.currentAnimation || this.finished) return;

    const anim = this.animations[this.currentAnimation];
    if (!anim) return;

    const frameDuration = 1 / anim.frameRate;
    this.elapsed += deltaTime;

    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      this.currentFrameIndex++;

      if (this.currentFrameIndex >= anim.frames.length) {
        if (anim.loop) {
          this.currentFrameIndex = 0;
        } else {
          this.currentFrameIndex = anim.frames.length - 1;
          this.finished = true;
          break;
        }
      }
    }
  }

  /** Draw the current animation frame onto a canvas context. */
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): void {
    if (!this.currentAnimation) return;

    const anim = this.animations[this.currentAnimation];
    if (!anim) return;

    const spriteFrameIndex = anim.frames[this.currentFrameIndex];
    if (spriteFrameIndex === undefined) return;

    this.spriteSheet.drawFrame(ctx, spriteFrameIndex, x, y, width, height);
  }

  /** Get the name of the currently playing animation */
  getCurrentAnimation(): string | null {
    return this.currentAnimation;
  }

  /** Check if the current (non-looping) animation has finished */
  isFinished(): boolean {
    return this.finished;
  }

  /** Get the current frame index within the animation */
  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }
}
