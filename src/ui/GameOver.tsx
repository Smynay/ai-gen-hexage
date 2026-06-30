import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStore';
import { STAGES } from '../data/stages';
import ObjectivesPanel from './ObjectivesPanel';

const overlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: 'rgba(10,10,20,0.92)',
  color: '#EAE0D0', fontFamily: 'monospace',
  zIndex: 200,
};

const GameOverScreen = observer(function GameOverScreen() {
  const { stageResult, goToMenu, goToStageSelect, currentStage, startStage, goals } = gameStore;

  const victory = stageResult === 'victory';

  return (
    <div style={overlayStyle}>
      <div style={{
        fontSize: '2.2rem', fontWeight: 'bold',
        color: victory ? '#40c040' : '#c04040',
        marginBottom: '1rem',
        letterSpacing: '0.15em',
      }}>
        {victory ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
      </div>
      <div style={{ color: '#7a7080', fontSize: '1rem', marginBottom: '1.5rem' }}>
        {victory
          ? 'Этап пройден! Цивилизация выжила.'
          : 'Все гексы потеряны. Цивилизация пала.'}
      </div>
      {goals.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ObjectivesPanel mode="game_over" goals={goals} />
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px' }}>
        {victory && currentStage < STAGES.length - 1 && (
          <button
            onClick={() => startStage(currentStage + 1)}
            style={{
              padding: '12px 28px', fontSize: '1.15rem',
              background: '#40c040', color: '#0a0a14',
              border: 'none', cursor: 'pointer',
              fontFamily: 'monospace', fontWeight: 'bold',
            }}
          >
            ▸ СЛЕДУЮЩИЙ ЭТАП
          </button>
        )}
        <button
          onClick={() => startStage(currentStage)}
          style={{
            padding: '12px 28px', fontSize: '1.15rem',
            background: '#c04040', color: '#0a0a14',
            border: 'none', cursor: 'pointer',
            fontFamily: 'monospace', fontWeight: 'bold',
          }}
        >
          ▸ ЗАНОВО
        </button>
        <button
          onClick={goToStageSelect}
          style={{
            padding: '12px 28px', fontSize: '1.15rem',
            background: 'transparent', color: '#7a7080',
            border: '1px solid #1e1a2e', cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          К ЭТАПАМ
        </button>
        <button
          onClick={goToMenu}
          style={{
            padding: '12px 28px', fontSize: '1.15rem',
            background: 'transparent', color: '#5a4050',
            border: '1px solid #1a1528', cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          МЕНЮ
        </button>
      </div>
    </div>
  );
});
export default GameOverScreen;
