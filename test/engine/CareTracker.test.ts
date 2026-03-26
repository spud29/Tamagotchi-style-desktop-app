import { describe, it, expect } from 'vitest';
import { CareTracker } from '../../src/engine/CareTracker';
import { PetStats } from '../../src/engine/types';

const goodStats: PetStats = {
  hunger: 80,
  happiness: 80,
  cleanliness: 80,
  health: 100,
  energy: 80,
};

const badStats: PetStats = {
  hunger: 10,
  happiness: 5,
  cleanliness: 15,
  health: 20,
  energy: 10,
};

describe('CareTracker', () => {
  it('starts with default values', () => {
    const ct = new CareTracker();
    const history = ct.getHistory();
    expect(history.totalFeedings).toBe(0);
    expect(history.totalPlaySessions).toBe(0);
    expect(history.totalCleanings).toBe(0);
    expect(history.neglectEvents).toBe(0);
    expect(history.averageCareScore).toBe(50);
  });

  it('records feeding events', () => {
    const ct = new CareTracker();
    ct.recordFeeding();
    ct.recordFeeding();
    expect(ct.getHistory().totalFeedings).toBe(2);
  });

  it('records play sessions', () => {
    const ct = new CareTracker();
    ct.recordPlay();
    expect(ct.getHistory().totalPlaySessions).toBe(1);
  });

  it('records cleaning events', () => {
    const ct = new CareTracker();
    ct.recordCleaning();
    ct.recordCleaning();
    ct.recordCleaning();
    expect(ct.getHistory().totalCleanings).toBe(3);
  });

  it('records neglect events', () => {
    const ct = new CareTracker();
    ct.recordNeglect();
    expect(ct.getHistory().neglectEvents).toBe(1);
  });

  it('updates care score based on stats over time', () => {
    const ct = new CareTracker();

    // Simulate 60+ seconds with good stats (triggers a sample)
    ct.update(61, goodStats);
    const score = ct.getCareScore();

    // Good stats average: (80+80+80+100+80)/5 = 84
    expect(score).toBeGreaterThan(70);
  });

  it('care score drops with bad stats', () => {
    const ct = new CareTracker();

    // Sample with bad stats
    ct.update(61, badStats);
    const score = ct.getCareScore();

    // Bad stats average: (10+5+15+20+10)/5 = 12
    expect(score).toBeLessThan(20);
  });

  it('loads care history from save data', () => {
    const ct = new CareTracker();
    ct.loadHistory({
      totalFeedings: 50,
      totalPlaySessions: 30,
      totalCleanings: 20,
      neglectEvents: 5,
      averageCareScore: 72,
    });

    const history = ct.getHistory();
    expect(history.totalFeedings).toBe(50);
    expect(history.averageCareScore).toBe(72);
  });

  it('accepts initial care history', () => {
    const ct = new CareTracker({
      totalFeedings: 10,
      averageCareScore: 65,
    });

    expect(ct.getHistory().totalFeedings).toBe(10);
    expect(ct.getCareScore()).toBe(65);
  });
});
