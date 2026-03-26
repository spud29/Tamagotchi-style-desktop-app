import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameClock } from '../../src/engine/GameClock';

describe('GameClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with 0 age by default', () => {
    const clock = new GameClock();
    expect(clock.getAgeMinutes()).toBe(0);
  });

  it('accepts initial age and lastSavedAt', () => {
    const clock = new GameClock('2026-01-01T00:00:00.000Z', 120);
    expect(clock.getAgeMinutes()).toBe(120);
  });

  it('accumulates age in minutes over time', () => {
    const clock = new GameClock();

    // Simulate 90 seconds (1.5 minutes)
    clock.update(60);
    expect(clock.getAgeMinutes()).toBe(1);

    clock.update(30);
    expect(clock.getAgeMinutes()).toBe(1); // Not yet 2 minutes

    clock.update(30);
    expect(clock.getAgeMinutes()).toBe(2); // Now 2 minutes
  });

  it('calculates offline elapsed seconds', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const clock = new GameClock(fiveMinutesAgo, 0);

    const elapsed = clock.getOfflineElapsedSeconds();
    expect(elapsed).toBeCloseTo(300, -1); // ~300 seconds
  });

  it('adds offline age correctly', () => {
    const clock = new GameClock(undefined, 10);
    clock.addOfflineAge(180); // 3 minutes offline
    expect(clock.getAgeMinutes()).toBe(13);
  });

  it('markSaved updates the lastSavedAt timestamp', () => {
    vi.setSystemTime(new Date('2026-03-26T12:00:00.000Z'));
    const clock = new GameClock('2026-03-26T11:00:00.000Z');

    clock.markSaved();
    expect(clock.getLastSavedAt()).toBe('2026-03-26T12:00:00.000Z');
  });

  it('setLastSavedAt and setAgeMinutes work for loading saves', () => {
    const clock = new GameClock();

    clock.setLastSavedAt('2026-06-15T08:30:00.000Z');
    clock.setAgeMinutes(500);

    expect(clock.getLastSavedAt()).toBe('2026-06-15T08:30:00.000Z');
    expect(clock.getAgeMinutes()).toBe(500);
  });
});
