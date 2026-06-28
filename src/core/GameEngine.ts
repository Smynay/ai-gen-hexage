import type { GameState, HexCoord, EnemyUnit, WaveDefinition, StageGoal, BuildingInfo, Resources } from '../types';
import { GamePhase, BuildingType, EnemyType, ResourceType } from '../types';
import { hexNeighbors, hexDistance, hexEqual, findPath } from './hex/HexGrid';
import type { GameContext } from './interfaces';
import { gameContext } from '../boot/dependencies';

let nextEnemyId = 1;

export function resetEnemyId(): void {
  nextEnemyId = 1;
}

export function allocEnemyId(): number {
  return nextEnemyId++;
}

export function getClaimCost(ctx: GameContext = gameContext) {
  return { ...ctx.config.claimCost };
}

export function canClaim(state: GameState, ctx: GameContext = gameContext): boolean {
  return state.resources.septims >= ctx.config.claimCost.septims &&
    state.resources.wood >= ctx.config.claimCost.wood &&
    state.resources.food >= ctx.config.claimCost.food;
}

export function canBuild(state: GameState, coord: HexCoord, buildingType: BuildingType, ctx: GameContext = gameContext): boolean {
  const tile = state.grid.getHex(coord);
  if (!tile || !tile.claimed || !tile.claimedByPlayer || tile.buildings.length >= tile.buildingSlots) return false;
  const def = ctx.data.buildings[buildingType];
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

export function startBuilding(state: GameState, coord: HexCoord, buildingType: BuildingType, ctx: GameContext = gameContext): boolean {
  if (!canBuild(state, coord, buildingType, ctx)) return false;
  const def = ctx.data.buildings[buildingType];
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

export function claimHex(state: GameState, coord: HexCoord, ctx: GameContext = gameContext): boolean {
  const tile = state.grid.getHex(coord);
  if (!tile || tile.claimed || tile.terrain === 'water') return false;
  if (!canClaim(state, ctx)) return false;
  state.resources.septims -= ctx.config.claimCost.septims;
  state.resources.wood -= ctx.config.claimCost.wood;
  state.resources.food -= ctx.config.claimCost.food;
  tile.claimed = true;
  tile.claimedByPlayer = true;
  tile.revealed = true;
  for (const nb of hexNeighbors(state.grid, tile)) {
    nb.revealed = true;
  }
  return true;
}

export function getReclaimCost(buildings: BuildingType[], ctx: GameContext = gameContext): Resources {
  const cost = { ...getClaimCost(ctx), stone: 0, iron: 0 };
  for (const bt of buildings) {
    const rc = ctx.data.buildings[bt]?.reclaimCost ?? { septims: 0, wood: 0, stone: 0, food: 0, iron: 0 };
    cost.septims += rc.septims;
    cost.wood += rc.wood;
    cost.stone += rc.stone;
    cost.food += rc.food;
    cost.iron += rc.iron;
  }
  return cost;
}

export function canReclaim(state: GameState, coord: HexCoord, selected: BuildingType[], ctx: GameContext = gameContext): boolean {
  const tile = state.grid.getHex(coord);
  if (!tile || !tile.claimed || tile.claimedByPlayer || tile.terrain === 'water') return false;
  const cost = getReclaimCost(selected, ctx);
  const r = state.resources;
  return (
    r.septims >= cost.septims &&
    r.wood >= cost.wood &&
    r.stone >= cost.stone &&
    r.food >= cost.food &&
    r.iron >= cost.iron
  );
}

export function reclaimHex(state: GameState, coord: HexCoord, selected: BuildingType[], ctx: GameContext = gameContext): boolean {
  if (!canReclaim(state, coord, selected, ctx)) return false;
  const tile = state.grid.getHex(coord)!;
  const cost = getReclaimCost(selected, ctx);
  state.resources.septims -= cost.septims;
  state.resources.wood -= cost.wood;
  state.resources.stone -= cost.stone;
  state.resources.food -= cost.food;
  state.resources.iron -= cost.iron;
  tile.claimedByPlayer = true;
  tile.destroyedBuildings = [];
  for (const bt of selected) {
    const def = ctx.data.buildings[bt];
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

export function canResearch(state: GameState, techId: string, ctx: GameContext = gameContext): boolean {
  const ts = state.techs.find(t => t.id === techId);
  if (!ts || ts.researched || ts.inProgress) return false;
  const tech = ctx.data.techs[techId];
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

export function startResearch(state: GameState, techId: string, ctx: GameContext = gameContext): boolean {
  if (!canResearch(state, techId, ctx)) return false;
  const ts = state.techs.find(t => t.id === techId)!;
  const tech = ctx.data.techs[techId];
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
  state.grid.forEach((tile) => {
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
    state.grid.forEach((tile) => {
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
  state.grid.forEach((tile) => {
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

export function gameTick(state: GameState, ctx: GameContext = gameContext): void {
  if (state.phase !== GamePhase.Playing) return;
  state.tick++;

  const { config: cfg, data } = ctx;
  const TICK_TIME = cfg.tickIntervalMs / 1000;
  const stage = data.stages[state.currentStage];
  const waves = state.adminWaves ?? stage?.waves;

  // 1. Resource generation
  state.grid.forEach((tile) => {
    if (!tile.claimedByPlayer) return;
    for (const b of tile.buildings) {
      if (b.progress < 1) continue;
      const def = data.buildings[b.type as BuildingType];
      for (const [rType, amount] of Object.entries(def.producesPerTick)) {
        state.resources[rType as ResourceType] += (amount as number) * TICK_TIME;
      }
    }
  });

  // 2. Building progress
  state.grid.forEach((tile) => {
    for (const b of tile.buildings) {
      if (b.progress >= 1) continue;
      b.progress += TICK_TIME / data.buildings[b.type as BuildingType].buildTime;
      if (b.progress > 1) b.progress = 1;
    }
  });

  // 3. Research progress
  for (const ts of state.techs) {
    if (!ts.inProgress) continue;
    ts.progress += TICK_TIME;
    const tech = data.techs[ts.id];
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
      spawnEnemyWave(state, waveDef, ctx);
    }
  }

  // 5. Spawn queue
  if (state.wave.spawning && state.wave.spawnQueue.length > 0) {
    state.wave.spawnTimer -= TICK_TIME;
    if (state.wave.spawnTimer <= 0) {
      const next = state.wave.spawnQueue.shift()!;
      const tile = state.grid.getHex(next.hex);
      if (tile && !tile.claimedByPlayer) {
        const def = data.enemies[next.type];
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
  state.grid.forEach((tile) => {
    if (!tile.claimedByPlayer || tile.enemyUnits.length === 0) return;
    let defenseDmg = 0;
    for (const b of tile.buildings) {
      if (b.progress < 1) continue;
      const def = data.buildings[b.type as BuildingType];
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
      const edef = data.enemies[enemy.type];
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
  state.grid.forEach((tile) => {
    if (tile.claimedByPlayer && tile.hp < tile.maxHp && tile.enemyUnits.length === 0) {
      tile.hp = Math.min(tile.maxHp, tile.hp + cfg.tileRegenPerTick);
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
        cfg.waveBaseTimer + Math.max(0, state.currentStage) * cfg.waveTimerPerStage,
        10
      );
    }
  }

  // 11. Check goals
  if (!state.adminMode) {
    checkGoals(state, stage?.goals ?? []);
  }
}

function spawnEnemyWave(state: GameState, waveDef: WaveDefinition, ctx: GameContext = gameContext): void {
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
  state.wave.spawnTimer = ctx.config.spawnInitialTimer;
  state.wave.spawnQueue = queue;
}

function checkGoals(state: GameState, goals: StageGoal[]): void {
  const allDone = goals.every(goal => {
    if (goal.type === 'survive_waves') {
      return state.wave.current >= goal.target && state.enemies.size === 0;
    }
    if (goal.type === 'claim_hexes') {
      let count = 0;
      state.grid.forEach((tile) => { if (tile.claimedByPlayer) count++; });
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
  state.grid.forEach((tile) => { if (tile.claimedByPlayer) playerHexes++; });
  if (playerHexes === 0) {
    state.phase = GamePhase.Defeat;
    state.stageResult = 'defeat';
  }
}
