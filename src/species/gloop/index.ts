import { SpeciesConfig } from '../../engine/types';
import { Species } from '../Species';
import { SpeciesRegistry } from '../SpeciesRegistry';
import { gloopAnimations } from './animations';
import { gloopLifeStages } from './stats';
import { createGridSpriteConfig } from '../../sprites/SpriteConfig';

/**
 * Gloop - The original desktop pet species.
 * A blue blob creature with antennae. Friendly, mischievous, and expressive.
 */
class GloopSpecies implements Species {
  private config: SpeciesConfig;

  constructor() {
    this.config = {
      id: 'gloop',
      name: 'Gloop',
      description: 'A friendly blue blob creature with antennae. Mischievous and surprisingly expressive.',
      spriteSheet: createGridSpriteConfig(
        // Path relative to the app's assets folder
        new URL('../../../assets/sprites/gloop/spritesheet.png', import.meta.url).href,
        64,   // frame width
        64,   // frame height
        10,   // columns
        7     // rows (enough for ~70 frames)
      ),
      lifeStages: gloopLifeStages,
      animations: gloopAnimations,
      attentionBehaviors: ['wave', 'ride_cursor', 'knock', 'mess_icons', 'yeet_icons'],
    };
  }

  getConfig(): SpeciesConfig {
    return this.config;
  }

  getAnimationName(state: string, direction?: string): string {
    // Try state_direction first, then fall back to just state
    if (direction) {
      const directional = `${state}_${direction}`;
      if (this.config.animations[directional]) {
        return directional;
      }
    }
    if (this.config.animations[state]) {
      return state;
    }
    // Ultimate fallback
    return 'idle_front';
  }
}

// Create and register the Gloop species
const gloop = new GloopSpecies();
SpeciesRegistry.register(gloop);

export { gloop };
