import { Species } from './Species';

/**
 * Registry for all available pet species.
 * New species register themselves here on import.
 */
class SpeciesRegistryImpl {
  private species = new Map<string, Species>();

  register(species: Species): void {
    const config = species.getConfig();
    this.species.set(config.id, species);
  }

  get(id: string): Species | undefined {
    return this.species.get(id);
  }

  getAll(): Species[] {
    return Array.from(this.species.values());
  }

  getAllIds(): string[] {
    return Array.from(this.species.keys());
  }
}

export const SpeciesRegistry = new SpeciesRegistryImpl();
