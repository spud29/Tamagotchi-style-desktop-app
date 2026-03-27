import { Position, PetStats } from './types';

/** The different attention-seeking behaviors */
export type AttentionBehavior = 'wave' | 'ride_cursor' | 'knock' | 'mess_icons' | 'yeet_icons';

/** Callback when an attention behavior starts */
export type AttentionStartCallback = (behavior: AttentionBehavior) => void;

/** Callback when an attention behavior ends */
export type AttentionEndCallback = (behavior: AttentionBehavior) => void;

/**
 * Controls when and which attention-seeking behaviors the pet performs.
 *
 * Behaviors trigger based on:
 * - Low stats (the lower, the more frequent)
 * - Available abilities (icon manipulation requires teen+ stage)
 * - Randomness (not every check triggers a behavior)
 * - Cooldowns (prevent spam)
 */
export class AttentionSeeker {
  private availableBehaviors: AttentionBehavior[] = [];
  private unlockedAbilities: string[] = [];
  private cooldowns = new Map<AttentionBehavior, number>();
  private activeBehavior: AttentionBehavior | null = null;
  private behaviorTimer = 0;
  private behaviorDuration = 0;
  private checkAccumulator = 0;
  private onStart: AttentionStartCallback | null = null;
  private onEnd: AttentionEndCallback | null = null;

  /** Minimum seconds between attention checks */
  private static readonly CHECK_INTERVAL = 5;
  /** Cooldown per behavior in seconds */
  private static readonly COOLDOWN = 30;
  /** Duration ranges for each behavior in seconds */
  private static readonly DURATIONS: Record<AttentionBehavior, [number, number]> = {
    wave: [3, 6],
    ride_cursor: [5, 10],
    knock: [2, 4],
    mess_icons: [4, 8],
    yeet_icons: [3, 5],
  };

  constructor(availableBehaviors: AttentionBehavior[], unlockedAbilities: string[] = []) {
    this.availableBehaviors = availableBehaviors;
    this.unlockedAbilities = unlockedAbilities;
  }

  setOnStart(callback: AttentionStartCallback): void {
    this.onStart = callback;
  }

  setOnEnd(callback: AttentionEndCallback): void {
    this.onEnd = callback;
  }

  /** Update unlocked abilities (e.g., on evolution) */
  setUnlockedAbilities(abilities: string[]): void {
    this.unlockedAbilities = [...abilities];
  }

  /** Get the currently active attention behavior, if any */
  getActiveBehavior(): AttentionBehavior | null {
    return this.activeBehavior;
  }

  /** Check if a behavior is currently active */
  isActive(): boolean {
    return this.activeBehavior !== null;
  }

  /**
   * Update the attention seeker. Call every frame.
   * @param deltaTime - Seconds since last frame
   * @param stats - Current pet stats
   * @param petState - Current pet AI state (only trigger during IDLE)
   * @returns The active behavior name, or null
   */
  update(deltaTime: number, stats: PetStats, petState: string): AttentionBehavior | null {
    // Update cooldowns
    for (const [behavior, remaining] of this.cooldowns) {
      const newVal = remaining - deltaTime;
      if (newVal <= 0) {
        this.cooldowns.delete(behavior);
      } else {
        this.cooldowns.set(behavior, newVal);
      }
    }

    // If a behavior is active, count down its duration
    if (this.activeBehavior) {
      this.behaviorTimer += deltaTime;
      if (this.behaviorTimer >= this.behaviorDuration) {
        this.endBehavior();
      }
      return this.activeBehavior;
    }

    // Only trigger attention behaviors during IDLE state
    if (petState !== 'IDLE') return null;

    // Periodic check
    this.checkAccumulator += deltaTime;
    if (this.checkAccumulator < AttentionSeeker.CHECK_INTERVAL) return null;
    this.checkAccumulator = 0;

    // Calculate urgency based on stats
    const urgency = this.calculateUrgency(stats);
    if (urgency <= 0) return null;

    // Random chance based on urgency (0-1 scale, higher = more likely)
    if (Math.random() > urgency) return null;

    // Pick a behavior
    const behavior = this.pickBehavior();
    if (!behavior) return null;

    this.startBehavior(behavior);
    return behavior;
  }

  /** Force-end the current behavior */
  cancelBehavior(): void {
    if (this.activeBehavior) {
      this.endBehavior();
    }
  }

  /**
   * Calculate urgency (0-1) based on how low stats are.
   * Returns 0 when all stats are fine, approaches 1 when stats are very low.
   */
  private calculateUrgency(stats: PetStats): number {
    const { hunger, happiness, cleanliness, energy } = stats;
    const avgNeed = (hunger + happiness + cleanliness + energy) / 4;

    // No attention seeking if stats are above 50 on average
    if (avgNeed > 50) return 0;

    // Map 0-50 average to 0.1-0.8 urgency
    return 0.1 + (1 - avgNeed / 50) * 0.7;
  }

  /** Pick a random available behavior that isn't on cooldown */
  private pickBehavior(): AttentionBehavior | null {
    const eligible = this.getEligibleBehaviors();
    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  /** Get behaviors that are available and not on cooldown */
  private getEligibleBehaviors(): AttentionBehavior[] {
    return this.availableBehaviors.filter((b) => {
      // Check cooldown
      if (this.cooldowns.has(b)) return false;

      // Check ability requirements for icon behaviors
      if (b === 'mess_icons' || b === 'yeet_icons') {
        return this.unlockedAbilities.includes('carry_icons');
      }

      return true;
    });
  }

  private startBehavior(behavior: AttentionBehavior): void {
    this.activeBehavior = behavior;
    this.behaviorTimer = 0;
    const [min, max] = AttentionSeeker.DURATIONS[behavior];
    this.behaviorDuration = min + Math.random() * (max - min);
    this.onStart?.(behavior);
  }

  private endBehavior(): void {
    const behavior = this.activeBehavior;
    if (!behavior) return;

    this.cooldowns.set(behavior, AttentionSeeker.COOLDOWN);
    this.activeBehavior = null;
    this.behaviorTimer = 0;
    this.onEnd?.(behavior);
  }
}
