import { races, raceById } from './races';
import { backgrounds } from './backgrounds';
import { useSkillTree } from './SkillTreeContext';

// Создание персонажа: раса -> выборы расы (если есть) -> предыстория.
export function RaceModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useSkillTree();
  const race = raceById(state.race);

  const choicesIncomplete =
    !!race?.choices?.some((c) => !state.raceChoices[c.id]);

  const step: 'race' | 'choices' | 'background' = !state.race
    ? 'race'
    : choicesIncomplete
      ? 'choices'
      : 'background';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {step === 'race' && (
          <>
            <h2 className="modal-title">Шаг 1 — Раса</h2>
            <p className="modal-sub">
              Выбери расу. Получишь её особенности, 2 ОУ и 2 ОО (1 уровень).
            </p>
            <div className="race-grid">
              {races.map((r) => (
                <button
                  key={r.id}
                  className="race-card"
                  onClick={() => dispatch({ type: 'CHOOSE_RACE', raceId: r.id })}
                >
                  <div className="race-head">
                    <span className="race-name">{r.name}</span>
                    <span className="race-speed">Скорость {r.speed}</span>
                  </div>
                  <p className="race-blurb">{r.blurb}</p>
                  <ul className="race-abilities">
                    {r.abilities.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                    {r.choices?.map((c) => (
                      <li key={c.id} className="race-choice-hint">
                        ⚙ {c.label}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'choices' && race && (
          <>
            <h2 className="modal-title">Шаг 2 — Выборы расы ({race.name})</h2>
            <p className="modal-sub">Определи стихию / характеристику.</p>
            <div className="choices-form">
              {race.choices!.map((c) => (
                <label key={c.id} className="choice-row">
                  {c.label}
                  <select
                    value={state.raceChoices[c.id] ?? ''}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_RACE_CHOICE',
                        choiceId: c.id,
                        value: e.target.value,
                      })
                    }
                  >
                    <option value="">— выбери —</option>
                    {c.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </>
        )}

        {step === 'background' && (
          <>
            <h2 className="modal-title">Шаг 3 — Предыстория</h2>
            <p className="modal-sub">
              Даёт владения навыками (не характеристиками).
            </p>
            <div className="race-grid">
              {backgrounds.map((b) => (
                <button
                  key={b.id}
                  className="race-card"
                  onClick={() => {
                    dispatch({ type: 'CHOOSE_BACKGROUND', backgroundId: b.id });
                    onClose();
                  }}
                >
                  <div className="race-head">
                    <span className="race-name">{b.name}</span>
                  </div>
                  <p className="race-blurb">{b.blurb}</p>
                  <ul className="race-abilities">
                    {Object.entries(b.statModifiers).map(([k, v]) => (
                      <li key={k}>
                        {k}: +{v}
                      </li>
                    ))}
                    {b.abilities.map((a, i) => (
                      <li key={`a${i}`}>{a}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            <button className="btn" style={{ marginTop: 12 }} onClick={onClose}>
              Пропустить
            </button>
          </>
        )}
      </div>
    </div>
  );
}
