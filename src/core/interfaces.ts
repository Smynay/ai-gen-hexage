import type { BuildingType, EnemyType, Resources, StageGoal, Tech, WaveDefinition } from '../types';

export interface GameData {
  buildings: Record<BuildingType, {
    type: BuildingType;
    name: string;
    cost: Resources;
    reclaimCost: Resources;
    buildTime: number;
    hp: number;
    producesPerTick: Partial<Record<string, number>>;
    passiveDamage: number;
    allowedTerrain: string[];
    providesDefense: boolean;
    defenseDamage: number;
    defenseRange: number;
  }>;
  enemies: Record<EnemyType, {
    type: EnemyType;
    hp: number;
    speed: number;
    damage: number;
    reward: { septims: number };
  }>;
  techs: Record<string, Tech>;
  stages: {
    id: number;
    name: string;
    description: string;
    mapRadius: number;
    playerStart: { q: number; r: number };
    terrain: string[];
    waves: WaveDefinition[];
    goals: StageGoal[];
    unlockedBuildings: BuildingType[];
    unlockedTechs: string[];
    initialResources: Partial<Resources>;
  }[];
}

export interface GameConfig {
  tickIntervalMs: number;
  hexSize: number;
  buildingSlots: { min: number; max: number; mainHex: number };
  waveBaseTimer: number;
  waveTimerPerStage: number;
  tileRegenPerTick: number;
  claimCost: Resources;
  settlementHp: number;
  defaultTileHp: number;
  spawnInitialTimer: number;
  adminMaxResources: number;
}

export interface GameContext {
  data: GameData;
  config: GameConfig;
}
