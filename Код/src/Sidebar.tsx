import { useState } from 'react';
import { useSkillTree } from './SkillTreeContext';
import { raceById } from './races';
import type { ZoneType } from './types';
import type { View } from './views';
import { TREE_ECONOMY } from './treeEconomy';
import { auraHint } from './coreRules';
import { applyPlaytestCatalog } from './cardsData';
import { PLAYTEST_PRESETS } from './playtestPresets';

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
  const { state, dispatch, totalStatModifiers, kb } = useSkillTree();
  const totals = Object.entries(totalStatModifiers);
  const race = raceById(state.race);
  const { combat } = state;
  const [targetLevel, setTargetLevel] = useState(1);

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
        <button
          className={`btn ${view === 'constructor' ? 'btn-primary' : ''}`}
          onClick={() => onView('constructor')}
        >
          Конструктор
        </button>
      </div>

      <section className="panel playtest-panel">
        <h2>Плейтест</h2>
        <p className="muted">Загрузить билд + карты из ABILITY-MAP</p>
        {PLAYTEST_PRESETS.map((p) => (
          <button
            key={p.id}
            className="btn btn-mini playtest-btn"
            onClick={() => {
              applyPlaytestCatalog(p.cardIds);
              dispatch({ type: 'LOAD_PLAYTEST_PRESET', preset: p });
            }}
          >
            {p.label}
          </button>
        ))}
      </section>

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
        <h2>Очки развития</h2>
        <div className="economy">
          <div className="econ-pill econ-or">
            <span className="econ-num">{state.orPoints}</span>
            <span className="econ-cap">ОР</span>
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={state.level < 1}
          onClick={() => dispatch({ type: 'GAIN_LEVEL' })}
        >
          + Уровень (+{TREE_ECONOMY.orPerLevel} ОР)
        </button>
      </section>

      {state.level >= 1 && (
        <section className="panel combat-panel">
          <h2>Бой (ядро v2)</h2>
          <div className="combat-row">
            <span>
              КБ <b>{kb}</b>
            </span>
            <label className="armor-in">
              Броня +
              <input
                type="number"
                min={0}
                className="armor-input"
                value={state.armorBonus}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_ARMOR_BONUS',
                    value: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className="combat-track">
            <span>
              Раны {combat.wounds}/{combat.woundsMax}
            </span>
            <div className="combat-btns">
              <button
                className="btn btn-mini"
                onClick={() => dispatch({ type: 'TAKE_WOUND' })}
              >
                +рана
              </button>
              <button
                className="btn btn-mini"
                disabled={combat.wounds <= 0}
                onClick={() => dispatch({ type: 'HEAL_WOUND' })}
              >
                −рана
              </button>
            </div>
          </div>
          <div className="combat-track">
            <span>
              Усталость {combat.fatigue}/{combat.fatigueMax}
            </span>
            <div className="combat-btns">
              <button
                className="btn btn-mini"
                onClick={() => dispatch({ type: 'ADD_FATIGUE', amount: 1 })}
              >
                +1
              </button>
              <button
                className="btn btn-mini"
                disabled={combat.fatigue <= 0}
                onClick={() => dispatch({ type: 'CLEAR_FATIGUE', amount: 1 })}
              >
                −1
              </button>
            </div>
          </div>
          <button
            className="btn btn-mini"
            onClick={() => dispatch({ type: 'REST' })}
          >
            Отдых (сброс ран и усталости)
          </button>
          <div className="combat-row aura-row">
            <label className="armor-in">
              Ур. цели
              <input
                type="number"
                min={1}
                className="armor-input"
                value={targetLevel}
                onChange={(e) => setTargetLevel(Number(e.target.value))}
              />
            </label>
            <span className="aura-hint">
              {state.level >= 1
                ? auraHint(state.level, Math.max(1, targetLevel))
                : '—'}
            </span>
          </div>
        </section>
      )}

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
                  disabled={
                    !opened ||
                    level >= 10 ||
                    state.orPoints < TREE_ECONOMY.specUpgradeCost
                  }
                  title={
                    !opened
                      ? 'Сначала открой ветку на древе'
                      : `Повысить уровень за ${TREE_ECONOMY.specUpgradeCost} ОР`
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
          if (confirm('Сбозить всё древо?')) dispatch({ type: 'RESET' });
        }}
      >
        Сбросить
      </button>
    </aside>
  );
}
