import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttentionSeeker, AttentionBehavior } from '../../src/engine/AttentionSeeker';
import { PetStats } from '../../src/engine/types';

function makeStats(overrides: Partial<PetStats> = {}): PetStats {
  return {
    hunger: 80,
    happiness: 80,
    cleanliness: 80,
    health: 80,
    energy: 80,
    ...overrides,
  };
}

function lowStats(): PetStats {
  return makeStats({ hunger: 10, happiness: 10, cleanliness: 10, energy: 10 });
}

describe('AttentionSeeker', () => {
  let seeker: AttentionSeeker;
  const allBehaviors: AttentionBehavior[] = ['wave', 'ride_cursor', 'knock', 'mess_icons', 'yeet_icons'];

  beforeEach(() => {
    seeker = new AttentionSeeker(allBehaviors, []);
  });

  it('starts with no active behavior', () => {
    expect(seeker.getActiveBehavior()).toBeNull();
    expect(seeker.isActive()).toBe(false);
  });

  it('does not trigger when stats are above 50', () => {
    // Advance past check interval
    const result = seeker.update(6, makeStats(), 'IDLE');
    expect(result).toBeNull();
  });

  it('does not trigger when pet is not IDLE', () => {
    const result = seeker.update(6, lowStats(), 'WALKING');
    expect(result).toBeNull();
  });

  it('does not trigger before check interval elapses', () => {
    const result = seeker.update(2, lowStats(), 'IDLE');
    expect(result).toBeNull();
  });

  it('can trigger a behavior when stats are low and pet is IDLE', () => {
    // Mock Math.random to always return 0 (guarantees trigger and picks first eligible)
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = seeker.update(6, lowStats(), 'IDLE');
    expect(result).not.toBeNull();
    expect(seeker.isActive()).toBe(true);
    expect(allBehaviors).toContain(result);

    vi.restoreAllMocks();
  });

  it('filters out icon behaviors when carry_icons ability is not unlocked', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    // Run many updates and collect all triggered behaviors
    const triggered = new Set<AttentionBehavior>();
    for (let i = 0; i < 100; i++) {
      const s = new AttentionSeeker(allBehaviors, []);
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const result = s.update(6, lowStats(), 'IDLE');
      if (result) triggered.add(result);
    }

    expect(triggered.has('mess_icons')).toBe(false);
    expect(triggered.has('yeet_icons')).toBe(false);

    vi.restoreAllMocks();
  });

  it('allows icon behaviors when carry_icons ability is unlocked', () => {
    const s = new AttentionSeeker(['mess_icons'], ['carry_icons']);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = s.update(6, lowStats(), 'IDLE');
    expect(result).toBe('mess_icons');

    vi.restoreAllMocks();
  });

  it('ends behavior after duration expires', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    seeker.update(6, lowStats(), 'IDLE');
    expect(seeker.isActive()).toBe(true);

    // Advance past max possible duration (10 seconds for ride_cursor is the longest)
    seeker.update(15, lowStats(), 'IDLE');
    expect(seeker.isActive()).toBe(false);

    vi.restoreAllMocks();
  });

  it('puts behavior on cooldown after it ends', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    // Use only one behavior so we can track its cooldown
    const s = new AttentionSeeker(['wave'], []);
    s.update(6, lowStats(), 'IDLE');
    expect(s.getActiveBehavior()).toBe('wave');

    // End the behavior
    s.update(10, lowStats(), 'IDLE');
    expect(s.isActive()).toBe(false);

    // Try to trigger again immediately - should fail due to cooldown
    const result = s.update(6, lowStats(), 'IDLE');
    expect(result).toBeNull();

    vi.restoreAllMocks();
  });

  it('cooldown expires after 30 seconds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const s = new AttentionSeeker(['wave'], []);
    // Trigger and end wave
    s.update(6, lowStats(), 'IDLE');
    s.update(10, lowStats(), 'IDLE');
    expect(s.isActive()).toBe(false);

    // Advance 35 seconds (past 30s cooldown + check interval)
    // This single update clears cooldown and re-triggers wave
    const result = s.update(35, lowStats(), 'IDLE');
    expect(result).toBe('wave');

    vi.restoreAllMocks();
  });

  it('calls onStart and onEnd callbacks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const onStart = vi.fn();
    const onEnd = vi.fn();
    seeker.setOnStart(onStart);
    seeker.setOnEnd(onEnd);

    seeker.update(6, lowStats(), 'IDLE');
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(expect.any(String));

    // End the behavior
    seeker.update(15, lowStats(), 'IDLE');
    expect(onEnd).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it('cancelBehavior ends the active behavior immediately', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const onEnd = vi.fn();
    seeker.setOnEnd(onEnd);

    seeker.update(6, lowStats(), 'IDLE');
    expect(seeker.isActive()).toBe(true);

    seeker.cancelBehavior();
    expect(seeker.isActive()).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it('setUnlockedAbilities updates ability checks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const s = new AttentionSeeker(['mess_icons'], []);

    // Should not trigger without ability
    s.update(6, lowStats(), 'IDLE');
    expect(s.isActive()).toBe(false);

    // Unlock ability
    s.setUnlockedAbilities(['carry_icons']);
    const result = s.update(6, lowStats(), 'IDLE');
    expect(result).toBe('mess_icons');

    vi.restoreAllMocks();
  });

  it('urgency is 0 when average stats are above 50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    // All stats at 60 → average 60 → above 50 → no trigger
    const stats = makeStats({ hunger: 60, happiness: 60, cleanliness: 60, energy: 60 });
    const result = seeker.update(6, stats, 'IDLE');
    expect(result).toBeNull();

    vi.restoreAllMocks();
  });

  it('higher urgency (lower stats) increases trigger chance', () => {
    // With very low stats, urgency approaches 0.8 → almost always triggers
    // With stats near 50, urgency approaches 0.1 → rarely triggers
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // Stats averaging ~45 → urgency ~0.17 → 0.5 > 0.17 → no trigger
    const mediumStats = makeStats({ hunger: 45, happiness: 45, cleanliness: 45, energy: 45 });
    const result1 = seeker.update(6, mediumStats, 'IDLE');
    expect(result1).toBeNull();

    // Stats averaging ~5 → urgency ~0.73 → 0.5 < 0.73 → should trigger
    const criticalStats = makeStats({ hunger: 5, happiness: 5, cleanliness: 5, energy: 5 });
    const result2 = seeker.update(6, criticalStats, 'IDLE');
    expect(result2).not.toBeNull();

    vi.restoreAllMocks();
  });
});
