import type { GameState, HexCoord } from '../../types';
import { hexDistance } from '../hex/HexGrid';

/**
 * Вспомогательные запросы к игровому миру с кешированием.
 * Инвалидация кеша происходит при изменении владения гексом.
 */

let playerHexesCache: HexCoord[] | null = null;
let playerHexesDirty = true;

/** Пометить кеш как невалидный — вызывать при claim/unclaim гексов */
export function invalidatePlayerHexes(): void {
  playerHexesDirty = true;
}

function rebuildPlayerHexes(state: GameState): HexCoord[] {
  const result: HexCoord[] = [];
  state.grid.forEach((tile) => {
    if (tile.claimedByPlayer) {
      result.push({ q: tile.q, r: tile.r });
    }
  });
  playerHexesCache = result;
  playerHexesDirty = false;
  return result;
}

export function getPlayerHexes(state: GameState): HexCoord[] {
  if (playerHexesDirty || !playerHexesCache) {
    return rebuildPlayerHexes(state);
  }
  return playerHexesCache;
}

export function findClosestPlayerHex(state: GameState, from: HexCoord): HexCoord | null {
  const playerHexes = getPlayerHexes(state);
  let best: HexCoord | null = null;
  let bestDist = Infinity;
  for (const coord of playerHexes) {
    const d = hexDistance(from, coord);
    if (d < bestDist) {
      bestDist = d;
      best = coord;
    }
  }
  return best;
}

export function countClaimedHexes(state: GameState): number {
  return getPlayerHexes(state).length;
}
