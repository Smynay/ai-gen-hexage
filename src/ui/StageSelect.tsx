import { useGameStore } from '../store/gameStore';
import { STAGES } from '../data/stages';
import { GamePhase } from '../types';

const containerStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', padding: '48px 24px',
  background: '#0a0a14', color: '#EAE0D0',
  fontFamily: 'monospace', overflow: 'auto',
  zIndex: 100,
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.8rem', fontWeight: 'bold', color: '#c04040',
  letterSpacing: '0.1em', marginBottom: '1.5rem',
};

const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '14px', maxWidth: '960px', width: '100%',
};

const cardStyle: React.CSSProperties = {
  padding: '20px', border: '1px solid #1e1a2e',
  cursor: 'pointer', transition: 'border-color 0.2s',
  background: '#120e1a',
};

const lockedStyle: React.CSSProperties = {
  ...cardStyle,
  opacity: 0.4, cursor: 'not-allowed',
};

const backBtnStyle: React.CSSProperties = {
  marginTop: '24px', padding: '12px 28px',
  background: 'transparent', color: '#7a7080',
  border: '1px solid #1e1a2e', cursor: 'pointer',
  fontFamily: 'monospace', fontSize: '1rem',
};

const waveDot = (active: boolean): React.CSSProperties => ({
  display: 'inline-block', width: 8, height: 8,
  borderRadius: '50%', background: active ? '#c04040' : '#2a1a20',
  marginRight: 3,
});

export default function StageSelect() {
  const startStage = useGameStore(s => s.startStage);
  const goToMenu = useGameStore(s => s.goToMenu);
  const completedStages = useGameStore(s => s.completedStages) ?? [1];

  const isUnlocked = (id: number) => completedStages.includes(id) || id === 1;

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>ВЫБОР ЭТАПА</div>
      <div style={gridStyle}>
        {STAGES.map((stage) => {
          const unlocked = isUnlocked(stage.id);
          return (
            <div
              key={stage.id}
              style={unlocked ? cardStyle : lockedStyle}
              onClick={() => unlocked && startStage(stage.id - 1)}
              onMouseEnter={(e) => {
                if (unlocked) e.currentTarget.style.borderColor = '#c04040';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1e1a2e';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#c04040', fontWeight: 'bold' }}>
                  ЭТАП {stage.id}
                </span>
                {!unlocked && <span style={{ color: '#5a4050' }}>🔒</span>}
                {completedStages.includes(stage.id) && (
                  <span style={{ color: '#40c040' }}>✔</span>
                )}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: 8 }}>
                {stage.name}
              </div>
              <div style={{ fontSize: '1rem', color: '#7a7080', marginBottom: 12 }}>
                {stage.description}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#5a5060' }}>
                {stage.waves.length} волн · {stage.waves.reduce((s, w) =>
                  s + w.enemies.reduce((a, e) => a + e.count, 0), 0)} врагов
              </div>
            </div>
          );
        })}
      </div>
      <button style={backBtnStyle} onClick={goToMenu}>
        ← НАЗАД
      </button>
    </div>
  );
}
