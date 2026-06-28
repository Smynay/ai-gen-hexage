import type { IHexTile } from '../types';
import { Terrain } from '../types';
import { CONFIG } from '../config';

const COLORS = CONFIG.colors;

export const GRIDS: [number, number][][][] = [
  // Сетка A
  [
    [[0, 0]],
    [[-10, 0], [10, 0]],
    [[-10, -6], [10, -6], [0, 8]],
    [[-10, -8], [10, -8], [-10, 8], [10, 8]],
    [[-12, -8], [12, -8], [0, 0], [-12, 8], [12, 8]],
  ],
  // Сетка B
  [
    [[0, 0]],
    [[0, -10], [0, 10]],
    [[-8, -8], [8, -8], [0, 8]],
    [[0, -10], [-10, 0], [0, 10], [10, 0]],
    [[0, -12], [-10, -6], [10, -6], [-10, 6], [10, 6]],
  ],
  // Сетка C
  [
    [[0, 0]],
    [[-8, -6], [8, 6]],
    [[-8, -8], [0, 0], [8, 8]],
    [[-10, -4], [-4, 8], [4, -8], [10, 4]],
    [[-6, -10], [-10, 2], [0, 8], [6, -10], [10, 2]],
  ],
];

export function gridVariant(q: number, r: number): number {
  return Math.abs(q * 17 + r * 31) % GRIDS.length;
}

export const TERRAIN_COLORS: Record<Terrain, string> = {
  [Terrain.Plains]: COLORS.plains,
  [Terrain.Forest]: COLORS.forest,
  [Terrain.Mountain]: COLORS.mountain,
  [Terrain.Water]: COLORS.water,
  [Terrain.Snow]: COLORS.snow,
  [Terrain.Tundra]: COLORS.tundra,
};

export const TERRAIN_ELEVATION: Record<Terrain, number> = {
  [Terrain.Plains]: 0,
  [Terrain.Forest]: 3,
  [Terrain.Mountain]: 8,
  [Terrain.Water]: -2,
  [Terrain.Snow]: 5,
  [Terrain.Tundra]: 1,
};

export function drawHexBase(
  ctx: CanvasRenderingContext2D,
  tile: IHexTile,
  px: number,
  py: number,
  zoom: number,
): number {
  const elev = TERRAIN_ELEVATION[tile.terrain] * zoom;
  const corners = tile.corners.map((c) => ({
    x: c.x * zoom + (px - tile.x * zoom),
    y: c.y * zoom + (py - tile.y * zoom),
  }));

  // Bottom face (isometric depth)
  if (elev > 0) {
    const bottomCorners = corners.map((c) => ({ x: c.x, y: c.y + elev }));
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y + elev);
    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      ctx.lineTo(corners[next].x, corners[next].y + elev);
      ctx.lineTo(bottomCorners[next].x, bottomCorners[next].y);
      ctx.lineTo(bottomCorners[i].x, bottomCorners[i].y);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(corners[next].x, corners[next].y + elev);
    }
  }

  // Top face
  ctx.beginPath();
  for (const c of corners) {
    ctx.lineTo(c.x, c.y);
  }
  ctx.closePath();

  ctx.fillStyle = TERRAIN_COLORS[tile.terrain];
  ctx.fill();

  return elev;
}
