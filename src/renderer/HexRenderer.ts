import type { GameState, IHexTile } from '../types';
import { GamePhase } from '../types';
import { drawHexBase, TERRAIN_ELEVATION } from './TerrainLayer';
import { drawBuildingsOnTile } from './BuildingLayer';
import { drawOverlays } from './OverlayLayer';
import { renderFog } from './FogLayer';
import { renderBorders } from './BorderLayer';

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

  const tiles: { tile: IHexTile; px: number; py: number }[] = [];
  const claimedTiles: { tile: IHexTile; px: number; py: number }[] = [];
  const claimedSet = new Set<string>();

  state.grid.forEach((tile) => {
    if (tile.claimedByPlayer) claimedSet.add(`${tile.q},${tile.r}`);
    if (!tile.revealed) return;
    const px = tile.x * zoom + cx;
    const py = tile.y * zoom + cy;
    tiles.push({ tile, px, py });
    if (tile.claimedByPlayer) {
      claimedTiles.push({ tile, px, py });
    }
  });

  tiles.sort((a, b) => (a.py + TERRAIN_ELEVATION[a.tile.terrain]) - (b.py + TERRAIN_ELEVATION[b.tile.terrain]));

  for (const { tile, px, py } of tiles) {
    const elev = drawHexBase(ctx, tile, px, py, zoom);
    drawBuildingsOnTile(ctx, tile, px, py, elev, zoom);
    drawOverlays(ctx, tile, px, py, elev, zoom, state);
  }

  renderBorders(ctx, claimedTiles, claimedSet, width, height, zoom);
  renderFog(ctx, claimedTiles, width, height, zoom);
}
