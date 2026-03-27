/**
 * Hide & Seek minigame engine.
 *
 * The pet hides somewhere on screen and the player must find it within a time limit.
 * The pet gives warmer/colder hints based on cursor proximity.
 * Finding the pet restores happiness; the pet gets happiness either way (fun to hide!).
 */

export type HideSeekHint = 'freezing' | 'cold' | 'warm' | 'hot' | 'found';

export interface HideSeekState {
  /** Whether the game is currently running */
  isActive: boolean;
  /** Countdown before pet hides */
  countdown: number;
  /** Time remaining to find the pet */
  timeRemaining: number;
  /** Current proximity hint */
  hint: HideSeekHint;
  /** Pet's hidden position (null until hidden) */
  hiddenPosition: { x: number; y: number } | null;
  /** Whether the pet has been found */
  found: boolean;
  /** Result when game ends */
  result: 'playing' | 'found' | 'timeout';
  /** Number of clicks made */
  clickCount: number;
}

export interface HideSeekResult {
  won: boolean;
  happinessBonus: number;
  energyCost: number;
}

export class HideSeekGame {
  private isActive = false;
  private countdown = 3;
  private timeRemaining = 20;
  private hint: HideSeekHint = 'freezing';
  private hiddenPosition: { x: number; y: number } | null = null;
  private found = false;
  private result: HideSeekState['result'] = 'playing';
  private clickCount = 0;
  private screenWidth: number;
  private screenHeight: number;
  private petSize: number;

  /** Detection radius — how close the click needs to be */
  private static readonly FIND_RADIUS = 60;
  /** Game duration in seconds */
  private static readonly GAME_DURATION = 20;
  /** Distance thresholds for hints */
  private static readonly HINT_HOT = 100;
  private static readonly HINT_WARM = 250;
  private static readonly HINT_COLD = 450;

  constructor(screenWidth: number, screenHeight: number, petSize: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.petSize = petSize;
  }

  getState(): HideSeekState {
    return {
      isActive: this.isActive,
      countdown: this.countdown,
      timeRemaining: this.timeRemaining,
      hint: this.hint,
      hiddenPosition: this.found ? this.hiddenPosition : null,
      found: this.found,
      result: this.result,
      clickCount: this.clickCount,
    };
  }

  /** Start the countdown and pick a hiding spot */
  start(): void {
    this.countdown = 3;
    this.isActive = false;
    this.found = false;
    this.result = 'playing';
    this.clickCount = 0;
    this.hint = 'freezing';
    this.timeRemaining = HideSeekGame.GAME_DURATION;

    // Pick a random hiding spot with margin from edges
    const margin = this.petSize * 2;
    this.hiddenPosition = {
      x: margin + Math.random() * (this.screenWidth - margin * 2),
      y: margin + Math.random() * (this.screenHeight - margin * 2),
    };
  }

  /**
   * Player clicks at a position to try to find the pet.
   * @returns The hint after the click
   */
  click(x: number, y: number): HideSeekHint {
    if (!this.isActive || this.result !== 'playing' || !this.hiddenPosition) {
      return this.hint;
    }

    this.clickCount++;

    const dx = x - this.hiddenPosition.x;
    const dy = y - this.hiddenPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= HideSeekGame.FIND_RADIUS) {
      this.found = true;
      this.result = 'found';
      this.isActive = false;
      this.hint = 'found';
      return 'found';
    }

    // Update hint based on proximity
    if (distance <= HideSeekGame.HINT_HOT) {
      this.hint = 'hot';
    } else if (distance <= HideSeekGame.HINT_WARM) {
      this.hint = 'warm';
    } else if (distance <= HideSeekGame.HINT_COLD) {
      this.hint = 'cold';
    } else {
      this.hint = 'freezing';
    }

    return this.hint;
  }

  /**
   * Update game state.
   * @param deltaTime - Seconds since last frame
   */
  update(deltaTime: number): void {
    // Countdown phase
    if (this.countdown > 0) {
      this.countdown -= deltaTime;
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.isActive = true;
      }
      return;
    }

    if (this.result !== 'playing') return;

    // Timer
    this.timeRemaining -= deltaTime;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.result = 'timeout';
      this.isActive = false;
    }
  }

  /** Get the result for stat changes */
  getResult(): HideSeekResult {
    const won = this.result === 'found';
    return {
      won,
      happinessBonus: won ? 30 : 10,
      energyCost: 10,
    };
  }
}
