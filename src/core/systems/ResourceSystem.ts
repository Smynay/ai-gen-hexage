import type { GameState } from '../../types';
import { BuildingType, ResourceType } from '../../types';
import type { GameContext } from '../interfaces';

export function tickResources(state: GameState, ctx: GameContext): void {
  const { data } = ctx;
  const dt = ctx.config.tickIntervalMs / 1000;
  state.grid.forEach((tile) => {
    if (!tile.claimedByPlayer) return;
    for (const b of tile.buildings) {
      if (b.progress < 1) continue;
      const def = data.buildings[b.type as BuildingType];
      for (const [rType, amount] of Object.entries(def.producesPerTick)) {
        state.resources[rType as ResourceType] += (amount as number) * dt;
      }
    }
  });
}
