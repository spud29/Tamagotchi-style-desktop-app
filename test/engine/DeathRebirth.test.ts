import { describe, it, expect, beforeEach } from 'vitest';
import { DeathRebirthManager } from '../../src/engine/DeathRebirth';

describe('DeathRebirthManager', () => {
  let manager: DeathRebirthManager;

  beforeEach(() => {
    manager = new DeathRebirthManager();
  });

  it('starts in alive state', () => {
    const state = manager.getState();
    expect(state.isDead).toBe(false);
    expect(state.isGhost).toBe(false);
    expect(state.rebirthReady).toBe(false);
    expect(state.memorial).toBeNull();
  });

  it('triggerDeath transitions to ghost phase', () => {
    manager.triggerDeath('Gloop', 'gloop', 'teen', 120);

    const state = manager.getState();
    expect(state.isDead).toBe(true);
    expect(state.isGhost).toBe(true);
    expect(state.rebirthReady).toBe(false);
  });

  it('creates a memorial on death', () => {
    manager.triggerDeath('Gloop', 'gloop', 'adult', 250);

    const memorial = manager.getMemorial();
    expect(memorial).not.toBeNull();
    expect(memorial!.name).toBe('Gloop');
    expect(memorial!.speciesId).toBe('gloop');
    expect(memorial!.lifeStage).toBe('adult');
    expect(memorial!.ageMinutes).toBe(250);
    expect(memorial!.diedAt).toBeTruthy();
    expect(memorial!.causeOfDeath).toContain('neglect');
  });

  it('mourning countdown decreases over time', () => {
    manager.triggerDeath('Gloop', 'gloop', 'baby', 30);

    const initialTime = manager.getState().mourningTimeRemaining;
    manager.update(10);

    expect(manager.getState().mourningTimeRemaining).toBeCloseTo(initialTime - 10, 0);
    expect(manager.getState().isGhost).toBe(true);
    expect(manager.getState().rebirthReady).toBe(false);
  });

  it('rebirth becomes ready after mourning period', () => {
    manager.triggerDeath('Gloop', 'gloop', 'teen', 100);

    // Advance past 30-second mourning period
    manager.update(31);

    const state = manager.getState();
    expect(state.isGhost).toBe(false);
    expect(state.rebirthReady).toBe(true);
    expect(state.isDead).toBe(true); // still dead until rebirth
  });

  it('confirmRebirth resets death state', () => {
    manager.triggerDeath('Gloop', 'gloop', 'teen', 100);
    manager.update(31); // finish mourning
    manager.confirmRebirth();

    const state = manager.getState();
    expect(state.isDead).toBe(false);
    expect(state.isGhost).toBe(false);
    expect(state.rebirthReady).toBe(false);
  });

  it('memorial persists after rebirth', () => {
    manager.triggerDeath('Gloop', 'gloop', 'adult', 300);
    manager.update(31);
    manager.confirmRebirth();

    const memorial = manager.getMemorial();
    expect(memorial).not.toBeNull();
    expect(memorial!.name).toBe('Gloop');
  });

  it('triggerDeath is idempotent (cannot die twice)', () => {
    manager.triggerDeath('Gloop', 'gloop', 'baby', 30);
    manager.triggerDeath('Gloop2', 'gloop', 'adult', 300);

    // Should keep the first death info
    expect(manager.getMemorial()!.name).toBe('Gloop');
    expect(manager.getMemorial()!.ageMinutes).toBe(30);
  });

  it('update does nothing when alive', () => {
    manager.update(100);
    expect(manager.getState().isDead).toBe(false);
    expect(manager.getState().rebirthReady).toBe(false);
  });

  it('update does nothing after mourning is complete', () => {
    manager.triggerDeath('Gloop', 'gloop', 'teen', 100);
    manager.update(31);

    // Further updates shouldn't change anything
    manager.update(100);
    expect(manager.getState().rebirthReady).toBe(true);
    expect(manager.getState().isGhost).toBe(false);
  });

  it('isInGhostPhase returns correct values', () => {
    expect(manager.isInGhostPhase()).toBe(false);

    manager.triggerDeath('Gloop', 'gloop', 'baby', 10);
    expect(manager.isInGhostPhase()).toBe(true);

    manager.update(31);
    expect(manager.isInGhostPhase()).toBe(false);
  });

  it('isRebirthReady returns correct values', () => {
    expect(manager.isRebirthReady()).toBe(false);

    manager.triggerDeath('Gloop', 'gloop', 'baby', 10);
    expect(manager.isRebirthReady()).toBe(false);

    manager.update(31);
    expect(manager.isRebirthReady()).toBe(true);

    manager.confirmRebirth();
    expect(manager.isRebirthReady()).toBe(false);
  });

  it('reset clears everything including memorial', () => {
    manager.triggerDeath('Gloop', 'gloop', 'adult', 300);
    manager.update(31);
    manager.reset();

    const state = manager.getState();
    expect(state.isDead).toBe(false);
    expect(state.isGhost).toBe(false);
    expect(state.rebirthReady).toBe(false);
    expect(state.memorial).toBeNull();
    expect(manager.getMemorial()).toBeNull();
  });

  it('mourningTimeRemaining is clamped to 0', () => {
    manager.triggerDeath('Gloop', 'gloop', 'baby', 10);
    manager.update(100); // way past mourning

    expect(manager.getState().mourningTimeRemaining).toBe(0);
  });
});
