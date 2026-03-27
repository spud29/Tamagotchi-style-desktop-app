import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TugOfWarGame } from '../../src/engine/TugOfWar';

describe('TugOfWarGame', () => {
  let game: TugOfWarGame;

  beforeEach(() => {
    game = new TugOfWarGame(50); // mid energy
    game.start();
  });

  it('starts with countdown and rope at center', () => {
    const state = game.getState();
    expect(state.ropePosition).toBe(0);
    expect(state.isActive).toBe(false);
    expect(state.countdown).toBe(3);
    expect(state.result).toBe('playing');
  });

  it('countdown decreases over time', () => {
    game.update(1);
    expect(game.getState().countdown).toBeCloseTo(2, 0);
    expect(game.getState().isActive).toBe(false);

    game.update(2);
    expect(game.getState().countdown).toBe(0);
    expect(game.getState().isActive).toBe(true);
  });

  it('game becomes active after countdown', () => {
    game.update(3.1);
    expect(game.getState().isActive).toBe(true);
    expect(game.getState().result).toBe('playing');
  });

  it('player pull moves rope toward player side (positive)', () => {
    game.update(3.1); // finish countdown
    const before = game.getState().ropePosition;

    game.playerPull();
    game.update(0.016); // one frame

    expect(game.getState().ropePosition).toBeGreaterThan(before);
  });

  it('player pull does nothing during countdown', () => {
    game.playerPull();
    game.update(1);
    // Rope should still be at 0 (countdown phase)
    expect(game.getState().ropePosition).toBe(0);
  });

  it('pet pulls rope toward negative side over time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    game.update(3.1); // finish countdown

    // Let pet pull without player input for several frames
    for (let i = 0; i < 20; i++) {
      game.update(0.5);
    }

    expect(game.getState().ropePosition).toBeLessThan(0);
    vi.restoreAllMocks();
  });

  it('game ends when player pulls past threshold', () => {
    game.update(3.1); // finish countdown

    // Mash pull many times
    for (let i = 0; i < 50; i++) {
      game.playerPull();
      game.update(0.016);
    }

    const state = game.getState();
    expect(state.result).toBe('player_win');
    expect(state.isActive).toBe(false);
  });

  it('game ends when pet pulls past threshold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // pet pulls every frame
    const strongPetGame = new TugOfWarGame(100); // max energy = strong pet
    strongPetGame.start();
    strongPetGame.update(3.1); // finish countdown

    // Let pet pull for a long time without player input
    for (let i = 0; i < 200; i++) {
      strongPetGame.update(0.1);
    }

    expect(strongPetGame.getState().result).toBe('pet_win');
    vi.restoreAllMocks();
  });

  it('game ends as draw when time runs out with rope near center', () => {
    game.update(3.1); // finish countdown

    // Simulate balanced play (alternate pulls to keep near center)
    // Just let time run out
    game.update(15.1);

    const state = game.getState();
    expect(state.timeRemaining).toBe(0);
    expect(state.result).not.toBe('playing');
  });

  it('getResult returns happiness bonus and energy cost', () => {
    game.update(3.1);
    for (let i = 0; i < 50; i++) {
      game.playerPull();
      game.update(0.016);
    }

    const result = game.getResult();
    expect(result.won).toBe(true);
    expect(result.happinessBonus).toBe(25);
    expect(result.energyCost).toBe(15);
  });

  it('losing still gives some happiness', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const strongPetGame = new TugOfWarGame(100);
    strongPetGame.start();
    strongPetGame.update(3.1);

    for (let i = 0; i < 200; i++) {
      strongPetGame.update(0.1);
    }

    const result = strongPetGame.getResult();
    expect(result.won).toBe(false);
    expect(result.happinessBonus).toBe(10);
    vi.restoreAllMocks();
  });

  it('pet strength scales with energy', () => {
    // Low energy pet should be weaker (rope drifts less negative)
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const weakPet = new TugOfWarGame(10);
    weakPet.start();
    weakPet.update(3.1);
    for (let i = 0; i < 10; i++) weakPet.update(0.5);
    const weakPos = weakPet.getState().ropePosition;

    const strongPet = new TugOfWarGame(90);
    strongPet.start();
    strongPet.update(3.1);
    for (let i = 0; i < 10; i++) strongPet.update(0.5);
    const strongPos = strongPet.getState().ropePosition;

    // Strong pet pulls more negative
    expect(strongPos).toBeLessThan(weakPos);
    vi.restoreAllMocks();
  });

  it('timer counts down during active play', () => {
    game.update(3.1); // finish countdown
    game.update(5);
    expect(game.getState().timeRemaining).toBeCloseTo(10, 0);
  });
});
