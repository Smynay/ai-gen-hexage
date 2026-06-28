import { makeAutoObservable, observable } from 'mobx';
import type { GameState, HexCoord, EnemyType, Resources, EnemyUnit, WaveDefinition, IHexGrid } from '../types';
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
} from '../core/GameEngine';
import { createInitialState } from '../boot/createGame';
import { invalidatePlayerHexes } from '../core/world/WorldQuery';
import { progressStore } from './progressStore';

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

  openPanel: 'tech' | 'admin' | null = null;

  constructor() {
    makeAutoObservable(this, { grid: observable.ref }, { autoBind: true });
  }

  startStage(index: number) {
    invalidatePlayerHexes();
    resetEnemyId();
    Object.assign(this, createInitialState(index));
    this.phase = GamePhase.Playing;
    this.currentStage = index;
    this.openPanel = null;
  }

  goToMenu() {
    if (this.stageResult === 'victory') {
      progressStore.save(this.currentStage);
    }
    this.phase = GamePhase.Menu;
    this.stageResult = null;
    this.openPanel = null;
  }

  goToStageSelect() {
    if (this.stageResult === 'victory') {
      progressStore.save(this.currentStage);
    }
    this.phase = GamePhase.StageSelect;
    this.stageResult = null;
    this.openPanel = null;
  }

  gameLoopTick() {
    if (this.phase !== GamePhase.Playing) return;
    gameTick(this);
    // re-read phase after gameTick may have changed it
    if ((this.phase as GamePhase) === GamePhase.Victory) {
      progressStore.save(this.currentStage);
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

  togglePanel(panel: 'tech' | 'admin') {
    this.openPanel = this.openPanel === panel ? null : panel;
  }
}

export const gameStore = new GameStore();
