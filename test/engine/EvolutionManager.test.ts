import { describe, it, expect, vi } from 'vitest';
import { EvolutionManager } from '../../src/engine/EvolutionManager';
import { gloopLifeStages } from '../../src/species/gloop/stats';
import { CareHistory } from '../../src/engine/types';

function makeCareHistory(overrides?: Partial<CareHistory>): CareHistory {
  return {
    totalFeedings: 0,
    totalPlaySessions: 0,
    totalCleanings: 0,
    neglectEvents: 0,
    averageCareScore: 50,
    ...overrides,
  };
}

describe('EvolutionManager', () => {
  it('starts at egg stage by default', () => {
    const evo = new EvolutionManager(gloopLifeStages);
    expect(evo.getStage()).toBe('egg');
  });

  it('accepts an initial stage', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'teen');
    expect(evo.getStage()).toBe('teen');
  });

  it('evolves from egg to baby when age meets threshold', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'egg');
    const care = makeCareHistory({ averageCareScore: 50 });

    // Not enough age
    expect(evo.checkEvolution(3, care)).toBe(false);
    expect(evo.getStage()).toBe('egg');

    // Enough age (egg -> baby at 5 minutes)
    expect(evo.checkEvolution(5, care)).toBe(true);
    expect(evo.getStage()).toBe('baby');
  });

  it('evolves from baby to teen with age + care score', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'baby');

    // Age met but care score too low
    const lowCare = makeCareHistory({ averageCareScore: 20 });
    expect(evo.checkEvolution(60, lowCare)).toBe(false);
    expect(evo.getStage()).toBe('baby');

    // Both met (teen requires 60 min + 40 care score)
    const goodCare = makeCareHistory({ averageCareScore: 45 });
    expect(evo.checkEvolution(60, goodCare)).toBe(true);
    expect(evo.getStage()).toBe('teen');
  });

  it('evolves from teen to adult with age + care score', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'teen');

    // Adult requires 180 min + 50 care score
    const care = makeCareHistory({ averageCareScore: 55 });
    expect(evo.checkEvolution(180, care)).toBe(true);
    expect(evo.getStage()).toBe('adult');
  });

  it('does not evolve past adult', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'adult');
    const care = makeCareHistory({ averageCareScore: 100 });

    expect(evo.checkEvolution(9999, care)).toBe(false);
    expect(evo.getStage()).toBe('adult');
  });

  it('does not evolve from ghost', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'ghost');
    const care = makeCareHistory({ averageCareScore: 100 });

    expect(evo.checkEvolution(9999, care)).toBe(false);
    expect(evo.getStage()).toBe('ghost');
  });

  it('fires evolution callback', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'egg');
    const callback = vi.fn();
    evo.setOnEvolve(callback);

    evo.checkEvolution(5, makeCareHistory());
    expect(callback).toHaveBeenCalledWith('baby', 'egg');
  });

  it('getNextStage returns correct next stage', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'egg');
    expect(evo.getNextStage()).toBe('baby');

    evo.setStage('baby');
    expect(evo.getNextStage()).toBe('teen');

    evo.setStage('teen');
    expect(evo.getNextStage()).toBe('adult');

    evo.setStage('adult');
    expect(evo.getNextStage()).toBeNull();
  });

  it('getEvolutionProgress returns percentage toward next stage', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'egg');

    // Egg -> baby requires 5 minutes, 0 care score
    // At 2.5 minutes: 50% age progress
    expect(evo.getEvolutionProgress(2.5, 50)).toBe(50);

    // At 5 minutes: 100%
    expect(evo.getEvolutionProgress(5, 50)).toBe(100);
  });

  it('getEvolutionProgress returns 100 when fully evolved', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'adult');
    expect(evo.getEvolutionProgress(9999, 100)).toBe(100);
  });

  it('hasAbility checks current stage abilities', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'baby');
    expect(evo.hasAbility('eat')).toBe(true);
    expect(evo.hasAbility('carry_icons')).toBe(false);

    evo.setStage('teen');
    expect(evo.hasAbility('carry_icons')).toBe(true);

    evo.setStage('adult');
    expect(evo.hasAbility('yeet_icons')).toBe(true);
    expect(evo.hasAbility('climb_edge')).toBe(true);
  });

  it('getPetSize returns correct size per stage', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'egg');
    expect(evo.getPetSize()).toEqual({ width: 32, height: 32 });

    evo.setStage('baby');
    expect(evo.getPetSize()).toEqual({ width: 48, height: 48 });

    evo.setStage('teen');
    expect(evo.getPetSize()).toEqual({ width: 56, height: 56 });

    evo.setStage('adult');
    expect(evo.getPetSize()).toEqual({ width: 64, height: 64 });
  });

  it('setStage fires callback', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'baby');
    const callback = vi.fn();
    evo.setOnEvolve(callback);

    evo.setStage('ghost');
    expect(callback).toHaveBeenCalledWith('ghost', 'baby');
  });

  it('evolution is delayed (not skipped) when care score is low', () => {
    const evo = new EvolutionManager(gloopLifeStages, 'baby');

    // Age is met but care score is too low
    const lowCare = makeCareHistory({ averageCareScore: 10 });
    expect(evo.checkEvolution(120, lowCare)).toBe(false);
    expect(evo.getStage()).toBe('baby'); // Still baby

    // Later, care score improves
    const improvedCare = makeCareHistory({ averageCareScore: 45 });
    expect(evo.checkEvolution(120, improvedCare)).toBe(true);
    expect(evo.getStage()).toBe('teen'); // Now evolves
  });
});
