import { Grid, Direction } from 'honeycomb-grid';
import { Tile } from './Tile';
import type { IHexGrid, IHexTile, HexCoord } from '../../types';

/**
 * Оборачивает honeycomb Grid<Tile> в наш IHexGrid интерфейс.
 * Это ЕДИНСТВЕННОЕ место в core/, которое зависит от honeycomb-grid.
 */
export function createHexGridAdapter(grid: Grid<Tile>): IHexGrid {
  return {
    forEach(callback: (tile: IHexTile) => void): void {
      grid.forEach(tile => callback(tile as unknown as IHexTile));
    },
    getHex(coord: HexCoord): IHexTile | undefined {
      return grid.getHex(coord) as IHexTile | undefined;
    },
    neighborOf(coord: HexCoord, direction: number): IHexTile | undefined {
      return grid.neighborOf(coord, direction as Direction) as IHexTile | undefined;
    },
    pointToHex(point: { x: number; y: number }): IHexTile | undefined {
      return (grid as any).pointToHex(point) as IHexTile | undefined;
    },
  };
}
