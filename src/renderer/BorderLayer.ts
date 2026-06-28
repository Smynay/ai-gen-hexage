import type { IHexTile } from '../types';

let borderCanvas: HTMLCanvasElement | undefined;

export function renderBorders(
  ctx: CanvasRenderingContext2D,
  claimedTiles: { tile: IHexTile; px: number; py: number }[],
  claimedSet: Set<string>,
  width: number,
  height: number,
  zoom: number,
): void {
  if (!borderCanvas || borderCanvas.width !== width || borderCanvas.height !== height) {
    borderCanvas = document.createElement('canvas');
    borderCanvas.width = width;
    borderCanvas.height = height;
  }
  const bctx = borderCanvas.getContext('2d')!;
  bctx.clearRect(0, 0, width, height);

  const axialNeighbors: [number, number][] = [
    [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1],
  ];

  for (const { tile, px, py } of claimedTiles) {
    const ox: number[] = [];
    const oy: number[] = [];
    for (let i = 0; i < 6; i++) {
      ox.push((tile.corners[i].x - tile.x) * zoom);
      oy.push((tile.corners[i].y - tile.y) * zoom);
    }

    bctx.lineWidth = 3 * zoom;
    bctx.strokeStyle = 'rgba(122,207,90,0.35)';
    bctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const [dq, dr] = axialNeighbors[i];
      if (claimedSet.has(`${tile.q + dq},${tile.r + dr}`)) continue;
      const next = (i + 1) % 6;
      bctx.beginPath();
      bctx.moveTo(px + ox[i], py + oy[i]);
      bctx.lineTo(px + ox[next], py + oy[next]);
      bctx.stroke();
    }

    bctx.lineWidth = 1.5 * zoom;
    bctx.strokeStyle = 'rgba(170,255,130,0.55)';
    for (let i = 0; i < 6; i++) {
      const [dq, dr] = axialNeighbors[i];
      if (claimedSet.has(`${tile.q + dq},${tile.r + dr}`)) continue;
      const next = (i + 1) % 6;
      bctx.beginPath();
      bctx.moveTo(px + ox[i], py + oy[i]);
      bctx.lineTo(px + ox[next], py + oy[next]);
      bctx.stroke();
    }
  }

  ctx.drawImage(borderCanvas, 0, 0);
}
