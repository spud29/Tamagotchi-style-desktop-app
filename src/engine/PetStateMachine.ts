import { PetState, Direction, Position, PetStats } from './types';

/** Callback when the state machine transitions to a new state */
export type StateChangeCallback = (newState: PetState, oldState: PetState) => void;

/**
 * Pet AI State Machine.
 * Controls the pet's behavior by transitioning between states
 * based on timers, stat thresholds, and user interactions.
 *
 * Phase 2: Adds SLEEPING, SAD, SICK states driven by pet stats.
 */
export class PetStateMachine {
  private state: PetState = 'IDLE';
  private direction: Direction = 'front';
  private stateTimer = 0;
  private stateDuration = 0;
  private onStateChange: StateChangeCallback | null = null;

  // Walking state
  private walkTarget: Position | null = null;
  private walkSpeed = 60; // pixels per second

  // Screen bounds
  private screenWidth = 1920;
  private screenHeight = 1080;
  private petSize = 64;

  // Stats reference for stat-driven transitions
  private stats: PetStats | null = null;

  constructor(screenWidth?: number, screenHeight?: number) {
    if (screenWidth) this.screenWidth = screenWidth;
    if (screenHeight) this.screenHeight = screenHeight;
    this.scheduleNextIdle();
  }

  /** Set callback for state changes */
  setOnStateChange(callback: StateChangeCallback): void {
    this.onStateChange = callback;
  }

  /** Update screen dimensions (e.g., on resize) */
  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /** Set the pet's rendered size for boundary calculations */
  setPetSize(size: number): void {
    this.petSize = size;
  }

  /** Update the stats snapshot for stat-driven transitions */
  setStats(stats: PetStats): void {
    this.stats = { ...stats };
  }

  /** Get current state */
  getState(): PetState {
    return this.state;
  }

  /** Get current facing direction */
  getDirection(): Direction {
    return this.direction;
  }

  /** Get the current walk target (if walking) */
  getWalkTarget(): Position | null {
    return this.walkTarget;
  }

  /** Get walk speed in pixels per second */
  getWalkSpeed(): number {
    return this.walkSpeed;
  }

  /**
   * Update the state machine. Call every frame with deltaTime in seconds.
   * @param currentPos - Pet's current position
   * @returns New position if the pet should move, null otherwise
   */
  update(deltaTime: number, currentPos: Position): Position | null {
    this.stateTimer += deltaTime;

    switch (this.state) {
      case 'IDLE':
        return this.updateIdle();

      case 'WALKING':
        return this.updateWalking(deltaTime, currentPos);

      case 'SLEEPING':
        return this.updateSleeping();

      case 'SAD':
        return this.updateSad();

      case 'SICK':
        return this.updateSick();

      case 'HAPPY':
        return this.updateHappy();

      case 'EATING':
        return this.updateEating();

      case 'GHOST':
        return this.updateGhost(deltaTime, currentPos);

      default:
        return null;
    }
  }

  /** Force transition to a specific state */
  forceState(newState: PetState): void {
    this.transition(newState);
  }

  // --- Private state handlers ---

  private updateIdle(): Position | null {
    // Check stat-driven transitions before normal idle behavior
    if (this.stats) {
      const statTransition = this.checkStatTransitions();
      if (statTransition) return null;
    }

    if (this.stateTimer >= this.stateDuration) {
      this.transition('WALKING');
      this.pickRandomWalkTarget();
    }
    return null;
  }

  private updateWalking(deltaTime: number, currentPos: Position): Position | null {
    if (!this.walkTarget) {
      this.transition('IDLE');
      return null;
    }

    const dx = this.walkTarget.x - currentPos.x;
    const dy = this.walkTarget.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Arrived at target
    if (distance < 5) {
      this.walkTarget = null;
      this.transition('IDLE');
      return null;
    }

    // Update direction based on movement
    this.direction = this.calculateDirection(dx, dy);

    // Move toward target
    const moveDistance = this.walkSpeed * deltaTime;
    const ratio = Math.min(moveDistance / distance, 1);

    return {
      x: currentPos.x + dx * ratio,
      y: currentPos.y + dy * ratio,
    };
  }

  private updateSleeping(): Position | null {
    // Sleep for 15-30 seconds, then wake up
    if (this.stateTimer >= this.stateDuration) {
      this.transition('IDLE');
    }
    return null;
  }

  private updateSad(): Position | null {
    // Stay sad for 5-10 seconds, then go back to idle
    if (this.stateTimer >= this.stateDuration) {
      this.transition('IDLE');
    }
    return null;
  }

  private updateSick(): Position | null {
    // Stay sick until stats improve (checked on next idle transition)
    // Auto-recover after 20 seconds if stats get better
    if (this.stateTimer >= this.stateDuration) {
      if (this.stats && this.stats.health > 20) {
        this.transition('IDLE');
      } else {
        // Reset timer, stay sick
        this.stateTimer = 0;
      }
    }
    return null;
  }

  private updateHappy(): Position | null {
    // Happy animation plays once (3 seconds), then back to idle
    if (this.stateTimer >= this.stateDuration) {
      this.transition('IDLE');
    }
    return null;
  }

  private updateEating(): Position | null {
    // Eating animation lasts ~2 seconds, then happy, then idle
    if (this.stateTimer >= this.stateDuration) {
      this.transition('HAPPY');
    }
    return null;
  }

  private updateGhost(deltaTime: number, currentPos: Position): Position | null {
    // Ghost floats slowly upward and drifts side to side
    const floatSpeed = 15;
    const driftAmplitude = 30;
    const driftSpeed = 1.5;

    const newY = currentPos.y - floatSpeed * deltaTime;
    const newX = currentPos.x + Math.sin(this.stateTimer * driftSpeed) * driftAmplitude * deltaTime;

    // Wrap around screen
    const wrappedY = newY < -this.petSize ? this.screenHeight : newY;

    return { x: newX, y: wrappedY };
  }

  /**
   * Check stats and potentially trigger stat-driven transitions.
   * Returns true if a transition occurred.
   */
  private checkStatTransitions(): boolean {
    if (!this.stats) return false;

    // Health at 0 = death
    if (this.stats.health <= 0) {
      this.transition('GHOST');
      return true;
    }

    // Very low health = sick
    if (this.stats.health <= 20 && this.state !== 'SICK') {
      this.transition('SICK');
      return true;
    }

    // Very low energy = sleep
    if (this.stats.energy <= 15 && this.state !== 'SLEEPING') {
      this.transition('SLEEPING');
      return true;
    }

    // Low happiness = sad (with some randomness so it's not constant)
    if (this.stats.happiness <= 25 && Math.random() < 0.02) {
      this.transition('SAD');
      return true;
    }

    return false;
  }

  private transition(newState: PetState): void {
    const oldState = this.state;
    this.state = newState;
    this.stateTimer = 0;

    switch (newState) {
      case 'IDLE':
        this.scheduleNextIdle();
        break;
      case 'WALKING':
        this.stateDuration = Infinity;
        break;
      case 'SLEEPING':
        this.stateDuration = 15 + Math.random() * 15; // 15-30 seconds
        break;
      case 'SAD':
        this.stateDuration = 5 + Math.random() * 5; // 5-10 seconds
        break;
      case 'SICK':
        this.stateDuration = 10; // Re-check every 10 seconds
        break;
      case 'HAPPY':
        this.stateDuration = 3;
        break;
      case 'EATING':
        this.stateDuration = 2;
        break;
      case 'GHOST':
        this.stateDuration = Infinity; // Ghost state is permanent until reset
        break;
    }

    if (this.onStateChange && oldState !== newState) {
      this.onStateChange(newState, oldState);
    }
  }

  private scheduleNextIdle(): void {
    // Stay idle for 3-8 seconds before walking again
    this.stateDuration = 3 + Math.random() * 5;
  }

  private pickRandomWalkTarget(): void {
    const margin = this.petSize;
    this.walkTarget = {
      x: margin + Math.random() * (this.screenWidth - margin * 2),
      y: margin + Math.random() * (this.screenHeight - margin * 2),
    };
  }

  private calculateDirection(dx: number, dy: number): Direction {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'front' : 'back';
    }
  }
}
