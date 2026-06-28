import type { GameState, IHexTile } from '../types';
import { CONFIG } from '../config';
import { GRIDS, gridVariant } from './TerrainLayer';

const HEX_SIZE = CONFIG.hexSize;
const COLORS = CONFIG.colors;

export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  tile: IHexTile,
  px: number,
  py: number,
  elev: number,
  zoom: number,
  state: GameState,
): void {
  // Selection highlight
  if (state.selectedHex && state.selectedHex.q === tile.q && state.selectedHex.r === tile.r) {
    const corners = tile.corners.map((c) => ({
      x: c.x * zoom + (px - tile.x * zoom),
      y: c.y * zoom + (py - tile.y * zoom),
    }));
    ctx.beginPath();
    for (const c of corners) ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();
  }

  // Enemies
  if (tile.claimedByPlayer && tile.enemyUnits.length > 0) {
    const count = tile.enemyUnits.length;
    const size = HEX_SIZE * zoom;
    for (let i = 0; i < Math.min(count, 5); i++) {
      const ex = px + (i - (Math.min(count, 5) - 1) / 2) * size * 0.4;
      const ey = py - elev - size * 0.6;
      ctx.beginPath();
      ctx.arc(ex, ey, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#c03030';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (count > 5) {
      ctx.fillStyle = '#fff';
      ctx.font = `${size * 0.3}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`+${count - 5}`, px + size * 0.3, py - elev - size * 0.6);
    }
  }

  // HP bar
  if (tile.claimedByPlayer && tile.hp < tile.maxHp) {
    const size = HEX_SIZE * zoom;
    const barW = size * 0.8;
    const barH = 4;
    const barX = px - barW / 2;
    const barY = py + size * 0.5;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    const ratio = tile.hp / tile.maxHp;
    ctx.fillStyle = ratio > 0.5 ? COLORS.hpBar : ratio > 0.25 ? '#c0c040' : COLORS.hpBarDamage;
    ctx.fillRect(barX, barY, barW * ratio, barH);
  }

  // Building progress bars
  if (tile.buildings && tile.buildings.length > 0) {
    const variant = gridVariant(tile.q, tile.r);
    const grid = GRIDS[variant];
    const size = HEX_SIZE * zoom;
    tile.buildings.forEach((b, i) => {
      if (b.progress >= 1) return;
      const offsets = grid[Math.min(tile.buildings.length, 5) - 1] ?? grid[0];
      const [ox, oy] = offsets[i % offsets.length];
      const barW = size * 0.4;
      const barH = 3;
      const barX = px + ox * zoom - barW / 2;
      const barY = py - elev + oy * zoom - size * 0.5;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#40a0ff';
      ctx.fillRect(barX, barY, barW * b.progress, barH);
    });
  }
}
