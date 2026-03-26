import { LifeStage, LifeStageConfig, CareHistory } from './types';

/** Callback when the pet evolves to a new life stage */
export type EvolutionCallback = (newStage: LifeStage, oldStage: LifeStage) => void;

/**
 * Manages pet life stage progression based on age and care quality.
 *
 * Life stages: egg → baby → teen → adult → (ghost on death)
 *
 * Evolution requirements:
 * - Age must meet the minimum for the next stage
 * - Care score must meet the threshold for the next stage
 * - If care score is too low, evolution is delayed (not skipped)
 */
export class EvolutionManager {
  private currentStage: LifeStage = 'egg';
  private stageConfigs: Record<LifeStage, LifeStageConfig>;
  private onEvolve: EvolutionCallback | null = null;

  /** Ordered progression path (ghost is not part of natural progression) */
  private static readonly STAGE_ORDER: LifeStage[] = ['egg', 'baby', 'teen', 'adult'];

  constructor(stageConfigs: Record<LifeStage, LifeStageConfig>, initialStage?: LifeStage) {
    this.stageConfigs = stageConfigs;
    if (initialStage) {
      this.currentStage = initialStage;
    }
  }

  /** Set callback for evolution events */
  setOnEvolve(callback: EvolutionCallback): void {
    this.onEvolve = callback;
  }

  /** Get the current life stage */
  getStage(): LifeStage {
    return this.currentStage;
  }

  /** Get the config for the current life stage */
  getCurrentConfig(): LifeStageConfig {
    return this.stageConfigs[this.currentStage];
  }

  /** Get the config for a specific life stage */
  getStageConfig(stage: LifeStage): LifeStageConfig {
    return this.stageConfigs[stage];
  }

  /** Force set the stage (e.g., loading from save or death) */
  setStage(stage: LifeStage): void {
    const oldStage = this.currentStage;
    this.currentStage = stage;
    if (oldStage !== stage && this.onEvolve) {
      this.onEvolve(stage, oldStage);
    }
  }

  /**
   * Check if the pet is ready to evolve and perform evolution if so.
   * Call this periodically (e.g., every few seconds in the game loop).
   *
   * @param ageMinutes - Pet's current age in minutes
   * @param careHistory - Current care history for score calculation
   * @returns true if evolution occurred
   */
  checkEvolution(ageMinutes: number, careHistory: CareHistory): boolean {
    if (this.currentStage === 'ghost') return false;

    const nextStage = this.getNextStage();
    if (!nextStage) return false; // Already at max stage (adult)

    const nextConfig = this.stageConfigs[nextStage];

    // Check age requirement
    if (ageMinutes < nextConfig.minAgeMinutes) return false;

    // Check care score requirement
    if (careHistory.averageCareScore < nextConfig.minCareScore) return false;

    // Evolve!
    const oldStage = this.currentStage;
    this.currentStage = nextStage;

    if (this.onEvolve) {
      this.onEvolve(nextStage, oldStage);
    }

    return true;
  }

  /** Get the next stage in the progression, or null if at max */
  getNextStage(): LifeStage | null {
    const order = EvolutionManager.STAGE_ORDER;
    const currentIndex = order.indexOf(this.currentStage);

    if (currentIndex === -1 || currentIndex >= order.length - 1) {
      return null;
    }

    return order[currentIndex + 1];
  }

  /** Get evolution progress as a percentage (0-100) toward the next stage */
  getEvolutionProgress(ageMinutes: number, careScore: number): number {
    const nextStage = this.getNextStage();
    if (!nextStage) return 100; // Fully evolved

    const currentConfig = this.stageConfigs[this.currentStage];
    const nextConfig = this.stageConfigs[nextStage];

    // Age progress
    const ageRange = nextConfig.minAgeMinutes - currentConfig.minAgeMinutes;
    const ageProgress = ageRange > 0
      ? Math.min(1, (ageMinutes - currentConfig.minAgeMinutes) / ageRange)
      : 1;

    // Care score progress
    const careProgress = nextConfig.minCareScore > 0
      ? Math.min(1, careScore / nextConfig.minCareScore)
      : 1;

    // Both conditions must be met, so progress is the minimum of the two
    return Math.floor(Math.min(ageProgress, careProgress) * 100);
  }

  /** Check if a specific ability is unlocked at the current stage */
  hasAbility(ability: string): boolean {
    return this.getCurrentConfig().unlockedAbilities.includes(ability);
  }

  /** Get all unlocked abilities at the current stage */
  getUnlockedAbilities(): string[] {
    return [...this.getCurrentConfig().unlockedAbilities];
  }

  /** Get the pet size for the current life stage */
  getPetSize(): { width: number; height: number } {
    return { ...this.getCurrentConfig().size };
  }
}
