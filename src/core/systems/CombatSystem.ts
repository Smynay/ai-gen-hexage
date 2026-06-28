import type { GameState } from '../../types';
import { BuildingType } from '../../types';
import type { GameContext } from '../interfaces';

export function tickCombat(state: GameState, ctx: GameContext): void {
  const { data } = ctx;
  const dt = ctx.config.tickIntervalMs / 1000;
  state.grid.forEach((tile) => {
    if (!tile.claimedByPlayer || tile.enemyUnits.length === 0) return;
    let defenseDmg = 0;
    for (const b of tile.buildings) {
      if (b.progress < 1) continue;
      const def = data.buildings[b.type as BuildingType];
      defenseDmg += def.passiveDamage * dt;
      if (def.providesDefense) {
        defenseDmg += def.defenseDamage * dt;
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
}
