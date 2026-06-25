import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { renderHexGrid } from '../renderer/HexRenderer';
import { GamePhase } from '../types';

const canvasParentStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, overflow: 'hidden',
  cursor: 'grab', background: '#0a0a14',
};

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; origX: number; origY: number }>({
    active: false, sx: 0, sy: 0, origX: 0, origY: 0,
  });
  const lastTickRef = useRef(0);
  const tickAccumRef = useRef(0);

  const gameLoopTick = useGameStore(s => s.gameLoopTick);
  const phase = useGameStore(s => s.phase);
  const adminMode = useGameStore(s => s.adminMode);
  const paintTerrain = useGameStore(s => s.paintTerrain);
  const paintTile = useGameStore(s => s.paintTile);
  const togglePanel = useGameStore(s => s.togglePanel);

  const getHexFromEvent = useCallback((clientX: number, clientY: number) => {
    const state = useGameStore.getState();
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const cx = state.cameraX;
    const cy = state.cameraY;
    const zoom = state.cameraZoom;
    const wx = (px - canvas.width / 2 + cx) / zoom;
    const wy = (py - canvas.height / 2 + cy) / zoom;
    const tile = state.grid.pointToHex?.({ x: wx, y: wy });
    return tile ? { q: tile.q, r: tile.r } : null;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    if (phase !== GamePhase.Playing) return;

    lastTickRef.current = performance.now();
    tickAccumRef.current = 0;

    const loop = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      tickAccumRef.current += dt;

      while (tickAccumRef.current >= 100) {
        gameLoopTick();
        tickAccumRef.current -= 100;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const state = useGameStore.getState();
          renderHexGrid(ctx, state, canvas.width, canvas.height);
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, gameLoopTick]);

  // Keyboard: ~ toggles admin panel
  useEffect(() => {
    if (!adminMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [adminMode, togglePanel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 && adminMode && paintTerrain) {
      const coord = getHexFromEvent(e.clientX, e.clientY);
      if (coord) {
        paintTile(coord, paintTerrain);
      }
      return;
    }
    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, origX: e.clientX, origY: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (drag.active) {
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      useGameStore.getState().panCamera(-dx, -dy);
      drag.sx = e.clientX;
      drag.sy = e.clientY;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;

    const totalDx = Math.abs(e.clientX - drag.origX);
    const totalDy = Math.abs(e.clientY - drag.origY);
    if (totalDx < 5 && totalDy < 5) {
      const coord = getHexFromEvent(e.clientX, e.clientY);
      if (coord) {
        useGameStore.getState().selectHex(coord);
      } else {
        useGameStore.getState().selectHex(null);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const dz = e.deltaY > 0 ? -0.1 : 0.1;
    useGameStore.getState().zoomCamera(dz);
  };

  return (
    <div style={{
      ...canvasParentStyle,
      cursor: adminMode && paintTerrain ? 'crosshair' : 'grab',
    }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={e => {
        if (adminMode && paintTerrain) {
          e.preventDefault();
        }
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
