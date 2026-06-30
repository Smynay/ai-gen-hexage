import type { GameState } from '../../types';
import { EnemyType } from '../../types';
import type { GameContext } from '../interfaces';
import { countClaimedHexes } from '../world/WorldQuery';

export function tickObjectives(state: GameState, _ctx: GameContext): void {
  if (!state.goals || state.goals.length === 0) return;

  const playerHexCount = countClaimedHexes(state);
  const allWavesDone = state.wave.current >= state.wave.total;

  for (const goal of state.goals) {
    switch (goal.type) {
      case 'survive_waves':
        goal.count = state.wave.current;
        break;
      case 'claim_hexes':
        goal.count = playerHexCount;
        break;
      case 'defeat_boss': {
        const noBosses = !Array.from(state.enemies.values()).some(
          e => e.type === EnemyType.Dragon || e.type === EnemyType.DragonPriest
        );
        goal.count = (allWavesDone && noBosses) ? 1 : 0;
        break;
      }
    }
  }
}
