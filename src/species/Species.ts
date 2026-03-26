import { SpeciesConfig } from '../engine/types';

/**
 * Species interface that all pet species must implement.
 * Each species provides its own config, animations, and behavior definitions.
 */
export interface Species {
  /** Get the full species configuration */
  getConfig(): SpeciesConfig;

  /** Get the animation name for a given state and direction */
  getAnimationName(state: string, direction?: string): string;
}
