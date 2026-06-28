import type { GameState } from '../../types';
import { BuildingType } from '../../types';
import type { GameContext } from '../interfaces';

export function tickBuildings(state: GameState, ctx: GameContext): void {
  const { data } = ctx;
  const dt = ctx.config.tickIntervalMs / 1000;
  state.grid.forEach((tile) => {
    for (const b of tile.buildings) {
      if (b.progress >= 1) continue;
      b.progress += dt / data.buildings[b.type as BuildingType].buildTime;
      if (b.progress > 1) b.progress = 1;
    }
  });
}
