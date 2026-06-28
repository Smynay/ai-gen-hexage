import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStore';

const containerStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: '#0a0a14',
  color: '#EAE0D0',
  fontFamily: 'monospace',
  zIndex: 100,
};

const titleStyle: React.CSSProperties = {
  fontSize: '3rem', fontWeight: 'bold',
  color: '#c04040', marginBottom: '0.5rem',
  letterSpacing: '0.15em', textShadow: '0 0 20px rgba(192,64,64,0.3)',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '1.1rem', color: '#7a7080', marginBottom: '2rem',
};

const btnStyle: React.CSSProperties = {
  padding: '14px 36px', fontSize: '1.3rem',
  background: '#c04040', color: '#0a0a14',
  border: 'none', cursor: 'pointer',
  fontFamily: 'monospace', fontWeight: 'bold',
  letterSpacing: '0.1em',
  margin: '6px',
};

export default observer(function MainMenu() {
  const { goToStageSelect, startTestLevel } = gameStore;

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>HEXAGE</div>
      <div style={subtitleStyle}>SKYRIM · ВЫЖИВАНИЕ · СТРАТЕГИЯ</div>
      <div style={{ color: '#7a7080', fontSize: '1rem', marginBottom: '1.5rem' }}>
        Займи гексы. Строй. Выживи.
      </div>
      <button style={btnStyle} onClick={goToStageSelect}>
        ▸ НАЧАТЬ КАМПАНИЮ
      </button>
      <button
        onClick={startTestLevel}
        style={{
          padding: '10px 28px', fontSize: '1rem',
          background: 'transparent', color: '#5a7080',
          border: '1px solid #1a2a3e', cursor: 'pointer',
          fontFamily: 'monospace', margin: '6px',
        }}
      >
        ▸ ТЕСТОВЫЙ УРОВЕНЬ
      </button>
      <div style={{ marginTop: '2rem', color: '#3a3040', fontSize: '0.85rem' }}>
        Лор Древних Свитков · Реальное время · 6 этапов
      </div>
    </div>
  );
});
