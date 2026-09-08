import { useSkillTree } from './SkillTreeContext';
import { raceById } from './races';
import type { ZoneType } from './types';
import type { View } from './App';

const ZONES: { zone: ZoneType; dar: string; branch: string }[] = [
  { zone: 'magic', dar: 'Дар Медведя', branch: 'Магия' },
  { zone: 'strength', dar: 'Дар Зюбания', branch: 'Ближний бой' },
  { zone: 'dexterity', dar: 'Дар Змея', branch: 'Ловкость' },
  { zone: 'wisdom', dar: 'Дар Голубя', branch: 'Мудрость' },
];

interface SidebarProps {
  editMode: boolean;
  onToggleEdit: () => void;
  view: View;
  onView: (v: View) => void;
}

export function Sidebar({ editMode, onToggleEdit, view, onView }: SidebarProps) {
  const { state, dispatch, totalStatModifiers } = useSkillTree();
  const totals = Object.entries(totalStatModifiers);
  const race = raceById(state.race);

  return (
    <aside className="sidebar">
      <h1 className="sidebar-title">Теомор</h1>

      <div className="view-tabs">
        <button
          className={`btn ${view === 'tree' ? 'btn-primary' : ''}`}
          onClick={() => onView('tree')}
        >
          Древо
        </button>
        <button
          className={`btn ${view === 'sheet' ? 'btn-primary' : ''}`}
          onClick={() => onView('sheet')}
        >
          Лист
        </button>
        <button
          className={`btn ${view === 'cards' ? 'btn-primary' : ''}`}
          onClick={() => onView('cards')}
        >
          Карты
        </button>
      </div>

      <section className="panel">
        <h2>Персонаж</h2>
        {state.level < 1 ? (
          <p className="muted">
            Нажми на белый центр древа, чтобы выбрать расу и начать (1 уровень).
          </p>
        ) : (
          <div className="char-line">
            <span>
              Уровень <b>{state.level}</b>
            </span>
            <span>{race ? race.name : 'без расы'}</span>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Очки</h2>
        <div className="economy">
          <div className="econ-pill econ-or">
            <span className="econ-num">{state.developmentPoints}</span>
            <span className="econ-cap">ОУ</span>
          </div>
          <div className="econ-pill econ-transit">
            <span className="econ-num">{state.transitPoints}</span>
            <span className="econ-cap">ОО</span>
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={state.level < 1}
          onClick={() => dispatch({ type: 'GAIN_LEVEL' })}
        >
          + Уровень (+1 ОУ, +1 ОО)
        </button>
      </section>

      <section className="panel">
        <h2>Дары (специализации)</h2>
        {ZONES.map(({ zone, dar, branch }) => {
          const level = state.specializationLevels[zone] ?? 0;
          const opened = level >= 1;
          return (
            <div key={zone} className={`spec-row zone-${zone}`}>
              <div className="spec-info">
                <span className="spec-name">{dar}</span>
                <span className="spec-dar">{branch}</span>
              </div>
              <div className="spec-ctrl">
                <span className="spec-level">{level}/10</span>
                <button
                  className="btn btn-mini"
                  disabled={!opened || level >= 10 || state.developmentPoints < 1}
                  title={
                    !opened
                      ? 'Сначала открой ветку на древе'
                      : 'Повысить уровень за 1 ОУ'
                  }
                  onClick={() =>
                    dispatch({ type: 'UPGRADE_SPECIALIZATION', zone })
                  }
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h2>Модификаторы (лист персонажа)</h2>
        {totals.length === 0 ? (
          <p className="muted">Пока пусто. Вкладывай очки в узлы.</p>
        ) : (
          <ul className="stat-list">
            {totals.map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <span className="stat-val">{v > 0 ? `+${v}` : v}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        className={`btn ${editMode ? 'btn-primary' : ''}`}
        onClick={onToggleEdit}
      >
        {editMode ? '✓ Режим редактора (вкл)' : '✎ Режим редактора'}
      </button>

      <button
        className="btn btn-danger"
        onClick={() => {
          if (confirm('Сбросить всё древо?')) dispatch({ type: 'RESET' });
        }}
      >
        Сбросить
      </button>
    </aside>
  );
}
