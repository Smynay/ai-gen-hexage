import type { IHexTile } from '../types';
import { BuildingType } from '../types';
import { CONFIG } from '../config';
import { GRIDS, gridVariant } from './TerrainLayer';

const COLORS = CONFIG.colors;

function drawSettlement(ctx: CanvasRenderingContext2D, px: number, py: number, bs: number): void {
  ctx.fillStyle = COLORS.settlement;
  ctx.fillRect(px - bs * 0.6, py - bs * 0.5, bs * 1.2, bs * 0.7);
  ctx.strokeStyle = '#8a6a30';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px - bs * 0.6, py - bs * 0.5, bs * 1.2, bs * 0.7);
  ctx.beginPath();
  ctx.moveTo(px - bs * 0.7, py - bs * 0.5);
  ctx.lineTo(px, py - bs * 0.9);
  ctx.lineTo(px + bs * 0.7, py - bs * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#8a3a20';
  ctx.fill();
  ctx.strokeStyle = '#6a2a10';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#3a2a10';
  ctx.fillRect(px - bs * 0.1, py - bs * 0.15, bs * 0.2, bs * 0.35);
}

function drawRectBuilding(
  ctx: CanvasRenderingContext2D, px: number, py: number,
  bs: number, color: string, label: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(px - bs * 0.4, py - bs * 0.35, bs * 0.8, bs * 0.7);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px - bs * 0.4, py - bs * 0.35, bs * 0.8, bs * 0.7);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${bs * 0.5}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, px, py);
}

function drawTower(ctx: CanvasRenderingContext2D, px: number, py: number, bs: number): void {
  ctx.fillStyle = COLORS.watchtower;
  ctx.fillRect(px - bs * 0.3, py - bs * 0.25, bs * 0.6, bs * 0.5);
  ctx.fillRect(px - bs * 0.2, py - bs * 0.55, bs * 0.4, bs * 0.3);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px - bs * 0.2, py - bs * 0.55, bs * 0.4, bs * 0.3);
  ctx.fillStyle = '#c04040';
  ctx.beginPath();
  ctx.moveTo(px, py - bs * 0.55);
  ctx.lineTo(px + bs * 0.2, py - bs * 0.5);
  ctx.lineTo(px, py - bs * 0.45);
  ctx.closePath();
  ctx.fill();
}

function drawWall(ctx: CanvasRenderingContext2D, px: number, py: number, bs: number): void {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(px - bs * 0.5, py - bs * 0.2, bs, bs * 0.4);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px - bs * 0.5, py - bs * 0.2, bs, bs * 0.4);
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(px + i * bs * 0.25 - bs * 0.08, py - bs * 0.35, bs * 0.16, bs * 0.15);
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  zoom: number,
  type: BuildingType,
  progress: number,
): void {
  const bs = CONFIG.hexSize * zoom * 0.4;

  if (progress < 1) {
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(px - bs * 0.3, py - bs * 0.3, bs * 0.6, bs * 0.6);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(px - bs * 0.3, py - bs * 0.3, bs * 0.6, bs * 0.6);
    return;
  }

  switch (type) {
    case BuildingType.Settlement:
      drawSettlement(ctx, px, py, bs);
      break;
    case BuildingType.LumberMill:
      drawRectBuilding(ctx, px, py, bs, COLORS.lumberMill, 'L');
      break;
    case BuildingType.Quarry:
      drawRectBuilding(ctx, px, py, bs, COLORS.quarry, 'Q');
      break;
    case BuildingType.Mine:
      drawRectBuilding(ctx, px, py, bs, COLORS.mine, 'M');
      break;
    case BuildingType.Farm:
      drawRectBuilding(ctx, px, py, bs, COLORS.farm, 'F');
      break;
    case BuildingType.Barracks:
      drawRectBuilding(ctx, px, py, bs, COLORS.barracks, 'B');
      break;
    case BuildingType.Watchtower:
      drawTower(ctx, px, py, bs);
      break;
    case BuildingType.Wall:
      drawWall(ctx, px, py, bs);
      break;
    case BuildingType.Shrine:
      drawRectBuilding(ctx, px, py, bs, COLORS.shrine, 'S');
      break;
    case BuildingType.Smithy:
      drawRectBuilding(ctx, px, py, bs, COLORS.smithy, 'A');
      break;
  }
}

export function drawBuildingsOnTile(
  ctx: CanvasRenderingContext2D,
  tile: IHexTile,
  px: number,
  py: number,
  elev: number,
  zoom: number,
): void {
  if (!tile.buildings || tile.buildings.length === 0 || !tile.revealed) return;

  const variant = gridVariant(tile.q, tile.r);
  const grid = GRIDS[variant];
  const sorted = [...tile.buildings].sort((a, b) => (b.progress < 1 ? 1 : 0) - (a.progress < 1 ? 1 : 0));
  sorted.forEach((b, i) => {
    const offsets = grid[Math.min(sorted.length, 5) - 1] ?? grid[0];
    const [ox, oy] = offsets[i % offsets.length];
    const bx = px + ox * zoom;
    const by = py - elev + oy * zoom;
    drawBuilding(ctx, bx, by, zoom, b.type, b.progress);
  });
}
