import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStore';
import { STAGES } from '../data/stages';
import ObjectivesPanel from './ObjectivesPanel';

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

const waveBlockStyle: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 2,
};

const HUD = observer(function HUD() {
  const { resources, wave, currentStage, enemies, goals } = gameStore;

  const stage = STAGES[currentStage];
  const stageName = stage?.name ?? '';

  const allWavesDone = wave.current >= wave.total;
  const waveStatus = allWavesDone
    ? enemies.size > 0 ? `\u2694 ОСТАЛОСЬ ${enemies.size}` : 'ЗАЧИСТКА'
    : wave.active
      ? `\u2694 ВРАГИ ${enemies.size}`
      : `${Math.ceil(wave.timer)}с`;

  return (
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

      <div style={waveBlockStyle}>
        <div style={{ color: allWavesDone ? '#40c040' : wave.spawning ? '#c04040' : '#eae0d0', fontWeight: 'bold', fontSize: '0.9rem' }}>
          {allWavesDone ? 'ВСЕ ВОЛНЫ' : `ВОЛНА ${wave.current + 1}/${wave.total}`}
        </div>
        <div style={{ color: wave.spawning ? '#c04040' : '#40a0ff', fontSize: '0.85rem' }}>
          {wave.spawning ? `\u2694 АТАКА! (${wave.spawnQueue.length})` : waveStatus}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div style={{ color: '#7a7080' }}>{stageName}</div>
        {goals.length > 0 && (
          <ObjectivesPanel mode="hud" goals={goals} />
        )}
      </div>
    </div>
  );
});
export default HUD;
