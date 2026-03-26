import { CareHistory, PetStats } from './types';

/**
 * Tracks care history for evolution calculations.
 * Records care actions and computes a rolling average care score.
 *
 * Care score (0-100) is based on how well-maintained stats are over time.
 * Sampled periodically and averaged.
 */
export class CareTracker {
  private history: CareHistory;
  private scoreSamples: number[] = [];
  private sampleAccumulator = 0;

  /** How often to sample care score, in seconds */
  private static readonly SAMPLE_INTERVAL = 60; // Every minute
  /** Max samples to keep for rolling average */
  private static readonly MAX_SAMPLES = 120; // 2 hours of history

  constructor(initial?: Partial<CareHistory>) {
    this.history = {
      totalFeedings: initial?.totalFeedings ?? 0,
      totalPlaySessions: initial?.totalPlaySessions ?? 0,
      totalCleanings: initial?.totalCleanings ?? 0,
      neglectEvents: initial?.neglectEvents ?? 0,
      averageCareScore: initial?.averageCareScore ?? 50,
    };

    // Seed the samples array with the loaded average
    if (initial?.averageCareScore !== undefined) {
      this.scoreSamples = [initial.averageCareScore];
    }
  }

  /** Record a feeding action */
  recordFeeding(): void {
    this.history.totalFeedings++;
  }

  /** Record a play session */
  recordPlay(): void {
    this.history.totalPlaySessions++;
  }

  /** Record a cleaning action */
  recordCleaning(): void {
    this.history.totalCleanings++;
  }

  /** Record a neglect event (any stat hit 0) */
  recordNeglect(): void {
    this.history.neglectEvents++;
  }

  /**
   * Update the care score sampling. Call every frame with deltaTime.
   * Periodically samples the average of all stats to compute care quality.
   */
  update(deltaTime: number, currentStats: PetStats): void {
    this.sampleAccumulator += deltaTime;

    if (this.sampleAccumulator >= CareTracker.SAMPLE_INTERVAL) {
      this.sampleAccumulator -= CareTracker.SAMPLE_INTERVAL;

      // Calculate current care score from stats
      const { hunger, happiness, cleanliness, health, energy } = currentStats;
      const score = (hunger + happiness + cleanliness + health + energy) / 5;

      this.scoreSamples.push(score);

      // Trim to max samples
      if (this.scoreSamples.length > CareTracker.MAX_SAMPLES) {
        this.scoreSamples.shift();
      }

      // Update rolling average
      this.history.averageCareScore = this.calculateAverage();
    }
  }

  /** Get the current care history snapshot */
  getHistory(): CareHistory {
    return { ...this.history };
  }

  /** Get the current average care score */
  getCareScore(): number {
    return this.history.averageCareScore;
  }

  /** Load care history from save data */
  loadHistory(history: CareHistory): void {
    this.history = { ...history };
    this.scoreSamples = [history.averageCareScore];
  }

  private calculateAverage(): number {
    if (this.scoreSamples.length === 0) return 50;
    const sum = this.scoreSamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.scoreSamples.length);
  }
}
