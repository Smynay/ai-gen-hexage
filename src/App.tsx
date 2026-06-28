import { observer } from 'mobx-react-lite';
import { GamePhase } from './types';
import { gameStore } from './store/gameStore';
import { adminStore } from './store/adminStore';
import MainMenu from './ui/MainMenu';
import StageSelect from './ui/StageSelect';
import GameCanvas from './ui/GameCanvas';
import HUD from './ui/HUD';
import HexPanel from './ui/HexPanel';
import TechPanel from './ui/TechPanel';
import GameOverScreen from './ui/GameOver';
import AdminPanel from './ui/AdminPanel';

const appStyle: React.CSSProperties = {
  width: '100vw', height: '100vh', position: 'relative',
  overflow: 'hidden', background: '#0a0a14',
};

export default observer(function App() {
  const { phase, openPanel } = gameStore;
  const { adminMode } = adminStore;

  return (
    <div style={appStyle}>
      {phase === GamePhase.Menu && <MainMenu />}
      {phase === GamePhase.StageSelect && <StageSelect />}
      {(phase === GamePhase.Playing || phase === GamePhase.Victory || phase === GamePhase.Defeat) && (
        <>
          <GameCanvas />
          <HUD />
          <HexPanel />
          {openPanel === 'tech' && <TechPanel />}
          {adminMode && openPanel === 'admin' && <AdminPanel />}
        </>
      )}
      {phase === GamePhase.Victory && <GameOverScreen />}
      {phase === GamePhase.Defeat && <GameOverScreen />}
    </div>
  );
});
