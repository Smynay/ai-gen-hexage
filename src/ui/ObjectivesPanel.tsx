import { observer } from 'mobx-react-lite';
import type { StageGoal } from '../types';
import { CONFIG } from '../config';

export type ObjectivesPanelMode = 'hud' | 'stage_select' | 'game_over';

type ObjectivesPanelProps = {
  goals: StageGoal[];
  mode: ObjectivesPanelMode;
  locked?: boolean;
};

const { labels, icons, colors } = CONFIG.objectives;

const icon = (type: StageGoal['type']) => icons[type] ?? '';
const label = (type: StageGoal['type']) => labels[type] ?? type;

const hudContainerStyle: React.CSSProperties = {
  display: 'flex', gap: '10px', fontSize: '0.78rem',
};

const hudGoalStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 3,
};

const selectContainerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
};

const selectGoalStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem',
};

const overContainerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8,
  alignItems: 'center',
};

const overGoalStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem',
};

const ObjectivesPanel = observer(function ObjectivesPanel({ goals, mode, locked }: ObjectivesPanelProps) {
  if (mode === 'hud') {
    return (
      <div style={hudContainerStyle}>
        {goals.map(goal => {
          const done = goal.count >= goal.target;
          return (
            <span
              key={goal.type}
              style={{
                ...hudGoalStyle,
                color: done ? colors.completed : colors.incomplete,
                textDecoration: done ? 'line-through' : 'none',
              }}
            >
              <span>{icon(goal.type)}</span>
              <span>{goal.count}/{goal.target}</span>
              {done && <span style={{ color: colors.completed }}>✅</span>}
            </span>
          );
        })}
      </div>
    );
  }

  if (mode === 'stage_select') {
    return (
      <div style={selectContainerStyle}>
        {goals.map(goal => (
          <span
            key={goal.type}
            style={{
              ...selectGoalStyle,
              color: locked ? colors.locked : colors.incomplete,
            }}
          >
            <span>{icon(goal.type)}</span>
            <span>{label(goal.type)}</span>
            <span style={{ opacity: 0.7 }}>{goal.target}</span>
          </span>
        ))}
      </div>
    );
  }

  // game_over mode
  return (
    <div style={overContainerStyle}>
      {goals.map(goal => {
        const done = goal.count >= goal.target;
        return (
          <span
            key={goal.type}
            style={{
              ...overGoalStyle,
              color: done ? colors.completed : colors.failed,
            }}
          >
            <span>{icon(goal.type)}</span>
            <span>{label(goal.type)}</span>
            <span>{done ? '✅' : '❌'}</span>
          </span>
        );
      })}
    </div>
  );
});

export default ObjectivesPanel;
