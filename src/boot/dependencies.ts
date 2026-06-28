import type { GameData, GameConfig } from '../core/interfaces';
import { BUILDINGS } from '../data/buildings';
import { ENEMIES } from '../data/enemies';
import { TECHS } from '../data/techs';
import { STAGES } from '../data/stages';
import { CONFIG } from '../config';

export function createGameData(): GameData {
  return {
    buildings: BUILDINGS as unknown as GameData['buildings'],
    enemies: ENEMIES as unknown as GameData['enemies'],
    techs: TECHS,
    stages: STAGES,
  };
}

export function createGameConfig(): GameConfig {
  return {
    tickIntervalMs: CONFIG.tickIntervalMs,
    hexSize: CONFIG.hexSize,
    buildingSlots: CONFIG.buildingSlots,
    waveBaseTimer: CONFIG.waveBaseTimer,
    waveTimerPerStage: CONFIG.waveTimerPerStage,
    tileRegenPerTick: CONFIG.tileRegenPerTick,
    claimCost: CONFIG.claimCost,
    settlementHp: CONFIG.settlementHp,
    defaultTileHp: CONFIG.defaultTileHp,
    spawnInitialTimer: CONFIG.spawnInitialTimer,
    adminMaxResources: CONFIG.adminMaxResources,
  };
}

export const gameContext: { data: GameData; config: GameConfig } = {
  data: createGameData(),
  config: createGameConfig(),
};
