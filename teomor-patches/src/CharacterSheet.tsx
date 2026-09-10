import { useEffect, useState } from 'react';
import { useSkillTree } from './SkillTreeContext';
import { raceById } from './races';
import { backgroundById } from './backgrounds';
import {
  BASE_CHAR,
  DERIVED_FIELDS,
  SKILL_GROUPS,
  charCapForLevel,
  kvelRankForLevel,
  rawSkillValue,
  skillValue,
  type SkillGroup,
} from './characterSheetData';

const LS_SHEET = 'teomor_sheet_v1';

function loadSheet(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_SHEET) ?? '{}');
  } catch {
    return {};
  }
}

const zoneOfChar: Record<SkillGroup['char'], string> = {
  Мощь: 'strength',
  Разум: 'magic',
  Моторика: 'dexterity',
  Стержень: 'wisdom',
};

export function CharacterSheet() {
  const { state, treeData, totalStatModifiers, kb } = useSkillTree();
  const { combat } = state;
  const [fields, setFields] = useState<Record<string, string>>(loadSheet);

  useEffect(() => {
    localStorage.setItem(LS_SHEET, JSON.stringify(fields));
  }, [fields]);

  const set = (key: string, val: string) =>
    setFields((f) => ({ ...f, [key]: val }));

  const cap = charCapForLevel(state.level);
  const rawCharValue = (char: string) => BASE_CHAR + (totalStatModifiers[char] ?? 0);
  const charValue = (char: string) => Math.min(rawCharValue(char), cap);

  const race = raceById(state.race);
  const bg = backgroundById(state.background);

  const quels: string[] = [];
  const aspects: string[] = [];
  const sigils: string[] = [];
  const feats: string[] = [];
  const crafts: string[] = [];
  for (const id of state.allocatedNodes) {
    const node = treeData.nodes.find((n) => n.id === id);
    if (!node) continue;
    if (node.category === 'specialization') {
      quels.push(`${node.label} (ур ${state.specializationLevels[node.zone] ?? 0})`);
    }
    const picks = state.nodeChoices[id] ?? [];
    for (const c of node.choices ?? []) {
      const chosen = picks.filter((p) => c.options.some((o) => o.id === p));
      if (chosen.length === 0) continue;
      if (c.id === 'aspect') aspects.push(...chosen);
      else if (c.id === 'sigils') sigils.push(...chosen.map((s) => `${node.label}: ${s}`));
      else if (c.id === 'feat') feats.push(...chosen);
      else if (c.id === 'craft') crafts.push(...chosen);
    }
    if (node.category === 'transit_specialized' && node.choices?.some((c) => c.id === 'aspect')) {
      quels.push(`Квель: ${node.label}`);
    }
  }
  const derivedBlock = (title: string, items: string[]) =>
    items.length > 0 ? (
      <div className="derived-line">
        <b>{title}:</b> {items.join(', ')}
      </div>
    ) : null;

  return (
    <div className="sheet">
      <div className="sheet-head">
        <label className="sheet-name">
          Имя
          <input
            value={fields['name'] ?? ''}
            onChange={(e) => set('name', e.target.value)}
          />
        </label>
        <div className="sheet-meta">
          <span>Раса: {race?.name ?? '—'}</span>
          <span>Предыстория: {bg?.name ?? '—'}</span>
          <span>Уровень: {state.level}</span>
          <span>Ранг Квеля: {kvelRankForLevel(state.level)}</span>
          <span>Потолок хар./навыков: +{cap}</span>
          <span>КБ: {kb}</span>
          <span>
            Раны: {combat.wounds}/{combat.woundsMax}
          </span>
          <span>
            Усталость: {combat.fatigue}/{combat.fatigueMax}
          </span>
        </div>
      </div>

      {(quels.length || aspects.length || sigils.length || feats.length || crafts.length) > 0 && (
        <div className="sheet-derived-choices panel">
          {derivedBlock('Квели', quels)}
          {derivedBlock('Аспекты', aspects)}
          {derivedBlock('Сигилы', sigils)}
          {derivedBlock('Черты', feats)}
          {derivedBlock('Ремёсла/Владения', crafts)}
        </div>
      )}

      <div className="sheet-cols">
        {SKILL_GROUPS.map((group) => (
          <section
            key={group.char}
            className={`sheet-col zone-${zoneOfChar[group.char]}`}
          >
            <header className="sheet-char">
              <span className="sheet-char-name">{group.char}</span>
              <span
                className="sheet-char-val"
                title={
                  rawCharValue(group.char) > cap
                    ? `Ограничено потолком ранга Квеля (+${cap})`
                    : undefined
                }
              >
                {charValue(group.char) >= 0
                  ? `+${charValue(group.char)}`
                  : charValue(group.char)}
                {rawCharValue(group.char) > cap && (
                  <span className="char-capped"> ⚠</span>
                )}
              </span>
            </header>
            <ul className="sheet-skills">
              {group.skills.map((s) => {
                const raw = rawSkillValue(totalStatModifiers, s.name);
                const val = skillValue(totalStatModifiers, s.name, state.level);
                const capped = raw > cap;
                return (
                  <li key={s.name}>
                    <span className="sheet-skill-name">{s.name}</span>
                    <span
                      className="sheet-skill-val sheet-char-val"
                      title={
                        capped
                          ? `Ограничено потолком ранга Квеля (+${cap})`
                          : undefined
                      }
                    >
                      +{val}
                      {capped && <span className="char-capped"> ⚠</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="sheet-derived">
        {DERIVED_FIELDS.map((f) => (
          <label key={f} className="sheet-field">
            {f}
            <input
              value={fields[`d:${f}`] ?? ''}
              onChange={(e) => set(`d:${f}`, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="sheet-blocks">
        {['Инструменты', 'Расходники', 'Инвентарь'].map((b) => (
          <label key={b} className="sheet-block">
            {b}
            <textarea
              rows={4}
              value={fields[`b:${b}`] ?? ''}
              onChange={(e) => set(`b:${b}`, e.target.value)}
            />
          </label>
        ))}
      </div>

      <p className="muted">
        Характеристики и навыки = база {BASE_CHAR} + бонусы из древа/расы/предыстории
        (0–15, автоматически). КБ, раны и усталость — в Sidebar. Имя, инвентарь и прочее —
        вручную.
      </p>
    </div>
  );
}
