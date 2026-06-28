export type HexCoord = { q: number; r: number };

export const Terrain = {
  Plains: 'plains',
  Forest: 'forest',
  Mountain: 'mountain',
  Water: 'water',
  Snow: 'snow',
  Tundra: 'tundra',
} as const;
export type Terrain = (typeof Terrain)[keyof typeof Terrain];

export const BuildingType = {
  Settlement: 'settlement',
  LumberMill: 'lumber_mill',
  Quarry: 'quarry',
  Mine: 'mine',
  Farm: 'farm',
  Barracks: 'barracks',
  Watchtower: 'watchtower',
  Wall: 'wall',
  Shrine: 'shrine',
  Smithy: 'smithy',
} as const;
export type BuildingType = (typeof BuildingType)[keyof typeof BuildingType];

export const EnemyType = {
  Draugr: 'draugr',
  Bandit: 'bandit',
  BanditMarauder: 'bandit_marauder',
  Forsworn: 'forsworn',
  ForswornBriarheart: 'forsworn_briarheart',
  Falmer: 'falmer',
  FalmerShadowmaster: 'falmer_shadowmaster',
  DragonPriest: 'dragon_priest',
  Dragon: 'dragon',
} as const;
export type EnemyType = (typeof EnemyType)[keyof typeof EnemyType];

export const ResourceType = {
  Septims: 'septims',
  Wood: 'wood',
  Stone: 'stone',
  Food: 'food',
  Iron: 'iron',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export type Resources = Record<ResourceType, number>;

export type BuildingInfo = {
  type: BuildingType;
  level: number;
  hp: number;
  maxHp: number;
  progress: number;
};

export type EnemyUnit = {
  id: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  pos: HexCoord;
  targetHex: HexCoord;
  path: HexCoord[];
};

export type DefenderUnit = {
  id: number;
  count: number;
  damage: number;
  hp: number;
};

export type HexTile = {
  coord: HexCoord;
  terrain: Terrain;
  claimed: boolean;
  claimedByPlayer: boolean;
  buildings: BuildingInfo[];
  buildingSlots: number;
  defenders: DefenderUnit[];
  enemyUnits: number[];
  hp: number;
  maxHp: number;
  revealed: boolean;
  destroyedBuildings: BuildingType[];
};

export type WaveDefinition = {
  enemies: { type: EnemyType; count: number; interval: number }[];
};

export type WaveState = {
  current: number;
  total: number;
  timer: number;
  active: boolean;
  spawning: boolean;
  spawnTimer: number;
  spawnQueue: { type: EnemyType; hex: HexCoord; interval: number }[];
};

export type StageGoal = {
  type: 'survive_waves' | 'claim_hexes' | 'defeat_boss';
  target: number;
  count: number;
};

export type StageDefinition = {
  id: number;
  name: string;
  description: string;
  mapRadius: number;
  playerStart: HexCoord;
  terrain: Terrain[];
  waves: WaveDefinition[];
  goals: StageGoal[];
  unlockedBuildings: BuildingType[];
  unlockedTechs: string[];
  initialResources: Partial<Resources>;
};

export const GamePhase = {
  Menu: 'menu',
  StageSelect: 'stage_select',
  Playing: 'playing',
  Paused: 'paused',
  Victory: 'victory',
  Defeat: 'defeat',
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export type Tech = {
  id: string;
  name: string;
  description: string;
  cost: Resources;
  researchTime: number;
  unlocks: string[];
  prerequisites: string[];
  category: 'economy' | 'military' | 'defense' | 'magic';
};

export type TechState = {
  id: string;
  researched: boolean;
  inProgress: boolean;
  progress: number;
};

// ============================================================
// Hex grid interfaces — абстрагируют honeycomb-grid
// ============================================================

/** Рантайм-гекс: поля из honeycomb defineHex + наши игровые расширения */
export interface IHexTile {
  // Геометрия (из honeycomb defineHex)
  readonly q: number;
  readonly r: number;
  readonly x: number;
  readonly y: number;
  readonly corners: readonly { x: number; y: number }[];

  // Игровое состояние
  terrain: Terrain;
  claimed: boolean;
  claimedByPlayer: boolean;
  revealed: boolean;
  buildings: BuildingInfo[];
  buildingSlots: number;
  defenders: DefenderUnit[];
  enemyUnits: number[];
  hp: number;
  maxHp: number;
  destroyedBuildings: BuildingType[];
}

/** Абстракция гексагональной сетки — единственный способ доступа core/ к карте */
export interface IHexGrid {
  forEach(callback: (tile: IHexTile) => void): void;
  getHex(coord: HexCoord): IHexTile | undefined;
  neighborOf(coord: HexCoord, direction: number): IHexTile | undefined;
  pointToHex(point: { x: number; y: number }): IHexTile | undefined;
}

export type GameState = {
  phase: GamePhase;
  currentStage: number;
  grid: IHexGrid;
  resources: Resources;
  wave: WaveState;
  techs: TechState[];
  enemies: Map<number, EnemyUnit>;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  selectedHex: HexCoord | null;
  tick: number;
  stageResult: 'victory' | 'defeat' | null;
  adminMode: boolean;
  adminWaves: WaveDefinition[] | null;
};

export type StageResult = {
  stageId: number;
  victory: boolean;
};
