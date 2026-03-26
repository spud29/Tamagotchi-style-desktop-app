import { describe, it, expect, vi } from 'vitest';
import { StatsManager } from '../../src/engine/StatsManager';

describe('StatsManager', () => {
  it('initializes with default stats', () => {
    const sm = new StatsManager();
    const stats = sm.getStats();
    expect(stats.hunger).toBe(80);
    expect(stats.happiness).toBe(80);
    expect(stats.health).toBe(100);
    expect(stats.energy).toBe(80);
  });

  it('accepts custom initial stats', () => {
    const sm = new StatsManager({ hunger: 50, happiness: 30 });
    expect(sm.getStat('hunger')).toBe(50);
    expect(sm.getStat('happiness')).toBe(30);
    expect(sm.getStat('health')).toBe(100); // default
  });

  it('decays stats over time', () => {
    const sm = new StatsManager({ hunger: 50 }, {
      hunger: 3600, // Decays 3600/hour = 1/second for easy math
      happiness: 0,
      cleanliness: 0,
      health: 0,
      energy: 0,
    });

    sm.update(10); // 10 seconds
    expect(sm.getStat('hunger')).toBeCloseTo(40, 1);
  });

  it('clamps stats to 0 minimum', () => {
    const sm = new StatsManager({ hunger: 5 }, {
      hunger: 3600,
      happiness: 0,
      cleanliness: 0,
      health: 0,
      energy: 0,
    });

    sm.update(10); // Would decay by 10, but hunger is only 5
    expect(sm.getStat('hunger')).toBe(0);
  });

  it('modifyStat clamps between 0 and 100', () => {
    const sm = new StatsManager({ hunger: 90 });
    sm.modifyStat('hunger', 20); // 90 + 20 = 110 → 100
    expect(sm.getStat('hunger')).toBe(100);

    sm.modifyStat('hunger', -200); // 100 - 200 = -100 → 0
    expect(sm.getStat('hunger')).toBe(0);
  });

  it('fires stats change callback on modifyStat', () => {
    const sm = new StatsManager();
    const callback = vi.fn();
    sm.setOnStatsChange(callback);

    sm.modifyStat('hunger', 10);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][1]).toBe('hunger');
  });

  it('fires threshold callback when stat crosses LOW threshold', () => {
    const sm = new StatsManager({ hunger: 31 }, {
      hunger: 3600,
      happiness: 0,
      cleanliness: 0,
      health: 0,
      energy: 0,
    });
    const callback = vi.fn();
    sm.setOnThreshold(callback);

    // Decay 2 seconds: 31 - 2 = 29, crosses 30 threshold
    sm.update(2);
    expect(callback).toHaveBeenCalledWith('hunger', expect.any(Number));
  });

  it('pauses decay when paused', () => {
    const sm = new StatsManager({ hunger: 50 }, {
      hunger: 3600,
      happiness: 0,
      cleanliness: 0,
      health: 0,
      energy: 0,
    });

    sm.pause();
    sm.update(100);
    expect(sm.getStat('hunger')).toBe(50); // No change
  });

  it('resumes decay after unpause', () => {
    const sm = new StatsManager({ hunger: 50 }, {
      hunger: 3600,
      happiness: 0,
      cleanliness: 0,
      health: 0,
      energy: 0,
    });

    sm.pause();
    sm.update(100);
    expect(sm.getStat('hunger')).toBe(50);

    sm.resume();
    sm.update(10);
    expect(sm.getStat('hunger')).toBeCloseTo(40, 1);
  });

  it('health decays faster when other stats are low', () => {
    const smHealthy = new StatsManager(
      { hunger: 80, happiness: 80, cleanliness: 80, health: 100, energy: 80 },
      { hunger: 0, happiness: 0, cleanliness: 0, health: 3600, energy: 0 }
    );

    const smNeglected = new StatsManager(
      { hunger: 0, happiness: 0, cleanliness: 0, health: 100, energy: 0 },
      { hunger: 0, happiness: 0, cleanliness: 0, health: 3600, energy: 0 }
    );

    smHealthy.update(10);
    smNeglected.update(10);

    // Neglected pet's health should have decayed more
    expect(smNeglected.getStat('health')).toBeLessThan(smHealthy.getStat('health'));
  });

  it('applies offline decay correctly', () => {
    const sm = new StatsManager({ hunger: 80 }, {
      hunger: 5,
      happiness: 3,
      cleanliness: 2,
      health: 1,
      energy: 4,
    });

    // Simulate 1 hour offline
    sm.applyOfflineDecay(3600);
    expect(sm.getStat('hunger')).toBeCloseTo(75, 0);
    expect(sm.getStat('happiness')).toBeCloseTo(77, 0);
    expect(sm.getStat('energy')).toBeCloseTo(76, 0);
  });

  it('isDead returns true when health is 0', () => {
    const sm = new StatsManager({ health: 0 });
    expect(sm.isDead()).toBe(true);
  });

  it('getLowestStat returns the stat with the minimum value', () => {
    const sm = new StatsManager({ hunger: 50, happiness: 10, cleanliness: 80, health: 100, energy: 80 });
    const lowest = sm.getLowestStat();
    expect(lowest.stat).toBe('happiness');
    expect(lowest.value).toBe(10);
  });

  it('getAverageScore calculates correct average', () => {
    const sm = new StatsManager({ hunger: 60, happiness: 80, cleanliness: 40, health: 100, energy: 20 });
    expect(sm.getAverageScore()).toBe(60); // (60+80+40+100+20)/5
  });

  it('setAllStats loads all stats from save data', () => {
    const sm = new StatsManager();
    sm.setAllStats({ hunger: 10, happiness: 20, cleanliness: 30, health: 40, energy: 50 });

    expect(sm.getStat('hunger')).toBe(10);
    expect(sm.getStat('happiness')).toBe(20);
    expect(sm.getStat('cleanliness')).toBe(30);
    expect(sm.getStat('health')).toBe(40);
    expect(sm.getStat('energy')).toBe(50);
  });
});
