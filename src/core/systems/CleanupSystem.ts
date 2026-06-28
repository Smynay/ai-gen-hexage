import type { GameState } from '../../types';
import type { GameContext } from '../interfaces';

export function tickCleanup(state: GameState, ctx: GameContext): void {
  const { data, config: cfg } = ctx;

  // Reward & cleanup dead enemies
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

  // Tile HP regen
  state.grid.forEach((tile) => {
    if (tile.claimedByPlayer && tile.hp < tile.maxHp && tile.enemyUnits.length === 0) {
      tile.hp = Math.min(tile.maxHp, tile.hp + cfg.tileRegenPerTick);
    }
  });
}
