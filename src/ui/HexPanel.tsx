import { useGameStore } from '../store/gameStore';
import { BuildingType } from '../types';
import { BUILDINGS } from '../data/buildings';
import { STAGES } from '../data/stages';
import { CONFIG } from '../config';

const panelStyle: React.CSSProperties = {
  position: 'absolute', bottom: 0, left: 0, right: 0,
  background: 'rgba(10,10,20,0.9)',
  borderTop: '1px solid #1e1a2e',
  padding: '14px 20px', fontFamily: 'monospace',
  color: '#EAE0D0', zIndex: 50,
  display: 'flex', gap: '16px', flexWrap: 'wrap',
  alignItems: 'flex-start',
};

const sectionTitle: React.CSSProperties = {
  color: '#7a7080', fontSize: '0.85rem',
  letterSpacing: '0.1em', marginBottom: 8,
  textTransform: 'uppercase',
};

const claimBtnStyle: React.CSSProperties = {
  padding: '8px 20px', fontSize: '1rem',
  background: '#2a4a2a', color: '#8ab87a',
  border: '1px solid #3a6a3a', cursor: 'pointer',
  fontFamily: 'monospace', fontWeight: 'bold',
};

function buildBtnStyle(state: 'full' | 'locked' | 'noterrain'): React.CSSProperties {
  const opacity = state === 'full' ? 1 : state === 'locked' ? 0.5 : 0.25;
  return {
    padding: '8px 14px', fontSize: '0.9rem',
    background: state === 'full' ? '#1a1528' : '#0a0a14',
    color: state === 'full' ? '#eae0d0' : '#3a3040',
    border: '1px solid',
    borderColor: state === 'full' ? '#3a2a50' : '#1a1528',
    cursor: state === 'full' ? 'pointer' : 'not-allowed',
    opacity,
    fontFamily: 'monospace', textAlign: 'left' as const,
    display: 'flex', flexDirection: 'column' as const,
    gap: 3,
    transition: 'opacity 0.15s',
  };
}

function progressBar(): React.CSSProperties {
  return {
    height: 4, background: '#333', borderRadius: 2, marginTop: 3, overflow: 'hidden',
  };
}

function progressFill(pct: number): React.CSSProperties {
  return {
    width: `${pct}%`, height: '100%', background: '#40a0ff', borderRadius: 2,
  };
}

function canAfford(resources: any, def: any): boolean {
  return (
    resources.septims >= def.cost.septims &&
    resources.wood >= def.cost.wood &&
    resources.stone >= def.cost.stone &&
    resources.food >= def.cost.food &&
    resources.iron >= def.cost.iron
  );
}

export default function HexPanel() {
  const selectedHex = useGameStore(s => s.selectedHex);
  const claimSelected = useGameStore(s => s.claimSelected);
  const buildOnSelected = useGameStore(s => s.buildOnSelected);
  const selectHex = useGameStore(s => s.selectHex);
  const canClaimAny = useGameStore(s => s.canClaimAny);
  const unclaimedNeighbors = useGameStore(s => s.unclaimedNeighbors);
  const currentStage = useGameStore(s => s.currentStage);
  const grid = useGameStore(s => s.grid);
  const resources = useGameStore(s => s.resources);

  const stageDef = STAGES[currentStage];
  const unlockedBuildings = stageDef?.unlockedBuildings ?? Object.values(BuildingType) as BuildingType[];

  const tile = selectedHex ? grid?.getHex?.({ q: selectedHex.q, r: selectedHex.r }) : null;

  if (!tile) {
    if (!canClaimAny()) return null;
    const neighbors = unclaimedNeighbors();
    if (neighbors.length === 0) return null;
    return (
      <div style={panelStyle}>
        <div>
          <div style={sectionTitle}>Доступные для захвата</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {neighbors.slice(0, 8).map((c, i) => (
              <button key={i} style={claimBtnStyle} onClick={() => selectHex(c)}>
                {c.q},{c.r}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const buildingCount = (tile.buildings ?? []).length;
  const slots = tile.buildingSlots ?? CONFIG.buildingSlots.max;
  const hasSlots = buildingCount < slots;

  return (
    <div style={panelStyle}>
      <div>
        <div style={sectionTitle}>Гекс ({tile.q}, {tile.r})</div>
        <div style={{ fontSize: '0.9rem' }}>
          <div>Тип: <span style={{ color: '#7a7080' }}>{tile.terrain}</span></div>
          <div>Статус: <span style={{ color: tile.claimedByPlayer ? '#8ab87a' : '#5a4050' }}>
            {tile.claimedByPlayer ? 'Ваш' : tile.claimed ? 'Занят' : 'Свободен'}
          </span></div>
      {tile.claimedByPlayer && hasSlots && (
            <div>
              Постройки: <span style={{ color: '#d4a050' }}>{buildingCount}/{slots}</span>
            </div>
          )}
        </div>

        {tile.claimedByPlayer && buildingCount > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(tile.buildings ?? []).map((b: any, i: number) => {
              const def = BUILDINGS[b.type as BuildingType];
              return (
                <div key={i} style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: '#d4a050' }}>{def?.name ?? b.type}</span>
                  {b.progress < 1 && (
                    <div style={progressBar()}>
                      <div style={progressFill(b.progress * 100)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {tile.claimedByPlayer && hasSlots && (
        <div>
          <div style={sectionTitle}>Построить ({slots - buildingCount} слотов)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {unlockedBuildings.map((bt: BuildingType) => {
              const def = BUILDINGS[bt];
              const terrainOk = def.allowedTerrain?.includes(tile.terrain) ?? true;
              const affordable = terrainOk && canAfford(resources, def);
              let state: 'full' | 'locked' | 'noterrain';
              if (terrainOk && affordable) {
                state = 'full';
              } else if (terrainOk && !affordable) {
                state = 'locked';
              } else {
                state = 'noterrain';
              }
              return (
                <button
                  key={bt}
                  style={buildBtnStyle(state)}
                  onClick={() => state === 'full' && buildOnSelected(bt)}
                  title={`${def.name}: ${def.description}`}
                >
                  <span style={{ fontWeight: 'bold' }}>{def.name}</span>
                  <span style={{ color: affordable ? '#5a5060' : '#3a3040', fontSize: '0.8rem' }}>
                    {def.cost.septims > 0 ? `G${def.cost.septims} ` : ''}
                    {def.cost.wood > 0 ? `W${def.cost.wood} ` : ''}
                    {def.cost.stone > 0 ? `S${def.cost.stone} ` : ''}
                    {def.cost.food > 0 ? `F${def.cost.food} ` : ''}
                    {def.cost.iron > 0 ? `I${def.cost.iron}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!tile.claimedByPlayer && !tile.claimed && (
        <button style={claimBtnStyle} onClick={claimSelected}>
          ▸ ЗАХВАТИТЬ (5G, 3W, 2F)
        </button>
      )}
    </div>
  );
}
