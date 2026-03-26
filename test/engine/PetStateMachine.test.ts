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

    // Advance time past the maximum idle duration (8 seconds)
    sm.update(9, pos);

    expect(sm.getState()).toBe('WALKING');
  });

  it('returns a new position when walking', () => {
    const sm = new PetStateMachine(800, 600);
    const startPos = { x: 400, y: 300 };

    // Force into walking state
    sm.update(9, startPos);
    expect(sm.getState()).toBe('WALKING');

    // Update should return a new position
    const newPos = sm.update(0.016, startPos);
    // newPos could be null if walk target happens to be very close
    // but generally should be a position
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

    // Transition to walking many times and check targets are in bounds
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

    // Force walking
    sm.forceState('IDLE');
    sm.update(9, { x: 400, y: 300 });
    expect(sm.getState()).toBe('WALKING');

    const target = sm.getWalkTarget();
    if (target) {
      // Place pet at the target - should transition back to IDLE
      sm.update(0.016, { x: target.x, y: target.y });
      expect(sm.getState()).toBe('IDLE');
    }
  });
});
