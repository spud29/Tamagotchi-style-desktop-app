import { PetStats, StatDecayRates } from './types';

/** Callback when any stat changes */
export type StatsChangeCallback = (stats: PetStats, changedStat: keyof PetStats) => void;

/** Callback when a stat hits a critical threshold */
export type StatThresholdCallback = (stat: keyof PetStats, value: number) => void;

/**
 * Manages pet stats (hunger, happiness, cleanliness, health, energy).
 * Handles real-time decay, stat modifications, and threshold notifications.
 *
 * All stats range from 0 to 100.
 * Decay rates are defined per hour and converted internally to per-second.
 */
export class StatsManager {
  private stats: PetStats;
  private decayRates: StatDecayRates;
  private paused = false;
  private onStatsChange: StatsChangeCallback | null = null;
  private onThreshold: StatThresholdCallback | null = null;

  /** Threshold levels for notifications */
  private static readonly LOW_THRESHOLD = 30;
  private static readonly CRITICAL_THRESHOLD = 15;

  constructor(initialStats?: Partial<PetStats>, decayRates?: StatDecayRates) {
    this.stats = {
      hunger: initialStats?.hunger ?? 80,
      happiness: initialStats?.happiness ?? 80,
      cleanliness: initialStats?.cleanliness ?? 80,
      health: initialStats?.health ?? 100,
      energy: initialStats?.energy ?? 80,
    };

    this.decayRates = decayRates ?? {
      hunger: 5,
      happiness: 3,
      cleanliness: 2,
      health: 1,
      energy: 4,
    };
  }

  /** Set callback for any stat change */
  setOnStatsChange(callback: StatsChangeCallback): void {
    this.onStatsChange = callback;
  }

  /** Set callback for threshold crossings */
  setOnThreshold(callback: StatThresholdCallback): void {
    this.onThreshold = callback;
  }

  /** Get a snapshot of current stats */
  getStats(): PetStats {
    return { ...this.stats };
  }

  /** Get a single stat value */
  getStat(stat: keyof PetStats): number {
    return this.stats[stat];
  }

  /** Update decay rates (e.g., when pet evolves to a new life stage) */
  setDecayRates(rates: StatDecayRates): void {
    this.decayRates = { ...rates };
  }

  /** Pause stat decay (e.g., when pet is sleeping, only energy recovers) */
  pause(): void {
    this.paused = true;
  }

  /** Resume stat decay */
  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Update stats based on elapsed time. Call every frame with deltaTime in seconds.
   * Health decays faster when other stats are low.
   */
  update(deltaTime: number): void {
    if (this.paused) return;

    const statKeys: (keyof PetStats)[] = ['hunger', 'happiness', 'cleanliness', 'energy'];

    for (const key of statKeys) {
      const ratePerSecond = this.decayRates[key] / 3600;
      const oldValue = this.stats[key];
      this.stats[key] = Math.max(0, this.stats[key] - ratePerSecond * deltaTime);

      if (this.stats[key] !== oldValue) {
        this.checkThreshold(key, oldValue);
      }
    }

    // Health decay accelerates based on how bad other stats are
    const healthDecayMultiplier = this.calculateHealthDecayMultiplier();
    const healthRatePerSecond = (this.decayRates.health * healthDecayMultiplier) / 3600;
    const oldHealth = this.stats.health;
    this.stats.health = Math.max(0, this.stats.health - healthRatePerSecond * deltaTime);

    if (this.stats.health !== oldHealth) {
      this.checkThreshold('health', oldHealth);
    }
  }

  /**
   * Apply bulk decay for offline time.
   * Same logic as update() but applied for a large time span at once.
   */
  applyOfflineDecay(elapsedSeconds: number): void {
    const statKeys: (keyof PetStats)[] = ['hunger', 'happiness', 'cleanliness', 'energy'];

    for (const key of statKeys) {
      const decay = (this.decayRates[key] / 3600) * elapsedSeconds;
      this.stats[key] = Math.max(0, this.stats[key] - decay);
    }

    // Simplified health decay for offline (use average multiplier)
    const healthMultiplier = this.calculateHealthDecayMultiplier();
    const healthDecay = (this.decayRates.health * healthMultiplier / 3600) * elapsedSeconds;
    this.stats.health = Math.max(0, this.stats.health - healthDecay);
  }

  /**
   * Modify a stat by a delta amount (positive to increase, negative to decrease).
   * Clamps result to 0-100.
   */
  modifyStat(stat: keyof PetStats, delta: number): void {
    const oldValue = this.stats[stat];
    this.stats[stat] = Math.max(0, Math.min(100, this.stats[stat] + delta));

    if (this.stats[stat] !== oldValue) {
      this.onStatsChange?.(this.getStats(), stat);
      this.checkThreshold(stat, oldValue);
    }
  }

  /** Set a stat to an exact value */
  setStat(stat: keyof PetStats, value: number): void {
    const oldValue = this.stats[stat];
    this.stats[stat] = Math.max(0, Math.min(100, value));

    if (this.stats[stat] !== oldValue) {
      this.onStatsChange?.(this.getStats(), stat);
    }
  }

  /** Set all stats at once (e.g., when loading a save) */
  setAllStats(stats: PetStats): void {
    this.stats = {
      hunger: Math.max(0, Math.min(100, stats.hunger)),
      happiness: Math.max(0, Math.min(100, stats.happiness)),
      cleanliness: Math.max(0, Math.min(100, stats.cleanliness)),
      health: Math.max(0, Math.min(100, stats.health)),
      energy: Math.max(0, Math.min(100, stats.energy)),
    };
  }

  /** Calculate the average of all stats (0-100). Used for care score. */
  getAverageScore(): number {
    const { hunger, happiness, cleanliness, health, energy } = this.stats;
    return (hunger + happiness + cleanliness + health + energy) / 5;
  }

  /** Check if the pet is dead (health at 0) */
  isDead(): boolean {
    return this.stats.health <= 0;
  }

  /** Check if any stat is critically low */
  hasCriticalStat(): boolean {
    return Object.values(this.stats).some((v) => v <= StatsManager.CRITICAL_THRESHOLD);
  }

  /** Check if any stat is low */
  hasLowStat(): boolean {
    return Object.values(this.stats).some((v) => v <= StatsManager.LOW_THRESHOLD);
  }

  /** Get the lowest stat name and value */
  getLowestStat(): { stat: keyof PetStats; value: number } {
    let lowest: keyof PetStats = 'hunger';
    let lowestVal = this.stats.hunger;

    for (const [key, val] of Object.entries(this.stats)) {
      if (val < lowestVal) {
        lowest = key as keyof PetStats;
        lowestVal = val;
      }
    }

    return { stat: lowest, value: lowestVal };
  }

  // --- Private helpers ---

  /**
   * Health decays faster when other stats are low.
   * Multiplier ranges from 1x (all stats healthy) to 5x (all stats at 0).
   */
  private calculateHealthDecayMultiplier(): number {
    const { hunger, happiness, cleanliness, energy } = this.stats;
    const avgOtherStats = (hunger + happiness + cleanliness + energy) / 4;

    // Maps 0-100 average to 5x-1x multiplier
    return 1 + (4 * (1 - avgOtherStats / 100));
  }

  private checkThreshold(stat: keyof PetStats, oldValue: number): void {
    const newValue = this.stats[stat];

    // Fire callback when crossing LOW or CRITICAL thresholds downward
    if (oldValue > StatsManager.LOW_THRESHOLD && newValue <= StatsManager.LOW_THRESHOLD) {
      this.onThreshold?.(stat, newValue);
    }
    if (oldValue > StatsManager.CRITICAL_THRESHOLD && newValue <= StatsManager.CRITICAL_THRESHOLD) {
      this.onThreshold?.(stat, newValue);
    }
  }
}
