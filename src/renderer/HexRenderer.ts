import type { GameState } from '../types';
import { GamePhase, BuildingType, Terrain } from '../types';
import { CONFIG } from '../config';

const COLORS = CONFIG.colors;

const GRIDS: [number, number][][][] = [
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

function gridVariant(q: number, r: number): number {
  return Math.abs(q * 17 + r * 31) % GRIDS.length;
}

function terrainColor(terrain: Terrain, claimed: boolean): string {
  if (claimed) return COLORS.claimedPlayer;
  switch (terrain) {
    case Terrain.Plains: return COLORS.plains;
    case Terrain.Forest: return COLORS.forest;
    case Terrain.Mountain: return COLORS.mountain;
    case Terrain.Water: return COLORS.water;
    case Terrain.Snow: return COLORS.snow;
    case Terrain.Tundra: return COLORS.tundra;
  }
}

function terrainElevation(terrain: Terrain): number {
  switch (terrain) {
    case Terrain.Mountain: return 8;
    case Terrain.Forest: return 3;
    case Terrain.Snow: return 5;
    case Terrain.Plains: return 0;
    case Terrain.Tundra: return 1;
    case Terrain.Water: return -2;
  }
}

function fogDirection(tile: any, claimedSet: Set<string>): { dx: number; dy: number } | null {
  const dirs: [number, number, number, number][] = [
    [1, 0, Math.sqrt(3), 0],
    [1, -1, Math.sqrt(3) / 2, -1.5],
    [0, -1, -Math.sqrt(3) / 2, -1.5],
    [-1, 0, -Math.sqrt(3), 0],
    [-1, 1, -Math.sqrt(3) / 2, 1.5],
    [0, 1, Math.sqrt(3) / 2, 1.5],
  ];
  let ax = 0, ay = 0;
  let count = 0;
  for (const [dq, dr, pdx, pdy] of dirs) {
    if (claimedSet.has(`${tile.q + dq},${tile.r + dr}`)) {
      ax += pdx;
      ay += pdy;
      count++;
    }
  }
  if (count === 0) return null;
  return { dx: ax / count, dy: ay / count };
}

export function renderHexGrid(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
): void {
  if (state.phase !== GamePhase.Playing && state.phase !== GamePhase.Victory && state.phase !== GamePhase.Defeat) return;

  const cx = width / 2 - state.cameraX;
  const cy = height / 2 - state.cameraY;
  const zoom = state.cameraZoom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, width, height);

  const tiles: { tile: any; px: number; py: number }[] = [];

  const claimedSet = new Set<string>();
  state.grid.forEach((t: any) => {
    if (t.claimedByPlayer) claimedSet.add(`${t.q},${t.r}`);
  });

  (state.grid as any).forEach((tile: any) => {
    const px = tile.x * zoom + cx;
    const py = tile.y * zoom + cy;
    tiles.push({ tile, px, py });
  });

  tiles.sort((a, b) => (a.py + terrainElevation(a.tile.terrain)) - (b.py + terrainElevation(b.tile.terrain)));

  for (const { tile, px, py } of tiles) {
    const fogDir = fogDirection(tile, claimedSet);
    drawHexTile(ctx, tile, px, py, zoom, state, fogDir);
  }
}

function drawHexTile(
  ctx: CanvasRenderingContext2D,
  tile: any,
  px: number,
  py: number,
  zoom: number,
  state: GameState,
  fogDir: { dx: number; dy: number } | null,
): void {
  const elev = terrainElevation(tile.terrain) * zoom;
  const corners = tile.corners.map((c: any) => ({
    x: c.x * zoom + (px - tile.x * zoom),
    y: c.y * zoom + (py - tile.y * zoom),
  }));

  // Bottom face (isometric depth)
  if (elev > 0) {
    const bottomCorners = corners.map((c: any) => ({ x: c.x, y: c.y + elev }));
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

  const color = terrainColor(tile.terrain, tile.claimedByPlayer);
  ctx.fillStyle = tile.revealed ? color : COLORS.fog;
  ctx.fill();

  if (tile.revealed) {
    ctx.strokeStyle = tile.claimedByPlayer ? COLORS.hexBorderClaimed : COLORS.hexBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Fog gradient for adjacent-to-claimed hexes
  if (!tile.claimedByPlayer && fogDir) {
    const size = 40 * zoom;
    const len = Math.sqrt(fogDir.dx * fogDir.dx + fogDir.dy * fogDir.dy);
    if (len > 0) {
      const nx = fogDir.dx / len;
      const ny = fogDir.dy / len;
      const grad = ctx.createLinearGradient(
        px - nx * size, py - ny * size,
        px + nx * size, py + ny * size,
      );
      grad.addColorStop(0, 'rgba(10,10,20,1.0)');
      grad.addColorStop(0.3, 'rgba(10,10,20,1.0)');
      grad.addColorStop(0.4, 'rgba(10,10,20,0.9)');
      grad.addColorStop(0.5, 'rgba(10,10,20,0.7)');
      grad.addColorStop(0.6, 'rgba(10,10,20,0.2)');
      grad.addColorStop(0.7, 'rgba(10,10,20,0)');
      grad.addColorStop(1, 'rgba(10,10,20,0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  // Highlight selected
  if (state.selectedHex && state.selectedHex.q === tile.q && state.selectedHex.r === tile.r) {
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // Buildings
  if (tile.buildings && tile.buildings.length > 0 && tile.revealed) {
    const variant = gridVariant(tile.q, tile.r);
    const grid = GRIDS[variant];
    const sorted = [...tile.buildings].sort((a, b) => (b.progress < 1 ? 1 : 0) - (a.progress < 1 ? 1 : 0));
    sorted.forEach((b: any, i: number) => {
      const offsets = grid[Math.min(sorted.length, 5) - 1] ?? grid[0];
      const [ox, oy] = offsets[i % offsets.length];
      const bx = px + ox * zoom;
      const by = py - elev + oy * zoom;
      drawBuilding(ctx, bx, by, zoom, b.type, b.progress);
    });
  }

  // Enemies
  if (tile.claimedByPlayer && tile.enemyUnits.length > 0) {
    const count = tile.enemyUnits.length;
    const size = 40 * zoom;
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
    const size = 40 * zoom;
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
    const size = 40 * zoom;
    tile.buildings.forEach((b: any, i: number) => {
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

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  zoom: number,
  type: BuildingType,
  progress: number,
): void {
  const bs = 40 * zoom * 0.4;

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
