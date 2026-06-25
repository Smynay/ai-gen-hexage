import { useGameStore } from '../store/gameStore';
import { STAGES } from '../data/stages';

const hudStyle: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0,
  display: 'flex', justifyContent: 'space-between',
  padding: '10px 16px', background: 'rgba(10,10,20,0.85)',
  fontFamily: 'monospace', fontSize: '1rem',
  color: '#EAE0D0', zIndex: 50,
  pointerEvents: 'none', userSelect: 'none',
};

const resStyle: React.CSSProperties = {
  display: 'flex', gap: '14px', alignItems: 'center',
};

const labelStyle: React.CSSProperties = {
  color: '#5a5060', fontSize: '0.85rem',
  marginRight: 2,
};

const waveStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)',
  color: '#c04040', fontSize: '1.8rem',
  fontWeight: 'bold', fontFamily: 'monospace',
  textShadow: '0 0 20px rgba(192,64,64,0.5)',
  pointerEvents: 'none', zIndex: 60,
};

export default function HUD() {
  const resources = useGameStore(s => s.resources);
  const wave = useGameStore(s => s.wave);
  const waveTimer = useGameStore(s => s.wave.timer);
  const currentStage = useGameStore(s => s.currentStage);

  const stage = STAGES[currentStage];
  const stageName = stage?.name ?? '';

  return (
    <>
      <div style={hudStyle}>
        <div style={resStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ffd700' }}>
            <span style={labelStyle}>G</span>
            <span>{Math.floor(resources.septims)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8b6f47' }}>
            <span style={labelStyle}>W</span>
            <span>{Math.floor(resources.wood)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#7a7a7a' }}>
            <span style={labelStyle}>S</span>
            <span>{Math.floor(resources.stone)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#a0c040' }}>
            <span style={labelStyle}>F</span>
            <span>{Math.floor(resources.food)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#c4a44a' }}>
            <span style={labelStyle}>I</span>
            <span>{Math.floor(resources.iron)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: '#7a7080' }}>{stageName}</span>
          <span style={{ color: '#5a5060' }}>
            ВОЛНА {wave.current + 1}/{wave.total}
          </span>
          {!wave.active && !wave.spawning && (
            <span style={{ color: '#40a0ff' }}>
              {Math.ceil(waveTimer)}с
            </span>
          )}
          {wave.spawning && (
            <span style={{ color: '#c04040' }}>
              АТАКА!
            </span>
          )}
        </div>
      </div>
      {wave.spawning && (
        <div style={waveStyle}>
          ⚔ ВРАГИ НАСТУПАЮТ ⚔
        </div>
      )}
    </>
  );
}
