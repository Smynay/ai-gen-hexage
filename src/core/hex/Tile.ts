import { defineHex, Orientation } from 'honeycomb-grid';
import type { Terrain, BuildingInfo, BuildingType } from '../../types';

export class Tile extends defineHex({ dimensions: 40, orientation: Orientation.POINTY }) {
  terrain!: Terrain;
  claimed = false;
  claimedByPlayer = false;
  buildings: BuildingInfo[] = [];
  buildingSlots = 0;
  defenders: { id: number; count: number; damage: number; hp: number }[] = [];
  enemyUnits: number[] = [];
  hp = 20;
  maxHp = 20;
  revealed = false;
  destroyedBuildings: BuildingType[] = [];
}
