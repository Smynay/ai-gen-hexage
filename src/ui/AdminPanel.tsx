import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStore';
import { EnemyType, Terrain } from '../types';
import { ENEMIES } from '../data/enemies';

const ALL_TERRAIN: Terrain[] = ['plains', 'forest', 'mountain', 'water', 'snow', 'tundra'];
const ALL_ENEMIES = Object.values(EnemyType);

const panelWrap: React.CSSProperties = {
  position: 'absolute', top: 48, right: 0, width: 380,
  background: 'rgba(10,10,20,0.92)',
  borderLeft: '1px solid #1e1a2e', borderBottom: '1px solid #1e1a2e',
  fontFamily: 'monospace', color: '#EAE0D0', zIndex: 100,
  fontSize: '0.85rem', maxHeight: 'calc(100vh - 60px)',
  overflowY: 'auto', display: 'flex', flexDirection: 'column',
};

const tabBar: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid #1e1a2e',
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '8px 4px', fontSize: '0.8rem',
  background: active ? '#1a1528' : 'transparent',
  color: active ? '#eae0d0' : '#5a5060',
  border: 'none', borderBottom: active ? '2px solid #c04040' : '2px solid transparent',
  cursor: 'pointer', fontFamily: 'monospace',
});

const sectionLabel: React.CSSProperties = {
  color: '#7a7080', fontSize: '0.75rem', letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: 6, marginTop: 8,
};

const inputStyle: React.CSSProperties = {
  width: 70, padding: '4px 6px', background: '#0a0a14',
  border: '1px solid #1e1a2e', color: '#eae0d0',
  fontFamily: 'monospace', fontSize: '0.85rem',
};

const smallBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: '0.8rem',
  background: '#1a1528', color: '#eae0d0',
  border: '1px solid #3a2a50', cursor: 'pointer',
  fontFamily: 'monospace',
};

const enemyColors: Record<string, string> = {
  draugr: '#6a8a7a', bandit: '#c0a060', bandit_marauder: '#c08040',
  forsworn: '#80a060', forsworn_briarheart: '#60a040',
  falmer: '#a080c0', falmer_shadowmaster: '#8060c0',
  dragon_priest: '#c040c0', dragon: '#c04040',
};

export default observer(function AdminPanel() {
  const [tab, setTab] = useState<'resources' | 'terrain' | 'waves' | 'spawn'>('resources');

  const {
    resources, selectedHex, paintTerrain, adminWaves, wave, grid,
    setResource, maxResources, setPaintTerrain, paintTile,
    triggerNextWave, spawnEnemyOnCoord,
    updateAdminWaveEnemy, addAdminWave, removeAdminWave,
    toggleClaimed, setAdminBuildingSlots,
  } = gameStore;

  const [waveAddType, setWaveAddType] = useState<EnemyType>(EnemyType.Draugr);
  const [waveAddCount, setWaveAddCount] = useState(3);
  const [waveAddInterval, setWaveAddInterval] = useState(1.5);
  const [spawnCount, setSpawnCount] = useState(1);
  const [spawnType, setSpawnType] = useState<EnemyType>(EnemyType.Draugr);
  const [slotCount, setSlotCount] = useState(5);

  const tile = selectedHex ? grid?.getHex?.({ q: selectedHex.q, r: selectedHex.r }) : null;

  const handleResourceChange = (type: string, raw: string) => {
    const val = parseInt(raw, 10);
    if (!isNaN(val)) setResource(type, val);
  };

  return (
    <div style={panelWrap}>
      <div style={tabBar}>
        {(['resources', 'terrain', 'waves', 'spawn'] as const).map(t => (
          <button key={t} style={tabBtn(tab === t)} onClick={() => setTab(t)}>
            {t === 'resources' ? 'РЕСУРСЫ' : t === 'terrain' ? 'ТЕРРЕЙН' : t === 'waves' ? 'ВОЛНЫ' : 'СПАВН'}
          </button>
        ))}
      </div>

      <div style={{ padding: '10px 12px', flex: 1, overflowY: 'auto' }}>
        {tab === 'resources' && (
          <div>
            <div style={sectionLabel}>Ресурсы</div>
            {(['septims', 'wood', 'stone', 'food', 'iron'] as const).map(r => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 60, color: '#7a7080' }}>{r.toUpperCase()}</span>
                <input
                  style={inputStyle}
                  type="number"
                  value={Math.floor(resources[r])}
                  onChange={e => handleResourceChange(r, e.target.value)}
                />
              </div>
            ))}
            <button style={{ ...smallBtn, marginTop: 8 }} onClick={maxResources}>
              MAX ALL
            </button>

            {tile && (
              <div style={{ marginTop: 16, borderTop: '1px solid #1e1a2e', paddingTop: 8 }}>
                <div style={sectionLabel}>Гекс ({tile.q},{tile.r})</div>
                <div style={{ fontSize: '0.8rem', color: '#7a7080' }}>
                  {tile.terrain} · {tile.claimedByPlayer ? 'Ваш' : tile.claimed ? 'Занят' : 'Свободен'}
                  · стройка: {(tile.buildings ?? []).length}/{tile.buildingSlots}
                </div>
                {!tile.claimedByPlayer && (
                  <button style={{ ...smallBtn, marginTop: 4 }} onClick={() => toggleClaimed(selectedHex!)}>
                    ЗАХВАТИТЬ (бесплатно)
                  </button>
                )}
                {tile.claimedByPlayer && (
                  <div style={{ marginTop: 4 }}>
                    <input
                      style={{ ...inputStyle, width: 50 }}
                      type="number"
                      value={slotCount}
                      onChange={e => setSlotCount(parseInt(e.target.value, 10) || 1)}
                    />
                    <button
                      style={{ ...smallBtn, marginLeft: 4 }}
                      onClick={() => setAdminBuildingSlots(selectedHex!, slotCount)}
                    >
                      СЛОТЫ
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'terrain' && (
          <div>
            <div style={sectionLabel}>Палитра</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {ALL_TERRAIN.map(t => (
                <button
                  key={t}
                  onClick={() => setPaintTerrain(paintTerrain === t ? null : t)}
                  style={{
                    padding: '8px 14px', fontSize: '0.8rem',
                    background: paintTerrain === t ? '#3a2a50' : '#1a1528',
                    color: paintTerrain === t ? '#eae0d0' : '#7a7080',
                    border: paintTerrain === t ? '1px solid #7a50a0' : '1px solid #1e1a2e',
                    cursor: 'pointer', fontFamily: 'monospace',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            {paintTerrain && (
              <div style={{ color: '#40a0ff', fontSize: '0.8rem' }}>
                Режим покраски: <b>{paintTerrain}</b> (ПКМ по гексу на карте)
              </div>
            )}
            {!paintTerrain && (
              <div style={{ color: '#5a5060', fontSize: '0.8rem' }}>
                Выберите террейн выше, затем ПКМ по гексу
              </div>
            )}

            {tile && (
              <div style={{ marginTop: 12, borderTop: '1px solid #1e1a2e', paddingTop: 8 }}>
                <div style={sectionLabel}>Текущий гекс</div>
                <div style={{ color: '#7a7080', fontSize: '0.8rem' }}>
                  ({tile.q},{tile.r}) — {tile.terrain}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'waves' && (
          <div>
            <div style={sectionLabel}>Волны ({wave.current + 1}/{wave.total})</div>
            {!wave.active && !wave.spawning && (
              <div style={{ color: '#40a0ff', fontSize: '0.8rem', marginBottom: 8 }}>
                До волны: {Math.ceil(wave.timer)}с
              </div>
            )}
            {(wave.spawning || wave.active) && (
              <div style={{ color: '#c04040', fontSize: '0.8rem', marginBottom: 8 }}>
                {wave.spawnQueue.length} в очереди
              </div>
            )}
            <button style={{ ...smallBtn, marginBottom: 8 }} onClick={triggerNextWave}>
              ВЫЗВАТЬ ВОЛНУ СЕЙЧАС
            </button>

            {adminWaves && adminWaves.map((wdef, wi) => (
              <div key={wi} style={{
                border: '1px solid #1e1a2e', padding: 8, marginBottom: 6,
                background: wi === wave.current ? '#1a1528' : undefined,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: wi === wave.current ? '#c04040' : '#7a7080' }}>
                    Волна {wi + 1}
                  </span>
                  <button
                    style={{ ...smallBtn, padding: '2px 8px', fontSize: '0.75rem' }}
                    onClick={() => removeAdminWave(wi)}
                  >
                    ✕
                  </button>
                </div>
                {wdef.enemies.map((eg, ei) => (
                  <div key={ei} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                    <span style={{ color: enemyColors[eg.type] ?? '#7a7080', width: 100, fontSize: '0.78rem' }}>
                      {eg.type.replace('_', ' ')}
                    </span>
                    <input
                      style={{ ...inputStyle, width: 45 }}
                      type="number"
                      value={eg.count}
                      onChange={e => updateAdminWaveEnemy(wi, ei, 'count', parseInt(e.target.value, 10) || 0)}
                    />
                    <span style={{ color: '#5a5060', fontSize: '0.75rem' }}>×</span>
                    <input
                      style={{ ...inputStyle, width: 40 }}
                      type="number"
                      step="0.1"
                      value={eg.interval}
                      onChange={e => updateAdminWaveEnemy(wi, ei, 'interval', parseFloat(e.target.value) || 1)}
                    />
                    <span style={{ color: '#5a5060', fontSize: '0.75rem' }}>с</span>
                  </div>
                ))}
              </div>
            ))}

            <div style={{ borderTop: '1px solid #1e1a2e', paddingTop: 8, marginTop: 8 }}>
              <div style={sectionLabel}>Добавить группу в последнюю волну</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  style={{ ...inputStyle, width: 120 }}
                  value={waveAddType}
                  onChange={e => setWaveAddType(e.target.value as EnemyType)}
                >
                  {ALL_ENEMIES.map(et => (
                    <option key={et} value={et}>{et.replace('_', ' ')}</option>
                  ))}
                </select>
                <input
                  style={{ ...inputStyle, width: 45 }}
                  type="number"
                  value={waveAddCount}
                  onChange={e => setWaveAddCount(parseInt(e.target.value, 10) || 1)}
                />
                <span style={{ color: '#5a5060' }}>×</span>
                <input
                  style={{ ...inputStyle, width: 40 }}
                  type="number"
                  step="0.1"
                  value={waveAddInterval}
                  onChange={e => setWaveAddInterval(parseFloat(e.target.value) || 1)}
                />
                <span style={{ color: '#5a5060' }}>с</span>
                <button
                  style={smallBtn}
                  onClick={() => addAdminWave(waveAddType, waveAddCount, waveAddInterval)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'spawn' && (
          <div>
            <div style={sectionLabel}>Заспавнить врага</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <select
                style={{ ...inputStyle, width: 140 }}
                value={spawnType}
                onChange={e => setSpawnType(e.target.value as EnemyType)}
              >
                {ALL_ENEMIES.map(et => (
                  <option key={et} value={et}>{et.replace('_', ' ')}</option>
                ))}
              </select>
              <input
                style={{ ...inputStyle, width: 50 }}
                type="number"
                min="1"
                max="50"
                value={spawnCount}
                onChange={e => setSpawnCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <span style={{ color: '#5a5060', fontSize: '0.8rem' }}>шт</span>
            </div>

            {selectedHex && tile && (
              <div style={{ marginTop: 4 }}>
                <div style={{ color: '#7a7080', fontSize: '0.8rem', marginBottom: 6 }}>
                  Гекс: ({tile.q},{tile.r}) — {tile.terrain}
                </div>
                <button
                  style={{ ...smallBtn, background: '#3a1a1a', borderColor: '#6a2a2a' }}
                  onClick={() => {
                    for (let i = 0; i < spawnCount; i++) {
                      spawnEnemyOnCoord(selectedHex, spawnType);
                    }
                  }}
                >
                  ЗАСПАВНИТЬ {spawnCount > 1 ? `${spawnCount}× ` : ''}{spawnType.replace('_', ' ')}
                </button>
              </div>
            )}
            {(!selectedHex || !tile) && (
              <div style={{ color: '#5a5060', fontSize: '0.8rem' }}>
                Выберите гекс на карте для спавна
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
