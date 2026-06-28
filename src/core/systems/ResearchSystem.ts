import type { GameState } from '../../types';
import type { GameContext } from '../interfaces';

export function tickResearch(state: GameState, ctx: GameContext): void {
  const { data } = ctx;
  const dt = ctx.config.tickIntervalMs / 1000;
  for (const ts of state.techs) {
    if (!ts.inProgress) continue;
    ts.progress += dt;
    const tech = data.techs[ts.id];
    if (tech && ts.progress >= tech.researchTime) {
      ts.researched = true;
      ts.inProgress = false;
      ts.progress = 0;
    }
  }
}
