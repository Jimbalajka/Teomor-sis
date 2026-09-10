import { useState, type ReactNode } from 'react';
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

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="panel sidebar-section">
      <button type="button" className="sidebar-section-head" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} {title}
      </button>
      {open && <div className="sidebar-section-body">{children}</div>}
    </section>
  );
}

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
        {(
          [
            ['tree', 'Древо'],
            ['sheet', 'Лист'],
            ['cards', 'Карты'],
            ['constructor', 'Конструктор'],
            ['rules', 'Правила'],
            ['gm', 'Мастер'],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            className={`btn ${view === v ? 'btn-primary' : ''}`}
            onClick={() => onView(v)}
          >
            {label}
          </button>
        ))}
      </div>

      <Section title="Плейтест" defaultOpen={false}>
        <p className="muted">Билд + статы + карты</p>
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
      </Section>

      <Section title="Персонаж">
        {state.level < 1 ? (
          <p className="muted">Выбери расу в центре древа.</p>
        ) : (
          <div className="char-line">
            <span>Уровень <b>{state.level}</b></span>
            <span>{race?.name ?? 'без расы'}</span>
          </div>
        )}
        <div className="economy" style={{ marginTop: '0.5rem' }}>
          <div className="econ-pill econ-or">
            <span className="econ-num">{state.orPoints}</span>
            <span className="econ-cap">ОР</span>
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: '0.5rem', width: '100%' }}
          disabled={state.level < 1}
          onClick={() => dispatch({ type: 'GAIN_LEVEL' })}
        >
          + Уровень (+{TREE_ECONOMY.orPerLevel} ОР)
        </button>
      </Section>

      {state.level >= 1 && (
        <Section title="Бой">
          <div className="combat-compact">
            <div className="combat-track">
              <span>КБ <b>{kb}</b> · броня +</span>
              <input
                type="number"
                min={0}
                className="armor-input"
                value={state.armorBonus}
                onChange={(e) =>
                  dispatch({ type: 'SET_ARMOR_BONUS', value: Number(e.target.value) })
                }
              />
            </div>
            <div className="combat-track">
              <span>Раны {combat.wounds}/{combat.woundsMax}</span>
              <div className="combat-btns">
                <button className="btn btn-mini" onClick={() => dispatch({ type: 'TAKE_WOUND' })}>+</button>
                <button className="btn btn-mini" disabled={combat.wounds <= 0} onClick={() => dispatch({ type: 'HEAL_WOUND' })}>−</button>
              </div>
            </div>
            <div className="combat-track">
              <span>Усталость {combat.fatigue}/{combat.fatigueMax}</span>
              <div className="combat-btns">
                <button className="btn btn-mini" onClick={() => dispatch({ type: 'ADD_FATIGUE', amount: 1 })}>+</button>
                <button className="btn btn-mini" disabled={combat.fatigue <= 0} onClick={() => dispatch({ type: 'CLEAR_FATIGUE', amount: 1 })}>−</button>
              </div>
            </div>
            <button className="btn btn-mini" style={{ width: '100%' }} onClick={() => dispatch({ type: 'REST' })}>
              Отдых
            </button>
            <div className="combat-track aura-row">
              <label className="armor-in">
                Ур. цели
                <input type="number" min={1} className="armor-input" value={targetLevel} onChange={(e) => setTargetLevel(Number(e.target.value))} />
              </label>
              <span className="aura-hint">{auraHint(state.level, Math.max(1, targetLevel))}</span>
            </div>
          </div>
        </Section>
      )}

      <Section title="Дары" defaultOpen={false}>
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
                  disabled={!opened || level >= 10 || state.orPoints < TREE_ECONOMY.specUpgradeCost}
                  onClick={() => dispatch({ type: 'UPGRADE_SPECIALIZATION', zone })}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </Section>

      <Section title="Модификаторы" defaultOpen={false}>
        {totals.length === 0 ? (
          <p className="muted">Пока пусто.</p>
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
      </Section>

      <div className="sidebar-footer">
        <button className={`btn ${editMode ? 'btn-primary' : ''}`} onClick={onToggleEdit}>
          {editMode ? '✓ Редактор' : '✎ Редактор'}
        </button>
        <button className="btn btn-danger" onClick={() => { if (confirm('Сбросить?')) dispatch({ type: 'RESET' }); }}>
          Сбросить
        </button>
      </div>
    </aside>
  );
}
