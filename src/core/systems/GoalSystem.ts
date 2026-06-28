import type { GameState } from '../../types';
import { GamePhase, EnemyType } from '../../types';
import type { GameContext } from '../interfaces';
import { countClaimedHexes } from '../world/WorldQuery';

export function tickGoals(state: GameState, ctx: GameContext): void {
  const { data, config: cfg } = ctx;
  const stage = data.stages[state.currentStage];

  // Wave completion
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

  // Check goals
  if (state.adminMode) return;
  const goals = stage?.goals ?? [];

  const allDone = goals.every(goal => {
    if (goal.type === 'survive_waves') {
      return state.wave.current >= goal.target && state.enemies.size === 0;
    }
    if (goal.type === 'claim_hexes') {
      const count = countClaimedHexes(state);
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

  const playerHexes = countClaimedHexes(state);
  if (playerHexes === 0) {
    state.phase = GamePhase.Defeat;
    state.stageResult = 'defeat';
  }
}
