import type { GameState, HexCoord, BuildingInfo, Resources } from '../types';
import { GamePhase, BuildingType } from '../types';
import { hexNeighbors } from './hex/HexGrid';
import type { GameContext } from './interfaces';
import { gameContext } from '../boot/dependencies';
import { tickResources } from './systems/ResourceSystem';
import { tickBuildings } from './systems/BuildingSystem';
import { tickResearch } from './systems/ResearchSystem';
import { tickWaves } from './systems/WaveSystem';
import { tickMovement } from './systems/MovementSystem';
import { tickCombat } from './systems/CombatSystem';
import { tickCleanup } from './systems/CleanupSystem';
import { tickGoals } from './systems/GoalSystem';
import { invalidatePlayerHexes } from './world/WorldQuery';

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
  invalidatePlayerHexes();
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
  invalidatePlayerHexes();
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

export function gameTick(state: GameState, ctx: GameContext = gameContext): void {
  if (state.phase !== GamePhase.Playing) return;
  state.tick++;

  tickResources(state, ctx);
  tickBuildings(state, ctx);
  tickResearch(state, ctx);
  tickWaves(state, ctx);
  tickMovement(state, ctx);
  tickCombat(state, ctx);
  tickCleanup(state, ctx);
  tickGoals(state, ctx);
}
