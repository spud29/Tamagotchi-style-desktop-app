/**
 * Manages the death → ghost → mourning → rebirth cycle.
 *
 * When the pet dies (health reaches 0):
 * 1. Pet enters GHOST state (floating animation, already handled by PetStateMachine)
 * 2. Ghost phase lasts for a mourning period (30 seconds)
 * 3. After mourning, the player is prompted to start a new egg
 * 4. A new egg spawns with fresh stats and a new ID, preserving the species
 *
 * The previous pet's memory is kept in a memorial record.
 */

export interface Memorial {
  name: string;
  speciesId: string;
  lifeStage: string;
  ageMinutes: number;
  diedAt: string;
  causeOfDeath: string;
}

export interface DeathRebirthState {
  /** Whether the pet is currently dead (ghost phase or awaiting rebirth) */
  isDead: boolean;
  /** Whether the ghost phase is active */
  isGhost: boolean;
  /** Time remaining in the ghost/mourning phase (seconds) */
  mourningTimeRemaining: number;
  /** Whether the mourning period is complete and rebirth is available */
  rebirthReady: boolean;
  /** Memorial of the deceased pet */
  memorial: Memorial | null;
}

export class DeathRebirthManager {
  private isDead = false;
  private isGhost = false;
  private mourningTimer = 0;
  private rebirthReady = false;
  private memorial: Memorial | null = null;

  /** Mourning period duration in seconds */
  private static readonly MOURNING_DURATION = 30;

  getState(): DeathRebirthState {
    return {
      isDead: this.isDead,
      isGhost: this.isGhost,
      mourningTimeRemaining: Math.max(0, DeathRebirthManager.MOURNING_DURATION - this.mourningTimer),
      rebirthReady: this.rebirthReady,
      memorial: this.memorial,
    };
  }

  /** Check if death should be triggered and start the death sequence */
  triggerDeath(petName: string, speciesId: string, lifeStage: string, ageMinutes: number): void {
    if (this.isDead) return;

    this.isDead = true;
    this.isGhost = true;
    this.mourningTimer = 0;
    this.rebirthReady = false;

    this.memorial = {
      name: petName,
      speciesId,
      lifeStage,
      ageMinutes,
      diedAt: new Date().toISOString(),
      causeOfDeath: 'Health reached zero from neglect',
    };
  }

  /**
   * Update the death/rebirth cycle.
   * @param deltaTime - Seconds since last frame
   */
  update(deltaTime: number): void {
    if (!this.isDead || !this.isGhost) return;

    this.mourningTimer += deltaTime;

    if (this.mourningTimer >= DeathRebirthManager.MOURNING_DURATION) {
      this.isGhost = false;
      this.rebirthReady = true;
    }
  }

  /** Confirm rebirth — resets the manager for a new pet */
  confirmRebirth(): void {
    this.isDead = false;
    this.isGhost = false;
    this.mourningTimer = 0;
    this.rebirthReady = false;
    // Memorial is preserved for history
  }

  /** Get the memorial record (null if no death has occurred) */
  getMemorial(): Memorial | null {
    return this.memorial ? { ...this.memorial } : null;
  }

  /** Check if the pet is in ghost phase */
  isInGhostPhase(): boolean {
    return this.isGhost;
  }

  /** Check if rebirth prompt should be shown */
  isRebirthReady(): boolean {
    return this.rebirthReady;
  }

  /** Reset the manager completely (e.g., loading a save with alive pet) */
  reset(): void {
    this.isDead = false;
    this.isGhost = false;
    this.mourningTimer = 0;
    this.rebirthReady = false;
    this.memorial = null;
  }
}
