/**
 * Tug of War minigame engine.
 *
 * The player and pet each pull on a rope. The player clicks/mashes a button
 * to pull their side; the pet pulls back automatically based on its energy stat.
 * The rope position is tracked as a value from -1 (pet wins) to +1 (player wins).
 * First to pull past the threshold wins.
 */

export interface TugOfWarState {
  /** Rope position: -1 = pet wins, 0 = center, +1 = player wins */
  ropePosition: number;
  /** Whether the game is currently running */
  isActive: boolean;
  /** Countdown before game starts (3, 2, 1, GO) */
  countdown: number;
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Result when game ends */
  result: 'playing' | 'player_win' | 'pet_win' | 'draw';
  /** Pet pull strength (visual feedback) */
  petPulling: boolean;
}

export interface TugOfWarResult {
  won: boolean;
  happinessBonus: number;
  energyCost: number;
}

export class TugOfWarGame {
  private ropePosition = 0;
  private isActive = false;
  private countdown = 3;
  private timeRemaining = 15;
  private result: TugOfWarState['result'] = 'playing';
  private petStrength: number;
  private petPullTimer = 0;
  private petPulling = false;
  private playerPullAccumulator = 0;

  /** Win threshold — pull rope past this to win */
  private static readonly WIN_THRESHOLD = 1.0;
  /** Game duration in seconds */
  private static readonly GAME_DURATION = 15;
  /** How fast the rope drifts back to center */
  private static readonly ROPE_FRICTION = 0.3;
  /** How much each player click moves the rope */
  private static readonly PLAYER_PULL_FORCE = 0.12;
  /** Base pet pull force per second */
  private static readonly PET_BASE_PULL = 0.06;

  /**
   * @param petEnergy - Pet's current energy stat (0-100). Higher = stronger pet pull.
   */
  constructor(petEnergy: number) {
    // Scale pet strength: energy 0 → 0.5x, energy 100 → 1.5x of base pull
    this.petStrength = 0.5 + (petEnergy / 100);
  }

  getState(): TugOfWarState {
    return {
      ropePosition: this.ropePosition,
      isActive: this.isActive,
      countdown: this.countdown,
      timeRemaining: this.timeRemaining,
      result: this.result,
      petPulling: this.petPulling,
    };
  }

  /** Start the countdown */
  start(): void {
    this.countdown = 3;
    this.isActive = false;
    this.ropePosition = 0;
    this.result = 'playing';
    this.timeRemaining = TugOfWarGame.GAME_DURATION;
  }

  /** Player pulls their side */
  playerPull(): void {
    if (!this.isActive || this.result !== 'playing') return;
    this.playerPullAccumulator += TugOfWarGame.PLAYER_PULL_FORCE;
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
      this.endGame();
      return;
    }

    // Pet pulls at random intervals
    this.petPullTimer -= deltaTime;
    if (this.petPullTimer <= 0) {
      this.petPulling = true;
      this.petPullTimer = 0.3 + Math.random() * 0.5; // Pull every 0.3-0.8s
      const pullForce = TugOfWarGame.PET_BASE_PULL * this.petStrength;
      this.ropePosition -= pullForce;
    } else {
      this.petPulling = false;
    }

    // Apply player pull
    if (this.playerPullAccumulator > 0) {
      this.ropePosition += this.playerPullAccumulator;
      this.playerPullAccumulator = 0;
    }

    // Friction: drift toward center
    this.ropePosition -= this.ropePosition * TugOfWarGame.ROPE_FRICTION * deltaTime;

    // Clamp
    this.ropePosition = Math.max(-TugOfWarGame.WIN_THRESHOLD, Math.min(TugOfWarGame.WIN_THRESHOLD, this.ropePosition));

    // Check win conditions
    if (this.ropePosition >= TugOfWarGame.WIN_THRESHOLD) {
      this.result = 'player_win';
      this.isActive = false;
    } else if (this.ropePosition <= -TugOfWarGame.WIN_THRESHOLD) {
      this.result = 'pet_win';
      this.isActive = false;
    }
  }

  /** Get the result for stat changes */
  getResult(): TugOfWarResult {
    const won = this.result === 'player_win';
    return {
      won,
      happinessBonus: won ? 25 : 10, // Still get some happiness for playing
      energyCost: 15,
    };
  }

  private endGame(): void {
    this.isActive = false;
    if (this.ropePosition > 0.1) {
      this.result = 'player_win';
    } else if (this.ropePosition < -0.1) {
      this.result = 'pet_win';
    } else {
      this.result = 'draw';
    }
  }
}
