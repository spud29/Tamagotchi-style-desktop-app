/**
 * GameClock manages real-time tracking for the pet simulation.
 * Handles:
 * - Tracking total pet age in minutes
 * - Calculating elapsed time since last save (for offline decay)
 * - Providing deltaTime for the game loop
 */
export class GameClock {
  private lastSavedAt: Date;
  private ageMinutes: number;
  private ageAccumulator = 0; // Accumulates seconds toward the next minute

  constructor(lastSavedAt?: string, ageMinutes?: number) {
    this.lastSavedAt = lastSavedAt ? new Date(lastSavedAt) : new Date();
    this.ageMinutes = ageMinutes ?? 0;
  }

  /**
   * Calculate how many seconds have elapsed since the last save.
   * Used to apply offline stat decay when the app reopens.
   */
  getOfflineElapsedSeconds(): number {
    const now = new Date();
    const elapsed = (now.getTime() - this.lastSavedAt.getTime()) / 1000;
    return Math.max(0, elapsed);
  }

  /**
   * Update the clock each frame. Accumulates age in minutes.
   * @param deltaTime - Time in seconds since last frame
   */
  update(deltaTime: number): void {
    this.ageAccumulator += deltaTime;

    // Convert accumulated seconds to minutes
    while (this.ageAccumulator >= 60) {
      this.ageAccumulator -= 60;
      this.ageMinutes++;
    }
  }

  /**
   * Add elapsed offline time to the pet's age.
   * Call this once on app startup after calculating offline time.
   */
  addOfflineAge(elapsedSeconds: number): void {
    this.ageMinutes += Math.floor(elapsedSeconds / 60);
  }

  /** Get the pet's total age in minutes */
  getAgeMinutes(): number {
    return this.ageMinutes;
  }

  /** Mark the current time as the last save time */
  markSaved(): void {
    this.lastSavedAt = new Date();
  }

  /** Get the last saved timestamp as an ISO string */
  getLastSavedAt(): string {
    return this.lastSavedAt.toISOString();
  }

  /** Set the last saved timestamp (e.g., when loading a save) */
  setLastSavedAt(isoString: string): void {
    this.lastSavedAt = new Date(isoString);
  }

  /** Set the age (e.g., when loading a save) */
  setAgeMinutes(minutes: number): void {
    this.ageMinutes = minutes;
  }
}
