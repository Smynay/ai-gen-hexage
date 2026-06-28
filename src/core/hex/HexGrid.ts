import type { HexCoord, IHexGrid, IHexTile } from '../../types';

export type { HexCoord } from '../../types';

export function hexEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function coordKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

// Pointy-top hex directions (NE, E, SE, SW, W, NW)
const POINTY_DIRS = [0, 1, 2, 3, 4, 5] as const;

export function hexNeighbors(grid: IHexGrid, coord: HexCoord): IHexTile[] {
  const result: IHexTile[] = [];
  for (const dir of POINTY_DIRS) {
    const nb = grid.neighborOf(coord, dir);
    if (nb) result.push(nb);
  }
  return result;
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

export function hexesInRadius(center: HexCoord, radius: number): HexCoord[] {
  const result: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      result.push({ q: center.q + q, r: center.r + r });
    }
  }
  return result;
}

export function findPath(
  grid: IHexGrid,
  from: HexCoord,
  to: HexCoord,
): HexCoord[] | null {
  if (hexEqual(from, to)) return [from];
  const visited = new Set<string>();
  const parent = new Map<string, HexCoord | null>();
  const queue: HexCoord[] = [from];
  visited.add(coordKey(from));
  parent.set(coordKey(from), null);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (hexEqual(cur, to)) {
      const path: HexCoord[] = [];
      let node: HexCoord | null = cur;
      while (node) {
        path.unshift(node);
        node = parent.get(coordKey(node)) ?? null;
      }
      return path;
    }
    for (const dir of POINTY_DIRS) {
      const nb = grid.neighborOf(cur, dir);
      if (nb && !visited.has(coordKey(nb))) {
        visited.add(coordKey(nb));
        parent.set(coordKey(nb), cur);
        queue.push(nb);
      }
    }
  }
  return null;
}
