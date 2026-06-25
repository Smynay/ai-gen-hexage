import { useGameStore } from '../store/gameStore';
import { TECHS } from '../data/techs';

const panelStyle: React.CSSProperties = {
  position: 'absolute', top: 48, right: 0,
  background: 'rgba(10,10,20,0.9)',
  borderLeft: '1px solid #1e1a2e',
  padding: '12px 14px', fontFamily: 'monospace',
  color: '#EAE0D0', zIndex: 50,
  width: 240, maxHeight: '60vh', overflow: 'auto',
};

const sectionTitle: React.CSSProperties = {
  color: '#7a7080', fontSize: '0.85rem',
  letterSpacing: '0.1em', marginBottom: 8,
};

const techBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'block', width: '100%', padding: '8px 12px',
  marginBottom: 6, fontSize: '0.85rem',
  background: active ? '#1a1528' : '#0a0a14',
  color: active ? '#eae0d0' : '#3a3040',
  border: '1px solid', borderColor: active ? '#3a2a50' : '#1a1528',
  cursor: active ? 'pointer' : 'not-allowed',
  fontFamily: 'monospace', textAlign: 'left' as const,
});

export default function TechPanel() {
  const techs = useGameStore(s => s.techs);
  const research = useGameStore(s => s.research);
  const canResearchTech = useGameStore(s => s.canResearchTech);

  if (!techs || techs.length === 0) return null;

  return (
    <div style={panelStyle}>
      <div style={sectionTitle}>Исследования</div>
      {techs.map(ts => {
        const tech = TECHS[ts.id];
        if (!tech) return null;
        const can = canResearchTech(ts.id) && !ts.researched && !ts.inProgress;
        return (
          <div key={ts.id}>
            <button
              style={techBtnStyle(can || ts.inProgress)}
              onClick={() => can && research(ts.id)}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
                {ts.researched ? '✔ ' : ts.inProgress ? '⏳ ' : ''}
                {tech.name}
              </div>
              <div style={{ color: '#5a5060', fontSize: '0.75rem' }}>
                {ts.inProgress
                  ? `${Math.floor(ts.progress / tech.researchTime * 100)}%`
                  : ts.researched
                    ? 'Изучено'
                    : tech.description
                }
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
