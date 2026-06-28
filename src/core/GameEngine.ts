import { Grid } from 'honeycomb-grid';
import type { GameState, HexCoord, EnemyUnit, WaveDefinition, StageGoal, BuildingInfo, Resources } from '../types';
import { GamePhase, BuildingType, EnemyType, ResourceType, Terrain } from '../types';
import { hexNeighbors, hexDistance, hexEqual, hexesInRadius, findPath } from './hex/HexGrid';
import { Tile } from './hex/Tile';
import { BUILDINGS } from '../data/buildings';
import { ENEMIES } from '../data/enemies';
import { TECHS } from '../data/techs';
import { STAGES } from '../data/stages';
import { CONFIG, TICK_TIME } from '../config';

let nextEnemyId = 1;

export function resetEnemyId(): void {
  nextEnemyId = 1;
}

export function allocEnemyId(): number {
  return nextEnemyId++;
}

type GameConfig = {
  stageIndex: number;
  mapRadius: number;
  playerStart: HexCoord;
  terrains: Terrain[];
  initialResources: Resources;
  waves: WaveDefinition[];
  waveTimer: number;
  unlockedTechs: string[];
  adminMode: boolean;
};

function createGameState(config: GameConfig): GameState {
  const { stageIndex, mapRadius, playerStart, terrains, initialResources, waves, waveTimer, unlockedTechs, adminMode } = config;

  const coords = hexesInRadius({ q: 0, r: 0 }, mapRadius);
  const grid = new Grid(Tile, coords);

  const slotsMin = CONFIG.buildingSlots.min;
  const slotsMax = CONFIG.buildingSlots.max;

  (grid as any).forEach((tile: any) => {
    const isPlayerStart = tile.q === playerStart.q && tile.r === playerStart.r;
    const terrainIndex = Math.abs(tile.q * 7 + tile.r * 13) % terrains.length;
    tile.terrain = terrains[terrainIndex];
    tile.claimed = isPlayerStart;
    tile.claimedByPlayer = isPlayerStart;
    tile.revealed = isPlayerStart;
    tile.buildingSlots = isPlayerStart
      ? CONFIG.buildingSlots.mainHex
      : slotsMin + Math.floor(Math.abs(tile.q * 17 + tile.r * 31) % (slotsMax - slotsMin + 1));
    tile.buildings = isPlayerStart
      ? [{ type: BuildingType.Settlement, level: 1, hp: 50, maxHp: 50, progress: 1 }]
      : [];
    tile.defenders = [];
    tile.enemyUnits = [];
    tile.hp = 20;
    tile.maxHp = 20;
  });

  // Reveal start hex neighbours — shared across all levels
  const startTile = grid.getHex(playerStart);
  if (startTile) {
    for (const nb of hexNeighbors(grid as any, startTile)) {
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

export function createInitialState(stageIndex: number): GameState {
  const stage = STAGES[stageIndex];
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
    waveTimer: CONFIG.waveBaseTimer + stageIndex * CONFIG.waveTimerPerStage,
    unlockedTechs: stage.unlockedTechs,
    adminMode: false,
  });
}

export function createSandboxState(): GameState {
  return createGameState({
    stageIndex: -1,
    mapRadius: 5,
    playerStart: { q: 0, r: 0 },
    terrains: [Terrain.Plains, Terrain.Forest, Terrain.Mountain, Terrain.Water, Terrain.Snow, Terrain.Tundra],
    initialResources: { septims: 100, wood: 100, stone: 100, food: 100, iron: 100 },
    waves: [],
    waveTimer: 5,
    unlockedTechs: Object.keys(TECHS),
    adminMode: true,
  });
}

export function getClaimCost() {
  return { septims: 5, wood: 3, food: 2 };
}

export function canClaim(state: GameState): boolean {
  return state.resources.septims >= 5 && state.resources.wood >= 3 && state.resources.food >= 2;
}

export function canBuild(state: GameState, coord: HexCoord, buildingType: BuildingType): boolean {
  const tile = state.grid.getHex(coord);
  if (!tile || !tile.claimed || !tile.claimedByPlayer || tile.buildings.length >= tile.buildingSlots) return false;
  const def = BUILDINGS[buildingType];
  if (!def.allowedTerrain.includes(tile.terrain)) return false;
  if (buildingType === BuildingType.Settlement && tile.buildings.some((b: BuildingInfo) => b.type === BuildingType.Settlement)) return false;
  const r = state.resources;
  return (
    r.septims >= def.cost.septims &&
    r.wood >= def.cost.wood &&
    r.stone >= def.cost.stone &&
    r.food >= def.cost.food &&
    r.iron >= def.cost.iron
  );
}

export function startBuilding(state: GameState, coord: HexCoord, buildingType: BuildingType): boolean {
  if (!canBuild(state, coord, buildingType)) return false;
  const def = BUILDINGS[buildingType];
  const r = state.resources;
  r.septims -= def.cost.septims;
  r.wood -= def.cost.wood;
  r.stone -= def.cost.stone;
  r.food -= def.cost.food;
  r.iron -= def.cost.iron;
  const tile = state.grid.getHex(coord)!;
  tile.buildings.push({
    type: buildingType,
    level: 1,
    hp: def.hp,
    maxHp: def.hp,
    progress: 0,
  });
  return true;
}

export function claimHex(state: GameState, coord: HexCoord): boolean {
  const tile = state.grid.getHex(coord);
  if (!tile || tile.claimed || tile.terrain === 'water') return false;
  if (!canClaim(state)) return false;
  state.resources.septims -= 5;
  state.resources.wood -= 3;
  state.resources.food -= 2;
  tile.claimed = true;
  tile.claimedByPlayer = true;
  tile.revealed = true;
  for (const nb of hexNeighbors(state.grid, tile)) {
    nb.revealed = true;
  }
  return true;
}

export function getReclaimCost(buildings: BuildingType[]): Resources {
  const cost = { ...getClaimCost(), stone: 0, iron: 0 };
  for (const bt of buildings) {
    const rc = BUILDINGS[bt]?.reclaimCost ?? { septims: 0, wood: 0, stone: 0, food: 0, iron: 0 };
    cost.septims += rc.septims;
    cost.wood += rc.wood;
    cost.stone += rc.stone;
    cost.food += rc.food;
    cost.iron += rc.iron;
  }
  return cost;
}

export function canReclaim(state: GameState, coord: HexCoord, selected: BuildingType[]): boolean {
  const tile = state.grid.getHex(coord);
  if (!tile || !tile.claimed || tile.claimedByPlayer || tile.terrain === 'water') return false;
  const cost = getReclaimCost(selected);
  const r = state.resources;
  return (
    r.septims >= cost.septims &&
    r.wood >= cost.wood &&
    r.stone >= cost.stone &&
    r.food >= cost.food &&
    r.iron >= cost.iron
  );
}

export function reclaimHex(state: GameState, coord: HexCoord, selected: BuildingType[]): boolean {
  if (!canReclaim(state, coord, selected)) return false;
  const tile = state.grid.getHex(coord)!;
  const cost = getReclaimCost(selected);
  state.resources.septims -= cost.septims;
  state.resources.wood -= cost.wood;
  state.resources.stone -= cost.stone;
  state.resources.food -= cost.food;
  state.resources.iron -= cost.iron;
  tile.claimedByPlayer = true;
  tile.destroyedBuildings = [];
  for (const bt of selected) {
    const def = BUILDINGS[bt];
    tile.buildings.push({
      type: bt,
      level: 1,
      hp: def.hp,
      maxHp: def.hp,
      progress: 0,
    });
  }
  return true;
}

export function canResearch(state: GameState, techId: string): boolean {
  const ts = state.techs.find(t => t.id === techId);
  if (!ts || ts.researched || ts.inProgress) return false;
  const tech = TECHS[techId];
  if (!tech) return false;
  for (const preq of tech.prerequisites) {
    const p = state.techs.find(t => t.id === preq);
    if (!p || !p.researched) return false;
  }
  const r = state.resources;
  return (
    r.septims >= tech.cost.septims &&
    r.wood >= tech.cost.wood &&
    r.stone >= tech.cost.stone &&
    r.food >= tech.cost.food &&
    r.iron >= tech.cost.iron
  );
}

export function startResearch(state: GameState, techId: string): boolean {
  if (!canResearch(state, techId)) return false;
  const ts = state.techs.find(t => t.id === techId)!;
  const tech = TECHS[techId];
  const r = state.resources;
  r.septims -= tech.cost.septims;
  r.wood -= tech.cost.wood;
  r.stone -= tech.cost.stone;
  r.food -= tech.cost.food;
  r.iron -= tech.cost.iron;
  ts.inProgress = true;
  ts.progress = 0;
  return true;
}

function getSpawnHexes(state: GameState): HexCoord[] {
  const candidates: HexCoord[] = [];
  (state.grid as any).forEach((tile: any) => {
    if (!tile.claimed && tile.terrain !== 'water') {
      for (const nb of hexNeighbors(state.grid, tile)) {
        if (nb.claimedByPlayer) {
          candidates.push(tile);
          break;
        }
      }
    }
  });
  if (candidates.length === 0) {
    (state.grid as any).forEach((tile: any) => {
      if (!tile.claimed && tile.terrain !== 'water') {
        candidates.push(tile);
      }
    });
  }
  return candidates;
}

function findClosestPlayerHex(state: GameState, from: HexCoord): HexCoord | null {
  let best: HexCoord | null = null;
  let bestDist = Infinity;
  (state.grid as any).forEach((tile: any) => {
    if (tile.claimedByPlayer) {
      const d = hexDistance(from, tile);
      if (d < bestDist) {
        bestDist = d;
        best = tile;
      }
    }
  });
  return best;
}

function getStage(stageIndex: number) {
  return STAGES[stageIndex];
}

export function gameTick(state: GameState): void {
  if (state.phase !== GamePhase.Playing) return;
  state.tick++;

  const stage = getStage(state.currentStage);
  const waves = state.adminWaves ?? stage.waves;

  // 1. Resource generation
  (state.grid as any).forEach((tile: any) => {
    if (!tile.claimedByPlayer) return;
    for (const b of tile.buildings) {
      if (b.progress < 1) continue;
      const def = BUILDINGS[b.type as BuildingType];
      for (const [rType, amount] of Object.entries(def.producesPerTick)) {
        state.resources[rType as ResourceType] += (amount as number) * TICK_TIME;
      }
    }
  });

  // 2. Building progress
  (state.grid as any).forEach((tile: any) => {
    for (const b of tile.buildings) {
      if (b.progress >= 1) continue;
      b.progress += TICK_TIME / BUILDINGS[b.type as BuildingType].buildTime;
      if (b.progress > 1) b.progress = 1;
    }
  });

  // 3. Research progress
  for (const ts of state.techs) {
    if (!ts.inProgress) continue;
    ts.progress += TICK_TIME;
    const tech = TECHS[ts.id];
    if (tech && ts.progress >= tech.researchTime) {
      ts.researched = true;
      ts.inProgress = false;
      ts.progress = 0;
    }
  }

  // 4. Wave timer
  if (!state.wave.active && !state.wave.spawning && waves.length > 0) {
    state.wave.timer -= TICK_TIME;
    if (state.wave.timer <= 0) {
      state.wave.active = true;
      const waveDef = waves[state.wave.current];
      spawnEnemyWave(state, waveDef);
    }
  }

  // 5. Spawn queue
  if (state.wave.spawning && state.wave.spawnQueue.length > 0) {
    state.wave.spawnTimer -= TICK_TIME;
    if (state.wave.spawnTimer <= 0) {
      const next = state.wave.spawnQueue.shift()!;
      const tile = state.grid.getHex(next.hex);
      if (tile && !tile.claimedByPlayer) {
        const def = ENEMIES[next.type];
        const enemy: EnemyUnit = {
          id: allocEnemyId(),
          type: next.type,
          hp: def.hp,
          maxHp: def.hp,
          speed: def.speed,
          damage: def.damage,
          pos: next.hex,
          targetHex: next.hex,
          path: [next.hex],
        };
        const target = findClosestPlayerHex(state, next.hex);
        if (target) enemy.targetHex = target;
        state.enemies.set(enemy.id, enemy);
        tile.enemyUnits.push(enemy.id);
      }
      state.wave.spawnTimer = next.interval;
    }
  }
  if (state.wave.spawning && state.wave.spawnQueue.length === 0) {
    state.wave.spawning = false;
  }

  // 6. Enemy movement & combat
  for (const [eid, enemy] of state.enemies) {
    if (enemy.hp <= 0) continue;
    const target = enemy.targetHex;
    if (hexEqual(enemy.pos, target)) {
      const tile = state.grid.getHex(target);
      if (tile) {
        const dmg = enemy.damage * TICK_TIME;
        tile.hp -= dmg;
        if (tile.hp <= 0 && tile.claimedByPlayer) {
          tile.destroyedBuildings = tile.buildings.map((b: BuildingInfo) => b.type);
          tile.claimed = true;
          tile.claimedByPlayer = false;
          tile.buildings = [];
          tile.defenders = [];
          tile.hp = tile.maxHp;
          tile.enemyUnits = [];
        }
      }
      const nt = findClosestPlayerHex(state, enemy.pos);
      if (nt && !hexEqual(nt, enemy.pos)) {
        enemy.targetHex = nt;
      }
    } else {
      const path = findPath(state.grid, enemy.pos, target);
      if (path && path.length > 1) {
        const nextStep = path[1];
        const oldTile = state.grid.getHex(enemy.pos);
        const newTile = state.grid.getHex(nextStep);
        if (oldTile && newTile) {
          oldTile.enemyUnits = oldTile.enemyUnits.filter((id: number) => id !== eid);
          newTile.enemyUnits.push(eid);
          enemy.pos = nextStep;
        }
      }
    }
  }

  // 7. Defense damage
  (state.grid as any).forEach((tile: any) => {
    if (!tile.claimedByPlayer || tile.enemyUnits.length === 0) return;
    let defenseDmg = 0;
    for (const b of tile.buildings) {
      if (b.progress < 1) continue;
      const def = BUILDINGS[b.type as BuildingType];
      defenseDmg += def.passiveDamage * TICK_TIME;
      if (def.providesDefense) {
        defenseDmg += def.defenseDamage * TICK_TIME;
      }
    }
    if (defenseDmg > 0) {
      for (const eid of tile.enemyUnits) {
        const enemy = state.enemies.get(eid);
        if (enemy && enemy.hp > 0) {
          enemy.hp -= defenseDmg;
        }
      }
      tile.enemyUnits = tile.enemyUnits.filter((eid: number) => {
        const e = state.enemies.get(eid);
        return e && e.hp > 0;
      });
    }
  });

  // 8. Reward & cleanup
  const deadEnemies: number[] = [];
  for (const [eid, enemy] of state.enemies) {
    if (enemy.hp <= 0) {
      const edef = ENEMIES[enemy.type];
      state.resources.septims += edef.reward.septims;
      deadEnemies.push(eid);
      const tile = state.grid.getHex(enemy.pos);
      if (tile) {
        tile.enemyUnits = tile.enemyUnits.filter((id: number) => id !== eid);
      }
    }
  }
  for (const eid of deadEnemies) {
    state.enemies.delete(eid);
  }

  // 9. Tile HP regen
  (state.grid as any).forEach((tile: any) => {
    if (tile.claimedByPlayer && tile.hp < tile.maxHp && tile.enemyUnits.length === 0) {
      tile.hp = Math.min(tile.maxHp, tile.hp + CONFIG.tileRegenPerTick);
    }
  });

  // 10. Wave completion
  if (state.wave.active && !state.wave.spawning && state.enemies.size === 0) {
    state.wave.current++;
    state.wave.active = false;
    if (state.adminMode && state.wave.current >= state.wave.total) {
      state.wave.current = 0;
      state.wave.timer = 5;
    } else if (state.wave.current < state.wave.total) {
      state.wave.timer = Math.max(
        CONFIG.waveBaseTimer + Math.max(0, state.currentStage) * CONFIG.waveTimerPerStage,
        10
      );
    }
  }

  // 11. Check goals
  if (!state.adminMode) {
    checkGoals(state, stage.goals);
  }
}

function spawnEnemyWave(state: GameState, waveDef: WaveDefinition): void {
  const spawnHexes = getSpawnHexes(state);
  if (spawnHexes.length === 0) return;
  const queue: { type: EnemyType; hex: HexCoord; interval: number }[] = [];
  for (const group of waveDef.enemies) {
    for (let i = 0; i < group.count; i++) {
      const hex = spawnHexes[i % spawnHexes.length];
      queue.push({ type: group.type, hex, interval: group.interval });
    }
  }
  state.wave.spawning = true;
  state.wave.spawnTimer = 2;
  state.wave.spawnQueue = queue;
}

function checkGoals(state: GameState, goals: StageGoal[]): void {
  const allDone = goals.every(goal => {
    if (goal.type === 'survive_waves') {
      return state.wave.current >= goal.target && state.enemies.size === 0;
    }
    if (goal.type === 'claim_hexes') {
      let count = 0;
      (state.grid as any).forEach((tile: any) => { if (tile.claimedByPlayer) count++; });
      return count >= goal.target;
    }
    if (goal.type === 'defeat_boss') {
      if (state.wave.current >= state.wave.total && state.enemies.size === 0) return true;
      return !Array.from(state.enemies.values()).some(
        e => e.type === EnemyType.Dragon || e.type === EnemyType.DragonPriest
      ) && state.wave.current >= state.wave.total;
    }
    return false;
  });

  if (allDone && state.wave.current > 0) {
    state.phase = GamePhase.Victory;
    state.stageResult = 'victory';
  }

  let playerHexes = 0;
  (state.grid as any).forEach((tile: any) => { if (tile.claimedByPlayer) playerHexes++; });
  if (playerHexes === 0) {
    state.phase = GamePhase.Defeat;
    state.stageResult = 'defeat';
  }
}

export { getStage };
