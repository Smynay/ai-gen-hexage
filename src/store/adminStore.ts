import { makeAutoObservable } from 'mobx';
import type { EnemyType, HexCoord, Terrain, WaveDefinition } from '../types';
import { GamePhase } from '../types';
import { gameStore } from './gameStore';
import { invalidatePlayerHexes } from '../core/world/WorldQuery';
import { resetEnemyId, allocEnemyId } from '../core/GameEngine';
import { createSandboxState } from '../boot/createGame';
import { hexNeighbors, hexEqual } from '../core/hex/HexGrid';
import { ENEMIES } from '../data/enemies';
import { CONFIG } from '../config';

class AdminStore {
  adminMode = false;
  adminWaves: WaveDefinition[] | null = null;
  paintTerrain: Terrain | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  startTestLevel() {
    invalidatePlayerHexes();
    resetEnemyId();
    Object.assign(gameStore, createSandboxState());
    this.adminMode = true;
    this.adminWaves = (gameStore as { adminWaves: WaveDefinition[] | null }).adminWaves;
    this.paintTerrain = null;
    gameStore.phase = GamePhase.Playing;
  }

  setPaintTerrain(t: Terrain | null) {
    this.paintTerrain = t;
  }

  paintTile(coord: HexCoord, terrain: Terrain) {
    const tile = gameStore.grid.getHex(coord);
    if (!tile) return;
    const enIds = tile.enemyUnits;
    tile.terrain = terrain;
    tile.buildings = [];
    tile.enemyUnits = [];
    tile.defenders = [];
    for (const eid of enIds) {
      gameStore.enemies.delete(eid);
    }
    if (gameStore.selectedHex && hexEqual(gameStore.selectedHex, coord)) {
      gameStore.selectedHex = { q: coord.q, r: coord.r };
    }
  }

  setResource(type: string, value: number) {
    (gameStore.resources as Record<string, number>)[type] = Math.max(0, value);
  }

  maxResources() {
    const max = CONFIG.adminMaxResources;
    gameStore.resources.septims = max;
    gameStore.resources.wood = max;
    gameStore.resources.stone = max;
    gameStore.resources.food = max;
    gameStore.resources.iron = max;
  }

  triggerNextWave() {
    gameStore.wave.timer = 0;
  }

  spawnEnemyOnCoord(coord: HexCoord, enemyType: EnemyType) {
    const def = ENEMIES[enemyType];
    const eid = allocEnemyId();
    gameStore.enemies.set(eid, {
      id: eid,
      type: enemyType,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      damage: def.damage,
      pos: { q: coord.q, r: coord.r },
      targetHex: { q: coord.q, r: coord.r },
      path: [{ q: coord.q, r: coord.r }],
    });
    const tile = gameStore.grid.getHex(coord);
    if (tile) {
      tile.enemyUnits.push(eid);
    }
  }

  updateAdminWaveEnemy(waveIdx: number, enemyIdx: number, field: string, value: number) {
    if (!this.adminWaves || !this.adminWaves[waveIdx]) return;
    const wave = this.adminWaves[waveIdx];
    const enemy = wave.enemies[enemyIdx];
    if (enemy) {
      (enemy as Record<string, unknown>)[field] = value;
    }
  }

  addAdminWave(enemyType: EnemyType, count: number, interval: number) {
    const waves = this.adminWaves ? [...this.adminWaves] : [];
    const existingGroup = waves.length > 0 ? waves[waves.length - 1].enemies.find(e => e.type === enemyType) : null;
    if (existingGroup) {
      existingGroup.count += count;
      existingGroup.interval = interval;
    } else if (waves.length > 0) {
      waves[waves.length - 1].enemies.push({ type: enemyType, count, interval });
    } else {
      waves.push({ enemies: [{ type: enemyType, count, interval }] });
    }
    this.adminWaves = waves;
    gameStore.wave.total = waves.length;
  }

  removeAdminWave(index: number) {
    if (!this.adminWaves || index < 0 || index >= this.adminWaves.length) return;
    const waves = this.adminWaves.filter((_, i) => i !== index);
    this.adminWaves = waves;
    gameStore.wave.total = waves.length;
  }

  setAdminBuildingSlots(coord: HexCoord, slots: number) {
    const tile = gameStore.grid.getHex(coord);
    if (tile) {
      tile.buildingSlots = Math.max(1, Math.min(10, slots));
      if (gameStore.selectedHex && hexEqual(gameStore.selectedHex, coord)) {
        gameStore.selectedHex = { q: coord.q, r: coord.r };
      }
    }
  }

  toggleClaimed(coord: HexCoord) {
    const tile = gameStore.grid.getHex(coord);
    if (tile && !tile.claimedByPlayer) {
      tile.claimed = true;
      tile.claimedByPlayer = true;
      tile.revealed = true;
      tile.buildings = [];
      tile.hp = tile.maxHp;
      for (const nb of hexNeighbors(gameStore.grid, coord)) {
        nb.revealed = true;
      }
      if (gameStore.selectedHex && hexEqual(gameStore.selectedHex, coord)) {
        gameStore.selectedHex = { q: coord.q, r: coord.r };
      }
    }
  }
}

export const adminStore = new AdminStore();
