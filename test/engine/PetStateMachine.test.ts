import { describe, it, expect, vi } from 'vitest';
import { PetStateMachine } from '../../src/engine/PetStateMachine';

describe('PetStateMachine', () => {
  it('starts in IDLE state', () => {
    const sm = new PetStateMachine(800, 600);
    expect(sm.getState()).toBe('IDLE');
  });

  it('starts facing front', () => {
    const sm = new PetStateMachine(800, 600);
    expect(sm.getDirection()).toBe('front');
  });

  it('transitions to WALKING after idle duration expires', () => {
    const sm = new PetStateMachine(800, 600);
    const pos = { x: 400, y: 300 };

    sm.update(9, pos);
    expect(sm.getState()).toBe('WALKING');
  });

  it('returns a new position when walking', () => {
    const sm = new PetStateMachine(800, 600);
    const startPos = { x: 400, y: 300 };

    sm.update(9, startPos);
    expect(sm.getState()).toBe('WALKING');

    const newPos = sm.update(0.016, startPos);
    if (newPos) {
      expect(newPos.x).toBeTypeOf('number');
      expect(newPos.y).toBeTypeOf('number');
    }
  });

  it('fires state change callback on transition', () => {
    const sm = new PetStateMachine(800, 600);
    const callback = vi.fn();
    sm.setOnStateChange(callback);

    const pos = { x: 400, y: 300 };
    sm.update(9, pos);

    expect(callback).toHaveBeenCalledWith('WALKING', 'IDLE');
  });

  it('can force state transitions', () => {
    const sm = new PetStateMachine(800, 600);
    sm.forceState('WALKING');
    expect(sm.getState()).toBe('WALKING');
  });

  it('keeps pet within screen bounds when picking walk targets', () => {
    const sm = new PetStateMachine(800, 600);
    sm.setPetSize(64);

    for (let i = 0; i < 20; i++) {
      sm.forceState('IDLE');
      sm.update(9, { x: 400, y: 300 });

      const target = sm.getWalkTarget();
      if (target) {
        expect(target.x).toBeGreaterThanOrEqual(0);
        expect(target.x).toBeLessThanOrEqual(800);
        expect(target.y).toBeGreaterThanOrEqual(0);
        expect(target.y).toBeLessThanOrEqual(600);
      }
    }
  });

  it('transitions back to IDLE when reaching walk target', () => {
    const sm = new PetStateMachine(800, 600);

    sm.forceState('IDLE');
    sm.update(9, { x: 400, y: 300 });
    expect(sm.getState()).toBe('WALKING');

    const target = sm.getWalkTarget();
    if (target) {
      sm.update(0.016, { x: target.x, y: target.y });
      expect(sm.getState()).toBe('IDLE');
    }
  });

  // --- Phase 2: Stat-driven state transitions ---

  it('transitions to SLEEPING when energy is very low', () => {
    const sm = new PetStateMachine(800, 600);
    sm.setStats({
      hunger: 50,
      happiness: 50,
      cleanliness: 50,
      health: 50,
      energy: 10, // Below 15 threshold
    });

    // Idle timer expires and stat check runs
    sm.update(9, { x: 400, y: 300 });
    // The state should now be SLEEPING since energy check runs before idle-to-walk
    // Actually it transitions IDLE->check stats->SLEEPING
    // The idle update checks stats first
    expect(sm.getState()).toBe('SLEEPING');
  });

  it('transitions to SICK when health is very low', () => {
    const sm = new PetStateMachine(800, 600);
    sm.setStats({
      hunger: 50,
      happiness: 50,
      cleanliness: 50,
      health: 15, // At 20 threshold
      energy: 50,
    });

    sm.update(9, { x: 400, y: 300 });
    expect(sm.getState()).toBe('SICK');
  });

  it('transitions to GHOST when health reaches 0', () => {
    const sm = new PetStateMachine(800, 600);
    sm.setStats({
      hunger: 0,
      happiness: 0,
      cleanliness: 0,
      health: 0, // Dead
      energy: 0,
    });

    sm.update(9, { x: 400, y: 300 });
    expect(sm.getState()).toBe('GHOST');
  });

  it('SLEEPING state returns to IDLE after duration', () => {
    const sm = new PetStateMachine(800, 600);
    sm.forceState('SLEEPING');
    expect(sm.getState()).toBe('SLEEPING');

    // Sleep lasts 15-30 seconds
    sm.update(31, { x: 400, y: 300 });
    expect(sm.getState()).toBe('IDLE');
  });

  it('EATING state transitions to HAPPY', () => {
    const sm = new PetStateMachine(800, 600);
    sm.forceState('EATING');
    expect(sm.getState()).toBe('EATING');

    // Eating lasts 2 seconds
    sm.update(2.1, { x: 400, y: 300 });
    expect(sm.getState()).toBe('HAPPY');
  });

  it('HAPPY state transitions back to IDLE', () => {
    const sm = new PetStateMachine(800, 600);
    sm.forceState('HAPPY');
    expect(sm.getState()).toBe('HAPPY');

    sm.update(3.1, { x: 400, y: 300 });
    expect(sm.getState()).toBe('IDLE');
  });

  it('GHOST state moves the pet (floating)', () => {
    const sm = new PetStateMachine(800, 600);
    sm.forceState('GHOST');

    const pos = { x: 400, y: 300 };
    const newPos = sm.update(1, pos);

    expect(newPos).not.toBeNull();
    if (newPos) {
      expect(newPos.y).toBeLessThan(pos.y); // Ghost floats up
    }
  });

  it('SICK state stays sick when health is still low', () => {
    const sm = new PetStateMachine(800, 600);
    sm.setStats({
      hunger: 50,
      happiness: 50,
      cleanliness: 50,
      health: 10, // Still low
      energy: 50,
    });

    sm.forceState('SICK');

    // After 10 seconds (sick duration), health still low → stays sick
    sm.update(11, { x: 400, y: 300 });
    expect(sm.getState()).toBe('SICK');
  });

  it('SICK state recovers to IDLE when health improves', () => {
    const sm = new PetStateMachine(800, 600);
    sm.forceState('SICK');

    sm.setStats({
      hunger: 50,
      happiness: 50,
      cleanliness: 50,
      health: 50, // Recovered
      energy: 50,
    });

    sm.update(11, { x: 400, y: 300 });
    expect(sm.getState()).toBe('IDLE');
  });
});
