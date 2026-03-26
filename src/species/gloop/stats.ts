import { StatDecayRates, LifeStageConfig, LifeStage } from '../../engine/types';

/** Default stat decay rates per hour for Gloop (adult stage) */
const adultDecayRates: StatDecayRates = {
  hunger: 5,
  happiness: 3,
  cleanliness: 2,
  health: 1,
  energy: 4,
};

/** Baby stage - slightly slower decay, more forgiving */
const babyDecayRates: StatDecayRates = {
  hunger: 4,
  happiness: 2,
  cleanliness: 2,
  health: 0.5,
  energy: 3,
};

/** Teen stage - normal decay */
const teenDecayRates: StatDecayRates = {
  hunger: 5,
  happiness: 3,
  cleanliness: 2,
  health: 1,
  energy: 4,
};

/** Gloop life stage configurations */
export const gloopLifeStages: Record<LifeStage, LifeStageConfig> = {
  egg: {
    minAgeMinutes: 0,
    minCareScore: 0,
    unlockedAbilities: [],
    statDecayRates: { hunger: 0, happiness: 0, cleanliness: 0, health: 0, energy: 0 },
    size: { width: 32, height: 32 },
    animationPrefix: 'egg_',
  },
  baby: {
    minAgeMinutes: 5,       // Hatches after 5 minutes
    minCareScore: 0,
    unlockedAbilities: ['eat', 'sleep'],
    statDecayRates: babyDecayRates,
    size: { width: 48, height: 48 },
    animationPrefix: '',
  },
  teen: {
    minAgeMinutes: 60,      // 1 hour to reach teen
    minCareScore: 40,       // Need decent care
    unlockedAbilities: ['eat', 'sleep', 'play', 'carry_icons'],
    statDecayRates: teenDecayRates,
    size: { width: 56, height: 56 },
    animationPrefix: '',
  },
  adult: {
    minAgeMinutes: 180,     // 3 hours to reach adult
    minCareScore: 50,       // Need good care
    unlockedAbilities: ['eat', 'sleep', 'play', 'carry_icons', 'yeet_icons', 'climb_edge'],
    statDecayRates: adultDecayRates,
    size: { width: 64, height: 64 },
    animationPrefix: '',
  },
  ghost: {
    minAgeMinutes: 0,
    minCareScore: 0,
    unlockedAbilities: [],
    statDecayRates: { hunger: 0, happiness: 0, cleanliness: 0, health: 0, energy: 0 },
    size: { width: 64, height: 64 },
    animationPrefix: 'ghost_',
  },
};
