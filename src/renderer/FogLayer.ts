import type { IHexTile } from '../types';
import { CONFIG } from '../config';

const COLORS = CONFIG.colors;
let fogCanvas: HTMLCanvasElement | undefined;

export function renderFog(
  ctx: CanvasRenderingContext2D,
  claimedTiles: { tile: IHexTile; px: number; py: number }[],
  width: number,
  height: number,
  zoom: number,
): void {
  if (!fogCanvas || fogCanvas.width !== width || fogCanvas.height !== height) {
    fogCanvas = document.createElement('canvas');
    fogCanvas.width = width;
    fogCanvas.height = height;
  }
  const fctx = fogCanvas.getContext('2d')!;
  fctx.clearRect(0, 0, width, height);
  fctx.fillStyle = COLORS.fog;
  fctx.fillRect(0, 0, width, height);

  fctx.globalCompositeOperation = 'destination-out';

  const numSteps = 20;
  const maxScale = 2.0;

  for (const { tile, px, py } of claimedTiles) {
    const ox: number[] = [];
    const oy: number[] = [];
    for (let i = 0; i < 6; i++) {
      ox.push((tile.corners[i].x - tile.x) * zoom);
      oy.push((tile.corners[i].y - tile.y) * zoom);
    }

    for (let step = numSteps - 1; step >= 0; step--) {
      const scale = 1.0 + (step / (numSteps - 1)) * (maxScale - 1.0);
      fctx.beginPath();
      for (let i = 0; i < 6; i++) {
        if (i === 0) fctx.moveTo(px + ox[i] * scale, py + oy[i] * scale);
        else fctx.lineTo(px + ox[i] * scale, py + oy[i] * scale);
      }
      fctx.closePath();
      fctx.fillStyle = 'rgba(255,255,255,0.12)';
      fctx.fill();
    }

    fctx.beginPath();
    for (let i = 0; i < 6; i++) {
      if (i === 0) fctx.moveTo(px + ox[i], py + oy[i]);
      else fctx.lineTo(px + ox[i], py + oy[i]);
    }
    fctx.closePath();
    fctx.fillStyle = 'rgba(255,255,255,1)';
    fctx.fill();
  }
  fctx.globalCompositeOperation = 'source-over';

  ctx.drawImage(fogCanvas, 0, 0);
}
