import type { GameState, HexCoord, WaveDefinition, EnemyUnit } from '../../types';
import { EnemyType } from '../../types';
import { hexNeighbors } from '../hex/HexGrid';
import { allocEnemyId } from '../GameEngine';
import { findClosestPlayerHex } from './MovementSystem';
import type { GameContext } from '../interfaces';

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

function spawnEnemyWave(state: GameState, waveDef: WaveDefinition, ctx: GameContext): void {
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

export function tickWaves(state: GameState, ctx: GameContext): void {
  const { data } = ctx;
  const dt = ctx.config.tickIntervalMs / 1000;
  const stage = data.stages[state.currentStage];
  const waves = state.adminWaves ?? stage?.waves ?? [];

  // Wave timer
  if (!state.wave.active && !state.wave.spawning && waves.length > 0) {
    state.wave.timer -= dt;
    if (state.wave.timer <= 0) {
      state.wave.active = true;
      const waveDef = waves[state.wave.current];
      if (waveDef) spawnEnemyWave(state, waveDef, ctx);
    }
  }

  // Spawn queue
  if (state.wave.spawning && state.wave.spawnQueue.length > 0) {
    state.wave.spawnTimer -= dt;
    if (state.wave.spawnTimer <= 0) {
      const next = state.wave.spawnQueue.shift()!;
      const tile = state.grid.getHex(next.hex);
      if (tile && !tile.claimedByPlayer) {
        const def = data.enemies[next.type as keyof typeof data.enemies];
        if (!def) return;
        const enemy: EnemyUnit = {
          id: allocEnemyId(),
          type: next.type as EnemyUnit['type'],
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
}
