import { Grid } from 'honeycomb-grid';
import type { GameState, HexCoord, WaveDefinition, StageGoal } from '../types';
import { GamePhase, BuildingType, Terrain } from '../types';
import { hexNeighbors, hexesInRadius } from '../core/hex/HexGrid';
import { Tile } from '../core/hex/Tile';
import { createHexGridAdapter } from '../core/hex/HexGridAdapter';
import type { GameContext } from '../core/interfaces';
import { gameContext } from './dependencies';

type CreateConfig = {
  stageIndex: number;
  mapRadius: number;
  playerStart: HexCoord;
  terrains: string[];
  initialResources: { septims: number; wood: number; stone: number; food: number; iron: number };
  waves: WaveDefinition[];
  waveTimer: number;
  unlockedTechs: string[];
  adminMode: boolean;
  goals: StageGoal[];
};

function createGameState(config: CreateConfig, ctx: GameContext = gameContext): GameState {
  const { stageIndex, mapRadius, playerStart, terrains, initialResources, waves, waveTimer, unlockedTechs, adminMode, goals } = config;
  const { config: cfg } = ctx;

  const coords = hexesInRadius({ q: 0, r: 0 }, mapRadius);
  const rawGrid = new Grid(Tile, coords) as unknown as Grid<Tile>;

  const slotsMin = cfg.buildingSlots.min;
  const slotsMax = cfg.buildingSlots.max;

  rawGrid.forEach((tile) => {
    const isPlayerStart = tile.q === playerStart.q && tile.r === playerStart.r;
    const terrainIndex = Math.abs(tile.q * 7 + tile.r * 13) % terrains.length;
    tile.terrain = terrains[terrainIndex] as Terrain;
    tile.claimed = isPlayerStart;
    tile.claimedByPlayer = isPlayerStart;
    tile.revealed = isPlayerStart;
    tile.buildingSlots = isPlayerStart
      ? cfg.buildingSlots.mainHex
      : slotsMin + Math.floor(Math.abs(tile.q * 17 + tile.r * 31) % (slotsMax - slotsMin + 1));
    tile.buildings = isPlayerStart
      ? [{ type: BuildingType.Settlement, level: 1, hp: cfg.settlementHp, maxHp: cfg.settlementHp, progress: 1 }]
      : [];
    tile.defenders = [];
    tile.enemyUnits = [];
    tile.hp = cfg.defaultTileHp;
    tile.maxHp = cfg.defaultTileHp;
  });

  const grid = createHexGridAdapter(rawGrid);

  const startTile = grid.getHex(playerStart);
  if (startTile) {
    for (const nb of hexNeighbors(grid, startTile)) {
      nb.revealed = true;
    }
  }

  return {
    phase: GamePhase.Playing,
    currentStage: stageIndex,
    grid,
    resources: initialResources,
    wave: {
      current: 0,
      total: waves.length,
      timer: waveTimer,
      active: false,
      spawning: false,
      spawnTimer: 0,
      spawnQueue: [],
    },
    techs: unlockedTechs.map(id => ({
      id,
      researched: false,
      inProgress: false,
      progress: 0,
    })),
    enemies: new Map(),
    goals: goals.map(g => ({ ...g, count: 0 })),
    cameraX: 0,
    cameraY: 0,
    cameraZoom: 1,
    selectedHex: playerStart,
    tick: 0,
    stageResult: null,
    adminMode,
    adminWaves: adminMode ? waves : null,
  };
}

export function createInitialState(stageIndex: number, ctx: GameContext = gameContext): GameState {
  const stage = ctx.data.stages[stageIndex];
  return createGameState({
    stageIndex,
    mapRadius: stage.mapRadius,
    playerStart: stage.playerStart,
    terrains: stage.terrain,
    initialResources: {
      septims: stage.initialResources.septims ?? 0,
      wood: stage.initialResources.wood ?? 0,
      stone: stage.initialResources.stone ?? 0,
      food: stage.initialResources.food ?? 0,
      iron: stage.initialResources.iron ?? 0,
    },
    waves: stage.waves,
    waveTimer: ctx.config.waveBaseTimer + stageIndex * ctx.config.waveTimerPerStage,
    unlockedTechs: stage.unlockedTechs,
    adminMode: false,
    goals: stage.goals,
  }, ctx);
}

export function createSandboxState(ctx: GameContext = gameContext): GameState {
  return createGameState({
    stageIndex: -1,
    mapRadius: 5,
    playerStart: { q: 0, r: 0 },
    terrains: [Terrain.Plains, Terrain.Forest, Terrain.Mountain, Terrain.Water, Terrain.Snow, Terrain.Tundra],
    initialResources: { septims: 100, wood: 100, stone: 100, food: 100, iron: 100 },
    waves: [],
    waveTimer: 5,
    unlockedTechs: Object.keys(ctx.data.techs),
    adminMode: true,
    goals: [],
  }, ctx);
}
