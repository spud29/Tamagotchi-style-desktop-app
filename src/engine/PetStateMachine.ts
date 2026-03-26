import { PetState, Direction, Position } from './types';

/** Callback when the state machine transitions to a new state */
export type StateChangeCallback = (newState: PetState, oldState: PetState) => void;

/**
 * Pet AI State Machine.
 * Controls the pet's behavior by transitioning between states
 * based on timers, stat thresholds, and user interactions.
 *
 * Phase 1: Only implements IDLE and WALKING states.
 * Future phases add SLEEPING, EATING, SAD, SICK, ATTENTION, etc.
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
      return this.walkTarget; // null, pet stays put
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

  private transition(newState: PetState): void {
    const oldState = this.state;
    this.state = newState;
    this.stateTimer = 0;

    switch (newState) {
      case 'IDLE':
        this.scheduleNextIdle();
        break;
      case 'WALKING':
        this.stateDuration = Infinity; // Walking ends when we reach the target
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
    // Determine primary movement direction
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'front' : 'back';
    }
  }
}
