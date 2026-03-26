/** All possible pet life stages */
export type LifeStage = 'egg' | 'baby' | 'teen' | 'adult' | 'ghost';

/** Pet AI behavior states */
export type PetState =
  | 'EGG'
  | 'IDLE'
  | 'WALKING'
  | 'SLEEPING'
  | 'EATING'
  | 'PLAYING'
  | 'HAPPY'
  | 'SAD'
  | 'SICK'
  | 'ATTENTION'
  | 'ICON_INTERACT'
  | 'GHOST';

/** Direction the pet is facing */
export type Direction = 'front' | 'back' | 'left' | 'right';

/** 2D position */
export interface Position {
  x: number;
  y: number;
}

/** Core pet stats (all 0-100) */
export interface PetStats {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
}

/** Stat decay rates per hour */
export interface StatDecayRates {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
}

/** Care history tracking for evolution */
export interface CareHistory {
  totalFeedings: number;
  totalPlaySessions: number;
  totalCleanings: number;
  neglectEvents: number;
  averageCareScore: number;
}

/** Complete pet save data */
export interface PetSaveData {
  id: string;
  speciesId: string;
  name: string;
  lifeStage: LifeStage;
  stats: PetStats;
  careHistory: CareHistory;
  ageMinutes: number;
  lastSavedAt: string;
  position: Position;
  isAlive: boolean;
  createdAt: string;
}

/** Animation definition for a single animation */
export interface AnimationDef {
  frames: number[];
  frameRate: number;
  loop: boolean;
}

/** Sprite sheet frame data */
export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Sprite sheet configuration */
export interface SpriteSheetConfig {
  image: string;
  frameWidth: number;
  frameHeight: number;
  frames: SpriteFrame[];
}

/** Species life stage configuration */
export interface LifeStageConfig {
  minAgeMinutes: number;
  minCareScore: number;
  unlockedAbilities: string[];
  statDecayRates: StatDecayRates;
  size: { width: number; height: number };
  animationPrefix: string;
}

/** Full species configuration */
export interface SpeciesConfig {
  id: string;
  name: string;
  description: string;
  spriteSheet: SpriteSheetConfig;
  lifeStages: Record<LifeStage, LifeStageConfig>;
  animations: Record<string, AnimationDef>;
  attentionBehaviors: string[];
}
