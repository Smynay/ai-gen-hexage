import type { GameState, HexCoord, BuildingInfo } from '../../types';
import { hexDistance, hexEqual, findPath } from '../hex/HexGrid';
import type { GameContext } from '../interfaces';

export function findClosestPlayerHex(state: GameState, from: HexCoord): HexCoord | null {
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

export function tickMovement(state: GameState, ctx: GameContext): void {
  const dt = ctx.config.tickIntervalMs / 1000;

  for (const [eid, enemy] of state.enemies) {
    if (enemy.hp <= 0) continue;
    const target = enemy.targetHex;
    if (hexEqual(enemy.pos, target)) {
      // Attack tile
      const tile = state.grid.getHex(target);
      if (tile) {
        const dmg = enemy.damage * dt;
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
      // Re-target
      const nt = findClosestPlayerHex(state, enemy.pos);
      if (nt && !hexEqual(nt, enemy.pos)) {
        enemy.targetHex = nt;
      }
    } else {
      // Move toward target
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
}
