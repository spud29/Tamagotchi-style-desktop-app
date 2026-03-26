import { describe, it, expect, vi } from 'vitest';
import { PetStateMachine } from '../../src/engine/PetStateMachine';
import { StatsManager } from '../../src/engine/StatsManager';

describe('Pet Interactions', () => {
  describe('Feeding', () => {
    it('increases hunger stat and triggers EATING state', () => {
      const stats = new StatsManager({ hunger: 40 });
      const sm = new PetStateMachine(800, 600);

      stats.modifyStat('hunger', 25);
      sm.forceState('EATING');

      expect(stats.getStat('hunger')).toBe(65);
      expect(sm.getState()).toBe('EATING');
    });

    it('EATING transitions to HAPPY then IDLE', () => {
      const sm = new PetStateMachine(800, 600);
      const pos = { x: 400, y: 300 };

      sm.forceState('EATING');
      expect(sm.getState()).toBe('EATING');

      // Eating lasts 2 seconds
      sm.update(2.1, pos);
      expect(sm.getState()).toBe('HAPPY');

      // Happy lasts 3 seconds
      sm.update(3.1, pos);
      expect(sm.getState()).toBe('IDLE');
    });

    it('hunger stat clamps at 100', () => {
      const stats = new StatsManager({ hunger: 90 });
      stats.modifyStat('hunger', 25);
      expect(stats.getStat('hunger')).toBe(100);
    });
  });

  describe('Cleaning', () => {
    it('increases cleanliness stat', () => {
      const stats = new StatsManager({ cleanliness: 30 });
      stats.modifyStat('cleanliness', 30);
      expect(stats.getStat('cleanliness')).toBe(60);
    });

    it('triggers HAPPY state', () => {
      const sm = new PetStateMachine(800, 600);
      sm.forceState('HAPPY');
      expect(sm.getState()).toBe('HAPPY');
    });
  });

  describe('Playing', () => {
    it('increases happiness and decreases energy', () => {
      const stats = new StatsManager({ happiness: 40, energy: 80 });

      stats.modifyStat('happiness', 20);
      stats.modifyStat('energy', -10);

      expect(stats.getStat('happiness')).toBe(60);
      expect(stats.getStat('energy')).toBe(70);
    });
  });

  describe('Medicine', () => {
    it('increases health stat', () => {
      const stats = new StatsManager({ health: 20 });
      stats.modifyStat('health', 30);
      expect(stats.getStat('health')).toBe(50);
    });

    it('can recover pet from sick state', () => {
      const sm = new PetStateMachine(800, 600);
      const stats = new StatsManager({ health: 15 });

      sm.setStats(stats.getStats());
      sm.forceState('SICK');

      // Give medicine
      stats.modifyStat('health', 30);
      sm.setStats(stats.getStats());

      // After sick duration, should recover
      sm.update(11, { x: 400, y: 300 });
      expect(sm.getState()).toBe('IDLE');
    });
  });

  describe('Sleeping', () => {
    it('pauses decay when sleeping', () => {
      const stats = new StatsManager({ hunger: 50 }, {
        hunger: 3600,
        happiness: 0,
        cleanliness: 0,
        health: 0,
        energy: 0,
      });

      stats.pause();
      stats.update(60);
      expect(stats.getStat('hunger')).toBe(50); // No decay
    });

    it('energy recovers during sleep when modified externally', () => {
      const stats = new StatsManager({ energy: 30 });

      // Simulate sleep energy recovery
      stats.pause();
      stats.modifyStat('energy', 40);
      expect(stats.getStat('energy')).toBe(70);
    });
  });

  describe('Context menu action flow', () => {
    it('all care actions work without errors', () => {
      const stats = new StatsManager();
      const sm = new PetStateMachine(800, 600);
      const pos = { x: 400, y: 300 };

      // Feed
      stats.modifyStat('hunger', 25);
      sm.forceState('EATING');
      expect(sm.getState()).toBe('EATING');

      // Complete eating chain
      sm.update(2.1, pos);
      sm.update(3.1, pos);
      expect(sm.getState()).toBe('IDLE');

      // Clean
      stats.modifyStat('cleanliness', 30);
      sm.forceState('HAPPY');
      sm.update(3.1, pos);
      expect(sm.getState()).toBe('IDLE');

      // Play
      stats.modifyStat('happiness', 20);
      stats.modifyStat('energy', -10);
      sm.forceState('HAPPY');
      sm.update(3.1, pos);
      expect(sm.getState()).toBe('IDLE');

      // Medicine
      stats.modifyStat('health', 30);
      sm.forceState('HAPPY');
      sm.update(3.1, pos);
      expect(sm.getState()).toBe('IDLE');

      // Sleep
      sm.forceState('SLEEPING');
      expect(sm.getState()).toBe('SLEEPING');
      sm.update(31, pos);
      expect(sm.getState()).toBe('IDLE');
    });
  });
});
