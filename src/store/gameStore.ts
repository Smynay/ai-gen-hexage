import { makeAutoObservable, observable } from 'mobx';
import type { GameState, HexCoord, Resources, EnemyType, EnemyUnit, Terrain, WaveDefinition, IHexGrid } from '../types';
import { GamePhase, BuildingType } from '../types';
import {
  gameTick,
  claimHex,
  reclaimHex,
  startBuilding,
  canBuild,
  canResearch,
  startResearch,
  resetEnemyId,
  allocEnemyId,
} from '../core/GameEngine';
import { createInitialState, createSandboxState } from '../boot/createGame';
import { hexNeighbors, hexEqual } from '../core/hex/HexGrid';
import { ENEMIES } from '../data/enemies';
import { CONFIG } from '../config';

const SAVE_KEY = 'hexage_progress';

function loadProgress(): number[] {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

function saveProgress(stageIndex: number) {
  const completed = loadProgress();
  const next = stageIndex + 1;
  if (!completed.includes(next)) {
    completed.push(next);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(completed)); } catch {}
  }
}

class GameStore implements GameState {
  phase: GamePhase = GamePhase.Menu;
  currentStage = 0;
  grid: IHexGrid = null!;
  resources: Resources = { septims: 0, wood: 0, stone: 0, food: 0, iron: 0 };
  wave = { current: 0, total: 0, timer: 30, active: false, spawning: false, spawnTimer: 0, spawnQueue: [] as { type: EnemyType; hex: HexCoord; interval: number }[] };
  techs: { id: string; researched: boolean; inProgress: boolean; progress: number }[] = [];
  enemies = new Map<number, EnemyUnit>();
  cameraX = 0;
  cameraY = 0;
  cameraZoom = 1;
  selectedHex: HexCoord | null = null;
  tick = 0;
  stageResult: 'victory' | 'defeat' | null = null;
  adminMode = false;
  adminWaves: WaveDefinition[] | null = null;

  completedStages = loadProgress();
  paintTerrain: Terrain | null = null;
  openPanel: 'tech' | 'admin' | null = null;

  constructor() {
    makeAutoObservable(this, { grid: observable.ref }, { autoBind: true });
  }

  startStage(index: number) {
    resetEnemyId();
    Object.assign(this, createInitialState(index));
    this.phase = GamePhase.Playing;
    this.currentStage = index;
    this.completedStages = loadProgress();
    this.paintTerrain = null;
    this.openPanel = null;
  }

  startTestLevel() {
    resetEnemyId();
    Object.assign(this, createSandboxState());
    this.completedStages = loadProgress();
    this.paintTerrain = null;
    this.openPanel = null;
  }

  goToMenu() {
    if (this.stageResult === 'victory' && !this.adminMode) {
      saveProgress(this.currentStage);
      this.completedStages = loadProgress();
    }
    this.phase = GamePhase.Menu;
    this.stageResult = null;
    this.openPanel = null;
  }

  goToStageSelect() {
    if (this.stageResult === 'victory' && !this.adminMode) {
      saveProgress(this.currentStage);
      this.completedStages = loadProgress();
    }
    this.phase = GamePhase.StageSelect;
    this.stageResult = null;
    this.openPanel = null;
  }

  resetProgress() {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    this.completedStages = [];
  }

  gameLoopTick() {
    if (this.phase !== GamePhase.Playing) return;
    gameTick(this);
    // re-read phase after gameTick may have changed it
    if ((this.phase as GamePhase) === GamePhase.Victory && !this.adminMode) {
      saveProgress(this.currentStage);
      this.completedStages = loadProgress();
    }
  }

  selectHex(coord: HexCoord | null) {
    this.selectedHex = coord;
  }

  claimSelected() {
    const coord = this.selectedHex;
    if (!coord) return;
    if (claimHex(this, coord)) {
      this.selectedHex = { q: coord.q, r: coord.r };
    }
  }

  buildOnSelected(type: BuildingType) {
    const coord = this.selectedHex;
    if (!coord) return;
    if (startBuilding(this, coord, type)) {
      this.selectedHex = { q: coord.q, r: coord.r };
    }
  }

  reclaimSelected(buildings?: BuildingType[]) {
    const coord = this.selectedHex;
    if (!coord) return;
    const tile = this.grid.getHex(coord);
    const selected = buildings ?? tile?.destroyedBuildings ?? [];
    if (reclaimHex(this, coord, selected)) {
      this.selectedHex = { q: coord.q, r: coord.r };
    }
  }

  research(techId: string) {
    startResearch(this, techId);
  }

  panCamera(dx: number, dy: number) {
    this.cameraX += dx;
    this.cameraY += dy;
  }

  zoomCamera(dz: number) {
    this.cameraZoom = Math.max(0.4, Math.min(2, this.cameraZoom + dz));
  }

  canBuildOnSelected(type: BuildingType): boolean {
    const coord = this.selectedHex;
    if (!coord) return false;
    return canBuild(this, coord, type);
  }

  canResearchTech(techId: string): boolean {
    return canResearch(this, techId);
  }

  setPaintTerrain(t: Terrain | null) {
    this.paintTerrain = t;
  }

  paintTile(coord: HexCoord, terrain: Terrain) {
    const tile = this.grid.getHex(coord);
    if (tile) {
      const enIds = tile.enemyUnits;
      tile.terrain = terrain;
      tile.buildings = [];
      tile.enemyUnits = [];
      tile.defenders = [];
      for (const eid of enIds) {
        this.enemies.delete(eid);
      }
      if (this.selectedHex && hexEqual(this.selectedHex, coord)) {
        this.selectedHex = { q: coord.q, r: coord.r };
      }
    }
  }

  setResource(type: string, value: number) {
    (this.resources as any)[type] = Math.max(0, value);
  }

  maxResources() {
    const max = CONFIG.adminMaxResources;
    this.resources.septims = max;
    this.resources.wood = max;
    this.resources.stone = max;
    this.resources.food = max;
    this.resources.iron = max;
  }

  triggerNextWave() {
    this.wave.timer = 0;
  }

  spawnEnemyOnCoord(coord: HexCoord, enemyType: EnemyType) {
    const def = ENEMIES[enemyType];
    const eid = allocEnemyId();
    this.enemies.set(eid, {
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
    const tile = this.grid.getHex(coord);
    if (tile) {
      tile.enemyUnits.push(eid);
    }
  }

  updateAdminWaveEnemy(waveIdx: number, enemyIdx: number, field: string, value: number) {
    if (!this.adminWaves || !this.adminWaves[waveIdx]) return;
    const wave = this.adminWaves[waveIdx];
    const enemy = wave.enemies[enemyIdx];
    if (enemy) {
      (enemy as any)[field] = value;
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
    this.wave.total = waves.length;
  }

  removeAdminWave(index: number) {
    if (!this.adminWaves || index < 0 || index >= this.adminWaves.length) return;
    const waves = this.adminWaves.filter((_, i) => i !== index);
    this.adminWaves = waves;
    this.wave.total = waves.length;
  }

  setAdminBuildingSlots(coord: HexCoord, slots: number) {
    const tile = this.grid.getHex(coord);
    if (tile) {
      tile.buildingSlots = Math.max(1, Math.min(10, slots));
      if (this.selectedHex && hexEqual(this.selectedHex, coord)) {
        this.selectedHex = { q: coord.q, r: coord.r };
      }
    }
  }

  toggleClaimed(coord: HexCoord) {
    const tile = this.grid.getHex(coord);
    if (tile && !tile.claimedByPlayer) {
      tile.claimed = true;
      tile.claimedByPlayer = true;
      tile.revealed = true;
      tile.buildings = [];
      tile.hp = tile.maxHp;
      for (const nb of hexNeighbors(this.grid, coord)) {
        nb.revealed = true;
      }
      if (this.selectedHex && hexEqual(this.selectedHex, coord)) {
        this.selectedHex = { q: coord.q, r: coord.r };
      }
    }
  }

  togglePanel(panel: 'tech' | 'admin') {
    this.openPanel = this.openPanel === panel ? null : panel;
  }
}

export const gameStore = new GameStore();
