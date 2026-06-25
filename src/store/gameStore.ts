import { create } from 'zustand';
import type { GameState, HexCoord, Resources, EnemyType, Terrain, WaveDefinition } from '../types';
import { GamePhase, BuildingType, ResourceType } from '../types';
import {
  createInitialState,
  gameTick,
  findUnclaimedNeighbors,
  claimHex,
  startBuilding,
  canBuild,
  canResearch,
  startResearch,
  resetEnemyId,
  createSandboxState,
  allocEnemyId,
} from '../core/GameEngine';
import { Tile } from '../core/hex/Tile';
import { hexNeighbors } from '../core/hex/HexGrid';
import { ENEMIES } from '../data/enemies';

interface GameStore extends GameState {
  completedStages: number[];
  paintTerrain: Terrain | null;
  panelVisible: boolean;
  startStage: (index: number) => void;
  startTestLevel: () => void;
  goToMenu: () => void;
  goToStageSelect: () => void;
  gameLoopTick: () => void;
  selectHex: (coord: HexCoord | null) => void;
  claimSelected: () => void;
  buildOnSelected: (type: BuildingType) => void;
  research: (techId: string) => void;
  panCamera: (dx: number, dy: number) => void;
  zoomCamera: (dz: number) => void;
  canBuildOnSelected: (type: BuildingType) => boolean;
  canClaimAny: () => boolean;
  unclaimedNeighbors: () => HexCoord[];
  canResearchTech: (techId: string) => boolean;
  setPaintTerrain: (t: Terrain | null) => void;
  paintTile: (coord: HexCoord, terrain: Terrain) => void;
  setResource: (type: string, value: number) => void;
  maxResources: () => void;
  triggerNextWave: () => void;
  spawnEnemyOnCoord: (coord: HexCoord, enemyType: EnemyType) => void;
  updateAdminWaveEnemy: (waveIdx: number, enemyIdx: number, field: string, value: number) => void;
  addAdminWave: (enemyType: EnemyType, count: number, interval: number) => void;
  removeAdminWave: (index: number) => void;
  setAdminBuildingSlots: (coord: HexCoord, slots: number) => void;
  toggleClaimed: (coord: HexCoord) => void;
  togglePanel: () => void;
}

const emptyState = (): GameState => ({
  phase: GamePhase.Menu,
  currentStage: 0,
  grid: null as any,
  resources: { septims: 0, wood: 0, stone: 0, food: 0, iron: 0 },
  wave: { current: 0, total: 0, timer: 30, active: false, spawning: false, spawnTimer: 0, spawnQueue: [] },
  techs: [],
  enemies: new Map(),
  cameraX: 0,
  cameraY: 0,
  cameraZoom: 1,
  selectedHex: null,
  tick: 0,
  stageResult: null,
  adminMode: false,
  adminWaves: null,
});

const SAVE_KEY = 'hexage_progress';

function loadProgress(): number[] {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [1];
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...emptyState(),
  completedStages: loadProgress(),
  paintTerrain: null as Terrain | null,
  panelVisible: true,

  startStage: (index: number) => {
    resetEnemyId();
    const state = createInitialState(index);
    set({
      ...state,
      phase: GamePhase.Playing,
      currentStage: index,
      completedStages: loadProgress(),
      paintTerrain: null,
    });
  },

  startTestLevel: () => {
    resetEnemyId();
    const state = createSandboxState();
    set({
      ...state,
      completedStages: loadProgress(),
      paintTerrain: null,
    });
  },

  goToMenu: () => set({ phase: GamePhase.Menu, stageResult: null }),
  goToStageSelect: () => set({ phase: GamePhase.StageSelect }),

  gameLoopTick: () => {
    const state = get();
    if (state.phase !== GamePhase.Playing) return;
    gameTick(state);
    set({ ...state });
    const afterPhase = get().phase;
    if (afterPhase === GamePhase.Victory && !state.adminMode) {
      const completed = loadProgress();
      if (!completed.includes(state.currentStage + 1)) {
        completed.push(state.currentStage + 1);
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(completed)); } catch {}
      }
    }
  },

  selectHex: (coord: HexCoord | null) => set({ selectedHex: coord }),

  claimSelected: () => {
    const state = get();
    const coord = state.selectedHex;
    if (!coord) return;
    if (claimHex(state, coord)) {
      set({ ...state });
    }
  },

  buildOnSelected: (type: BuildingType) => {
    const state = get();
    const coord = state.selectedHex;
    if (!coord) return;
    if (startBuilding(state, coord, type)) {
      set({ ...state });
    }
  },

  research: (techId: string) => {
    const state = get();
    if (startResearch(state, techId)) {
      set({ ...state });
    }
  },

  panCamera: (dx: number, dy: number) =>
    set(s => ({ cameraX: s.cameraX + dx, cameraY: s.cameraY + dy })),

  zoomCamera: (dz: number) =>
    set(s => ({ cameraZoom: Math.max(0.4, Math.min(2, s.cameraZoom + dz)) })),

  canBuildOnSelected: (type: BuildingType) => {
    const state = get();
    const coord = state.selectedHex;
    if (!coord) return false;
    return canBuild(state, coord, type);
  },

  canClaimAny: () => findUnclaimedNeighbors(get()).length > 0,

  unclaimedNeighbors: () => findUnclaimedNeighbors(get()),

  canResearchTech: (techId: string) => canResearch(get(), techId),

  setPaintTerrain: (t: Terrain | null) => set({ paintTerrain: t }),

  paintTile: (coord: HexCoord, terrain: Terrain) => {
    const state = get();
    const tile = state.grid.getHex(coord);
    if (tile) {
      const enIds = tile.enemyUnits;
      tile.terrain = terrain;
      tile.buildings = [];
      tile.enemyUnits = [];
      tile.defenders = [];
      for (const eid of enIds) {
        state.enemies.delete(eid);
      }
      set({ ...state });
    }
  },

  setResource: (type: string, value: number) => {
    const state = get();
    state.resources[type as keyof Resources] = Math.max(0, value);
    set({ ...state });
  },

  maxResources: () => {
    const state = get();
    state.resources.septims = 9999;
    state.resources.wood = 9999;
    state.resources.stone = 9999;
    state.resources.food = 9999;
    state.resources.iron = 9999;
    set({ ...state });
  },

  triggerNextWave: () => {
    const state = get();
    state.wave.timer = 0;
    set({ ...state });
  },

  spawnEnemyOnCoord: (coord: HexCoord, enemyType: EnemyType) => {
    const def = ENEMIES[enemyType];
    const eid = allocEnemyId();
    const enemy = {
      id: eid,
      type: enemyType,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      damage: def.damage,
      pos: { q: coord.q, r: coord.r },
      targetHex: { q: coord.q, r: coord.r },
      path: [{ q: coord.q, r: coord.r }],
    };
    set(s => {
      const newEnemies = new Map(s.enemies);
      newEnemies.set(eid, enemy);
      const tile = s.grid.getHex(coord);
      if (tile) {
        tile.enemyUnits = [...tile.enemyUnits, eid];
      }
      return { ...s, enemies: newEnemies };
    });
  },

  updateAdminWaveEnemy: (waveIdx: number, enemyIdx: number, field: string, value: number) => {
    const state = get();
    if (!state.adminWaves || !state.adminWaves[waveIdx]) return;
    const wave = state.adminWaves[waveIdx];
    const enemy = wave.enemies[enemyIdx];
    if (enemy) {
      (enemy as any)[field] = value;
      set({ ...state });
    }
  },

  addAdminWave: (enemyType: EnemyType, count: number, interval: number) => {
    const state = get();
    const waves = state.adminWaves ? [...state.adminWaves] : [];
    const existingGroup = waves.length > 0 ? waves[waves.length - 1].enemies.find(e => e.type === enemyType) : null;
    if (existingGroup) {
      existingGroup.count += count;
      existingGroup.interval = interval;
    } else if (waves.length > 0) {
      waves[waves.length - 1].enemies.push({ type: enemyType, count, interval });
    } else {
      waves.push({
        enemies: [{ type: enemyType, count, interval }],
      });
    }
    set({
      adminWaves: waves,
      wave: { ...state.wave, total: waves.length },
    });
  },

  removeAdminWave: (index: number) => {
    const state = get();
    if (!state.adminWaves || index < 0 || index >= state.adminWaves.length) return;
    const waves = state.adminWaves.filter((_, i) => i !== index);
    set({
      adminWaves: waves,
      wave: { ...state.wave, total: waves.length },
    });
  },

  setAdminBuildingSlots: (coord: HexCoord, slots: number) => {
    const state = get();
    const tile = state.grid.getHex(coord);
    if (tile) {
      tile.buildingSlots = Math.max(1, Math.min(10, slots));
      set({ ...state });
    }
  },

  toggleClaimed: (coord: HexCoord) => {
    const state = get();
    const tile = state.grid.getHex(coord);
    if (tile && !tile.claimedByPlayer) {
      tile.claimed = true;
      tile.claimedByPlayer = true;
      tile.revealed = true;
      tile.buildings = [];
      tile.hp = tile.maxHp;
      for (const nb of hexNeighbors(state.grid, coord)) {
        nb.revealed = true;
      }
      set({ ...state });
    }
  },

  togglePanel: () => set(s => ({ panelVisible: !s.panelVisible })),
}));
