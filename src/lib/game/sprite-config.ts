/**
 * Sprite animation configuration for bosses and hero.
 * Maps boss IDs to their sprite folders and animation frame counts.
 */

export type AnimationType = 'idle' | 'attack' | 'hurt' | 'death' | 'walk' | 'special';

export interface SpriteAnimation {
  /** Folder path relative to /assets/sprites/ */
  folder: string;
  /** File prefix before the frame number */
  prefix: string;
  /** Number of frames */
  frames: number;
  /** Frames per second */
  fps: number;
  /** Whether animation loops */
  loop: boolean;
}

export interface SpriteConfig {
  animations: Record<AnimationType, SpriteAnimation | null>;
  /** Display scale multiplier */
  scale: number;
}

const BOSS_BASE = '/assets/sprites/bosses';

export const BOSS_SPRITES: Record<string, SpriteConfig> = {
  goblin: {
    scale: 1.8,
    animations: {
      idle: { folder: `${BOSS_BASE}/rpg-monsters/PNG/small_dragon`, prefix: 'Idle', frames: 3, fps: 6, loop: true },
      attack: { folder: `${BOSS_BASE}/rpg-monsters/PNG/small_dragon`, prefix: 'Fire_Attack', frames: 9, fps: 10, loop: false },
      hurt: { folder: `${BOSS_BASE}/rpg-monsters/PNG/small_dragon`, prefix: 'Hurt', frames: 2, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/rpg-monsters/PNG/small_dragon`, prefix: 'Death', frames: 4, fps: 8, loop: false },
      walk: { folder: `${BOSS_BASE}/rpg-monsters/PNG/small_dragon`, prefix: 'Walk', frames: 4, fps: 8, loop: true },
      special: { folder: `${BOSS_BASE}/rpg-monsters/PNG/small_dragon`, prefix: 'Attack', frames: 3, fps: 10, loop: false },
    },
  },
  orc: {
    scale: 1.6,
    animations: {
      idle: { folder: `${BOSS_BASE}/rpg-monsters/PNG/lizard`, prefix: 'Idle', frames: 3, fps: 6, loop: true },
      attack: { folder: `${BOSS_BASE}/rpg-monsters/PNG/lizard`, prefix: 'Attack', frames: 5, fps: 10, loop: false },
      hurt: { folder: `${BOSS_BASE}/rpg-monsters/PNG/lizard`, prefix: 'Hurt', frames: 2, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/rpg-monsters/PNG/lizard`, prefix: 'Death', frames: 6, fps: 8, loop: false },
      walk: { folder: `${BOSS_BASE}/rpg-monsters/PNG/lizard`, prefix: 'Walk', frames: 6, fps: 8, loop: true },
      special: null,
    },
  },
  troll: {
    scale: 1.4,
    animations: {
      idle: { folder: `${BOSS_BASE}/rpg-monsters/PNG/demon`, prefix: 'Idle', frames: 3, fps: 6, loop: true },
      attack: { folder: `${BOSS_BASE}/rpg-monsters/PNG/demon`, prefix: 'Attack', frames: 4, fps: 10, loop: false },
      hurt: { folder: `${BOSS_BASE}/rpg-monsters/PNG/demon`, prefix: 'Hurt', frames: 2, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/rpg-monsters/PNG/demon`, prefix: 'Death', frames: 6, fps: 8, loop: false },
      walk: { folder: `${BOSS_BASE}/rpg-monsters/PNG/demon`, prefix: 'Walk', frames: 6, fps: 8, loop: true },
      special: null,
    },
  },
  titan: {
    scale: 1.2,
    animations: {
      idle: { folder: `${BOSS_BASE}/rpg-monsters/PNG/dragon`, prefix: 'Idle', frames: 3, fps: 5, loop: true },
      attack: { folder: `${BOSS_BASE}/rpg-monsters/PNG/dragon`, prefix: 'Fire_Attack', frames: 6, fps: 10, loop: false },
      hurt: { folder: `${BOSS_BASE}/rpg-monsters/PNG/dragon`, prefix: 'Hurt', frames: 2, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/rpg-monsters/PNG/dragon`, prefix: 'Death', frames: 5, fps: 8, loop: false },
      walk: { folder: `${BOSS_BASE}/rpg-monsters/PNG/dragon`, prefix: 'Walk', frames: 5, fps: 8, loop: true },
      special: { folder: `${BOSS_BASE}/rpg-monsters/PNG/dragon`, prefix: 'Attack', frames: 4, fps: 10, loop: false },
    },
  },
  medusa: {
    scale: 1.4,
    animations: {
      idle: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Idle', frames: 3, fps: 6, loop: true },
      attack: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Attack', frames: 6, fps: 10, loop: false },
      hurt: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Hurt', frames: 2, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Death', frames: 6, fps: 8, loop: false },
      walk: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Walk', frames: 4, fps: 8, loop: true },
      special: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Stone', frames: 8, fps: 10, loop: false },
    },
  },
  jinn: {
    scale: 1.3,
    animations: {
      idle: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Idle', frames: 3, fps: 6, loop: true },
      attack: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Attack', frames: 4, fps: 10, loop: false },
      hurt: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Hurt', frames: 2, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Death', frames: 6, fps: 8, loop: false },
      walk: null,
      special: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Magic_Attack', frames: 11, fps: 12, loop: false },
    },
  },
  demon_slime: {
    scale: 1.5,
    animations: {
      idle: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/01_demon_idle`, prefix: 'demon_idle_', frames: 6, fps: 6, loop: true },
      attack: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/03_demon_cleave`, prefix: 'demon_cleave_', frames: 15, fps: 12, loop: false },
      hurt: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/04_demon_take_hit`, prefix: 'demon_take_hit_', frames: 5, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/05_demon_death`, prefix: 'demon_death_', frames: 22, fps: 10, loop: false },
      walk: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/02_demon_walk`, prefix: 'demon_walk_', frames: 12, fps: 10, loop: true },
      special: null,
    },
  },
};

/** Extra bosses available for future levels */
export const EXTRA_BOSS_SPRITES: Record<string, SpriteConfig> = {
  medusa: {
    scale: 1.4,
    animations: {
      idle: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Idle', frames: 3, fps: 6, loop: true },
      attack: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Attack', frames: 6, fps: 10, loop: false },
      hurt: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Hurt', frames: 2, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Death', frames: 6, fps: 8, loop: false },
      walk: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Walk', frames: 4, fps: 8, loop: true },
      special: { folder: `${BOSS_BASE}/rpg-monsters/PNG/medusa`, prefix: 'Stone', frames: 8, fps: 10, loop: false },
    },
  },
  jinn: {
    scale: 1.3,
    animations: {
      idle: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Idle', frames: 3, fps: 6, loop: true },
      attack: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Attack', frames: 4, fps: 10, loop: false },
      hurt: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Hurt', frames: 2, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Death', frames: 6, fps: 8, loop: false },
      walk: null,
      special: { folder: `${BOSS_BASE}/rpg-monsters/PNG/jinn_animation`, prefix: 'Magic_Attack', frames: 11, fps: 12, loop: false },
    },
  },
  demon_slime: {
    scale: 1.5,
    animations: {
      idle: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/01_demon_idle`, prefix: 'demon_idle_', frames: 6, fps: 6, loop: true },
      attack: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/03_demon_cleave`, prefix: 'demon_cleave_', frames: 15, fps: 12, loop: false },
      hurt: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/04_demon_take_hit`, prefix: 'demon_take_hit_', frames: 5, fps: 8, loop: false },
      death: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/05_demon_death`, prefix: 'demon_death_', frames: 22, fps: 10, loop: false },
      walk: { folder: `${BOSS_BASE}/boss_demon_slime_FREE_v1.0/individual sprites/02_demon_walk`, prefix: 'demon_walk_', frames: 12, fps: 10, loop: true },
      special: null,
    },
  },
};

export function getBossSprite(bossId: string): SpriteConfig | undefined {
  return BOSS_SPRITES[bossId] ?? EXTRA_BOSS_SPRITES[bossId];
}
