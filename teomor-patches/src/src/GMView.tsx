import { useEffect, useState } from 'react';
import { applyPlaytestCatalog } from './cardsData';
import {
  addBuff,
  adjustFatigue,
  adjustWounds,
  defaultGmRoster,
  loadGmRoster,
  newCustomPlayer,
  playerFromPreset,
  presetByPlayerId,
  removeBuff,
  restPlayer,
  refreshPlayerLimits,
  saveGmRoster,
  tickBuffRounds,
  type GmPlayer,
} from './gmRoster';
import { useSkillTree } from './SkillTreeContext';
import { PLAYTEST_PRESETS } from './playtestPresets';

const QUICK_BUFFS = [
  'Сглаз',
  'Кровотечение',
  'Ошеломление',
  'Укрытие',
  'Благословение',
  'Невидимость',
];

function PlayerCard({
  player,
  active,
  onSelect,
  onChange,
  onLoadSheet,
  onPullFromSheet,
  onRemove,
}: {
  player: GmPlayer;
  active: boolean;
  onSelect: () => void;
  onChange: (next: GmPlayer) => void;
  onLoadSheet: () => void;
  onPullFromSheet: () => void;
  onRemove: () => void;
}) {
  const [buffInput, setBuffInput] = useState('');
  const [buffRounds, setBuffRounds] = useState('');

  const addQuickBuff = (label: string) => {
    onChange(addBuff(player, label));
  };

  const submitBuff = () => {
    const rounds = buffRounds.trim() ? Number(buffRounds) : undefined;
    onChange(addBuff(player, buffInput, rounds));
    setBuffInput('');
    setBuffRounds('');
  };

  return (
    <article
      className={`gm-player panel${active ? ' gm-player-active' : ''}`}
      onClick={onSelect}
    >
      <div className="gm-player-head">
        <input
          className="gm-name-input"
          value={player.name}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange({ ...player, name: e.target.value })}
        />
        {player.presetId && (
          <span className="gm-preset-tag muted">плейтест</span>
        )}
      </div>

      <div className="gm-level-row">
        <label className="gm-inline-label">
          Ур.
          <input
            type="number"
            min={1}
            className="armor-input gm-level-input"
            value={player.level}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const level = Math.max(1, Number(e.target.value) || 1);
              const mods = player.presetId
                ? (presetByPlayerId(player.presetId)?.manualModifiers ?? {})
                : {};
              onChange(refreshPlayerLimits({ ...player, level }, mods));
            }}
          />
        </label>
      </div>

      <div className="gm-tracks">
        <div className="combat-track">
          <span>
            Раны <b>{player.combat.wounds}</b>/{player.combat.woundsMax}
          </span>
          <div className="combat-btns" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn btn-mini"
              onClick={() => onChange(adjustWounds(player, 1))}
            >
              +
            </button>
            <button
              type="button"
              className="btn btn-mini"
              disabled={player.combat.wounds <= 0}
              onClick={() => onChange(adjustWounds(player, -1))}
            >
              −
            </button>
          </div>
        </div>
        <div className="combat-track">
          <span>
            Усталость <b>{player.combat.fatigue}</b>/{player.combat.fatigueMax}
          </span>
          <div className="combat-btns" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn btn-mini"
              onClick={() => onChange(adjustFatigue(player, 1))}
            >
              +
            </button>
            <button
              type="button"
              className="btn btn-mini"
              disabled={player.combat.fatigue <= 0}
              onClick={() => onChange(adjustFatigue(player, -1))}
            >
              −
            </button>
          </div>
        </div>
      </div>

      <div className="gm-buffs" onClick={(e) => e.stopPropagation()}>
        <div className="gm-buffs-head">
          <span>Эффекты</span>
          <button
            type="button"
            className="btn btn-mini"
            onClick={() => onChange(restPlayer(player))}
          >
            Отдых
          </button>
        </div>
        {player.buffs.length === 0 ? (
          <p className="muted gm-buffs-empty">Нет активных эффектов</p>
        ) : (
          <ul className="gm-buff-list">
            {player.buffs.map((b) => (
              <li key={b.id} className="gm-buff-chip">
                <span>
                  {b.label}
                  {b.rounds != null && (
                    <span className="gm-buff-rounds"> ({b.rounds})</span>
                  )}
                </span>
                <button
                  type="button"
                  className="gm-buff-remove"
                  aria-label="Снять"
                  onClick={() => onChange(removeBuff(player, b.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="gm-quick-buffs">
          {QUICK_BUFFS.map((label) => (
            <button
              key={label}
              type="button"
              className="btn btn-mini2"
              onClick={() => addQuickBuff(label)}
            >
              + {label}
            </button>
          ))}
        </div>
        <div className="gm-buff-add">
          <input
            placeholder="Свой эффект"
            value={buffInput}
            onChange={(e) => setBuffInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitBuff()}
          />
          <input
            type="number"
            min={1}
            placeholder="раунды"
            className="gm-buff-rounds-input"
            value={buffRounds}
            onChange={(e) => setBuffRounds(e.target.value)}
          />
          <button type="button" className="btn btn-mini" onClick={submitBuff}>
            +
          </button>
        </div>
      </div>

      <textarea
        className="gm-notes"
        placeholder="Заметки мастера"
        rows={2}
        value={player.notes}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange({ ...player, notes: e.target.value })}
      />

      <div className="gm-player-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-primary btn-mini" onClick={onLoadSheet}>
          На лист
        </button>
        <button type="button" className="btn btn-mini" onClick={onPullFromSheet}>
          С листа
        </button>
        {!player.presetId && (
          <button type="button" className="btn btn-mini btn-danger" onClick={onRemove}>
            Удалить
          </button>
        )}
      </div>
    </article>
  );
}

export function GMView() {
  const { state, dispatch } = useSkillTree();
  const [roster, setRoster] = useState<GmPlayer[]>(loadGmRoster);
  const [activeId, setActiveId] = useState<string | null>(
    roster[0]?.id ?? null,
  );

  useEffect(() => {
    saveGmRoster(roster);
  }, [roster]);

  const patch = (id: string, next: GmPlayer) => {
    setRoster((rs) => rs.map((p) => (p.id === id ? next : p)));
  };

  const loadToSheet = (player: GmPlayer) => {
    if (player.presetId) {
      const preset = presetByPlayerId(player.presetId);
      if (preset) {
        applyPlaytestCatalog(preset.cardIds);
        dispatch({ type: 'LOAD_PLAYTEST_PRESET', preset });
      }
    }
    dispatch({ type: 'SET_COMBAT', combat: { ...player.combat } });
    setActiveId(player.id);
  };

  const pullFromSheet = (player: GmPlayer) => {
    patch(player.id, {
      ...player,
      level: state.level,
      combat: { ...state.combat },
    });
    setActiveId(player.id);
  };

  const restAll = () => {
    setRoster((rs) => rs.map(restPlayer));
  };

  const tickAllRounds = () => {
    setRoster((rs) => rs.map(tickBuffRounds));
  };

  const resetRoster = () => {
    if (!confirm('Сбросить roster к трём плейтест-персонажам?')) return;
    const fresh = defaultGmRoster();
    setRoster(fresh);
    setActiveId(fresh[0]?.id ?? null);
  };

  return (
    <div className="gm-view">
      <header className="gm-head">
        <div>
          <h2>Панель мастера</h2>
          <p className="muted gm-sub">
            Раны, усталость и эффекты по игрокам. «На лист» — загрузить билд и
            бой; «С листа» — забрать текущие значения с активного листа.
          </p>
        </div>
        <div className="gm-toolbar">
          <button
            type="button"
            className="btn btn-mini"
            onClick={() => {
              const p = newCustomPlayer();
              setRoster((rs) => [...rs, p]);
              setActiveId(p.id);
            }}
          >
            + Игрок
          </button>
          <button type="button" className="btn btn-mini" onClick={restAll}>
            Отдых всем
          </button>
          <button type="button" className="btn btn-mini" onClick={tickAllRounds}>
            Конец раунда
          </button>
          <button type="button" className="btn btn-mini" onClick={resetRoster}>
            Сброс roster
          </button>
        </div>
      </header>

      <div className="gm-preset-bar panel-inset">
        <span className="muted">Быстрая загрузка:</span>
        {PLAYTEST_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn btn-mini2"
            onClick={() => {
              const existing = roster.find((r) => r.id === p.id);
              const player = existing ?? playerFromPreset(p);
              if (!existing) setRoster((rs) => [...rs, player]);
              loadToSheet(player);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="gm-grid">
        {roster.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            active={activeId === player.id}
            onSelect={() => setActiveId(player.id)}
            onChange={(next) => patch(player.id, next)}
            onLoadSheet={() => loadToSheet(player)}
            onPullFromSheet={() => pullFromSheet(player)}
            onRemove={() => {
              setRoster((rs) => rs.filter((p) => p.id !== player.id));
              if (activeId === player.id) setActiveId(null);
            }}
          />
        ))}
      </div>

      {activeId && (
        <p className="muted gm-active-hint">
          Активный: <b>{roster.find((p) => p.id === activeId)?.name}</b>
        </p>
      )}
    </div>
  );
}
